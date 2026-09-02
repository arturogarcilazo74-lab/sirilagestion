import { getPool } from '../server/db.js';

// Calendario Escolar Oficial 2026-2027 - SEP / SEPyC Sinaloa (185 Días)
const NEW_EVENTS = [
    { id: 'sep26_inicio', title: 'Inicio de Clases Ciclo 2026-2027', date: '2026-08-31', type: 'ACADEMICO', description: 'Inicio oficial del ciclo escolar 2026-2027' },
    { id: 'sep26_concientizacion', title: 'Jornada contra el Abuso Sexual Infantil', date: '2026-09-07', type: 'ADMINISTRATIVO', description: 'Jornada de concientización' },
    { id: 'sep26_indep', title: 'Aniversario de la Independencia', date: '2026-09-16', type: 'FESTIVO', description: 'Suspensión oficial de labores docentes' },
    { id: 'sep26_cte1', title: 'Consejo Técnico Escolar', date: '2026-09-25', type: 'ADMINISTRATIVO', description: 'Primera sesión ordinaria de CTE' },
    { id: 'sep26_cte2', title: 'Consejo Técnico Escolar', date: '2026-10-30', type: 'ADMINISTRATIVO', description: 'Segunda sesión ordinaria de CTE' },
    { id: 'sep26_muertos', title: 'Día de Muertos', date: '2026-11-02', type: 'FESTIVO', description: 'Suspensión oficial de labores docentes' },
    { id: 'sep26_revol', title: 'Aniversario de la Revolución', date: '2026-11-16', type: 'FESTIVO', description: 'Conmemoración del 20 de noviembre' },
    { id: 'sep26_cte3', title: 'Consejo Técnico Escolar', date: '2026-11-27', type: 'ADMINISTRATIVO', description: 'Tercera sesión ordinaria de CTE' },
    { id: 'sep26_vac_inv', title: 'Vacaciones de Invierno', date: '2026-12-21', type: 'FESTIVO', description: 'Inicio de vacaciones de invierno' },
    { id: 'sep27_navidad', title: 'Navidad', date: '2026-12-25', type: 'FESTIVO', description: 'Suspensión oficial' },
    { id: 'sep27_anio_nuevo', title: 'Año Nuevo', date: '2027-01-01', type: 'FESTIVO', description: 'Suspensión oficial' },
    { id: 'sep27_reyes', title: 'Día de Reyes', date: '2027-01-06', type: 'FESTIVO', description: 'Suspensión oficial' },
    { id: 'sep27_regreso', title: 'Regreso a Clases', date: '2027-01-11', type: 'ACADEMICO', description: 'Reanudación de clases' },
    { id: 'sep27_cte4', title: 'Consejo Técnico Escolar', date: '2027-01-29', type: 'ADMINISTRATIVO', description: 'Cuarta sesión ordinaria de CTE' },
    { id: 'sep27_const', title: 'Aniversario de la Constitución', date: '2027-02-01', type: 'FESTIVO', description: 'Conmemoración del 5 de febrero' },
    { id: 'sep27_cte5', title: 'Consejo Técnico Escolar', date: '2027-02-26', type: 'ADMINISTRATIVO', description: 'Quinta sesión ordinaria de CTE' },
    { id: 'sep27_natal', title: 'Natalicio de Benito Juárez', date: '2027-03-15', type: 'FESTIVO', description: 'Conmemoración del 21 de marzo' },
    { id: 'sep27_vac_sem', title: 'Vacaciones de Semana Santa', date: '2027-03-22', type: 'FESTIVO', description: 'Inicio de vacaciones de Semana Santa' },
    { id: 'sep27_regreso_sem', title: 'Regreso a Clases (Semana Santa)', date: '2027-04-05', type: 'ACADEMICO', description: 'Reanudación de clases' },
    { id: 'sep27_cte6', title: 'Consejo Técnico Escolar', date: '2027-04-30', type: 'ADMINISTRATIVO', description: 'Sexta sesión ordinaria de CTE' },
    { id: 'sep27_batalla', title: 'Batalla de Puebla', date: '2027-05-05', type: 'FESTIVO', description: 'Suspensión oficial de labores' },
    { id: 'sep27_cte7', title: 'Consejo Técnico Escolar', date: '2027-05-28', type: 'ADMINISTRATIVO', description: 'Séptima sesión ordinaria de CTE' },
    { id: 'sep27_cte8', title: 'Consejo Técnico Escolar', date: '2027-06-25', type: 'ADMINISTRATIVO', description: 'Octava sesión ordinaria de CTE' },
    { id: 'sep27_fin', title: 'Fin del Ciclo Escolar', date: '2027-07-07', type: 'ACADEMICO', description: 'Fin oficial del ciclo 2026-2027' }
];

export async function runCleanAndBackup() {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 0. Idempotencia: Verificar si ya se insertaron los eventos 2026
        const [existingEvents] = await connection.query("SELECT id FROM events WHERE id = 'ev_26_inicio'");
        if (existingEvents.length > 0) {
            console.log("⚠️ El script clean_and_backup ya fue ejecutado (eventos 2026-2027 presentes). Abortando para no sobrescribir el respaldo original.");
            await connection.rollback();
            connection.release();
            return { success: true, message: "Already cleaned and backed up" };
        }

        // 1. Crear tablas de respaldo
        console.log("Creando respaldos de tablas...");
        const tablesToBackup = ['students', 'assignments', 'behavior_logs', 'events', 'finance_events', 'staff_attendance'];
        for (const table of tablesToBackup) {
            try {
                await connection.query(`DROP TABLE IF EXISTS ${table}_2025_2026`);
                await connection.query(`CREATE TABLE ${table}_2025_2026 LIKE ${table}`);
                await connection.query(`INSERT INTO ${table}_2025_2026 SELECT * FROM ${table}`);
            } catch (err) {
                console.log(`Skipping backup for ${table}:`, err.message);
            }
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
        const [pastStudentsRows] = await connection.query("SELECT id, data_json FROM students_2025_2026 WHERE status = 'INSCRITO'");
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
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        const tablesToTruncate = ['student_assignments', 'finance_contributions', 'assignments', 'events', 'finance_events', 'behavior_logs', 'staff_attendance'];
        for (const table of tablesToTruncate) {
            try {
                await connection.query(`TRUNCATE TABLE ${table}`);
            } catch (err) {
                console.log(`Skipping truncate for ${table}:`, err.message);
            }
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // 4. Insertar eventos oficiales 2026-2027
        console.log("Insertando calendario oficial 2026-2027...");
        for (const ev of NEW_EVENTS) {
            await connection.query(`INSERT INTO events (id, title, date, type, description, data_json) VALUES (?, ?, ?, ?, ?, ?)`,
                [ev.id, ev.title, ev.date, ev.type, ev.description, JSON.stringify(ev)]
            );
        }

        // 5. Limpiar historial en los alumnos (students)
        console.log("Limpiando JSON de alumnos...");
        const [studentsRows] = await connection.query("SELECT id, status, data_json FROM students");
        let studentsUpdated = 0;
        for (const s of studentsRows) {
            if (s.status !== 'INSCRITO') continue;
            let data = {};
            try { data = typeof s.data_json === 'string' ? JSON.parse(s.data_json) : s.data_json; } catch(e) {}
            
            data.grades = [];
            data.attendance = {};
            data.completedAssignmentIds = [];
            data.assignmentResults = {};
            data.assignmentAreaResults = {};
            data.assignmentAttempts = {};
            data.behaviorPoints = 0;
            data.assignmentsCompleted = 0;
            data.totalAssignments = 0;
            data.participationCount = 0;
            data.annualFeePaid = false;
            data.annualFeeStatus = 'PENDIENTE';
            data.annualFeeAbono = 0;
            data.annualFeeTotal = 0;
            data.eventFeePaid = false;
            data.examFeePaid = false;

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
