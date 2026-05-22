import db from '../config/db.js';
import { validarRecursos, obtenerPuertoLibre, setPuertoEnUso } from '../services/recursos.js';
import { crearContenedor, pararContenedor, encenderContenedor, reiniciarContenedor,
         eliminarContenedor, logsContenedor, statsContenedor,
         ejecutarComando, enviarComandoRcon, actualizarRecursos } from '../services/docker.js';

import { execSync } from 'child_process';
import path from 'path';

export default async function servidoresRoutes(fastify) {

    // GET /api/servidores
    fastify.get('/api/servidores', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const [rows] = await db.query(`
            SELECT s.id, s.nombre, s.juego, s.estado,
                   s.cpu_asignada, s.ram_asignada_gb, pu.puerto
            FROM servidores s
            JOIN puertos_usuario pu ON s.puerto_id = pu.id
            WHERE s.usuario_id = ?
            ORDER BY s.creado_en DESC
        `, [request.user.id]);
        reply.send(rows);
    });

    // POST /api/servidores
    fastify.post('/api/servidores', {
        onRequest: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['nombre', 'juego', 'cpu', 'ram'],
                properties: {
                    nombre:  { type: 'string', minLength: 1, maxLength: 100 },
                    juego:   { type: 'string', enum: ['minecraft', 'zomboid', 'valheim'] },
                    cpu:     { type: 'number', minimum: 1, maximum: 4 },
                    ram:     { type: 'number', minimum: 0.5, maximum: 8 },
                    version: { type: 'string' },
                    mcType:  { type: 'string' },
                }
            }
        }
    }, async (request, reply) => {
        const { nombre, juego, cpu, ram, version, mcType } = request.body;
        const usuarioId = request.user.id;

        const { valido, cpuLibre, ramLibre } = await validarRecursos(usuarioId, cpu, ram);
        if (!valido) {
            return reply.code(409).send({
                error: `Recursos insuficientes. Tienes ${cpuLibre} CPU y ${ramLibre}GB libres.`
            });
        }

        const puerto = await obtenerPuertoLibre(usuarioId);
        if (!puerto) return reply.code(409).send({ error: 'No tienes puertos disponibles.' });

        const [result] = await db.query(`
            INSERT INTO servidores
                (usuario_id, nombre, juego, estado, cpu_asignada, ram_asignada_gb, puerto_id)
            VALUES (?, ?, ?, 'iniciando', ?, ?, ?)
        `, [usuarioId, nombre, juego, cpu, ram, puerto.id]);

        const servidorId = result.insertId;
        await setPuertoEnUso(puerto.id, true);

        crearContenedor({ servidorId, juego, puerto: puerto.puerto, cpus: cpu, ramGb: ram, version, mcType })
            .then(async (containerId) => {
                await db.query(
                    `UPDATE servidores SET estado = 'encendido', docker_container_id = ? WHERE id = ?`,
                    [containerId, servidorId]
                );
            }).catch(async (err) => {
                await db.query('DELETE FROM servidores WHERE id = ?', [servidorId]);
                await setPuertoEnUso(puerto.id, false);
                fastify.log.error(`Error creando contenedor: ${err.message}`);
            });

        reply.code(202).send({ ok: true, servidorId, mensaje: 'Servidor en creación.' });
    });

    // POST /api/servidores/:id/encender
    fastify.post('/api/servidores/:id/encender', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });
        if (servidor.estado !== 'apagado') return reply.code(409).send({ error: 'El servidor no está apagado' });

        const [rows] = await db.query(`
            SELECT
                p.cpu_limit - COALESCE(SUM(s.cpu_asignada), 0)       AS cpu_libre,
                p.ram_limit_gb - COALESCE(SUM(s.ram_asignada_gb), 0) AS ram_libre
            FROM usuarios u
            JOIN planes p ON u.plan_id = p.id
            LEFT JOIN servidores s ON s.usuario_id = u.id AND s.id != ?
            WHERE u.id = ?
            GROUP BY p.cpu_limit, p.ram_limit_gb
        `, [servidor.id, request.user.id]);

        if (!rows.length) return reply.code(500).send({ error: 'Error interno' });
        const { cpu_libre, ram_libre } = rows[0];
        if (cpu_libre < servidor.cpu_asignada || ram_libre < servidor.ram_asignada_gb) {
            return reply.code(409).send({ error: 'Recursos insuficientes para encender' });
        }

        await db.query("UPDATE servidores SET estado = 'iniciando' WHERE id = ?", [servidor.id]);
        encenderContenedor(servidor.docker_container_id).then(async () => {
            await db.query("UPDATE servidores SET estado = 'encendido' WHERE id = ?", [servidor.id]);
        }).catch(fastify.log.error);

        reply.send({ ok: true });
    });

    // POST /api/servidores/:id/apagar
    fastify.post('/api/servidores/:id/apagar', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });
        if (servidor.estado !== 'encendido') return reply.code(409).send({ error: 'El servidor no está encendido' });

        await db.query("UPDATE servidores SET estado = 'apagando' WHERE id = ?", [servidor.id]);
        pararContenedor(servidor.docker_container_id).then(async () => {
            await db.query("UPDATE servidores SET estado = 'apagado' WHERE id = ?", [servidor.id]);
        }).catch(fastify.log.error);

        reply.send({ ok: true });
    });

    // POST /api/servidores/:id/reiniciar
    fastify.post('/api/servidores/:id/reiniciar', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });
        if (servidor.estado !== 'encendido') return reply.code(409).send({ error: 'El servidor no está encendido' });

        await db.query("UPDATE servidores SET estado = 'iniciando' WHERE id = ?", [servidor.id]);
        reiniciarContenedor(servidor.docker_container_id).then(async () => {
            await db.query("UPDATE servidores SET estado = 'encendido' WHERE id = ?", [servidor.id]);
        }).catch(fastify.log.error);

        reply.send({ ok: true });
    });

    // PUT /api/servidores/:id/recursos
    fastify.put('/api/servidores/:id/recursos', {
        onRequest: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['cpu', 'ram'],
                properties: {
                    cpu: { type: 'number', minimum: 1, maximum: 4 },
                    ram: { type: 'number', minimum: 0.5, maximum: 8 },
                }
            }
        }
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });
        if (servidor.estado !== 'apagado') {
            return reply.code(409).send({ error: 'El servidor debe estar apagado para modificar los recursos' });
        }

        const { cpu, ram } = request.body;

        // Validar recursos excluyendo este servidor
        const [rows] = await db.query(`
            SELECT
                p.cpu_limit - COALESCE(SUM(s.cpu_asignada), 0)       AS cpu_libre,
                p.ram_limit_gb - COALESCE(SUM(s.ram_asignada_gb), 0) AS ram_libre
            FROM usuarios u
            JOIN planes p ON u.plan_id = p.id
            LEFT JOIN servidores s ON s.usuario_id = u.id AND s.id != ?
            WHERE u.id = ?
            GROUP BY p.cpu_limit, p.ram_limit_gb
        `, [servidor.id, request.user.id]);

        if (!rows.length) return reply.code(500).send({ error: 'Error interno' });
        const { cpu_libre, ram_libre } = rows[0];
        if (cpu > cpu_libre || ram > ram_libre) {
            return reply.code(409).send({
                error: `Recursos insuficientes. Tienes ${cpu_libre} vCPU y ${ram_libre} GB libres.`
            });
        }

        await actualizarRecursos(servidor.docker_container_id, cpu, ram);
        await db.query(
            'UPDATE servidores SET cpu_asignada = ?, ram_asignada_gb = ? WHERE id = ?',
            [cpu, ram, servidor.id]
        );

        reply.send({ ok: true });
    });

    // GET /api/servidores/:id/stats
    fastify.get('/api/servidores/:id/stats', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });
        if (servidor.estado !== 'encendido') return reply.send({ offline: true });

        const stats = await statsContenedor(servidor.docker_container_id);
        reply.send(stats);
    });

    // POST /api/servidores/:id/comando
    fastify.post('/api/servidores/:id/comando', {
        onRequest: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['comando'],
                properties: { comando: { type: 'string', minLength: 1, maxLength: 500 } }
            }
        }
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });
        if (servidor.estado !== 'encendido') return reply.code(409).send({ error: 'El servidor no está encendido' });

        let output = '';
        if (servidor.juego === 'minecraft') {
            const rconPort = servidor.puerto + 1000;
            output = await enviarComandoRcon(rconPort, request.body.comando);
        } else {
            output = await ejecutarComando(servidor.docker_container_id, request.body.comando);
        }

        reply.send({ ok: true, output });
    });

    // GET /api/servidores/:id/logs
    fastify.get('/api/servidores/:id/logs', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });

        const logs = await logsContenedor(servidor.docker_container_id);
        reply.send({ logs });
    });

    // DELETE /api/servidores/:id
    fastify.delete('/api/servidores/:id', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });

        await eliminarContenedor(servidor.docker_container_id);
        await setPuertoEnUso(servidor.puerto_id, false);
        await db.query('DELETE FROM servidores WHERE id = ?', [servidor.id]);

        const volPath = path.join(process.env.VOLUMES_PATH, `servidor-${servidor.id}`);
        execSync(`sudo rm -rf ${volPath}`);

        reply.send({ ok: true });
    });
}

async function getServidorDelUsuario(usuarioId, servidorId) {
    const [rows] = await db.query(
        `SELECT s.*, pu.puerto, pu.id AS puerto_id
         FROM servidores s
         JOIN puertos_usuario pu ON s.puerto_id = pu.id
         WHERE s.id = ? AND s.usuario_id = ?`,
        [servidorId, usuarioId]
    );
    return rows[0] || null;
}
