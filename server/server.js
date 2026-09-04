import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initDB, getPool } from './db.js';
import { runCleanAndBackup } from '../tools/clean_and_backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Request logging middleware (debug for 403 issue)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Content-Type: ${req.headers['content-type'] || 'none'} | Content-Length: ${req.headers['content-length'] || '0'}`);
    next();
});

app.use(express.json({ limit: '50mb' }));

// Parse text/plain as JSON (bypasses Hostinger WAF that blocks large application/json POSTs)
app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.startsWith('text/plain') && req.body === undefined) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                req.body = JSON.parse(body);
            } catch (e) {
                req.body = body;
            }
            next();
        });
    } else {
        next();
    }
});

// --- API ALIAS / BACKWARD COMPATIBILITY ---
// Map /api requests to /sirila-v1 prefix
app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
        const oldUrl = req.url;
        req.url = req.url.replace('/api/', '/sirila-v1/');
        console.log(`[API ALIAS] Remapped ${oldUrl} to ${req.url}`);
    }
    next();
});

// --- SERVE STATIC FRONTEND ---
const STATIC_ROOT = path.resolve(__dirname, '../dist-app');

// Serve static files from the dist-app directory
app.use(express.static(STATIC_ROOT));
app.use('/assets', express.static(path.join(STATIC_ROOT, 'assets')));

// Endpoint for checking if server is alive
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        storage: useMySQL ? 'MySQL' : 'JSON (Fallback)',
        dbHost: process.env.DB_HOST || process.env.MYSQLHOST ? 'Configured in Env' : 'Not Configured',
        dbName: process.env.DB_NAME || process.env.MYSQLDATABASE || 'N/A',
        mysqlConnection: useMySQL ? 'Active' : 'Failed',
        message: useMySQL ? 'System Healthy' : 'Warning: Using local JSON file instead of Cloud DB'
    });
});

// Historical Group Analysis Endpoint
app.get('/sirila-v1/group-history/:group', async (req, res) => {
    try {
        if (!useMySQL) return res.status(400).json({ error: 'MySQL is not active' });
        const pool = getPool();
        const [rows] = await pool.query('SELECT data_json FROM group_history_2025_2026 WHERE current_group = ?', [req.params.group]);
        if (rows.length === 0) return res.json(null);
        let data = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/sirila-v1/admin/clean-backup-2026', async (req, res) => {
    try {
        if (!useMySQL) return res.status(400).json({ error: 'MySQL is not active' });
        const result = await runCleanAndBackup();
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

import { runMigrate } from '../tools/migrate_2026_2027.js';
app.post('/sirila-v1/admin/migrate-2026', async (req, res) => {
    try {
        if (!useMySQL) return res.status(400).json({ error: 'MySQL is not active' });
        const result = await runMigrate();
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

import { repairBajas } from '../tools/repair_bajas_2026.js';
app.post('/sirila-v1/admin/repair-bajas', async (req, res) => {
    try {
        if (!useMySQL) return res.status(400).json({ error: 'MySQL is not active' });
        const result = await repairBajas();
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Diagnostic: Test POST endpoint
app.post('/sirila-v1/test-post', (req, res) => {
    console.log('[TEST POST] Received:', JSON.stringify(req.body).substring(0, 200));
    res.json({ success: true, receivedSize: JSON.stringify(req.body).length, timestamp: Date.now() });
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

        // Auto-reconcile student status if desynced between column and data_json
        try {
            const [syncResult] = await pool.query(`
                UPDATE students 
                SET status = JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.status'))
                WHERE data_json IS NOT NULL 
                  AND JSON_VALID(data_json)
                  AND JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.status')) IN ('INSCRITO', 'BAJA', 'TRASLADO')
                  AND status != JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.status'))
            `);
            if (syncResult && syncResult.changedRows > 0) {
                console.log(`🔄 Reconciled ${syncResult.changedRows} student status discrepancies between column and data_json.`);
            }
        } catch (rErr) {
            console.warn('Status reconciliation note:', rErr.message);
        }

        // Auto-sync Official 2026-2027 Calendar Events
        try {
            for (const ev of OFFICIAL_EVENTS_2026_2027) {
                await pool.query(`
                    INSERT INTO events (id, title, date, type, description, data_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    title=VALUES(title), date=VALUES(date), type=VALUES(type), description=VALUES(description), data_json=VALUES(data_json)
                `, [ev.id, ev.title, ev.date, ev.type, ev.description, JSON.stringify(ev)]);
            }
            console.log('📅 Calendario Oficial 2026-2027 sincronizado en base de datos.');
        } catch (evErr) {
            console.warn('Events sync note:', evErr.message);
        }
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
app.get('/sirila-v1/full-state', async (req, res) => {
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

            // Ensure status takes the latest valid status, reconciling if data_json has INSCRITO while column was left BAJA
            let studentStatus = row.status;
            if ((!studentStatus || (studentStatus === 'BAJA' && base.status === 'INSCRITO')) && base.status) {
                studentStatus = base.status;
            }
            if (!studentStatus) studentStatus = 'INSCRITO';

            return {
                ...base,
                id: row.id,
                name: row.name,
                curp: row.curp,
                status: studentStatus,
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
            if (typeof d === 'string') {
                try {
                    d = JSON.parse(d);
                } catch (e) {
                    console.error(`[CRITICAL] JSON Parse failed for assignment ${r.id}. Data might be truncated.`, e.message);
                    d = { id: r.id, title: r.title || "ERROR: Datos Corruptos", corrupt: true };
                }
            }

            // Keep lightweight assignment info for initial state, but preserve critical fields
            return {
                ...d,
                id: r.id,
                interactiveData: d.interactiveData ? {
                    type: d.interactiveData.type,
                    hasContent: true,
                    questions: d.interactiveData.questions,
                    minScoreToPass: d.interactiveData.minScoreToPass,
                    imageUrl: d.interactiveData.imageUrl && d.interactiveData.imageUrl.length > 100000 ? undefined : d.interactiveData.imageUrl,
                    interactiveZones: d.interactiveData.interactiveZones,
                    draggableItems: d.interactiveData.draggableItems,
                    gradingCriteria: d.interactiveData.gradingCriteria,
                    gameUrl: d.interactiveData.gameUrl,
                    videoUrl: d.interactiveData.videoUrl,
                    htmlContent: d.interactiveData.htmlContent && d.interactiveData.htmlContent.length > 50000 ? undefined : d.interactiveData.htmlContent
                } : null
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

        // CTE Games & Results
        let cteGames = [];
        let cteGameResults = [];
        let ctePresentations = [];
        let staffAttendanceRecords = [];
        try {
            const [cteGameRows] = await pool.query('SELECT * FROM cte_games');
            cteGames = cteGameRows.map(r => {
                let d = r.data_json || {};
                if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
                return { ...d, id: r.id };
            });
        } catch (e) { console.log('cte_games table not found, skipping'); }
        try {
            const [cteResultRows] = await pool.query('SELECT * FROM cte_game_results');
            cteGameResults = cteResultRows.map(r => {
                let d = r.data_json || {};
                if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
                return { ...d, id: r.id };
            });
        } catch (e) { console.log('cte_game_results table not found, skipping'); }
        try {
            const [ctePresRows] = await pool.query('SELECT * FROM cte_presentations');
            ctePresentations = ctePresRows.map(r => {
                let d = r.data_json || {};
                if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
                return { ...d, id: r.id };
            });
        } catch (e) { console.log('cte_presentations table not found, skipping'); }
        try {
            const [staffAttRows] = await pool.query('SELECT * FROM staff_attendance');
            staffAttendanceRecords = staffAttRows.map(r => {
                let d = r.data_json || {};
                if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { } }
                return { ...d, id: r.id };
            });
        } catch (e) { console.log('staff_attendance table not found, skipping'); }

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
            staffTasks: taskRows.map(r => ({ ...r, id: r.id })),
            books: bookRows.map(r => ({ ...r, id: r.id })),
            cteGames,
            cteGameResults,
            ctePresentations,
            staffAttendanceRecords,
            isEmpty: students.length === 0,
            isOptimized: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Endpoint to fetch avatars in small batches or for specific student
app.get('/sirila-v1/students/avatars', async (req, res) => {
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

// Eventos Oficiales SEP/SEPyC Sinaloa 2026-2027 (185 Días)
const OFFICIAL_EVENTS_2026_2027 = [
    { id: 'sep26_inicio', title: 'Inicio de Clases Ciclo 2026-2027', date: '2026-08-31', type: 'INICIO_FIN', description: 'Primer día de clases oficial del ciclo escolar 2026-2027' },
    { id: 'sep27_fin', title: 'Fin de Clases Ciclo 2026-2027', date: '2027-07-07', type: 'INICIO_FIN', description: 'Último día de clases del ciclo escolar 2026-2027' },
    { id: 'sep26_cte_int_1', title: 'CTE Fase Intensiva (Día 1)', date: '2026-08-24', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },
    { id: 'sep26_cte_int_2', title: 'CTE Fase Intensiva (Día 2)', date: '2026-08-25', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },
    { id: 'sep26_cte_int_3', title: 'CTE Fase Intensiva (Día 3)', date: '2026-08-26', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },
    { id: 'sep26_cte_int_4', title: 'CTE Fase Intensiva (Día 4)', date: '2026-08-27', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },
    { id: 'sep26_cte_int_5', title: 'CTE Fase Intensiva (Día 5)', date: '2026-08-28', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },
    { id: 'sep26_concientizacion', title: 'Jornada contra el Abuso Sexual Infantil', date: '2026-09-07', type: 'CONCIENTIZACION', description: 'Jornada de concientización sobre la gravedad del abuso sexual y el maltrato infantil' },
    { id: 'sep26_inscripciones', title: 'Periodo de Inscripciones y Reinscripciones', date: '2026-09-01', type: 'INSCRIPCIONES', description: 'Periodo oficial de inscripciones y reinscripciones escolares' },
    { id: 'sep26_cte1', title: 'CTE 1ª Sesión Ordinaria', date: '2026-09-25', type: 'CTE', description: 'Consejo Técnico Escolar - 1ª Sesión Ordinaria' },
    { id: 'sep26_cte2', title: 'CTE 2ª Sesión Ordinaria', date: '2026-10-30', type: 'CTE', description: 'Consejo Técnico Escolar - 2ª Sesión Ordinaria' },
    { id: 'sep26_cte3', title: 'CTE 3ª Sesión Ordinaria', date: '2026-11-27', type: 'CTE', description: 'Consejo Técnico Escolar - 3ª Sesión Ordinaria' },
    { id: 'sep27_cte4', title: 'CTE 4ª Sesión Ordinaria', date: '2027-01-29', type: 'CTE', description: 'Consejo Técnico Escolar - 4ª Sesión Ordinaria' },
    { id: 'sep27_cte5', title: 'CTE 5ª Sesión Ordinaria', date: '2027-02-26', type: 'CTE', description: 'Consejo Técnico Escolar - 5ª Sesión Ordinaria' },
    { id: 'sep27_cte6', title: 'CTE 6ª Sesión Ordinaria', date: '2027-04-30', type: 'CTE', description: 'Consejo Técnico Escolar - 6ª Sesión Ordinaria' },
    { id: 'sep27_cte7', title: 'CTE 7ª Sesión Ordinaria', date: '2027-05-28', type: 'CTE', description: 'Consejo Técnico Escolar - 7ª Sesión Ordinaria' },
    { id: 'sep27_cte8', title: 'CTE 8ª Sesión Ordinaria', date: '2027-06-25', type: 'CTE', description: 'Consejo Técnico Escolar - 8ª Sesión Ordinaria' },
    { id: 'sep26_indep', title: 'Suspensión: Independencia de México', date: '2026-09-16', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
    { id: 'sep26_muertos', title: 'Suspensión: Día de Muertos', date: '2026-11-02', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
    { id: 'sep26_revolucion', title: 'Suspensión: Revolución Mexicana', date: '2026-11-16', type: 'SUSPENSION', description: 'Conmemoración del 20 de noviembre' },
    { id: 'sep26_navidad', title: 'Suspensión: Navidad', date: '2026-12-25', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
    { id: 'sep27_anio_nuevo', title: 'Suspensión: Año Nuevo', date: '2027-01-01', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
    { id: 'sep27_reyes', title: 'Suspensión: Día de Reyes', date: '2027-01-06', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
    { id: 'sep27_constitucion', title: 'Suspensión: Constitución Mexicana', date: '2027-02-01', type: 'SUSPENSION', description: 'Conmemoración del 5 de febrero' },
    { id: 'sep27_juarez', title: 'Suspensión: Natalicio Benito Juárez', date: '2027-03-15', type: 'SUSPENSION', description: 'Conmemoración del 21 de marzo' },
    { id: 'sep27_puebla', title: 'Suspensión: Batalla de Puebla', date: '2027-05-05', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
    { id: 'sep26_eval1', title: 'Entrega de Boletas - Trimestre 1', date: '2026-11-23', type: 'EVALUACION', description: 'Registro y comunicación de resultados de evaluación' },
    { id: 'sep27_eval2', title: 'Entrega de Boletas - Trimestre 2', date: '2027-03-16', type: 'EVALUACION', description: 'Registro y comunicación de resultados de evaluación' },
    { id: 'sep27_eval3', title: 'Entrega de Boletas - Trimestre 3', date: '2027-07-05', type: 'EVALUACION', description: 'Registro y comunicación de resultados de evaluación final' },
    { id: 'sep27_preinscripciones', title: 'Periodo de Preinscripciones 2027-2028', date: '2027-02-02', type: 'INSCRIPCIONES', description: 'Preinscripción a Preescolar, 1° Primaria y 1° Secundaria' },
    { id: 'sep26_vac_inv', title: 'Vacaciones de Invierno', date: '2026-12-21', type: 'VACACIONES', description: 'Periodo vacacional de invierno' },
    { id: 'sep27_regreso_inv', title: 'Regreso a Clases (Invierno)', date: '2027-01-11', type: 'INICIO_FIN', description: 'Reanudación de actividades escolares' },
    { id: 'sep27_vac_sem', title: 'Vacaciones de Semana Santa', date: '2027-03-22', type: 'VACACIONES', description: 'Periodo vacacional de Semana Santa' },
    { id: 'sep27_regreso_sem', title: 'Regreso a Clases (Semana Santa)', date: '2027-04-05', type: 'INICIO_FIN', description: 'Reanudación de actividades escolares' },
    { id: 'sep26_grito', title: 'Grito de Independencia', date: '2026-09-15', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
    { id: 'sep26_raza', title: 'Día de la Raza', date: '2026-10-12', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
    { id: 'sep26_rev_civico', title: 'Aniversario de la Revolución Mexicana', date: '2026-11-20', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
    { id: 'sep27_const_civico', title: 'Aniversario de la Constitución de 1917', date: '2027-02-05', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
    { id: 'sep27_bandera', title: 'Día de la Bandera', date: '2027-02-24', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
    { id: 'sep27_mujer', title: 'Día Internacional de la Mujer', date: '2027-03-08', type: 'CONMEMORATIVO', description: 'Día conmemorativo y de reflexión' },
    { id: 'sep27_petroleo', title: 'Expropiación Petrolera', date: '2027-03-18', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
    { id: 'sep27_juarez_civico', title: 'Natalicio de Benito Juárez', date: '2027-03-21', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
    { id: 'sep27_nino', title: 'Día del Niño', date: '2027-04-30', type: 'CONMEMORATIVO', description: 'Celebración escolar del Día del Niño' },
    { id: 'sep27_trabajo', title: 'Día del Trabajo', date: '2027-05-01', type: 'CONMEMORATIVO', description: 'Día de descanso internacional' },
    { id: 'sep27_maestro', title: 'Día del Maestro', date: '2027-05-15', type: 'CONMEMORATIVO', description: 'Celebración del personal docente' },
    { id: 'sep27_receso', title: 'Receso de Clases', date: '2027-07-08', type: 'VACACIONES', description: 'Receso oficial de clases de fin de ciclo' }
];

// School Calendar helpers 2026-2027
const SCHOOL_PERIODS = [
    {
        id: 'P1',
        name: 'Primer Periodo (Trimestre 1)',
        startDate: '2026-08-31',
        endDate: '2026-11-27'
    },
    {
        id: 'P2',
        name: 'Segundo Periodo (Trimestre 2)',
        startDate: '2026-11-30',
        endDate: '2027-03-19'
    },
    {
        id: 'P3',
        name: 'Tercer Periodo (Trimestre 3)',
        startDate: '2027-04-05',
        endDate: '2027-07-07'
    }
];

const SUSPENSION_DAYS = {
    // Primer Periodo
    '2026-09-16': 'Aniversario de la Independencia de México (Suspensión Oficial)',
    '2026-09-25': 'Consejo Técnico Escolar - 1ª Sesión Ordinaria',
    '2026-10-30': 'Consejo Técnico Escolar - 2ª Sesión Ordinaria',
    '2026-11-02': 'Día de Muertos (Suspensión Oficial)',
    '2026-11-16': 'Conmemoración del 20 de noviembre (Suspensión Oficial)',
    '2026-11-27': 'Consejo Técnico Escolar - 3ª Sesión Ordinaria',

    // Vacaciones de Invierno
    '2026-12-21': 'Vacaciones de Invierno',
    '2026-12-22': 'Vacaciones de Invierno',
    '2026-12-23': 'Vacaciones de Invierno',
    '2026-12-24': 'Vacaciones de Invierno',
    '2026-12-25': 'Navidad (Suspensión Oficial)',
    '2026-12-28': 'Vacaciones de Invierno',
    '2026-12-29': 'Vacaciones de Invierno',
    '2026-12-30': 'Vacaciones de Invierno',
    '2026-12-31': 'Vacaciones de Invierno',
    '2027-01-01': 'Año Nuevo (Suspensión Oficial)',
    '2027-01-04': 'Vacaciones de Invierno',
    '2027-01-05': 'Vacaciones de Invierno',
    '2027-01-06': 'Día de Reyes (Suspensión Oficial)',
    '2027-01-07': 'Taller Intensivo para Docentes',
    '2027-01-08': 'Taller Intensivo para Docentes',

    // Segundo Periodo
    '2027-01-29': 'Consejo Técnico Escolar - 4ª Sesión Ordinaria',
    '2027-02-01': 'Conmemoración del 5 de febrero (Suspensión Oficial)',
    '2027-02-26': 'Consejo Técnico Escolar - 5ª Sesión Ordinaria',
    '2027-03-15': 'Conmemoración del 21 de marzo (Suspensión Oficial)',

    // Vacaciones de Semana Santa
    '2027-03-22': 'Vacaciones de Semana Santa',
    '2027-03-23': 'Vacaciones de Semana Santa',
    '2027-03-24': 'Vacaciones de Semana Santa',
    '2027-03-25': 'Vacaciones de Semana Santa',
    '2027-03-26': 'Vacaciones de Semana Santa',
    '2027-03-29': 'Vacaciones de Semana Santa',
    '2027-03-30': 'Vacaciones de Semana Santa',
    '2027-03-31': 'Vacaciones de Semana Santa',
    '2027-04-01': 'Vacaciones de Semana Santa',
    '2027-04-02': 'Vacaciones de Semana Santa',

    // Tercer Periodo
    '2027-04-30': 'Consejo Técnico Escolar - 6ª Sesión Ordinaria',
    '2027-05-05': 'Batalla de Puebla (Suspensión Oficial)',
    '2027-05-28': 'Consejo Técnico Escolar - 7ª Sesión Ordinaria',
    '2027-06-25': 'Consejo Técnico Escolar - 8ª Sesión Ordinaria'
};

function getSchoolPeriod(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    for (const period of SCHOOL_PERIODS) {
        const start = new Date(period.startDate + 'T00:00:00');
        const end = new Date(period.endDate + 'T00:00:00');
        if (date >= start && date <= end) {
            return period;
        }
    }
    return null;
}

function isSchoolDay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }
    if (!getSchoolPeriod(dateString)) {
        return false;
    }
    if (SUSPENSION_DAYS[dateString]) {
        return false;
    }
    return true;
}

// Endpoint to fetch Honor Roll (Ponderando promedio académico, porcentaje de avance y actividades autocalificables)
app.get('/sirila-v1/honor-roll', async (req, res) => {
    try {
        let students = [];
        let assignments = [];
        let schoolConfig = null;

        if (!useMySQL) {
            const data = readJSON();
            students = data.students || [];
            assignments = data.assignments || [];
            schoolConfig = data.schoolConfig;
        } else {
            const pool = getPool();
            const [rows] = await pool.query('SELECT id, name, avatar, behavior_points, status, data_json FROM students');
            const [aRows] = await pool.query('SELECT id, title, type, target_group, data_json FROM assignments');
            assignments = aRows.map(r => {
                let base = {};
                try { base = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : (r.data_json || {}); } catch(e){}
                return { ...base, id: r.id, title: r.title, type: r.type, targetGroup: r.target_group };
            });

            const [configRows] = await pool.query('SELECT * FROM school_config WHERE config_key = ?', ['main_config']);
            if (configRows.length > 0) {
                try {
                    const val = configRows[0].config_value;
                    schoolConfig = typeof val === 'string' ? JSON.parse(val) : val;
                } catch (e) { schoolConfig = {}; }
            }

            students = rows.map(r => {
                let base = {};
                try {
                    base = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : (r.data_json || {});
                } catch (e) { }
                return {
                    ...base,
                    id: r.id,
                    name: r.name,
                    avatar: r.avatar,
                    status: r.status,
                    behaviorPoints: r.behavior_points || 0
                };
            });
        }

        if (req.query.group) {
            const targetGroup = req.query.group.trim().toLowerCase();
            students = students.filter(s => s.group && s.group.trim().toLowerCase() === targetGroup);
        }

        const calculateNEMAvg = (s) => {
            const getTrimesterAvg = (g) => {
                if (!g) return 0;
                if (typeof g === 'number') return g;
                if (typeof g === 'string') return parseFloat(g) || 0;
                if (typeof g === 'object') {
                    const suma = Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0);
                    return suma / 4;
                }
                return 0;
            };

            const trimAvgs = (s.grades || []).map(getTrimesterAvg);
            const activeTrims = trimAvgs.filter(a => a > 0);
            return activeTrims.length > 0 ? activeTrims.reduce((a, b) => a + b, 0) / activeTrims.length : 0;
        };

        const honorRoll = students
            .filter(s => s.status !== 'BAJA')
            .map(s => {
                const academicAvg = calculateNEMAvg(s);

                // Tareas y avance del alumno
                const studentGroup = (s.group || '').trim().toLowerCase();
                const relevantAssignments = assignments.filter(a => {
                    if (!a.targetGroup) return true;
                    const tg = a.targetGroup.trim().toLowerCase();
                    return tg === 'global' || tg === 'todos' || tg === studentGroup;
                });

                const totalAssignments = relevantAssignments.length;
                const completedIds = Array.isArray(s.completedAssignmentIds) ? s.completedAssignmentIds : [];
                const completedCount = completedIds.length;
                const progressPercentage = totalAssignments > 0
                    ? Math.min(100, Math.round((completedCount / totalAssignments) * 100))
                    : (completedCount > 0 ? 100 : 0);

                // Calificaciones de actividades autocalificables
                const results = (s.assignmentResults && typeof s.assignmentResults === 'object') ? s.assignmentResults : {};
                const interactiveScores = Object.values(results).filter(v => typeof v === 'number' && v >= 0 && v <= 10);
                const interactiveAvg = interactiveScores.length > 0
                    ? Number((interactiveScores.reduce((a, b) => a + b, 0) / interactiveScores.length).toFixed(1))
                    : 0;

                // Cálculo ponderado del puntaje de honor (escala 0-10)
                const progressScore = progressPercentage / 10;
                let honorScore = 0;
                if (academicAvg > 0) {
                    if (interactiveAvg > 0) {
                        honorScore = (academicAvg * 0.50) + (interactiveAvg * 0.30) + (progressScore * 0.20);
                    } else {
                        honorScore = (academicAvg * 0.70) + (progressScore * 0.30);
                    }
                } else {
                    // Al inicio del ciclo sin calificaciones trimestrales aún capturadas
                    if (interactiveAvg > 0) {
                        honorScore = (interactiveAvg * 0.60) + (progressScore * 0.40);
                    } else {
                        honorScore = progressScore;
                    }
                }
                honorScore = Number(honorScore.toFixed(1));

                let avatar = s.avatar;
                if ((!avatar || avatar === "PENDING_LOAD") && s.data_json) {
                    try {
                        const parsed = typeof s.data_json === 'string' ? JSON.parse(s.data_json) : (s.data_json || {});
                        avatar = parsed.avatar;
                    } catch (e) { }
                }

                return {
                    id: s.id,
                    name: s.name,
                    avatar: (avatar && avatar.length > 100) ? avatar : "",
                    behaviorPoints: s.behaviorPoints || 0,
                    average: honorScore > 0 ? honorScore : (academicAvg > 0 ? Number(academicAvg.toFixed(1)) : 0),
                    honorScore: honorScore,
                    academicAvg: Number(academicAvg.toFixed(1)),
                    interactiveAvg: interactiveAvg,
                    progressPercentage: progressPercentage
                };
            })
            .sort((a, b) => {
                if (b.honorScore !== a.honorScore) return b.honorScore - a.honorScore;
                if (b.average !== a.average) return b.average - a.average;
                if (b.behaviorPoints !== a.behaviorPoints) return b.behaviorPoints - a.behaviorPoints;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 10);

        res.json(honorRoll);
    } catch (error) {
        console.error("Honor Roll fetch error:", error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Endpoint to fetch specific assignment data (interactive worksheets)
app.get('/sirila-v1/assignments/:id', async (req, res) => {
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
app.post('/sirila-v1/sync', async (req, res) => {
    console.log('Received Sync Request. Processing payload...');
    const { students, assignments, events, behaviorLogs, financeEvents, schoolConfig } = req.body;

    // DEBUG LOGS
    const payloadSize = JSON.stringify(req.body).length;
    console.log(`Payload Size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

    const pool = getPool();

    // 0. GHOST EFFECT PREVENTION
    try {
        const [configRows] = await pool.query("SELECT config_value FROM school_config WHERE config_key = 'main_config'");
        if (configRows.length > 0 && schoolConfig) {
            let dbConfig = JSON.parse(configRows[0].config_value);
            if (dbConfig.schoolYear === "2026-2027" && schoolConfig.schoolYear !== "2026-2027") {
                console.warn("BLOCKED SYNC: Frontend sent stale data from previous school year.");
                return res.status(409).json({ 
                    error: "CONFLICTO DE DATOS: La base de datos ya está en el ciclo 2026-2027 pero tu navegador tiene información desactualizada. Por favor, recarga la página completamente para evitar borrar la migración." 
                });
            }
        }
    } catch (e) {
        console.error("Error checking ghost effect", e);
    }

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
app.post('/sirila-v1/students', async (req, res) => {
    const s = req.body;
    if (!useMySQL) {
        const data = readJSON();
        const idx = (data.students || []).findIndex(st => st.id === s.id);
        if (idx >= 0) {
            data.students[idx] = s;
        } else {
            if (!data.students) data.students = [];
            data.students.push(s);
        }
        writeJSON(data);
        return res.json({ success: true });
    }
    const pool = getPool();
    try {
        // Remove PENDING_LOAD from data_json so it doesn't overwrite real avatar in DB
        const studentForJson = { ...s };
        if (studentForJson.avatar === 'PENDING_LOAD') {
            delete studentForJson.avatar;
        }

        // Upsert (Insert or Update)
        await pool.query(`
      INSERT INTO students (id, curp, name, sex, birth_date, enrollment_date, status, guardian_name, guardian_phone, avatar, repeater, bap, usaer, behavior_points, annual_fee_paid, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name=VALUES(name),
      curp=VALUES(curp),
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
            s.status || 'INSCRITO', s.guardianName || null, s.guardianPhone || null, s.avatar || null,
            !!s.repeater, s.bap || 'NINGUNA', !!s.usaer, s.behaviorPoints || 0, !!s.annualFeePaid,
            JSON.stringify(studentForJson)
        ]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/sirila-v1/students/:id', async (req, res) => {
    if (!useMySQL) {
        const data = readJSON();
        data.students = (data.students || []).filter(st => st.id !== req.params.id);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ASSIGNMENTS
app.get('/sirila-v1/assignments', async (req, res) => {
    if (!useMySQL) {
        const data = readJSON();
        return res.json(data.assignments || []);
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM assignments');
        const assignments = rows.map(r => {
            let d = r.data_json || {};
            if (typeof d === 'string') {
                try {
                    d = JSON.parse(d);
                } catch (e) {
                    console.error(`[CRITICAL] JSON Parse failed in /sirila-v1/assignments for ${r.id}`, e.message);
                    d = { id: r.id, title: "Error de carga (Datos truncados)", corrupt: true };
                }
            }

            // OPTIMIZATION: Strip huge payloads from the list view
            // The frontend (ParentsPortal) lazily loads detail via getAssignmentById
            if (d.interactiveData) {
                if (d.interactiveData.htmlContent && d.interactiveData.htmlContent.length > 50000) {
                    d.interactiveData.htmlContent = undefined;
                    d.interactiveData.hasContent = true;
                    d.isOptimized = true;
                }
                if (d.interactiveData.imageUrl && d.interactiveData.imageUrl.length > 100000) {
                    d.interactiveData.imageUrl = undefined;
                    d.interactiveData.hasContent = true;
                    d.isOptimized = true;
                }
            }

            return { ...d, id: r.id }; // Ensure ID from column is used
        });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/sirila-v1/assignments/:id', async (req, res) => {
    const id = req.params.id;
    if (!useMySQL) {
        const data = readJSON();
        const a = (data.assignments || []).find(a => a.id === id);
        return a ? res.json(a) : res.status(404).json({ error: 'No encontrado' });
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM assignments WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

        const r = rows[0];
        let d = r.data_json || {};
        if (typeof (d || '') === 'string') {
            try {
                d = JSON.parse(d);
            } catch (e) {
                console.error(`[CRITICAL] JSON Parse failed for single assignment ${id}`, e.message);
                return res.status(500).json({ error: "Datos corruptos en la base de datos" });
            }
        }

        // DEBUG: Log if interactiveData is missing
        if (!d.interactiveData) {
            console.error(`[WARNING] Assignment ${id} "${r.title}" has NO interactiveData in database!`);
            console.error(`[WARNING] Full data_json:`, d);
        }

        res.json({ ...d, id: r.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/sirila-v1/assignments', async (req, res) => {
    const a = req.body;
    const payloadSize = JSON.stringify(a).length;
    console.log(`[ASSIGNMENT] Attempting to save activity: "${a.title}" (ID: ${a.id}). Payload size: ${(payloadSize / 1024).toFixed(2)} KB`);
    console.log(`[ASSIGNMENT] Activity type: ${a.type}`);
    console.log(`[ASSIGNMENT] Has interactiveData: ${!!a.interactiveData}`);
    if (a.interactiveData) {
        console.log(`[ASSIGNMENT] interactiveData.type: ${a.interactiveData.type}`);
        console.log(`[ASSIGNMENT] htmlContent length: ${a.interactiveData.htmlContent?.length || 0}`);
    }

    try {
        const pool = getPool();
        await pool.query(`
      INSERT INTO assignments (id, title, due_date, data_json)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      title=VALUES(title), due_date=VALUES(due_date), data_json=VALUES(data_json)
    `, [a.id, a.title, a.dueDate || null, JSON.stringify(a)]);

        console.log(`✅ Activity saved successfully: ${a.id}`);
        res.json({ success: true });
    } catch (error) {
        console.error(`❌ DB Error saving assignment ${a.id}:`, error.message);
        console.error('SQL State:', error.sqlState, 'Code:', error.code);

        // Check for common MySQL errors
        if (error.code === 'ER_NET_PACKET_TOO_LARGE') {
            res.status(413).json({ error: 'La actividad es demasiado grande para el servidor (Límite de paquete excedido).' });
        } else if (error.code === 'ER_DATA_TOO_LONG') {
            res.status(400).json({ error: 'Los datos son demasiado largos para la columna de la base de datos.' });
        } else {
            res.status(500).json({ error: `Error en la base de datos: ${error.message}` });
        }
    }
});

app.delete('/sirila-v1/assignments/:id', async (req, res) => {
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
app.get('/sirila-v1/events', async (req, res) => {
    if (!useMySQL) {
        const data = readJSON();
        return res.json(data.events || []);
    }
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM events');
        // Parse JSON if needed, or if stored as separate columns, fine. 
        // My schema has columns + data_json.
        // Let's return the structured data.
        const events = rows.map(r => {
            let base = r.data_json || {};
            if (typeof base === 'string') {
                try { base = JSON.parse(base); } catch (e) { }
            }
            return { ...base, id: r.id, title: r.title, date: r.date, type: r.type, description: r.description };
        });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/sirila-v1/events', async (req, res) => {
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

app.delete('/sirila-v1/events/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BEHAVIOR
app.post('/sirila-v1/behavior', async (req, res) => {
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

app.delete('/sirila-v1/behavior/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM behavior_logs WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/sirila-v1/behavior/student/:studentId', async (req, res) => {
    if (!useMySQL) {
        const data = readJSON();
        const logs = (data.behaviorLogs || []).filter(l => l.studentId === req.params.studentId);
        return res.json(logs);
    }
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
app.post('/sirila-v1/finance', async (req, res) => {
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

app.delete('/sirila-v1/finance/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM finance_events WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BULK IMPORT PAYMENTS DATA (For local or production sync)
app.post('/sirila-v1/import-payments-data', async (req, res) => {
    const { payments } = req.body;
    if (!Array.isArray(payments)) {
        return res.status(400).json({ error: 'payments must be an array' });
    }

    try {
        console.log(`[API IMPORT] Received ${payments.length} payment records`);
        
        if (!useMySQL) {
            const data = readJSON();
            let updatedCount = 0;
            const updatedStudents = data.students.map(s => {
                const curp = (s.curp || '').trim().toUpperCase();
                const name = (s.name || '').trim().toUpperCase();
                const match = payments.find(p => p.curp.trim().toUpperCase() === curp || p.name.trim().toUpperCase() === name);
                if (match) {
                    updatedCount++;
                    s.annualFeePaid = !!match.annualFeePaid;
                    s.annualFeeStatus = match.annualFeeStatus;
                    s.annualFeeAbono = match.annualFeeAbono;
                    s.annualFeeTotal = match.annualFeeTotal;
                    s.tieneHermanos = !!match.tieneHermanos;
                    if (match.siblingGrade) s.siblingGrade = String(match.siblingGrade);
                    
                    if (match.guardianName && match.guardianName.toUpperCase() !== 'N/A') {
                        if (!s.guardianName || ['', 'N/A', 'NONE', 'NULL'].includes(s.guardianName.toUpperCase())) {
                            s.guardianName = match.guardianName;
                        }
                    }
                    if (match.guardianPhone && match.guardianPhone.toUpperCase() !== 'N/A') {
                        if (!s.guardianPhone || ['', 'N/A', 'NONE', 'NULL'].includes(s.guardianPhone.toUpperCase())) {
                            s.guardianPhone = String(match.guardianPhone);
                        }
                    }
                }
                return s;
            });
            data.students = updatedStudents;
            writeJSON(data);
            return res.json({ success: true, message: `Updated ${updatedCount} students in JSON fallback storage.` });
        }

        const pool = getPool();
        const [dbStudents] = await pool.query("SELECT id, curp, name, guardian_name, guardian_phone, data_json FROM students");
        let updatedCount = 0;
        
        for (const s of dbStudents) {
            const curp = (s.curp || '').trim().toUpperCase();
            const name = (s.name || '').trim().toUpperCase();
            const match = payments.find(p => p.curp.trim().toUpperCase() === curp || p.name.trim().toUpperCase() === name);
            if (match) {
                updatedCount++;
                const isPaid = match.annualFeePaid ? 1 : 0;
                
                let finalTutorName = s.guardian_name || '';
                if (match.guardianName && match.guardianName.toUpperCase() !== 'N/A') {
                    if (!finalTutorName || ['', 'N/A', 'NONE', 'NULL'].includes(finalTutorName.toUpperCase())) {
                        finalTutorName = match.guardianName;
                    }
                }
                let finalTutorPhone = s.guardian_phone || '';
                if (match.guardianPhone && match.guardianPhone.toUpperCase() !== 'N/A') {
                    if (!finalTutorPhone || ['', 'N/A', 'NONE', 'NULL'].includes(finalTutorPhone.toUpperCase())) {
                        finalTutorPhone = String(match.guardianPhone);
                    }
                }

                let studentData = {};
                try {
                    studentData = typeof s.data_json === 'string' ? JSON.parse(s.data_json) : (s.data_json || {});
                } catch(e) { studentData = {}; }

                studentData.annualFeePaid = !!match.annualFeePaid;
                studentData.annualFeeStatus = match.annualFeeStatus;
                studentData.annualFeeAbono = match.annualFeeAbono;
                studentData.annualFeeTotal = match.annualFeeTotal;
                studentData.tieneHermanos = !!match.tieneHermanos;
                if (match.siblingGrade) studentData.siblingGrade = String(match.siblingGrade);
                studentData.guardianName = finalTutorName;
                studentData.guardianPhone = finalTutorPhone;

                await pool.query(`
                    UPDATE students
                    SET annual_fee_paid = ?,
                        guardian_name = ?,
                        guardian_phone = ?,
                        data_json = ?
                    WHERE id = ?
                `, [isPaid, finalTutorName, finalTutorPhone, JSON.stringify(studentData), s.id]);
            }
        }
        
        res.json({ success: true, message: `Updated ${updatedCount} students in MySQL database.` });
    } catch (error) {
        console.error('[API IMPORT ERROR]', error.message);
        res.status(500).json({ error: error.message });
    }
});

// CONFIG
app.post('/sirila-v1/config', async (req, res) => {
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
// Since we store attendance inside the Student JSON/Object in the frontend, updating the student calls POST /sirila-v1/students.
// But for efficiency, we might want a specific attendance endpoint.
// For now, let's rely on POST /sirila-v1/students to update the whole student record (including new attendance).
// This generates more traffic but ensures consistency with the current frontend 'Student' object structure.

// NOTIFICATIONS
app.get('/sirila-v1/notifications', async (req, res) => {
    if (!useMySQL) {
        const data = readJSON();
        const { studentId } = req.query;
        let list = (data.notifications || []).filter(n => !n.studentId || n.studentId === studentId);
        return res.json(list);
    }
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

app.post('/sirila-v1/notifications', async (req, res) => {
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

app.delete('/sirila-v1/notifications/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/sirila-v1/notifications/:id/read', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/sirila-v1/parent/login', async (req, res) => {
    let { loginId } = req.body;
    loginId = (loginId || '').trim();
    if (!loginId) {
        return res.status(400).json({ success: false, message: 'El ID de acceso es obligatorio.' });
    }
    const loginIdUpper = loginId.toUpperCase();
    console.log(`[Parent Login] Attempt for: "${loginId}" (Upper: "${loginIdUpper}")`);

    if (!useMySQL) {
        const data = readJSON();
        const matches = (data.students || []).filter(s =>
            s.id === loginId ||
            (s.curp || '').toUpperCase() === loginIdUpper ||
            s.guardianPhone === loginId
        );
        if (matches.length > 0) {
            const schoolConfig = data.schoolConfig;
            if (matches.length === 1) return res.json({ success: true, student: matches[0], schoolConfig });
            return res.json({ success: true, multiple: true, students: matches, schoolConfig });
        }
        return res.status(401).json({ success: false, message: 'No se encontraron alumnos vinculados.' });
    }

    try {
        const pool = getPool();
        // Search by CURP, ID, or Phone Number
        const [rows] = await pool.query(
            'SELECT * FROM students WHERE curp = ? OR curp = ? OR id = ? OR guardian_phone = ?',
            [loginId, loginIdUpper, loginId, loginId]
        );

        if (rows.length > 0) {
            let schoolConfig = null;
            const [configRows] = await pool.query('SELECT * FROM school_config WHERE config_key = ?', ['main_config']);
            if (configRows.length > 0) {
                try {
                    const val = configRows[0].config_value;
                    schoolConfig = typeof val === 'string' ? JSON.parse(val) : val;
                } catch (e) { schoolConfig = {}; }
            }

            const students = rows.map(student => {
                let parsed = student.data_json;
                if (typeof parsed === 'string') {
                    try {
                        parsed = JSON.parse(parsed);
                        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                    } catch (e) { parsed = {}; }
                }
                if (!parsed || typeof parsed !== 'object') parsed = {};

                return {
                    ...parsed,
                    id: student.id,
                    name: student.name,
                    curp: student.curp,
                    group: student.group || parsed.group,
                    avatar: student.avatar || parsed.avatar,
                    attendance: parsed.attendance || {},
                    completedAssignmentIds: Array.isArray(parsed.completedAssignmentIds) ? parsed.completedAssignmentIds : [],
                    behaviorPoints: student.behavior_points !== undefined ? student.behavior_points : (parsed.behaviorPoints || 0)
                };
            });

            // If only one student, return directly as before for backward compatibility
            // If multiple, return the list for selection
            if (students.length === 1) {
                res.json({ success: true, student: students[0], schoolConfig });
            } else {
                res.json({ success: true, multiple: true, students, schoolConfig });
            }
        } else {
            res.status(401).json({ success: false, message: 'No se encontraron alumnos vinculados a este identificador.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// PARENT MESSAGES
app.get('/sirila-v1/parent/messages', async (req, res) => {
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

app.post('/sirila-v1/parent/messages', async (req, res) => {
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

app.get('/sirila-v1/parent/all-messages', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM parent_messages ORDER BY date ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/sirila-v1/parent/messages/read', async (req, res) => {
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

app.delete('/sirila-v1/parent/messages/:studentId', async (req, res) => {
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
app.get('/sirila-v1/staff-tasks', async (req, res) => {
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

app.post('/sirila-v1/staff-tasks', async (req, res) => {
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

app.delete('/sirila-v1/staff-tasks/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM staff_tasks WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BOOKS
app.post('/sirila-v1/books', async (req, res) => {
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

app.delete('/sirila-v1/books/:id', async (req, res) => {
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

// --- CTE Games ---
app.post('/sirila-v1/cte-games', async (req, res) => {
    const g = req.body;
    if (!useMySQL) {
        const data = readJSON();
        if (!data.cteGames) data.cteGames = [];
        const index = data.cteGames.findIndex(x => x.id === g.id);
        if (index >= 0) data.cteGames[index] = g;
        else data.cteGames.push(g);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO cte_games (id, title, game_type, data_json)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title=VALUES(title), game_type=VALUES(game_type), data_json=VALUES(data_json)
        `, [g.id, g.title, g.type, JSON.stringify(g)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/sirila-v1/cte-games/:id', async (req, res) => {
    if (!useMySQL) {
        const data = readJSON();
        if (data.cteGames) data.cteGames = data.cteGames.filter(g => g.id !== req.params.id);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query('DELETE FROM cte_games WHERE id = ?', [req.params.id]);
        await pool.query('DELETE FROM cte_game_results WHERE game_id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- CTE Game Results ---
app.post('/sirila-v1/cte-game-results', async (req, res) => {
    const r = req.body;
    if (!useMySQL) {
        const data = readJSON();
        if (!data.cteGameResults) data.cteGameResults = [];
        const index = data.cteGameResults.findIndex(x => x.id === r.id);
        if (index >= 0) data.cteGameResults[index] = r;
        else data.cteGameResults.push(r);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO cte_game_results (id, game_id, staff_id, score, data_json)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            game_id=VALUES(game_id), staff_id=VALUES(staff_id), score=VALUES(score), data_json=VALUES(data_json)
        `, [r.id, r.gameId, r.staffId, r.score, JSON.stringify(r)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- CTE Presentations ---
app.post('/sirila-v1/cte-presentations', async (req, res) => {
    const p = req.body;
    if (!useMySQL) {
        const data = readJSON();
        if (!data.ctePresentations) data.ctePresentations = [];
        const index = data.ctePresentations.findIndex(x => x.id === p.id);
        if (index >= 0) data.ctePresentations[index] = p;
        else data.ctePresentations.push(p);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO cte_presentations (id, title, pres_date, data_json)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title=VALUES(title), pres_date=VALUES(pres_date), data_json=VALUES(data_json)
        `, [p.id, p.title, p.date, JSON.stringify(p)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/sirila-v1/cte-presentations/:id', async (req, res) => {
    if (!useMySQL) {
        const data = readJSON();
        if (data.ctePresentations) data.ctePresentations = data.ctePresentations.filter(p => p.id !== req.params.id);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query('DELETE FROM cte_presentations WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Staff Attendance Records ---
app.post('/sirila-v1/staff-attendance', async (req, res) => {
    const r = req.body;
    if (!useMySQL) {
        const data = readJSON();
        if (!data.staffAttendanceRecords) data.staffAttendanceRecords = [];
        const index = data.staffAttendanceRecords.findIndex(x => x.id === r.id);
        if (index >= 0) data.staffAttendanceRecords[index] = r;
        else data.staffAttendanceRecords.push(r);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query(`
            INSERT INTO staff_attendance (id, title, att_date, data_json)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title=VALUES(title), att_date=VALUES(att_date), data_json=VALUES(data_json)
        `, [r.id, r.title, r.date, JSON.stringify(r)]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/sirila-v1/staff-attendance/:id', async (req, res) => {
    if (!useMySQL) {
        const data = readJSON();
        if (data.staffAttendanceRecords) data.staffAttendanceRecords = data.staffAttendanceRecords.filter(r => r.id !== req.params.id);
        writeJSON(data);
        return res.json({ success: true });
    }
    try {
        const pool = getPool();
        await pool.query('DELETE FROM staff_attendance WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Handle React Routing - return all requests to React app (Express 4 & 5 compatible)
app.get('*path', (req, res) => {
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