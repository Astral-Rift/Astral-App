'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import GestorArchivos from '@/components/GestorArchivos';

const JUEGO_EMOJI = { minecraft: '⛏️', zomboid: '🧟', valheim: '⚔️' };

const SECCIONES = [
    { id: 'consola',  label: 'Console',  icon: '▶' },
    { id: 'info',     label: 'Info',     icon: 'ℹ' },
    { id: 'archivos', label: 'Files',    icon: '📁' },
    { id: 'logs',     label: 'Logs',     icon: '≡'  },
];

const ESTADO_BADGE = {
    encendido: { bg: '#1c3a1c', text: '#4ade80', dot: '#4ade80' },
    apagado:   { bg: '#2e2e2e', text: '#888',    dot: '#555'    },
    iniciando: { bg: '#3a2e00', text: '#fbbf24', dot: '#fbbf24' },
    apagando:  { bg: '#3a1a00', text: '#f97316', dot: '#f97316' },
};

function RightCard({ icon, label, value, valueColor, sub }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '11px', color: '#666', margin: 0, marginBottom: '2px' }}>{label}</p>
                <p style={{ fontSize: '13px', color: valueColor || '#ddd', margin: 0, fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{value}</p>
                {sub && <p style={{ fontSize: '10px', color: '#555', margin: 0, marginTop: '1px' }}>{sub}</p>}
            </div>
        </div>
    );
}

function RightCardBar({ icon, label, value, pct, barColor, sub }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '11px', color: '#ddd', margin: 0, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
                </div>
                <div style={{ height: '4px', background: '#333', borderRadius: '2px' }}>
                    <div style={{ height: '4px', borderRadius: '2px', width: `${Math.min(pct, 100)}%`, background: barColor, transition: 'width 0.5s' }} />
                </div>
                {sub && <p style={{ fontSize: '10px', color: '#555', margin: 0, marginTop: '3px', textAlign: 'right' }}>{sub}</p>}
            </div>
        </div>
    );
}

export default function ServidorPage() {
    const { id }  = useParams();
    const router  = useRouter();

    const [servidor, setServidor]     = useState(null);
    const [estadoPrev, setEstadoPrev] = useState(null);
    const [seccion, setSeccion]       = useState('consola');
    const [loading, setLoading]       = useState(true);
    const [accion, setAccion]         = useState(false);

    const [consolaLineas, setConsolaLineas] = useState([]);
    const [ultimosLogs, setUltimosLogs]     = useState('');
    const [comando, setComando]             = useState('');
    const [enviando, setEnviando]           = useState(false);
    const consolaRef = useRef(null);

    const [logs, setLogs]   = useState('');
    const [stats, setStats] = useState(null);

    // Recursos editables
    const [cpuEdit, setCpuEdit]       = useState(null);
    const [ramEdit, setRamEdit]       = useState(null);
    const [guardandoRec, setGuardandoRec] = useState(false);
    const [errorRec, setErrorRec]     = useState('');

    const cargar = useCallback(async () => {
        try {
            const srvs = await api.listarServidores();
            const srv  = srvs.find(s => s.id === Number(id));
            if (!srv) return router.push('/dashboard');
            setServidor(srv);
        } catch { router.push('/'); }
        finally { setLoading(false); }
    }, [id, router]);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => { const t = setInterval(cargar, 4000); return () => clearInterval(t); }, [cargar]);

    // Inicializar sliders cuando carga el servidor
    useEffect(() => {
        if (servidor && cpuEdit === null) {
            setCpuEdit(servidor.cpu_asignada);
            setRamEdit(servidor.ram_asignada_gb);
        }
    }, [servidor]);

    useEffect(() => {
        if (!servidor) return;
        if (estadoPrev && estadoPrev !== servidor.estado) {
            const estabaApagado = estadoPrev === 'apagado' || estadoPrev === 'apagando';
            const ahoraEnciende = servidor.estado === 'iniciando' || servidor.estado === 'encendido';
            if (estabaApagado && ahoraEnciende) { setConsolaLineas([]); setUltimosLogs(''); }
        }
        setEstadoPrev(servidor.estado);
    }, [servidor?.estado]);

    useEffect(() => {
        if (!servidor || servidor.estado !== 'encendido') return;
        const intervalo = seccion === 'consola' ? 1000 : 5000;
        async function refrescarLogs() {
            try {
                const data = await api.logsServidor(id);
                setLogs(data.logs);
                setUltimosLogs(prev => {
                    if (data.logs === prev) return prev;
                    const lineasNuevas = data.logs.split('\n').filter(l => l.trim());
                    const prevLineas   = prev.split('\n').filter(l => l.trim());
                    const nuevas = lineasNuevas.slice(prevLineas.length);
                    if (nuevas.length > 0) {
                        setConsolaLineas(cl => [...cl, ...nuevas.map(l => ({ tipo: 'log', texto: l }))].slice(-500));
                    }
                    return data.logs;
                });
                setTimeout(() => { if (consolaRef.current) consolaRef.current.scrollTop = consolaRef.current.scrollHeight; }, 50);
            } catch {}
        }
        refrescarLogs();
        const t = setInterval(refrescarLogs, intervalo);
        return () => clearInterval(t);
    }, [seccion, servidor?.estado, id]);

    useEffect(() => {
        if (!servidor || servidor.estado !== 'encendido') { setStats(null); return; }
        async function refrescarStats() {
            try { const data = await api.statsServidor(id); if (!data.offline) setStats(data); } catch {}
        }
        refrescarStats();
        const t = setInterval(refrescarStats, 3000);
        return () => clearInterval(t);
    }, [servidor?.estado, id]);

    async function handleEncender() {
        setAccion(true);
        try { await api.encenderServidor(id); await cargar(); }
        catch (e) { alert(e.message); } finally { setAccion(false); }
    }
    async function handleApagar() {
        if (!confirm('¿Apagar el servidor?')) return;
        setAccion(true);
        try { await api.apagarServidor(id); await cargar(); }
        catch (e) { alert(e.message); } finally { setAccion(false); }
    }
    async function handleReiniciar() {
        if (!confirm('¿Reiniciar el servidor?')) return;
        setAccion(true);
        try { await api.reiniciarServidor(id); await cargar(); }
        catch (e) { alert(e.message); } finally { setAccion(false); }
    }
    async function handleComando(e) {
        e.preventDefault();
        if (!comando.trim()) return;
        setEnviando(true);
        const cmd = comando.trim();
        setComando('');
        setConsolaLineas(cl => [...cl, { tipo: 'cmd', texto: cmd }]);
        try {
            const res = await api.ejecutarComando(id, cmd);
            if (res.output) setConsolaLineas(cl => [...cl, { tipo: 'out', texto: res.output }]);
        } catch (e) {
            setConsolaLineas(cl => [...cl, { tipo: 'err', texto: e.message }]);
        } finally {
            setEnviando(false);
            setTimeout(() => { if (consolaRef.current) consolaRef.current.scrollTop = consolaRef.current.scrollHeight; }, 50);
        }
    }

    async function handleGuardarRecursos() {
        setGuardandoRec(true); setErrorRec('');
        try {
            await api.actualizarRecursos(id, cpuEdit, ramEdit);
            await cargar();
        } catch (e) { setErrorRec(e.message); }
        finally { setGuardandoRec(false); }
    }

    if (loading || !servidor) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
            <p style={{ color: '#666' }}>Cargando...</p>
        </div>
    );

    const encendido    = servidor.estado === 'encendido';
    const enTransicion = servidor.estado === 'iniciando' || servidor.estado === 'apagando';
    const badge        = ESTADO_BADGE[servidor.estado] || ESTADO_BADGE.apagado;
    const cpuBarColor  = stats ? (stats.cpu > 80 ? '#ef4444' : stats.cpu > 50 ? '#f59e0b' : '#1677ff') : '#1677ff';
    const ramBarColor  = stats ? (stats.ramMb / stats.ramLimiteMb > 0.8 ? '#ef4444' : '#1677ff') : '#1677ff';

    return (
        <div style={{ height: '100vh', background: '#1a1a1a', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'ui-monospace, monospace', color: '#ccc' }}>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:#1a1a1a} ::-webkit-scrollbar-thumb{background:#3a3a3a;border-radius:3px}`}</style>

            {/* TOPBAR */}
            <header style={{ background: '#222', borderBottom: '1px solid #2e2e2e', padding: '0 1.5rem', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }} onClick={() => router.push('/dashboard')}>← Dashboard</button>
                    <span style={{ color: '#3a3a3a' }}>|</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{JUEGO_EMOJI[servidor.juego]} {servidor.nombre}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: badge.bg, color: badge.text, borderRadius: '4px', padding: '2px 8px', fontSize: '11px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badge.dot, display: 'inline-block', animation: enTransicion ? 'pulse 1s infinite' : 'none' }} />
                        {servidor.estado}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {!encendido && !enTransicion && (
                        <button style={{ background: '#1677ff', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }} onClick={handleEncender} disabled={accion}>▶ Start</button>
                    )}
                    {encendido && (<>
                        <button style={{ background: '#333', color: '#ccc', border: '1px solid #444', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }} onClick={handleReiniciar} disabled={accion}>↺ Restart</button>
                        <button style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }} onClick={handleApagar} disabled={accion}>■ Stop</button>
                    </>)}
                    {enTransicion && <span style={{ color: '#fbbf24', fontSize: '13px', alignSelf: 'center' }}>{servidor.estado === 'iniciando' ? 'Starting...' : 'Stopping...'}</span>}
                </div>
            </header>

            {/* BODY */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* SIDEBAR */}
                <aside style={{ width: '180px', background: '#222', borderRight: '1px solid #2e2e2e', display: 'flex', flexDirection: 'column', flexShrink: 0, paddingTop: '8px' }}>
                    <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 16px 4px' }}>{servidor.nombre}</p>
                    {SECCIONES.map(s => (
                        <button key={s.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', cursor: 'pointer', background: seccion === s.id ? '#2a2a2a' : 'none', color: seccion === s.id ? '#fff' : '#888', border: 'none', borderLeft: seccion === s.id ? '2px solid #1677ff' : '2px solid transparent', width: '100%', textAlign: 'left' }}
                            onClick={() => setSeccion(s.id)}>
                            <span style={{ fontSize: '14px', opacity: 0.7 }}>{s.icon}</span>
                            <span>{s.label}</span>
                        </button>
                    ))}
                </aside>

                {/* MAIN */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1a1a1a' }}>

                    {/* CONSOLA */}
                    {seccion === 'consola' && (
                        <>
                            <div ref={consolaRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', lineHeight: '1.7' }}>
                                {consolaLineas.length === 0 && <span style={{ color: '#555' }}>{encendido ? 'Cargando logs...' : 'Servidor apagado'}</span>}
                                {consolaLineas.map((linea, i) => {
                                    if (linea.tipo === 'cmd') return <div key={i} style={{ color: '#60a5fa', marginTop: '4px' }}><span style={{ color: '#444', marginRight: '6px' }}>$</span>{linea.texto}</div>;
                                    if (linea.tipo === 'out') return <div key={i} style={{ color: '#a3e635', paddingLeft: '14px' }}>{linea.texto}</div>;
                                    if (linea.tipo === 'err') return <div key={i} style={{ color: '#f87171', paddingLeft: '14px' }}>❌ {linea.texto}</div>;
                                    const isErr  = linea.texto.includes('ERROR') || linea.texto.includes('FATAL');
                                    const isWarn = linea.texto.includes('WARN');
                                    const isRcon = linea.texto.includes('RCON');
                                    return <div key={i} style={{ color: isErr ? '#f87171' : isWarn ? '#fbbf24' : isRcon ? '#a78bfa' : '#9ca3af', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{linea.texto}</div>;
                                })}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderTop: '1px solid #2e2e2e', background: '#222', flexShrink: 0 }}>
                                <span style={{ color: '#555', fontSize: '14px', flexShrink: 0 }}>{'>'}</span>
                                <input style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e0e0e0', fontFamily: 'ui-monospace, monospace', fontSize: '13px' }}
                                       value={comando} onChange={e => setComando(e.target.value)}
                                       onKeyDown={e => { if (e.key === 'Enter') handleComando(e); }}
                                       disabled={!encendido || enviando}
                                       placeholder={encendido ? 'Type a command...' : 'Server offline'}
                                       autoComplete="off" spellCheck={false} />
                                <button style={{ background: '#1677ff', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, opacity: (!encendido || enviando || !comando.trim()) ? 0.4 : 1 }}
                                        onClick={handleComando} disabled={!encendido || enviando || !comando.trim()}>
                                    {enviando ? '...' : 'Send'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* INFO */}
                    {seccion === 'info' && (
                        <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Info básica */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {[['Nombre', servidor.nombre], ['Juego', servidor.juego], ['Estado', servidor.estado], ['Puerto', servidor.puerto]].map(([k, v]) => (
                                    <div key={k} style={{ background: '#222', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '12px' }}>
                                        <p style={{ fontSize: '11px', color: '#555', margin: 0, marginBottom: '4px' }}>{k}</p>
                                        <p style={{ fontSize: '13px', color: '#ddd', margin: 0, textTransform: 'capitalize' }}>{v}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Dirección de conexión */}
                            {encendido && (
                                <div style={{ background: '#1a2a3a', border: '1px solid #1677ff44', borderRadius: '6px', padding: '12px' }}>
                                    <p style={{ fontSize: '11px', color: '#4a9eff', margin: 0, marginBottom: '4px' }}>Dirección de conexión</p>
                                    <p style={{ fontSize: '15px', color: '#60a5fa', margin: 0, fontWeight: 600 }}>TU_DOMINIO:{servidor.puerto}</p>
                                </div>
                            )}

                            {/* Modificar recursos — solo si está apagado */}
                            <div style={{ background: '#222', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>Recursos asignados</p>
                                    {!encendido && !enTransicion && (
                                        <span style={{ background: '#1c3a1c', color: '#4ade80', borderRadius: '4px', padding: '2px 8px', fontSize: '11px' }}>Editable</span>
                                    )}
                                    {(encendido || enTransicion) && (
                                        <span style={{ background: '#2a2a2a', color: '#666', borderRadius: '4px', padding: '2px 8px', fontSize: '11px' }}>Apaga el servidor para editar</span>
                                    )}
                                </div>

                                {/* CPU slider */}
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', color: '#666' }}>CPU</span>
                                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{cpuEdit} vCPU</span>
                                    </div>
                                    <input type="range" min={1} max={4} step={1} value={cpuEdit || servidor.cpu_asignada}
                                           disabled={encendido || enTransicion}
                                           onChange={e => setCpuEdit(Number(e.target.value))}
                                           style={{ width: '100%', accentColor: '#1677ff', opacity: (encendido || enTransicion) ? 0.4 : 1 }} />
                                </div>

                                {/* RAM slider */}
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', color: '#666' }}>RAM</span>
                                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{ramEdit} GB</span>
                                    </div>
                                    <input type="range" min={0.5} max={8} step={0.5} value={ramEdit || servidor.ram_asignada_gb}
                                           disabled={encendido || enTransicion}
                                           onChange={e => setRamEdit(Number(e.target.value))}
                                           style={{ width: '100%', accentColor: '#1677ff', opacity: (encendido || enTransicion) ? 0.4 : 1 }} />
                                </div>

                                {errorRec && (
                                    <p style={{ background: '#3a1a1a', border: '1px solid #5a2020', color: '#f87171', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', marginBottom: '10px' }}>{errorRec}</p>
                                )}

                                {!encendido && !enTransicion && (
                                    <button onClick={handleGuardarRecursos} disabled={guardandoRec || (cpuEdit === servidor.cpu_asignada && ramEdit === servidor.ram_asignada_gb)}
                                            style={{ width: '100%', background: '#1677ff', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: guardandoRec ? 0.6 : 1 }}>
                                        {guardandoRec ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ARCHIVOS */}
                    {seccion === 'archivos' && (
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                            <GestorArchivos servidorId={id} juego={servidor.juego} />
                        </div>
                    )}

                    {/* LOGS */}
                    {seccion === 'logs' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                                <span style={{ color: '#666', fontSize: '12px' }}>Logs completos</span>
                                <span style={{ color: '#444', fontSize: '11px' }}>{encendido ? 'actualizando cada 5s' : 'servidor apagado'}</span>
                            </div>
                            <pre style={{ flex: 1, overflowY: 'auto', margin: 0, background: '#1a1a1a', color: '#9ca3af', fontFamily: 'ui-monospace, monospace', fontSize: '11px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '12px' }}>
                                {logs || (encendido ? 'Cargando...' : 'Sin logs disponibles')}
                            </pre>
                        </div>
                    )}
                </main>

                {/* PANEL DERECHO */}
                <aside style={{ width: '240px', background: '#222', borderLeft: '1px solid #2e2e2e', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
                    <RightCard icon="📡" label="Address" value={encendido ? `TU_DOMINIO:${servidor.puerto}` : 'Offline'} valueColor={encendido ? '#60a5fa' : '#555'} />
                    <RightCard icon="🕐" label="Uptime" value={encendido ? 'Online' : 'Offline'} valueColor={encendido ? '#4ade80' : '#555'} />

                    {encendido && stats ? (<>
                        <RightCardBar icon="🖥️" label="CPU Load" value={`${stats.cpu}%`} pct={stats.cpu} barColor={cpuBarColor} />
                        <RightCardBar icon="💾" label="Memory" value={`${stats.ramMb} MiB`} pct={(stats.ramMb / stats.ramLimiteMb) * 100} barColor={ramBarColor} sub={`/ ${stats.ramLimiteMb} MiB`} />
                        <RightCard icon="⬇️" label="Network (Inbound)"  value={`${stats.rxMb} MB`} />
                        <RightCard icon="⬆️" label="Network (Outbound)" value={`${stats.txMb} MB`} />
                    </>) : (<>
                        <RightCard icon="🖥️" label="CPU Load"           value="Offline" valueColor="#555" />
                        <RightCard icon="💾" label="Memory"             value="Offline" valueColor="#555" />
                        <RightCard icon="⬇️" label="Network (Inbound)"  value="Offline" valueColor="#555" />
                        <RightCard icon="⬆️" label="Network (Outbound)" value="Offline" valueColor="#555" />
                    </>)}
                    <RightCard icon="💿" label="Disk" value={`${servidor.ram_asignada_gb * 5} GiB`} valueColor="#ddd" />
                </aside>
            </div>
        </div>
    );
}
