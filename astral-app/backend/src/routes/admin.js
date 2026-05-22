import bcrypt from 'bcrypt';
import db from '../config/db.js';

export default async function adminRoutes(fastify) {

    async function soloAdmin(request, reply) {
        await fastify.authenticate(request, reply);
        if (request.user.rol !== 'admin') {
            return reply.code(403).send({ error: 'Acceso denegado' });
        }
    }

    // GET /api/admin/usuarios
    fastify.get('/api/admin/usuarios', {
        onRequest: [soloAdmin]
    }, async (request, reply) => {
        const [usuarios] = await db.query(`
            SELECT u.id, u.username, u.email, u.rol, u.activo, u.plan_id, u.creado_en,
                   p.nombre AS plan, p.cpu_limit, p.ram_limit_gb,
                   COUNT(s.id)                          AS total_servidores,
                   COALESCE(SUM(s.cpu_asignada), 0)     AS cpu_usada,
                   COALESCE(SUM(s.ram_asignada_gb), 0)  AS ram_usada
            FROM usuarios u
            JOIN planes p ON u.plan_id = p.id
            LEFT JOIN servidores s ON s.usuario_id = u.id
            GROUP BY u.id
            ORDER BY u.creado_en DESC
        `);
        reply.send(usuarios);
    });

    // GET /api/admin/usuarios/:id/servidores
    fastify.get('/api/admin/usuarios/:id/servidores', {
        onRequest: [soloAdmin]
    }, async (request, reply) => {
        const [servidores] = await db.query(`
            SELECT s.id, s.nombre, s.juego, s.estado,
                   s.cpu_asignada, s.ram_asignada_gb, pu.puerto
            FROM servidores s
            JOIN puertos_usuario pu ON s.puerto_id = pu.id
            WHERE s.usuario_id = ?
            ORDER BY s.creado_en DESC
        `, [request.params.id]);
        reply.send(servidores);
    });

    // POST /api/admin/usuarios — crear usuario
    fastify.post('/api/admin/usuarios', {
        onRequest: [soloAdmin],
        schema: {
            body: {
                type: 'object',
                required: ['username', 'email', 'password', 'plan_id'],
                properties: {
                    username: { type: 'string', minLength: 3, maxLength: 50 },
                    email:    { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    plan_id:  { type: 'number' },
                    rol:      { type: 'string', enum: ['user', 'admin'] },
                }
            }
        }
    }, async (request, reply) => {
        const { username, email, password, plan_id, rol = 'user' } = request.body;
        const [existe] = await db.query(
            'SELECT id FROM usuarios WHERE username = ? OR email = ?', [username, email]
        );
        if (existe.length) return reply.code(409).send({ error: 'El usuario o email ya existe' });

        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO usuarios (username, password_hash, email, plan_id, activo, rol) VALUES (?, ?, ?, ?, 1, ?)',
            [username, hash, email, plan_id, rol]
        );
        const nuevoId = result.insertId;

        // Puertos por plan: basic=1, medium=2, pro=4
        const puertosPerPlan = { 1: 1, 2: 2, 3: 4 };
        const numPuertos = puertosPerPlan[plan_id] || 1;
        const [todosLosPuertos] = await db.query('SELECT puerto FROM puertos_usuario ORDER BY puerto');
        const usados = new Set(todosLosPuertos.map(r => r.puerto));
        const values = [];
        let puerto = 25000;
        while (values.length < numPuertos) {
            if (!usados.has(puerto)) values.push([nuevoId, puerto, 0]);
            puerto++;
            if (puerto > 25999) break;
        }
        if (values.length < numPuertos) {
            return reply.code(409).send({ error: 'No hay puertos disponibles en el rango' });
        }
        await db.query(`INSERT INTO puertos_usuario (usuario_id, puerto, en_uso) VALUES ?`, [values]);

        reply.code(201).send({ ok: true, id: nuevoId });
    });

    // DELETE /api/admin/usuarios/:id — eliminar usuario
    fastify.delete('/api/admin/usuarios/:id', {
        onRequest: [soloAdmin]
    }, async (request, reply) => {
        const id = Number(request.params.id);
        if (id === request.user.id) return reply.code(400).send({ error: 'No puedes eliminarte a ti mismo' });

        const [srvs] = await db.query('SELECT id FROM servidores WHERE usuario_id = ?', [id]);
        if (srvs.length) return reply.code(409).send({ error: 'El usuario tiene servidores. Elimínalos primero.' });

        await db.query('DELETE FROM puertos_usuario WHERE usuario_id = ?', [id]);
        await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
        reply.send({ ok: true });
    });

    // PUT /api/admin/usuarios/:id/password
    fastify.put('/api/admin/usuarios/:id/password', {
        onRequest: [soloAdmin],
        schema: { body: { type: 'object', required: ['password'], properties: { password: { type: 'string', minLength: 6 } } } }
    }, async (request, reply) => {
        const hash = await bcrypt.hash(request.body.password, 10);
        await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, request.params.id]);
        reply.send({ ok: true });
    });

    // PUT /api/admin/usuarios/:id/activo
    fastify.put('/api/admin/usuarios/:id/activo', {
        onRequest: [soloAdmin],
        schema: { body: { type: 'object', required: ['activo'], properties: { activo: { type: 'boolean' } } } }
    }, async (request, reply) => {
        await db.query('UPDATE usuarios SET activo = ? WHERE id = ?', [request.body.activo, request.params.id]);
        reply.send({ ok: true });
    });

    // PUT /api/admin/usuarios/:id/plan
    fastify.put('/api/admin/usuarios/:id/plan', {
        onRequest: [soloAdmin],
        schema: { body: { type: 'object', required: ['plan_id'], properties: { plan_id: { type: 'number' } } } }
    }, async (request, reply) => {
        await db.query('UPDATE usuarios SET plan_id = ? WHERE id = ?', [request.body.plan_id, request.params.id]);
        reply.send({ ok: true });
    });

    // PUT /api/admin/usuarios/:id/rol
    fastify.put('/api/admin/usuarios/:id/rol', {
        onRequest: [soloAdmin],
        schema: { body: { type: 'object', required: ['rol'], properties: { rol: { type: 'string', enum: ['user', 'admin'] } } } }
    }, async (request, reply) => {
        if (Number(request.params.id) === request.user.id) {
            return reply.code(400).send({ error: 'No puedes cambiar tu propio rol' });
        }
        await db.query('UPDATE usuarios SET rol = ? WHERE id = ?', [request.body.rol, request.params.id]);
        reply.send({ ok: true });
    });
}
