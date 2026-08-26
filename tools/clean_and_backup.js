import { getPool } from '../server/db.js';

// Calendario Escolar Oficial 2026-2027 (fechas estimadas basadas en calendarios típicos de la SEP, ya que el oficial exacto para 2026 aún no se publica a esta fecha, pero usaremos fechas de referencia comunes).
const NEW_EVENTS = [
    { id: 'ev_26_inicio', title: 'Inicio de Clases Ciclo 2026-2027', date: '2026-08-24', type: 'ACADEMICO', description: 'Inicio oficial del ciclo escolar 2026-2027' },
    { id: 'ev_26_indep', title: 'Aniversario de la Independencia', date: '2026-09-16', type: 'FESTIVO', description: 'Suspensión de labores docentes' },
    { id: 'ev_26_cte1', title: 'Consejo Técnico Escolar', date: '2026-09-25', type: 'ADMINISTRATIVO', description: 'Primera sesión ordinaria de CTE' },
    { id: 'ev_26_cte2', title: 'Consejo Técnico Escolar', date: '2026-10-30', type: 'ADMINISTRATIVO', description: 'Segunda sesión ordinaria de CTE' },
    { id: 'ev_26_revol', title: 'Aniversario de la Revolución', date: '2026-11-16', type: 'FESTIVO', description: 'Suspensión de labores docentes' },
    { id: 'ev_26_cte3', title: 'Consejo Técnico Escolar', date: '2026-11-27', type: 'ADMINISTRATIVO', description: 'Tercera sesión ordinaria de CTE' },
    { id: 'ev_26_vac_inv', title: 'Vacaciones de Invierno', date: '2026-12-18', type: 'FESTIVO', description: 'Inicio de vacaciones de invierno' },
    { id: 'ev_27_regreso', title: 'Regreso a Clases', date: '2027-01-08', type: 'ACADEMICO', description: 'Reanudación de clases' },
    { id: 'ev_27_cte4', title: 'Consejo Técnico Escolar', date: '2027-01-29', type: 'ADMINISTRATIVO', description: 'Cuarta sesión ordinaria de CTE' },
    { id: 'ev_27_const', title: 'Aniversario de la Constitución', date: '2027-02-01', type: 'FESTIVO', description: 'Suspensión de labores' },
    { id: 'ev_27_cte5', title: 'Consejo Técnico Escolar', date: '2027-02-26', type: 'ADMINISTRATIVO', description: 'Quinta sesión ordinaria de CTE' },
    { id: 'ev_27_natal', title: 'Natalicio de Benito Juárez', date: '2027-03-15', type: 'FESTIVO', description: 'Suspensión de labores' },
    { id: 'ev_27_cte6', title: 'Consejo Técnico Escolar', date: '2027-03-26', type: 'ADMINISTRATIVO', description: 'Sexta sesión ordinaria de CTE' },
    { id: 'ev_27_vac_sem', title: 'Vacaciones de Semana Santa', date: '2027-03-29', type: 'FESTIVO', description: 'Inicio de vacaciones de primavera' },
    { id: 'ev_27_trabajo', title: 'Día del Trabajo', date: '2027-05-01', type: 'FESTIVO', description: 'Suspensión de labores' },
    { id: 'ev_27_batalla', title: 'Batalla de Puebla', date: '2027-05-05', type: 'FESTIVO', description: 'Suspensión de labores' },
    { id: 'ev_27_maestro', title: 'Día del Maestro', date: '2027-05-15', type: 'FESTIVO', description: 'Suspensión de labores' },
    { id: 'ev_27_cte7', title: 'Consejo Técnico Escolar', date: '2027-05-28', type: 'ADMINISTRATIVO', description: 'Séptima sesión ordinaria de CTE' },
    { id: 'ev_27_cte8', title: 'Consejo Técnico Escolar', date: '2027-06-25', type: 'ADMINISTRATIVO', description: 'Octava sesión ordinaria de CTE' },
    { id: 'ev_27_fin', title: 'Fin del Ciclo Escolar', date: '2027-07-15', type: 'ACADEMICO', description: 'Fin oficial del ciclo 2026-2027' }
];

export async function runCleanAndBackup() {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Crear tablas de respaldo
        console.log("Creando respaldos de tablas...");
        const tablesToBackup = ['students', 'assignments', 'behavior_logs', 'events', 'finance_events', 'staff_attendance'];
        for (const table of tablesToBackup) {
            await connection.query(`DROP TABLE IF EXISTS ${table}_2025_2026`);
            await connection.query(`CREATE TABLE ${table}_2025_2026 AS SELECT * FROM ${table}`);
        }

        // 2. Generar el análisis histórico (se guardará en una nueva tabla)
        console.log("Generando análisis histórico de los grupos...");
        await connection.query(`CREATE TABLE IF NOT EXISTS group_history_2025_2026 (
            id VARCHAR(50) PRIMARY KEY,
            current_group VARCHAR(10),
            past_group VARCHAR(10),
            data_json LONGTEXT
        )`);
        await connection.query(`TRUNCATE TABLE group_history_2025_2026`);

        // Leer alumnos del ciclo pasado (desde la tabla de respaldo para evitar conflictos con la migración actual)
        const [pastStudentsRows] = await connection.query('SELECT id, data_json FROM students_2025_2026 WHERE status = "INSCRITO"');
        const [pastLogsRows] = await connection.query('SELECT student_id, type FROM behavior_logs_2025_2026');

        // Mapear logs por alumno
        const logsByStudent = {};
        pastLogsRows.forEach(log => {
            if (!logsByStudent[log.student_id]) logsByStudent[log.student_id] = { POSITIVE: 0, NEGATIVE: 0 };
            logsByStudent[log.student_id][log.type]++;
        });

        // Agrupar alumnos por su grupo pasado
        const groupsData = {};
        for (const row of pastStudentsRows) {
            let data = {};
            try { data = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json; } catch(e) {}
            
            const group = (data.group || "").trim();
            if (!group) continue;
            
            if (!groupsData[group]) {
                groupsData[group] = { students: [], totalAcademic: 0, countAcademic: 0, positiveLogs: 0, negativeLogs: 0, subjects: { lenguajes: 0, saberes: 0, etica: 0, humano: 0 }, subjectCount: { lenguajes: 0, saberes: 0, etica: 0, humano: 0 } };
            }
            
            // Calcular promedios NEM del alumno
            let studentAvgSum = 0;
            let studentTrimCount = 0;
            if (data.grades && Array.isArray(data.grades)) {
                data.grades.forEach(g => {
                    if (g && typeof g === 'object') {
                        ['lenguajes', 'saberes', 'etica', 'humano'].forEach(sub => {
                            const val = Number(g[sub]) || 0;
                            if (val > 0) {
                                groupsData[group].subjects[sub] += val;
                                groupsData[group].subjectCount[sub]++;
                                studentAvgSum += val;
                                studentTrimCount++;
                            }
                        });
                    }
                });
            }
            
            if (studentTrimCount > 0) {
                groupsData[group].totalAcademic += (studentAvgSum / studentTrimCount);
                groupsData[group].countAcademic++;
            }

            // Sumar logs
            const sLogs = logsByStudent[row.id] || { POSITIVE: 0, NEGATIVE: 0 };
            groupsData[group].positiveLogs += sLogs.POSITIVE;
            groupsData[group].negativeLogs += sLogs.NEGATIVE;
        }

        // Generar y guardar resúmenes
        const groupTransitions = {
            "1 A": "2 A",
            "2 A": "3 A",
            "3 A": "4 A",
            "4 A": "5 A",
            "5 A": "6 A"
        };

        for (const [pastGroup, currentGroup] of Object.entries(groupTransitions)) {
            const gd = groupsData[pastGroup];
            if (!gd) continue;
            
            const groupAvg = gd.countAcademic > 0 ? (gd.totalAcademic / gd.countAcademic).toFixed(1) : "N/A";
            const subAvgs = {
                lenguajes: gd.subjectCount.lenguajes > 0 ? (gd.subjects.lenguajes / gd.subjectCount.lenguajes) : 0,
                saberes: gd.subjectCount.saberes > 0 ? (gd.subjects.saberes / gd.subjectCount.saberes) : 0,
                etica: gd.subjectCount.etica > 0 ? (gd.subjects.etica / gd.subjectCount.etica) : 0,
                humano: gd.subjectCount.humano > 0 ? (gd.subjects.humano / gd.subjectCount.humano) : 0,
            };

            // Determinar fortalezas y áreas de oportunidad
            const sortedSubjects = Object.entries(subAvgs).sort((a, b) => b[1] - a[1]);
            const bestSubject = sortedSubjects[0][0];
            const worstSubject = sortedSubjects[3][0];

            let behaviorSummary = "Comportamiento regular.";
            if (gd.positiveLogs > gd.negativeLogs * 2) behaviorSummary = "Grupo con excelente disciplina y participación positiva.";
            else if (gd.negativeLogs > gd.positiveLogs) behaviorSummary = "Grupo que requiere atención en seguimiento de reglas e indisciplina.";

            const analysisData = {
                pastGroup,
                currentGroup,
                academicAverage: groupAvg,
                behaviorSummary,
                positiveLogs: gd.positiveLogs,
                negativeLogs: gd.negativeLogs,
                strengths: `Destacan en el campo formativo de ${bestSubject.toUpperCase()}.`,
                opportunities: `Requieren mayor apoyo y nivelación en ${worstSubject.toUpperCase()}.`
            };

            await connection.query(`INSERT INTO group_history_2025_2026 (id, current_group, past_group, data_json) VALUES (?, ?, ?, ?)`, 
                [`hist_${currentGroup.replace(' ', '')}`, currentGroup, pastGroup, JSON.stringify(analysisData)]);
        }


        // 3. Limpiar Tablas (TRUNCATE)
        console.log("Vaciando tablas del ciclo anterior...");
        await connection.query('TRUNCATE TABLE assignments');
        await connection.query('TRUNCATE TABLE events');
        await connection.query('TRUNCATE TABLE finance_events');
        await connection.query('TRUNCATE TABLE behavior_logs');
        await connection.query('TRUNCATE TABLE staff_attendance');

        // 4. Insertar eventos oficiales 2026-2027
        console.log("Insertando calendario oficial 2026-2027...");
        for (const ev of NEW_EVENTS) {
            await connection.query(`INSERT INTO events (id, title, date, type, description, data_json) VALUES (?, ?, ?, ?, ?, ?)`,
                [ev.id, ev.title, ev.date, ev.type, ev.description, JSON.stringify(ev)]
            );
        }

        // 5. Limpiar historial en los alumnos (students)
        console.log("Limpiando JSON de alumnos...");
        const [studentsRows] = await connection.query('SELECT id, status, data_json FROM students');
        let studentsUpdated = 0;
        for (const s of studentsRows) {
            if (s.status !== 'INSCRITO') continue;
            let data = {};
            try { data = typeof s.data_json === 'string' ? JSON.parse(s.data_json) : s.data_json; } catch(e) {}
            
            data.grades = [];
            data.attendance = {};
            data.completedAssignmentIds = [];
            data.assignmentResults = {};
            data.behaviorPoints = 0;
            data.assignmentsCompleted = 0;
            data.totalAssignments = 0;
            data.participationCount = 0;
            data.annualFeePaid = false;

            await connection.query('UPDATE students SET behavior_points = 0, annual_fee_paid = 0, data_json = ? WHERE id = ?', [JSON.stringify(data), s.id]);
            studentsUpdated++;
        }

        await connection.commit();
        console.log(`Éxito. Respaldo creado, ${studentsUpdated} alumnos limpiados y calendario actualizado.`);
        return { success: true, studentsUpdated };

    } catch (e) {
        await connection.rollback();
        console.error("Error en backup/clean:", e);
        throw e;
    } finally {
        connection.release();
    }
}
