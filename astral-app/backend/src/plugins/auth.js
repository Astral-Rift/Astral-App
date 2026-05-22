import fp from 'fastify-plugin';

export default fp(async (fastify) => {
    fastify.register(import('@fastify/jwt'), {
        secret: process.env.JWT_SECRET,
        cookie: { cookieName: 'token', signed: false }
    });

    fastify.decorate('authenticate', async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.code(401).send({ error: 'No autorizado' });
        }
    });

    fastify.decorate('onlyAdmin', async (request, reply) => {
        try {
            await request.jwtVerify();
            if (!request.user.admin) {
                reply.code(403).send({ error: 'Acceso denegado' });
            }
        } catch (err) {
            reply.code(401).send({ error: 'No autorizado' });
        }
    });
});
