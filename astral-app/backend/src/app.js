import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import 'dotenv/config';
import authPlugin       from './plugins/auth.js';
import authRoutes       from './routes/auth.js';
import servidoresRoutes from './routes/servidores.js';
import archivosRoutes   from './routes/archivos.js';
import adminRoutes      from './routes/admin.js';
import contactoRoutes   from './routes/contacto.js';

const fastify = Fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: { colorize: false }
        }
    }
});

await fastify.register(cookie);
await fastify.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });
await fastify.register(authPlugin);

await fastify.register(authRoutes);
await fastify.register(servidoresRoutes);
await fastify.register(archivosRoutes);
await fastify.register(adminRoutes);
await fastify.register(contactoRoutes);

fastify.get('/api/health', async () => ({ ok: true }));

try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '127.0.0.1' });
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
