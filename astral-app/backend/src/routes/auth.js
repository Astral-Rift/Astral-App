import bcrypt from 'bcrypt';
import db from '../config/db.js';

export default async function authRoutes(fastify) {

    // POST /api/auth/login
    fastify.post('/api/auth/login', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                }
            }
        }
    }, async (request, reply) => {
        const { username, password } = request.body;
        const [rows] = await db.query(
            'SELECT * FROM usuarios WHERE username = ? AND activo = TRUE',
            [username]
        );
        if (!rows.length) return reply.code(401).send({ error: 'Credenciales incorrectas' });

        const usuario = rows[0];
        const ok = await bcrypt.compare(password, usuario.password_hash);
        if (!ok) return reply.code(401).send({ error: 'Credenciales incorrectas' });

        const token = fastify.jwt.sign({
            id:       usuario.id,
            username: usuario.username,
            plan_id:  usuario.plan_id,
            rol:      usuario.rol || 'user',
        }, { expiresIn: '8h' });

        reply
            .setCookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' })
            .send({ ok: true, username: usuario.username });
    });

    // POST /api/auth/logout
    fastify.post('/api/auth/logout', async (request, reply) => {
        reply.clearCookie('token', { path: '/' }).send({ ok: true });
    });

    // GET /api/auth/me
    fastify.get('/api/auth/me', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const [rows] = await db.query(
            `SELECT u.id, u.username, u.email, u.rol,
                    p.nombre AS plan, p.cpu_limit, p.ram_limit_gb
             FROM usuarios u JOIN planes p ON u.plan_id = p.id
             WHERE u.id = ?`,
            [request.user.id]
        );
        reply.send(rows[0]);
    });
}
