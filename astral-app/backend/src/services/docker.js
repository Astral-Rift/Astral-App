import Dockerode from 'dockerode';
import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';
import { Rcon } from 'rcon-client';
import 'dotenv/config';

const docker = new Dockerode({ socketPath: process.env.DOCKER_SOCKET });

const RCON_PASSWORD = process.env.RCON_PASSWORD || '[CENSURADO]';

const GAME_CONFIG = {
    minecraft: {
        image:    'itzg/minecraft-server',
        protocol: 'tcp',
        gamePort: 25565,
        dataPath: '/data',
        modsPath: '/data/mods',
    },
    zomboid: {
        image:    'astral-pz:latest',
        protocol: 'udp',
        gamePort: 16261,
        dataPath: '/server/game',
        modsPath: '/server/game/mods',
    },
    valheim: {
        image:    'lloesche/valheim-server',
        protocol: 'udp',
        gamePort: 2456,
        dataPath: '/config',
        modsPath: '/config/BepInEx/plugins',
    },
};

export async function crearContenedor({ servidorId, juego, puerto, cpus, ramGb, version, mcType }) {
    const cfg      = GAME_CONFIG[juego];
    const volPath  = path.join(process.env.VOLUMES_PATH, `servidor-${servidorId}`);
    const ramBytes = ramGb * 1024 * 1024 * 1024;
    const containerName = `astral-srv-${servidorId}`;

    await fs.mkdir(volPath, { recursive: true });
    execSync(`chmod 777 ${volPath}`);

    const env = [];

    let image = cfg.image;
    if (juego === 'minecraft') {
        env.push('EULA=TRUE');
        env.push(`VERSION=${version || 'LATEST'}`);
        env.push(`TYPE=${mcType || 'VANILLA'}`);
        env.push(`MEMORY=${ramGb}G`);
        env.push('ENABLE_RCON=true');
        env.push(`RCON_PASSWORD=${RCON_PASSWORD}`);
        env.push('RCON_PORT=25575');

        if (version === '1.12.2') {
            image = 'itzg/minecraft-server:java8';
        } else if (version === '1.16.5') {
            image = 'itzg/minecraft-server:java17';
        }
    } else if (juego === 'zomboid') {
        env.push('ADMIN_PASSWORD=changeme');
        env.push('ADMIN_USER=admin');
        env.push('SERVER_NAME=AstralServer');
        env.push(`MEMORY=${ramGb}g`);
    } else if (juego === 'valheim') {
        env.push('SERVER_NAME=AstralServer');
        env.push('WORLD_NAME=AstralWorld');
        env.push('SERVER_PASS=changeme');
        env.push('SERVER_PUBLIC=false');
    }

    const portKey      = `${cfg.gamePort}/${cfg.protocol}`;
    const exposedPorts = { [portKey]: {} };
    const portBindings = { [portKey]: [{ HostPort: String(puerto) }] };

    if (juego === 'valheim') {
        exposedPorts['2457/udp'] = {};
        portBindings['2457/udp'] = [{ HostPort: String(puerto + 1) }];
    }

    if (juego === 'minecraft') {
        exposedPorts['25575/tcp'] = {};
        portBindings['25575/tcp'] = [{ HostPort: String(puerto + 1000) }];
    }

    const container = await docker.createContainer({
        name:         containerName,
        Image:        image,
        Env:          env,
        ExposedPorts: exposedPorts,
        HostConfig: {
            NanoCpus:      Math.round(cpus * 1e9),
            Memory:        ramBytes,
            Binds:         [`${volPath}:${cfg.dataPath}`],
            PortBindings:  portBindings,
            RestartPolicy: { Name: 'unless-stopped' },
        },
    });

    await container.start();
    return container.id;
}

export async function pararContenedor(containerId) {
    const container = docker.getContainer(containerId);
    await container.stop({ t: 10 });
}

export async function encenderContenedor(containerId) {
    const container = docker.getContainer(containerId);
    await container.start();
}

export async function reiniciarContenedor(containerId) {
    const container = docker.getContainer(containerId);
    await container.restart({ t: 10 });
}

export async function eliminarContenedor(containerId) {
    const container = docker.getContainer(containerId);
    await container.stop({ t: 10 }).catch(() => {});
    await container.remove();
}

export async function estadoContenedor(containerId) {
    const container = docker.getContainer(containerId);
    const data = await container.inspect();
    return data.State.Running ? 'encendido' : 'apagado';
}

export async function logsContenedor(containerId, tail = 200) {
    const container = docker.getContainer(containerId);
    const stream = await container.logs({
        stdout:     true,
        stderr:     true,
        tail,
        timestamps: true,
    });
    return demuxLogs(stream);
}

export async function statsContenedor(containerId) {
    const container = docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });

    const cpuDelta    = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;

    const inspect  = await container.inspect();
    const nanoCpus = inspect.HostConfig.NanoCpus || 1e9;
    const numCpus  = nanoCpus / 1e9;

    const cpuPercent  = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

    const ramUsadaMb  = stats.memory_stats.usage / (1024 * 1024);
    const ramLimiteMb = stats.memory_stats.limit / (1024 * 1024);

    const networks = stats.networks || {};
    let rxBytes = 0, txBytes = 0;
    for (const iface of Object.values(networks)) {
        rxBytes += iface.rx_bytes;
        txBytes += iface.tx_bytes;
    }

    return {
        cpu:         parseFloat(cpuPercent.toFixed(1)),
        ramMb:       parseFloat(ramUsadaMb.toFixed(0)),
        ramLimiteMb: parseFloat(ramLimiteMb.toFixed(0)),
        rxMb:        parseFloat((rxBytes / (1024 * 1024)).toFixed(2)),
        txMb:        parseFloat((txBytes / (1024 * 1024)).toFixed(2)),
    };
}

export async function actualizarRecursos(containerId, cpus, ramGb) {
    const container = docker.getContainer(containerId);
    await container.update({
        NanoCpus:   Math.round(cpus * 1e9),
        Memory:     Math.round(ramGb * 1024 * 1024 * 1024),
        MemorySwap: Math.round(ramGb * 1024 * 1024 * 1024 * 2),
    });
}

export async function enviarComandoRcon(rconPort, comando) {
    const rcon = new Rcon({
        host:     '127.0.0.1',
        port:     rconPort,
        password: RCON_PASSWORD,
        timeout:  5000,
    });

    await rcon.connect();
    try {
        const respuesta = await rcon.send(comando);
        return respuesta;
    } finally {
        await rcon.end();
    }
}

export async function ejecutarComando(containerId, comando) {
    const container = docker.getContainer(containerId);

    const exec = await container.exec({
        Cmd:          ['sh', '-c', comando],
        AttachStdout: true,
        AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    return new Promise((resolve, reject) => {
        let output = '';
        stream.on('data', chunk => { output += chunk.toString('utf8').replace(/[\x00-\x08\x0e-\x1f]/g, ''); });
        stream.on('end', () => resolve(output.trim()));
        stream.on('error', reject);
        setTimeout(() => resolve(output.trim()), 5000);
    });
}

function demuxLogs(buffer) {
    const lines = [];
    let offset  = 0;
    while (offset < buffer.length) {
        if (offset + 8 > buffer.length) break;
        const size = buffer.readUInt32BE(offset + 4);
        offset += 8;
        if (offset + size > buffer.length) break;
        lines.push(buffer.slice(offset, offset + size).toString('utf8'));
        offset += size;
    }
    return lines.join('');
}
