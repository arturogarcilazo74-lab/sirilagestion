import { getPool } from '../server/db.js';

export async function runMigrate() {
    console.log("Iniciando migración de ciclo escolar 2026-2027...");
    const pool = getPool();

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Migrar Alumnos
        console.log("Migrando alumnos...");
        const [students] = await connection.query('SELECT id, status, data_json FROM students');
        
        let promovidos = 0;
        let egresados = 0;

        for (const s of students) {
            if (s.status !== 'INSCRITO') continue; // Solo migrar los inscritos

            let data = {};
            try { data = typeof s.data_json === 'string' ? JSON.parse(s.data_json) : s.data_json; } catch(e) {}
            
            const currentGroup = (data.group || "").trim();
            if (!currentGroup) continue;

            let newGroup = currentGroup;
            let newStatus = s.status;

            if (currentGroup.startsWith("6")) {
                newStatus = 'BAJA';
                // Dejamos el grupo como 6 para historial o lo limpiamos? Mejor lo dejamos pero en BAJA.
                egresados++;
            } else if (currentGroup.startsWith("5")) {
                newGroup = currentGroup.replace("5", "6");
                promovidos++;
            } else if (currentGroup.startsWith("4")) {
                newGroup = currentGroup.replace("4", "5");
                promovidos++;
            } else if (currentGroup.startsWith("3")) {
                newGroup = currentGroup.replace("3", "4");
                promovidos++;
            } else if (currentGroup.startsWith("2")) {
                newGroup = currentGroup.replace("2", "3");
                promovidos++;
            } else if (currentGroup.startsWith("1")) {
                newGroup = currentGroup.replace("1", "2");
                promovidos++;
            }

            if (newGroup !== currentGroup || newStatus !== s.status) {
                data.group = newGroup;
                await connection.query('UPDATE students SET status = ?, data_json = ? WHERE id = ?', [newStatus, JSON.stringify(data), s.id]);
            }
        }
        console.log(`✅ Alumnos promovidos: ${promovidos}`);
        console.log(`✅ Alumnos egresados (BAJA): ${egresados}`);

        // 2. Migrar Configuración (Maestros y Año Escolar)
        console.log("Actualizando maestros y ciclo escolar...");
        const [configRows] = await connection.query("SELECT config_value FROM school_config WHERE config_key = 'main_config'");
        if (configRows.length > 0) {
            let config = JSON.parse(configRows[0].config_value);
            config.schoolYear = "2026-2027";
            
            if (config.staff && Array.isArray(config.staff)) {
                config.staff.forEach(member => {
                    const name = member.name.toLowerCase();
                    // Normalizamos nombres para hacer match más fácil
                    if (name.includes("josé luis") || name.includes("jose luis peraza")) {
                        member.group = "3 A";
                    } else if (name.includes("ana luisa castro")) {
                        member.group = "4 A";
                    } else if (name.includes("fatima") || name.includes("fátima")) {
                        member.group = "5 A";
                    } else if (name.includes("miguel angel román") || name.includes("miguel angel roman")) {
                        member.group = "6 A";
                    }
                    // Cristina ya tiene dos registros para 1 A y 2 A, se queda igual.
                    // Los demás directivos/servicios se quedan igual.
                });
            }

            await connection.query("UPDATE school_config SET config_value = ? WHERE config_key = 'main_config'", [JSON.stringify(config)]);
            console.log("✅ Ciclo escolar actualizado a 2026-2027.");
            console.log("✅ Maestros reasignados a sus nuevos grados.");
        }

        await connection.commit();
        console.log("🚀 MIGRACIÓN COMPLETADA CON ÉXITO.");
        return { success: true, promovidos, egresados };
    } catch (e) {
        await connection.rollback();
        console.error("Error durante la migración, se hizo rollback:", e);
        throw e;
    } finally {
        connection.release();
    }
}
