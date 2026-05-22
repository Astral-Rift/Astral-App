import db from '../config/db.js';

// Comprueba si el usuario tiene CPU y RAM suficiente para un nuevo servidor
export async function validarRecursos(usuarioId, cpuNecesaria, ramNecesaria) {
    const [rows] = await db.query(`
        SELECT
            p.cpu_limit - COALESCE(SUM(s.cpu_asignada), 0)       AS cpu_libre,
            p.ram_limit_gb - COALESCE(SUM(s.ram_asignada_gb), 0) AS ram_libre
        FROM usuarios u
        JOIN planes p ON u.plan_id = p.id
        LEFT JOIN servidores s ON s.usuario_id = u.id
        WHERE u.id = ?
        GROUP BY p.cpu_limit, p.ram_limit_gb
    `, [usuarioId]);

    if (!rows.length) throw new Error('Usuario no encontrado');

    const { cpu_libre, ram_libre } = rows[0];
    return {
        valido:   cpu_libre >= cpuNecesaria && ram_libre >= ramNecesaria,
        cpuLibre: cpu_libre,
        ramLibre: ram_libre,
    };
}

// Obtiene un puerto libre del usuario
export async function obtenerPuertoLibre(usuarioId) {
    const [rows] = await db.query(`
        SELECT id, puerto
        FROM puertos_usuario
        WHERE usuario_id = ? AND en_uso = FALSE
        LIMIT 1
    `, [usuarioId]);
    return rows[0] || null;
}

// Marca un puerto como en uso o libre
export async function setPuertoEnUso(puertoId, enUso) {
    await db.query(
        'UPDATE puertos_usuario SET en_uso = ? WHERE id = ?',
        [enUso, puertoId]
    );
}
