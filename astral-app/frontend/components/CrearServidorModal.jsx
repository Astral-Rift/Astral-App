'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

const JUEGOS = [
    { id: 'minecraft', nombre: 'Minecraft',       emoji: '⛏️' },
    { id: 'zomboid',   nombre: 'Project Zomboid',  emoji: '🧟' },
    { id: 'valheim',   nombre: 'Valheim',           emoji: '⚔️' },
];

const MC_VERSIONS = [
    { value: '1.12.2', label: '1.12.2 — Forge Mods',        mcType: 'FORGE'   },
    { value: '1.16.5', label: '1.16.5 — Fabric/Speedruns',  mcType: 'FABRIC'  },
    { value: '1.20.1', label: '1.20.1 — Forge/Fabric',      mcType: 'VANILLA' },
    { value: 'LATEST', label: 'Última versión (Vanilla)',    mcType: 'VANILLA' },
];

export default function CrearServidorModal({ usuario, cpuUsada, ramUsada, onClose, onCreado }) {
    const [nombre, setNombre]       = useState('');
    const [juego, setJuego]         = useState('minecraft');
    const [cpu, setCpu]             = useState(1);
    const [ram, setRam]             = useState(2);
    const [mcVersion, setMcVersion] = useState('LATEST');
    const [error, setError]         = useState('');
    const [loading, setLoading]     = useState(false);

    const cpuLibre = usuario.cpu_limit - cpuUsada;
    const ramLibre = usuario.ram_limit_gb - ramUsada;

    async function handleCrear() {
        if (!nombre.trim()) return setError('El nombre es obligatorio');
        if (cpu > cpuLibre)  return setError(`Solo tienes ${cpuLibre} vCPU libres`);
        if (ram > ramLibre)  return setError(`Solo tienes ${ramLibre} GB libres`);

        setLoading(true);
        setError('');
        try {
            const versionData = MC_VERSIONS.find(v => v.value === mcVersion) || MC_VERSIONS[3];
            await api.crearServidor({
                nombre,
                juego,
                cpu,
                ram,
                version: juego === 'minecraft' ? mcVersion   : undefined,
                mcType:  juego === 'minecraft' ? versionData.mcType : undefined,
            });
            onCreado();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const s = {
        overlay: {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '1rem',
        },
        card: {
            background: '#222', border: '1px solid #2e2e2e', borderRadius: '12px',
            padding: '2rem', width: '100%', maxWidth: '460px',
            maxHeight: '90vh', overflowY: 'auto',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        },
        title: { color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem' },
        label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' },
        input: {
            width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e',
            borderRadius: '6px', padding: '10px 14px', color: '#e0e0e0',
            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        },
        field: { marginBottom: '1.25rem' },
        juegoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
        juegoBtn: (active) => ({
            padding: '12px 8px', borderRadius: '8px', border: '1px solid',
            borderColor: active ? '#1677ff' : '#2e2e2e',
            background: active ? '#1677ff22' : '#1a1a1a',
            color: active ? '#60a5fa' : '#666',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600,
        }),
        versionBtn: (active) => ({
            width: '100%', textAlign: 'left', padding: '10px 14px',
            borderRadius: '6px', border: '1px solid',
            borderColor: active ? '#1677ff' : '#2e2e2e',
            background: active ? '#1677ff22' : '#1a1a1a',
            color: active ? '#60a5fa' : '#888',
            cursor: 'pointer', fontSize: '13px', marginBottom: '6px',
        }),
        sliderWrap: { marginBottom: '1.25rem' },
        sliderLabel: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
        sliderLabelText: { fontSize: '12px', color: '#666' },
        sliderValue: { fontSize: '13px', color: '#fff', fontWeight: 600 },
        slider: { width: '100%', accentColor: '#1677ff' },
        error: {
            background: '#3a1a1a', border: '1px solid #5a2020', color: '#f87171',
            borderRadius: '6px', padding: '8px 12px', fontSize: '13px', marginBottom: '1rem',
        },
        btnRow: { display: 'flex', gap: '10px', marginTop: '0.5rem' },
        btnCancel: {
            flex: 1, padding: '10px', background: '#2a2a2a', border: '1px solid #3a3a3a',
            borderRadius: '6px', color: '#aaa', fontSize: '13px', cursor: 'pointer',
        },
        btnCreate: (disabled) => ({
            flex: 1, padding: '10px', background: '#1677ff', border: 'none',
            borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        }),
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.card}>
                <h2 style={s.title}>Nuevo servidor</h2>

                {/* Nombre */}
                <div style={s.field}>
                    <label style={s.label}>Nombre</label>
                    <input style={s.input} type="text" value={nombre}
                           onChange={e => setNombre(e.target.value)}
                           placeholder="Mi servidor" />
                </div>

                {/* Juego */}
                <div style={s.field}>
                    <label style={s.label}>Juego</label>
                    <div style={s.juegoGrid}>
                        {JUEGOS.map(j => (
                            <button key={j.id} style={s.juegoBtn(juego === j.id)}
                                    onClick={() => setJuego(j.id)}>
                                <span style={{ fontSize: '22px' }}>{j.emoji}</span>
                                <span>{j.nombre}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Versión Minecraft */}
                {juego === 'minecraft' && (
                    <div style={s.field}>
                        <label style={s.label}>Versión</label>
                        {MC_VERSIONS.map(v => (
                            <button key={v.value} style={s.versionBtn(mcVersion === v.value)}
                                    onClick={() => setMcVersion(v.value)}>
                                {v.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* CPU */}
                <div style={s.sliderWrap}>
                    <div style={s.sliderLabel}>
                        <span style={s.sliderLabelText}>CPU <span style={{ color: '#555' }}>({cpuLibre} libres)</span></span>
                        <span style={s.sliderValue}>{cpu} vCPU</span>
                    </div>
                    <input style={s.slider} type="range"
                           min={1} max={Math.min(4, cpuLibre)} step={1} value={cpu}
                           onChange={e => setCpu(Number(e.target.value))} />
                </div>

                {/* RAM — pasos de 0.5 GB */}
                <div style={s.sliderWrap}>
                    <div style={s.sliderLabel}>
                        <span style={s.sliderLabelText}>RAM <span style={{ color: '#555' }}>({ramLibre} GB libres)</span></span>
                        <span style={s.sliderValue}>{ram} GB</span>
                    </div>
                    <input style={s.slider} type="range"
                           min={1} max={Math.min(8, ramLibre)} step={0.5} value={ram}
                           onChange={e => setRam(Number(e.target.value))} />
                </div>

                {error && <div style={s.error}>{error}</div>}

                <div style={s.btnRow}>
                    <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
                    <button style={s.btnCreate(loading)} onClick={handleCrear} disabled={loading}>
                        {loading ? 'Creando...' : 'Crear servidor'}
                    </button>
                </div>
            </div>
        </div>
    );
}
