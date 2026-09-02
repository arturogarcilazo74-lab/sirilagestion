import { getPool } from '../server/db.js';

export async function repairBajas() {
    console.log("Iniciando reparación de alumnos dados de baja (falsos EGRESADOS)...");
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Obtener todos los alumnos que están dados de BAJA y en grupo EGRESADO
        const [currentStudents] = await connection.query("SELECT id, name, status, data_json FROM students WHERE status = 'BAJA'");
        
        let restoredCount = 0;
        let leftAsEgresadoCount = 0;

        for (const s of currentStudents) {
            let data = {};
            try { data = typeof s.data_json === 'string' ? JSON.parse(s.data_json) : s.data_json; } catch(e) {}
            
            if (data.group === 'EGRESADO') {
                // Buscar su grado original en la tabla de respaldo
                let originalGroup = null;
                try {
                    const [backupRows] = await connection.query("SELECT data_json FROM students_2025_2026 WHERE id = ?", [s.id]);
                    if (backupRows.length > 0) {
                        const backupData = typeof backupRows[0].data_json === 'string' ? JSON.parse(backupRows[0].data_json) : backupRows[0].data_json;
                        originalGroup = backupData.group;
                    }
                } catch(e) {
                    console.warn(`No se pudo buscar en el respaldo para ${s.name}`);
                }

                if (originalGroup && originalGroup !== 'EGRESADO' && !originalGroup.startsWith('6')) {
                    // Restaurar el grupo original si NO era de 6to
                    console.log(`Restaurando ${s.name} a grupo original: ${originalGroup}`);
                    data.group = originalGroup;
                    data.status = 'INSCRITO';
                    await connection.query("UPDATE students SET status = 'INSCRITO', data_json = ? WHERE id = ?", [JSON.stringify(data), s.id]);
                    restoredCount++;
                } else {
                    if (!originalGroup) {
                        console.log(`Dejando a ${s.name} como EGRESADO (sin datos de respaldo)`);
                    } else if (originalGroup.startsWith('6')) {
                        console.log(`Dejando a ${s.name} como EGRESADO (era de 6to)`);
                    }
                    leftAsEgresadoCount++;
                }
            } else if (data.status === 'INSCRITO') {
                // El usuario ya lo había marcado como INSCRITO en la UI pero la columna quedó en BAJA
                console.log(`Reconciliando estatus INSCRITO para ${s.name} (ID: ${s.id})`);
                await connection.query("UPDATE students SET status = 'INSCRITO' WHERE id = ?", [s.id]);
                restoredCount++;
            }
        }

        await connection.commit();
        console.log(`✅ Reparación completada. Restaurados a sus grupos / Inscritos: ${restoredCount}. Conservados como Egresados: ${leftAsEgresadoCount}.`);
        return { success: true, restoredCount, leftAsEgresadoCount };

    } catch (e) {
        await connection.rollback();
        console.error("Error durante la reparación:", e);
        throw e;
    } finally {
        connection.release();
    }
}

// Permitir correr desde CLI
if (process.argv[1] && process.argv[1].endsWith('repair_bajas_2026.js')) {
    import('../server/db.js').then(({ initDB }) => {
        initDB().then(() => repairBajas()).then(() => process.exit(0)).catch(e => {
            console.error(e);
            process.exit(1);
        });
    });
}
