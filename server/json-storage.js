// JSON Storage Endpoints - Handles all operations when MySQL is not available
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

function readJSON() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {
            students: [],
            assignments: [],
            events: [],
            behaviorLogs: [],
            financeEvents: [],
            schoolConfig: null,
            staffTasks: []
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

// Register JSON endpoints
function registerJSONEndpoints(app) {

    // SYNC endpoint for JSON
    app.post('/api/sync-json', async (req, res) => {
        try {
            const { students, assignments, events, behaviorLogs, financeEvents, schoolConfig, staffTasks } = req.body;

            const data = readJSON();

            if (students) data.students = students;
            if (assignments) data.assignments = assignments;
            if (events) data.events = events;
            if (behaviorLogs) data.behaviorLogs = behaviorLogs;
            if (financeEvents) data.financeEvents = financeEvents;
            if (schoolConfig) data.schoolConfig = schoolConfig;
            if (staffTasks) data.staffTasks = staffTasks;

            writeJSON(data);
            res.json({ success: true, message: 'Sync complete (JSON)' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Student endpoints
    app.post('/api/students-json', async (req, res) => {
        try {
            const student = req.body;
            const data = readJSON();

            const index = data.students.findIndex(s => s.id === student.id);
            if (index >= 0) {
                data.students[index] = student;
            } else {
                data.students.push(student);
            }

            writeJSON(data);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/students-json/:id', async (req, res) => {
        try {
            const data = readJSON();
            data.students = data.students.filter(s => s.id !== req.params.id);
            writeJSON(data);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Assignment endpoints
    app.post('/api/assignments-json', async (req, res) => {
        try {
            const assignment = req.body;
            const data = readJSON();

            const index = data.assignments.findIndex(a => a.id === assignment.id);
            if (index >= 0) {
                data.assignments[index] = assignment;
            } else {
                data.assignments.push(assignment);
            }

            writeJSON(data);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/assignments-json/:id', async (req, res) => {
        try {
            const data = readJSON();
            data.assignments = data.assignments.filter(a => a.id !== req.params.id);
            writeJSON(data);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Config endpoint
    app.post('/api/config-json', async (req, res) => {
        try {
            const config = req.body;
            const data = readJSON();
            data.schoolConfig = config;
            writeJSON(data);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { readJSON, writeJSON, registerJSONEndpoints };
