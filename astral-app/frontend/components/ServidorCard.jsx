'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const JUEGO_CONFIG = {
    minecraft: { icon: '/mc.png',        banner: '/minecraft.jpg', color: '#4ade80', label: 'Minecraft'       },
    zomboid:   { icon: '/projectz.png',  banner: '/project.jpg',  color: '#f87171', label: 'Project Zomboid' },
    valheim:   { icon: '/valheimpng.png', banner: '/valheim.jpg',  color: '#fbbf24', label: 'Valheim'         },
};

const ESTADO = {
    encendido: { color: '#4ade80', bg: '#1c3a1c', label: 'Online'    },
    apagado:   { color: '#555',    bg: '#2a2a2a', label: 'Offline'   },
    iniciando: { color: '#fbbf24', bg: '#3a2e00', label: 'Starting'  },
    apagando:  { color: '#f97316', bg: '#3a1500', label: 'Stopping'  },
};

export default function ServidorCard({ servidor, onRefresh }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const cfg = JUEGO_CONFIG[servidor.juego] || JUEGO_CONFIG.minecraft;
    const est = ESTADO[servidor.estado]     || ESTADO.apagado;
    const enTransicion = servidor.estado === 'iniciando' || servidor.estado === 'apagando';

    async function toggleEstado() {
        setLoading(true);
        try {
            if (servidor.estado === 'encendido') await api.apagarServidor(servidor.id);
            else if (servidor.estado === 'apagado') await api.encenderServidor(servidor.id);
            onRefresh();
        } catch (err) { alert(err.message); }
        finally { setLoading(false); }
    }

    async function eliminar() {
        if (!confirm(`¿Eliminar "${servidor.nombre}"? Se perderán todos los datos.`)) return;
        setLoading(true);
        try { await api.eliminarServidor(servidor.id); onRefresh(); }
        catch (err) { alert(err.message); }
        finally { setLoading(false); }
    }

    return (
        <div style={{
            background: '#222', border: '1px solid #2e2e2e', borderRadius: '12px',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            transition: 'border-color 0.2s',
        }}>
            {/* Banner con overlay */}
            <div style={{ position: 'relative', height: '110px', overflow: 'hidden' }}>
                <img src={cfg.banner} alt={cfg.label}
                     style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.4)' }} />
                {/* Overlay degradado */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #222 100%)' }} />
                {/* Estado badge */}
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: est.bg, color: est.color, borderRadius: '4px', padding: '3px 9px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: est.color, display: 'inline-block', animation: enTransicion ? 'pulse 1s infinite' : 'none' }} />
                    {est.label}
                </div>
                {/* Nombre sobre el banner */}
                <div style={{ position: 'absolute', bottom: '10px', left: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={cfg.icon} alt={cfg.label} style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} />
                    <div>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{servidor.nombre}</p>
                        <p style={{ color: '#aaa', fontSize: '11px', margin: 0 }}>{cfg.label}</p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Specs */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '6px', padding: '8px 10px' }}>
                        <p style={{ color: '#555', fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CPU</p>
                        <p style={{ color: '#ddd', fontSize: '13px', fontWeight: 600 }}>{servidor.cpu_asignada} vCPU</p>
                    </div>
                    <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '6px', padding: '8px 10px' }}>
                        <p style={{ color: '#555', fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RAM</p>
                        <p style={{ color: '#ddd', fontSize: '13px', fontWeight: 600 }}>{servidor.ram_asignada_gb} GB</p>
                    </div>
                    <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '6px', padding: '8px 10px' }}>
                        <p style={{ color: '#555', fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Puerto</p>
                        <p style={{ color: servidor.estado === 'encendido' ? cfg.color : '#555', fontSize: '13px', fontWeight: 600 }}>:{servidor.puerto}</p>
                    </div>
                </div>

                {/* Dirección de conexión si está encendido */}
                {servidor.estado === 'encendido' && (
                    <div style={{ background: cfg.color + '10', border: `1px solid ${cfg.color}30`, borderRadius: '6px', padding: '7px 10px' }}>
                        <p style={{ color: '#555', fontSize: '10px', marginBottom: '2px' }}>CONEXIÓN</p>
                        <p style={{ color: cfg.color, fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                            TU_DOMINIO:{servidor.puerto}
                        </p>
                    </div>
                )}

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={toggleEstado} disabled={loading || enTransicion}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                background: servidor.estado === 'encendido' ? '#3a1500' : '#1c3a1c',
                                color:      servidor.estado === 'encendido' ? '#f97316' : '#4ade80',
                                opacity: (loading || enTransicion) ? 0.5 : 1 }}>
                        {enTransicion ? '...' : servidor.estado === 'encendido' ? '■ Apagar' : '▶ Encender'}
                    </button>
                    <button onClick={() => router.push(`/dashboard/servidor/${servidor.id}`)}
                            style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #3a3a3a', fontSize: '13px', color: '#aaa', background: '#2a2a2a', cursor: 'pointer' }}>
                        Gestionar
                    </button>
                    <button onClick={eliminar} disabled={loading || servidor.estado !== 'apagado'}
                            title="Solo se puede eliminar si está apagado"
                            style={{ padding: '8px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', color: '#f87171', background: '#3a1a1a', cursor: 'pointer', opacity: (loading || servidor.estado !== 'apagado') ? 0.3 : 1 }}>
                        🗑️
                    </button>
                </div>
            </div>

            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
        </div>
    );
}
