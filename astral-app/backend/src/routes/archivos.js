import path from 'path';
import fs from 'fs/promises';
import 'dotenv/config';

// Carpetas y archivos permitidos para navegar (relativo a la raíz del volumen)
const RUTAS_PERMITIDAS = [
    'mods',
    'plugins',
    'config',
    'worlds',
    'world',
    'BepInEx/plugins',
    'BepInEx/config',
    'server.properties',
    'ops.json',
    'whitelist.json',
    'banned-players.json',
    'banned-ips.json',
    'spigot.yml',
    'bukkit.yml',
    'paper.yml',
    'paper-global.yml',
];

// Extensiones de texto editables
const EXTENSIONES_TEXTO = [
    '.properties', '.yml', '.yaml', '.json', '.txt', '.cfg', '.conf', '.toml', '.ini', '.log'
];

// Archivos que nunca se pueden eliminar ni editar (protegidos)
const ARCHIVOS_PROTEGIDOS = [
    'start.sh', 'entrypoint.sh', 'run.sh', 'launcher.jar', 'server.jar'
];

function getVolumenPath(servidorId) {
    return path.join(process.env.VOLUMES_PATH, `servidor-${servidorId}`);
}

function resolverRuta(servidorId, subpath) {
    const base    = getVolumenPath(servidorId);
    const full    = path.resolve(base, subpath || '');
    // Evitar path traversal
    if (!full.startsWith(base)) return null;
    return full;
}

function esPermitido(subpath) {
    if (!subpath || subpath === '' || subpath === '.') return true;
    return RUTAS_PERMITIDAS.some(r => subpath === r || subpath.startsWith(r + '/') || subpath.startsWith(r + path.sep));
}

function esTexto(nombre) {
    const ext = path.extname(nombre).toLowerCase();
    return EXTENSIONES_TEXTO.includes(ext);
}

function esProtegido(nombre) {
    return ARCHIVOS_PROTEGIDOS.includes(path.basename(nombre));
}

export default async function archivosRoutes(fastify) {

    // GET /api/servidores/:id/archivos?ruta=carpeta/subcarpeta — listar contenido
    fastify.get('/api/servidores/:id/archivos', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });

        const subpath = request.query.ruta || '';

        if (!esPermitido(subpath)) {
            return reply.code(403).send({ error: 'Ruta no permitida' });
        }

        const rutaFull = resolverRuta(servidor.id, subpath);
        if (!rutaFull) return reply.code(400).send({ error: 'Ruta inválida' });

        try {
            const stat = await fs.stat(rutaFull);

            if (stat.isFile()) {
                // Si se pide directamente un archivo, devolver su contenido si es texto
                if (!esTexto(rutaFull)) {
                    return reply.code(400).send({ error: 'El archivo no es editable' });
                }
                const contenido = await fs.readFile(rutaFull, 'utf-8');
                return reply.send({ tipo: 'archivo', nombre: path.basename(rutaFull), contenido });
            }

            // Es carpeta — listar contenido
            const entradas = await fs.readdir(rutaFull);
            const detalle  = await Promise.all(entradas.map(async (nombre) => {
                const fullEntry = path.join(rutaFull, nombre);
                const s = await fs.stat(fullEntry);
                const subRuta = subpath ? `${subpath}/${nombre}` : nombre;
                return {
                    nombre,
                    tipo:       s.isDirectory() ? 'carpeta' : 'archivo',
                    tamaño:     s.isFile() ? s.size : null,
                    modificado: s.mtime,
                    editable:   s.isFile() && esTexto(nombre) && !esProtegido(nombre),
                    protegido:  esProtegido(nombre),
                    permitido:  s.isDirectory() ? esPermitido(subRuta) : true,
                    ruta:       subRuta,
                };
            }));

            // Ordenar: carpetas primero, luego archivos
            detalle.sort((a, b) => {
                if (a.tipo === b.tipo) return a.nombre.localeCompare(b.nombre);
                return a.tipo === 'carpeta' ? -1 : 1;
            });

            reply.send({ tipo: 'carpeta', ruta: subpath, entradas: detalle });

        } catch (err) {
            if (err.code === 'ENOENT') {
                // La carpeta no existe aún (ej: mods en servidor recién creado)
                return reply.send({ tipo: 'carpeta', ruta: subpath, entradas: [] });
            }
            throw err;
        }
    });

    // GET /api/servidores/:id/archivos/contenido?ruta=archivo.properties — leer archivo
    fastify.get('/api/servidores/:id/archivos/contenido', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });

        const subpath = request.query.ruta;
        if (!subpath) return reply.code(400).send({ error: 'Falta parámetro ruta' });
        if (!esPermitido(subpath)) return reply.code(403).send({ error: 'Ruta no permitida' });
        if (!esTexto(subpath)) return reply.code(400).send({ error: 'Archivo no editable' });
        if (esProtegido(subpath)) return reply.code(403).send({ error: 'Archivo protegido' });

        const rutaFull = resolverRuta(servidor.id, subpath);
        if (!rutaFull) return reply.code(400).send({ error: 'Ruta inválida' });

        const contenido = await fs.readFile(rutaFull, 'utf-8');
        reply.send({ contenido });
    });

    // PUT /api/servidores/:id/archivos/contenido — guardar archivo editado
    fastify.put('/api/servidores/:id/archivos/contenido', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });

        const { ruta, contenido } = request.body;
        if (!ruta || contenido === undefined) return reply.code(400).send({ error: 'Faltan parámetros' });
        if (!esPermitido(ruta)) return reply.code(403).send({ error: 'Ruta no permitida' });
        if (!esTexto(ruta)) return reply.code(400).send({ error: 'Archivo no editable' });
        if (esProtegido(ruta)) return reply.code(403).send({ error: 'Archivo protegido' });

        const rutaFull = resolverRuta(servidor.id, ruta);
        if (!rutaFull) return reply.code(400).send({ error: 'Ruta inválida' });

        await fs.writeFile(rutaFull, contenido, 'utf-8');
        reply.send({ ok: true });
    });

    // POST /api/servidores/:id/archivos — subir archivo a una carpeta
    fastify.post('/api/servidores/:id/archivos', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });

        const subpath = request.query.ruta || 'mods';
        if (!esPermitido(subpath)) return reply.code(403).send({ error: 'Ruta no permitida' });

        const rutaFull = resolverRuta(servidor.id, subpath);
        if (!rutaFull) return reply.code(400).send({ error: 'Ruta inválida' });

        await fs.mkdir(rutaFull, { recursive: true });

        const data = await request.file();
        if (!data) return reply.code(400).send({ error: 'No se recibió ningún archivo' });

        const destino = path.join(rutaFull, data.filename);
        if (!destino.startsWith(rutaFull)) return reply.code(400).send({ error: 'Nombre inválido' });

        await fs.writeFile(destino, await data.toBuffer());
        reply.send({ ok: true, archivo: data.filename });
    });

    // DELETE /api/servidores/:id/archivos?ruta=carpeta/archivo.jar — borrar archivo
    fastify.delete('/api/servidores/:id/archivos', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const servidor = await getServidorDelUsuario(request.user.id, request.params.id);
        if (!servidor) return reply.code(404).send({ error: 'Servidor no encontrado' });

        const subpath = request.query.ruta;
        if (!subpath) return reply.code(400).send({ error: 'Falta parámetro ruta' });
        if (!esPermitido(subpath)) return reply.code(403).send({ error: 'Ruta no permitida' });
        if (esProtegido(subpath)) return reply.code(403).send({ error: 'Archivo protegido' });

        const rutaFull = resolverRuta(servidor.id, subpath);
        if (!rutaFull) return reply.code(400).send({ error: 'Ruta inválida' });

        const stat = await fs.stat(rutaFull);
        if (stat.isDirectory()) {
            await fs.rm(rutaFull, { recursive: true });
        } else {
            await fs.unlink(rutaFull);
        }

        reply.send({ ok: true });
    });
}

async function getServidorDelUsuario(usuarioId, servidorId) {
    const { default: db } = await import('../config/db.js');
    const [rows] = await db.query(
        'SELECT * FROM servidores WHERE id = ? AND usuario_id = ?',
        [servidorId, usuarioId]
    );
    return rows[0] || null;
}
