import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initDB, getPool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '500mb' }));

// --- SERVE STATIC FRONTEND ---
const distPath = path.join(__dirname, '../dist-app');
app.use(express.static(distPath));

// Endpoint for checking if server is alive
// Endpoint for checking if server is alive and Diagnostics
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        storage: useMySQL ? 'MySQL' : 'JSON (Fallback)',
        dbHost: process.env.MYSQLHOST ? 'Configured in Env' : 'Not Configured',
        dbName: process.env.MYSQLDATABASE || 'N/A',
        mysqlConnection: useMySQL ? 'Active' : 'Failed',
        message: useMySQL ? 'System Healthy' : 'Warning: Using local JSON file instead of Cloud DB'
    });
});

// --- STORAGE STRATEGY ---
let useMySQL = false;
let pool = null;
const DB_FILE = path.join(__dirname, 'database.json');

// Try to initialize MySQL, fallback to JSON
async function initStorage() {
    try {
        pool = await initDB();
        useMySQL = true;
        console.log('✅ MySQL connected successfully!');
        console.log('📊 Using MySQL for data storage');
    } catch (error) {
        console.warn('⚠️  MySQL not available:', error.message);
        console.log('📁 FALLBACK: Using JSON file storage (database.json)');
        useMySQL = false;

        // Initialize JSON file if not exists
        if (!fs.existsSync(DB_FILE)) {
            const defaultData = {
                students: [],
                assignments: [],
                events: [],
                behaviorLogs: [],
                financeEvents: [],
                schoolConfig: null,
                staffTasks: [],
                books: []
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
            console.log('📝 Created new database.json file');
        }
    }
}

// JSON Storage Helper Functions
function readJSON() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading JSON:', error);
        return {
            students: [],
            assignments: [],
            events: [],
            behaviorLogs: [],
            financeEvents: [],
            schoolConfig: null,
            staffTasks: [],
            books: []
        };
    }
}

function writeJSON(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing JSON:', error);
        return false;
    }
}

// Continue with the rest of the MySQL implementation...
// Now we'll wrap each endpoint to use JSON when MySQL is not available

// 1. GET ALL DATA
app.get('/api/full-state', async (req, res) => {
    try {
        if (!useMySQL) {
            const data = readJSON();
            res.json({ ...data, isEmpty: data.students.length === 0 });
            return;
        }

        const pool = getPool();

        // 1. Students (Strip avatars to save 90% space)
        const [studentRows] = await pool.query('SELECT id, curp, name, sex, birth_date, enrollment_date, status, behavior_points, annual_fee_paid, avatar, data_json FROM students');
        const students = studentRows.map(row => {
            let base = {};
            try {
                base = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : (row.data_json || {});
            } catch (e) { base = {}; }

            // STRIP AVATAR from both base and root for initial load
            const avatar = row.avatar || base.avatar;
            const hasAvatar = !!avatar && avatar.length > 100;

            return {
                ...base,
                id: row.id,
                name: row.name,
                curp: row.curp,
                avatar: hasAvatar ? "PENDING_LOAD" : (avatar || ""), // Placeholder
                hasRealAvatar: hasAvatar,
                // Defaults
                grades: Array.isArray(base.grades) ? base.grades : [],
                attendance: (base.attendance && typeof base.attendance === 'object') ? base.attendance : {},
                completedAssignmentIds: Array.isArray(base.completedAssignmentIds) ? base.completedAssignmentIds : [],
                assignmentResults: (base.assignmentResults && typeof base.assignmentResults === 'object') ? base.assignmentResults : {},
                behaviorPoints: typeof row.behavior_points === 'number' ? row.behavior_points : 0
            };
        });

        // 2. Assignments (Strip heavy interactiveData)
        const [assignmentRows] = await pool.query('SELECT id, title, due_date, data_json FROM assignments');
        const assignments = assignmentRows.map(r => {
            let d = r.data_json || {};
            if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }

            // Only keep lightweight assignment info for initial state
            return {
                ...d,
                id: r.id,
                interactiveData: d.interactiveData ? { type: d.interactiveData.type, hasContent: true } : null
            };
        });

        // 3. Other tables (usually smaller)
        const [eventRows] = await pool.query('SELECT * FROM events');
        const events = eventRows.map(r => {
            let d = r.data_json || {};
            if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
            return { ...d, id: r.id };
        });

        const [logRows] = await pool.query('SELECT * FROM behavior_logs');
        const behaviorLogs = logRows.map(r => {
            let d = r.data_json || {};
            if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
            return { ...d, id: r.id, studentId: r.student_id };
        });

        const [financeRows] = await pool.query('SELECT * FROM finance_events');
        const financeEvents = financeRows.map(r => {
            let d = r.data_json || {};
            if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
            return { ...d, id: r.id };
        });

        const [configRows] = await pool.query('SELECT * FROM school_config WHERE config_key = ?', ['main_config']);
        const [taskRows] = await pool.query('SELECT * FROM staff_tasks');
        const [bookRows] = await pool.query('SELECT * FROM books');

        let schoolConfig = null;
        if (configRows.length > 0) {
            try {
                const val = configRows[0].config_value;
                schoolConfig = typeof val === 'string' ? JSON.parse(val) : val;
            } catch (e) { schoolConfig = {}; }
        }

        res.json({
            students,
            assignments,
            events,
            behaviorLogs,
            financeEvents,
            schoolConfig,
            staffTasks: taskRows.map(r => ({ ...r, id: r.id })), // Simplified
            books: bookRows.map(r => ({ ...r, id: r.id })),
            isEmpty: students.length === 0,
            isOptimized: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Endpoint to fetch avatars in small batches or for specific student
app.get('/api/students/avatars', async (req, res) => {
    try {
        const pool = getPool();
        // Fetch all students to ensure we check both avatar column and data_json
        const [rows] = await pool.query('SELECT id, avatar, data_json FROM students');
        const avatars = {};
        rows.forEach(r => {
            let avatar = r.avatar;
            if ((!avatar || avatar === "PENDING_LOAD") && r.data_json) {
                try {
                    const parsed = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : (r.data_json || {});
                    avatar = parsed.avatar;
                } catch (e) { }
            }
            // Only add to map if it's a real base64 image
            if (avatar && avatar.length > 100) {
                avatars[r.id] = avatar;
            }
        });
        res.json(avatars);
    } catch (error) {
        console.error("Avatar fetch error:", error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Endpoint to fetch Honor Roll (Top performers by behavior points)
app.get('/api/honor-roll', async (req, res) => {
    try {
        if (!useMySQL) {
            const data = readJSON();
            const honorRoll = [...data.students]
                .sort((a, b) => (b.behaviorPoints || 0) - (a.behaviorPoints || 0))
                .slice(0, 10) // Top 10
                .map(s => ({ id: s.id, name: s.name, avatar: s.avatar, behaviorPoints: s.behaviorPoints || 0 }));
            res.json(honorRoll);
            return;
        }

        const pool = getPool();
        const [rows] = await pool.query('SELECT id, name, avatar, behavior_points, data_json FROM students ORDER BY behavior_points DESC LIMIT 10');

        const honorRoll = rows.map(r => {
            let avatar = r.avatar;
            if ((!avatar || avatar === "PENDING_LOAD") && r.data_json) {
                try {
                    const parsed = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : (r.data_json || {});
                    avatar = parsed.avatar;
                } catch (e) { }
            }
            return {
                id: r.id,
                name: r.name,
                avatar: (avatar && avatar.length > 100) ? avatar : "",
                behaviorPoints: r.behavior_points || 0
            };
        });
        res.json(honorRoll);
    } catch (error) {
        console.error("Honor Roll fetch error:", error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Endpoint to fetch specific assignment data (interactive worksheets)
app.get('/api/assignments/:id', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT data_json FROM assignments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const d = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
        res.json(d);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. SYNC / MIGRATE (Receives full state and overwrites/inserts)
app.post('/api/sync', async (req, res) => {
    console.log('Received Sync Request. Processing payload...');
    const { students, assignments, events, behaviorLogs, financeEvents, schoolConfig } = req.body;

    // DEBUG LOGS
    const payloadSize = JSON.stringify(req.body).length;
    console.log(`Payload Size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Students
        if (students && students.length > 0) {
            for (const s of students) {
                // SANITIZE BEFORE SAVE
                const sanitizedStudent = {
                    attendance: {},
                    grades: [],
                    completedAssignmentIds: [],
                    assignmentResults: {},
                    behaviorPoints: 0,
                    assignmentsCompleted: 0,
                    totalAssignments: 0,
                    participationCount: 0,
                    ...s, // User data overrides defaults
                    // Ensure arrays are actual arrays if they exist but are nullish
                    grades: Array.isArray(s.grades) ? s.grades : [],
                    attendance: (s.attendance && typeof s.attendance === 'object') ? s.attendance : {},
                    completedAssignmentIds: Array.isArray(s.completedAssignmentIds) ? s.completedAssignmentIds : []
                };

                // Protection: Do not save "PENDING_LOAD" placeholder into data_json
                const finalData = { ...sanitizedStudent };
                if (finalData.avatar === "PENDING_LOAD") {
                    delete finalData.avatar;
                }

                await connection.query(`
                INSERT INTO students (id, curp, name, sex, birth_date, enrollment_date, status, guardian_name, guardian_phone, avatar, repeater, bap, usaer, behavior_points, annual_fee_paid, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                curp=VALUES(curp),
                name=VALUES(name),
                sex=VALUES(sex),
                birth_date=VALUES(birth_date),
                enrollment_date=VALUES(enrollment_date),
                status=VALUES(status),
                guardian_name=VALUES(guardian_name),
                guardian_phone=VALUES(guardian_phone),
                avatar=IF(VALUES(avatar) = 'PENDING_LOAD', avatar, VALUES(avatar)),
                repeater=VALUES(repeater),
                bap=VALUES(bap),
                usaer=VALUES(usaer),
                behavior_points=VALUES(behavior_points),
                annual_fee_paid=VALUES(annual_fee_paid),
                data_json=VALUES(data_json)
            `, [
                    s.id, s.curp || '', s.name, s.sex === 'MUJER' ? 'MUJER' : 'HOMBRE', s.birthDate || null, s.enrollmentDate || null,
                    s.status || 'INSCRITO', s.guardianName, s.guardianPhone, s.avatar,
                    !!s.repeater, s.bap || 'NINGUNA', !!s.usaer, s.behaviorPoints || 0, !!s.annualFeePaid,
                    JSON.stringify(finalData)
                ]);
            }
        }

        // Assignments
        if (assignments && assignments.length > 0) {
            for (const a of assignments) {
                await connection.query(`
                INSERT INTO assignments (id, title, due_date, data_json)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                title=VALUES(title), data_json=VALUES(data_json)
            `, [a.id, a.title, a.dueDate || null, JSON.stringify(a)]);
            }
        }

        // Events
        if (events && events.length > 0) {
            for (const e of events) {
                await connection.query(`
                INSERT INTO events (id, title, date, type, description, data_json)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                title=VALUES(title), data_json=VALUES(data_json)
            `, [e.id, e.title, e.date || null, e.type, e.description, JSON.stringify(e)]);
            }
        }

        // Behavior Logs
        if (behaviorLogs && behaviorLogs.length > 0) {
            for (const l of behaviorLogs) {
                await connection.query(`
                INSERT INTO behavior_logs (id, student_id, type, description, date, data_json)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                description=VALUES(description), data_json=VALUES(data_json)
            `, [l.id, l.studentId, l.type, l.description, l.date ? new Date(l.date) : new Date(), JSON.stringify(l)]);
            }
        }

        // Finance
        if (financeEvents && financeEvents.length > 0) {
            for (const f of financeEvents) {
                await connection.query(`
                INSERT INTO finance_events (id, title, date, total_cost, cost_per_student, category, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                title=VALUES(title), data_json=VALUES(data_json)
            `, [f.id, f.title, f.date || null, f.totalCost || 0, f.costPerStudent || 0, f.category || 'EVENT', JSON.stringify(f)]);
            }
        }

        // Config
        if (schoolConfig) {
            await connection.query(`
            INSERT INTO school_config (config_key, config_value)
            VALUES ('main_config', ?)
            ON DUPLICATE KEY UPDATE config_value=VALUES(config_value)
        `, [JSON.stringify(schoolConfig)]);
        }

        // Books
        if (req.body.books && req.body.books.length > 0) {
            for (const b of req.body.books) {
                await connection.query(`
                INSERT INTO books (id, title, author, grade, category, data_json)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                title=VALUES(title), author=VALUES(author), grade=VALUES(grade), category=VALUES(category), data_json=VALUES(data_json)
            `, [b.id, b.title, b.author, b.grade, b.category, JSON.stringify(b)]);
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'Sync complete' });

    } catch (error) {
        await connection.rollback();
        console.error('Sync error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// --- CRUD ENDPOINTS ---

// STUDENTS
app.post('/api/students', async (req, res) => {
    const s = req.body;
    const pool = getPool();
    try {
        // Upsert (Insert or Update)
        await pool.query(`
      INSERT INTO students (id, curp, name, sex, birth_date, enrollment_date, status, guardian_name, guardian_phone, avatar, repeater, bap, usaer, behavior_points, annual_fee_paid, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name=VALUES(name),
      curp=VALUES(curp),
      sex=VALUES(sex),
      birth_date=VALUES(birth_date),
      guardian_name=VALUES(guardian_name),
      guardian_phone=VALUES(guardian_phone),
      avatar=IF(VALUES(avatar) = 'PENDING_LOAD', avatar, VALUES(avatar)),
      repeater=VALUES(repeater),
      bap=VALUES(bap),
      usaer=VALUES(usaer),
      behavior_points=VALUES(behavior_points),
      annual_fee_paid=VALUES(annual_fee_paid),
      data_json=VALUES(data_json)
    `, [
            s.id, s.curp || '', s.name, s.sex === 'MUJER' ? 'MUJER' : 'HOMBRE', s.birthDate || null, s.enrollmentDate || null,
            s.status || 'INSCRITO', s.guardianName, s.guardianPhone, s.avatar,
            !!s.repeater, s.bap || 'NINGUNA', !!s.usaer, s.behaviorPoints || 0, !!s.annualFeePaid,
            JSON.stringify(s)
        ]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ASSIGNMENTS
app.get('/api/assignments', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM assignments');
        const assignments = rows.map(r => {
            let d = r.data_json || {};
            if (typeof d === 'string') {
                try { d = JSON.parse(d); } catch (e) { console.error("Failed to parse", d); }
            }
            return d;
        });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/assignments', async (req, res) => {
    const a = req.body;
    try {
        const pool = getPool();
        await pool.query(`
      INSERT INTO assignments (id, title, due_date, data_json)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      title=VALUES(title), due_date=VALUES(due_date), data_json=VALUES(data_json)
    `, [a.id, a.title, a.dueDate || null, JSON.stringify(a)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/assignments/:id', async (req, res) => {
    try {
        const pool = getPool();
        // Manually delete dependencies first to fix potential missing CASCADE issues on legacy DBs
        try {
            await pool.query('DELETE FROM student_assignments WHERE assignment_id = ?', [req.params.id]);
        } catch (subError) {
            console.warn("Could not delete from student_assignments (maybe table missing?):", subError.message);
        }

        await pool.query('DELETE FROM assignments WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting assignment:", error);
        res.status(500).json({
            error: error.message || "Unknown error (check server logs)",
            code: error.code,
            sqlMessage: error.sqlMessage
        });
    }
});

// EVENTS
app.get('/api/events', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM events');
        // Parse JSON if needed, or if stored as separate columns, fine. 
        // My schema has columns + data_json.
        // Let's return the structured data.
        const events = rows.map(r => {
            const base = r.data_json || {};
            return { ...base, id: r.id, title: r.title, date: r.date, type: r.type, description: r.description };
        });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/events', async (req, res) => {
    const e = req.body;
    try {
        const pool = getPool();
        await pool.query(`
      INSERT INTO events (id, title, date, type, description, data_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      title=VALUES(title), date=VALUES(date), type=VALUES(type), description=VALUES(description), data_json=VALUES(data_json)
    `, [e.id, e.title, e.date || null, e.type, e.description, JSON.stringify(e)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/events/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BEHAVIOR
app.post('/api/behavior', async (req, res) => {
    const l = req.body; // Log
    try {
        const pool = getPool();
        await pool.query(`
      INSERT INTO behavior_logs (id, student_id, type, description, date, data_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      description=VALUES(description), data_json=VALUES(data_json)
    `, [l.id, l.studentId, l.type, l.description, l.date ? new Date(l.date) : new Date(), JSON.stringify(l)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/behavior/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM behavior_logs WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/behavior/student/:studentId', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM behavior_logs WHERE student_id = ? ORDER BY date DESC', [req.params.studentId]);
        const logs = rows.map(r => {
            let d = r.data_json || {};
            if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
            if (!d || typeof d !== 'object') d = {};
            return { ...d, id: r.id, studentId: r.student_id };
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FINANCE
app.post('/api/finance', async (req, res) => {
    const f = req.body;
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO finance_events (id, title, date, total_cost, cost_per_student, category, data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title=VALUES(title), total_cost=VALUES(total_cost), data_json=VALUES(data_json)
        `, [f.id, f.title, f.date || null, f.totalCost || 0, f.costPerStudent || 0, f.category || 'EVENT', JSON.stringify(f)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/finance/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM finance_events WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CONFIG
app.post('/api/config', async (req, res) => {
    const config = req.body;
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO school_config (config_key, config_value)
            VALUES ('main_config', ?)
            ON DUPLICATE KEY UPDATE config_value=VALUES(config_value)
        `, [JSON.stringify(config)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ATTENDANCE & GRADES (Update Student Wrapper or specific?)
// Since we store attendance inside the Student JSON/Object in the frontend, updating the student calls POST /api/students.
// But for efficiency, we might want a specific attendance endpoint.
// For now, let's rely on POST /api/students to update the whole student record (including new attendance).
// This generates more traffic but ensures consistency with the current frontend 'Student' object structure.

// NOTIFICATIONS
app.get('/api/notifications', async (req, res) => {
    try {
        const pool = getPool();
        const { studentId } = req.query; // If provided, filter by student + global

        let query = 'SELECT * FROM notifications WHERE student_id IS NULL'; // Global
        let params = [];

        if (studentId) {
            query += ' OR student_id = ?';
            params.push(studentId);
        }

        query += ' ORDER BY date DESC';

        const [rows] = await pool.query(query, params);
        res.json(rows.map(row => ({
            id: row.id,
            studentId: row.student_id,
            title: row.title,
            message: row.message,
            date: row.date,
            isRead: Boolean(row.is_read),
            type: row.type || 'INFO'
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notifications', async (req, res) => {
    const { id, studentId, title, message, date, type } = req.body;
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO notifications (id, student_id, title, message, date, type, is_read)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `, [id, studentId || null, title, message, date ? new Date(date) : new Date(), type || 'INFO']);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/notifications/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/parent/login', async (req, res) => {
    let { loginId } = req.body;
    loginId = (loginId || '').trim();
    const loginIdUpper = loginId.toUpperCase();
    console.log(`[Parent Login] Attempt for: "${loginId}" (Upper: "${loginIdUpper}")`);

    try {
        const pool = getPool();
        // Try exact match, uppercase match (common for CURP), or ID match
        const [rows] = await pool.query('SELECT * FROM students WHERE curp = ? OR curp = ? OR id = ?', [loginId, loginIdUpper, loginId]);

        if (rows.length > 0) {
            const student = rows[0];

            // Robust JSON parsing
            let parsed = student.data_json;
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed);
                    // Double parse check (sometimes it gets double encoded)
                    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                } catch (e) {
                    console.error('JSON Parse error for student:', student.id, e);
                    parsed = {};
                }
            } else if (!parsed) {
                parsed = {};
            }
            if (!parsed || typeof parsed !== 'object') parsed = {};

            // Merge and ensure defaults
            const finalStudent = {
                ...parsed,
                id: student.id,
                name: student.name,
                curp: student.curp,
                avatar: student.avatar || parsed.avatar,
                // Ensure critical arrays/objects exist
                attendance: parsed.attendance || {},
                completedAssignmentIds: Array.isArray(parsed.completedAssignmentIds) ? parsed.completedAssignmentIds : [],
                behaviorPoints: student.behavior_points !== undefined ? student.behavior_points : (parsed.behaviorPoints || 0)
            };

            res.json({ success: true, student: finalStudent });
        } else {
            res.status(401).json({ success: false, message: 'No se encontró un alumno con esa CURP o ID.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// PARENT MESSAGES
app.get('/api/parent/messages', async (req, res) => {
    try {
        const { studentId } = req.query;
        const pool = getPool();
        if (!studentId) return res.json([]);
        const [rows] = await pool.query('SELECT * FROM parent_messages WHERE student_id = ? ORDER BY date ASC', [studentId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/parent/messages', async (req, res) => {
    const { studentId, message, sender } = req.body;
    try {
        const pool = getPool();
        const id = Date.now().toString();
        await pool.query('INSERT INTO parent_messages (id, student_id, message, date, sender) VALUES (?, ?, ?, ?, ?)',
            [id, studentId, message, new Date(), sender || 'PARENT']);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/parent/all-messages', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM parent_messages ORDER BY date ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/parent/messages/read', async (req, res) => {
    const { studentId } = req.body;
    try {
        const pool = getPool();
        // Mark all messages FROM PARENT for this student as read
        await pool.query('UPDATE parent_messages SET is_read = 1 WHERE student_id = ? AND sender = ?', [studentId, 'PARENT']);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/parent/messages/:studentId', async (req, res) => {
    try {
        const pool = getPool();
        // Delete all messages for this conversation (thread)
        await pool.query('DELETE FROM parent_messages WHERE student_id = ?', [req.params.studentId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// STAFF TASKS
app.get('/api/staff-tasks', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM staff_tasks ORDER BY due_date ASC');
        const tasks = rows.map(r => {
            let d = r.data_json || {};
            if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
            return {
                ...d,
                id: r.id,
                title: r.title,
                description: r.description,
                assignedTo: r.assigned_to,
                type: r.type,
                dueDate: r.due_date,
                status: r.status,
                createdAt: r.created_at
            };
        });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/staff-tasks', async (req, res) => {
    const t = req.body;
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO staff_tasks (id, title, description, assigned_to, type, due_date, status, data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            title=VALUES(title), description=VALUES(description), assigned_to=VALUES(assigned_to), 
            type=VALUES(type), due_date=VALUES(due_date), status=VALUES(status), data_json=VALUES(data_json)
        `, [
            t.id, t.title, t.description, t.assignedTo,
            t.type || 'COMMISSION', t.dueDate || null,
            t.status || 'PENDING', JSON.stringify(t)
        ]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/staff-tasks/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM staff_tasks WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BOOKS
app.post('/api/books', async (req, res) => {
    const b = req.body;
    if (!useMySQL) {
        const data = readJSON();
        const index = data.books.findIndex(x => x.id === b.id);
        if (index >= 0) data.books[index] = b;
        else data.books.push(b);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO books (id, title, author, grade, category, data_json)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title=VALUES(title), author=VALUES(author), grade=VALUES(grade), category=VALUES(category), data_json=VALUES(data_json)
        `, [b.id, b.title, b.author, b.grade, b.category, JSON.stringify(b)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/books/:id', async (req, res) => {
    if (!useMySQL) {
        const data = readJSON();
        data.books = data.books.filter(b => b.id !== req.params.id);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query('DELETE FROM books WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Handle React Routing, return all requests to React app (Fixed for Express 5)
app.get(/^(.*)$/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist-app', 'index.html'));
});

// Initialize Storage (MySQL or JSON fallback) and start server
initStorage().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        if (useMySQL) {
            console.log('💾 Storage: MySQL Database');
        } else {
            console.log('💾 Storage: JSON File (database.json)');
            console.log('⚠️  MySQL not available - using file-based storage');
            console.log('   To use MySQL: Start XAMPP and run REPARAR_MYSQL.bat');
        }
    });
}).catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
// End of File