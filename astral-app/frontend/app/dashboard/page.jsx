'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ServidorCard from '@/components/ServidorCard';
import CrearServidorModal from '@/components/CrearServidorModal';

const JUEGO_EMOJI  = { minecraft: '⛏️', zomboid: '🧟', valheim: '⚔️' };
const ESTADO_COLOR = { encendido: '#4ade80', apagado: '#555', iniciando: '#fbbf24', apagando: '#f97316' };
const PLANES = [{ id: 1, nombre: 'Básico' }, { id: 2, nombre: 'Estándar' }, { id: 3, nombre: 'Pro' }];

function NuevoUsuarioForm({ onCreado, onCancel }) {
    const [form, setForm] = useState({ username: '', email: '', password: '', plan_id: 1, rol: 'user' });
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await api.adminCrearUsuario({ ...form, plan_id: Number(form.plan_id) });
            onCreado();
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }

    const s = {
        overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' },
        card: { background: '#222', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '420px' },
        title: { color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '1.5rem' },
        field: { marginBottom: '1rem' },
        label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' },
        input: { width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '9px 12px', color: '#e0e0e0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
        select: { width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '9px 12px', color: '#e0e0e0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
        error: { background: '#3a1a1a', border: '1px solid #5a2020', color: '#f87171', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', marginBottom: '1rem' },
        btnRow: { display: 'flex', gap: '8px', marginTop: '1rem' },
        btnCancel: { flex: 1, padding: '9px', background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: '6px', color: '#aaa', fontSize: '13px', cursor: 'pointer' },
        btnCreate: { flex: 1, padding: '9px', background: '#1677ff', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 },
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
            <div style={s.card}>
                <p style={s.title}>Crear nuevo usuario</p>
                <form onSubmit={handleSubmit}>
                    <div style={s.field}>
                        <label style={s.label}>Usuario</label>
                        <input style={s.input} required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="nombre_usuario" />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Email</label>
                        <input style={s.input} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@email.com" />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Contraseña</label>
                        <input style={s.input} type="password" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={s.field}>
                            <label style={s.label}>Plan</label>
                            <select style={s.select} value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}>
                                {PLANES.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                        <div style={s.field}>
                            <label style={s.label}>Rol</label>
                            <select style={s.select} value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                                <option value="user">Usuario</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                    {error && <div style={s.error}>{error}</div>}
                    <div style={s.btnRow}>
                        <button type="button" style={s.btnCancel} onClick={onCancel}>Cancelar</button>
                        <button type="submit" style={s.btnCreate} disabled={loading}>{loading ? 'Creando...' : 'Crear usuario'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AdminPanel({ usuarioActualId }) {
    const [usuarios, setUsuarios]     = useState([]);
    const [expandido, setExpandido]   = useState(null);
    const [servidores, setServidores] = useState({});
    const [nuevaPass, setNuevaPass]   = useState({});
    const [guardando, setGuardando]   = useState({});
    const [loading, setLoading]       = useState(true);
    const [modalNuevo, setModalNuevo] = useState(false);

    async function cargar() {
        setLoading(true);
        try { setUsuarios(await api.adminListarUsuarios()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    useEffect(() => { cargar(); }, []);

    async function toggleExpand(id) {
        if (expandido === id) { setExpandido(null); return; }
        setExpandido(id);
        if (!servidores[id]) {
            try {
                const srvs = await api.adminServidoresUsuario(id);
                setServidores(prev => ({ ...prev, [id]: srvs }));
            } catch {}
        }
    }

    async function cambiarPassword(id) {
        const pass = nuevaPass[id];
        if (!pass || pass.length < 6) return alert('Mínimo 6 caracteres');
        setGuardando(g => ({ ...g, [id]: 'pass' }));
        try { await api.adminCambiarPassword(id, pass); setNuevaPass(p => ({ ...p, [id]: '' })); alert('Contraseña actualizada'); }
        catch (e) { alert(e.message); }
        finally { setGuardando(g => ({ ...g, [id]: null })); }
    }

    async function toggleActivo(id, actual) {
        setGuardando(g => ({ ...g, [id]: 'activo' }));
        try { await api.adminToggleActivo(id, !actual); await cargar(); }
        catch (e) { alert(e.message); }
        finally { setGuardando(g => ({ ...g, [id]: null })); }
    }

    async function cambiarPlan(id, plan_id) {
        setGuardando(g => ({ ...g, [id]: 'plan' }));
        try { await api.adminCambiarPlan(id, Number(plan_id)); await cargar(); }
        catch (e) { alert(e.message); }
        finally { setGuardando(g => ({ ...g, [id]: null })); }
    }

    async function cambiarRol(id, rol) {
        setGuardando(g => ({ ...g, [id]: 'rol' }));
        try { await api.adminCambiarRol(id, rol); await cargar(); }
        catch (e) { alert(e.message); }
        finally { setGuardando(g => ({ ...g, [id]: null })); }
    }

    async function eliminarUsuario(id, username) {
        if (!confirm(`¿Eliminar al usuario "${username}"? Esta acción no se puede deshacer.`)) return;
        setGuardando(g => ({ ...g, [id]: 'eliminar' }));
        try { await api.adminEliminarUsuario(id); await cargar(); if (expandido === id) setExpandido(null); }
        catch (e) { alert(e.message); }
        finally { setGuardando(g => ({ ...g, [id]: null })); }
    }

    const s = {
        wrap: { marginTop: '2rem' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
        title: { fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 },
        headerBtns: { display: 'flex', gap: '8px' },
        reloadBtn: { background: '#2a2a2a', border: '1px solid #3a3a3a', color: '#aaa', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' },
        newBtn: { background: '#1677ff', border: 'none', color: '#fff', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 },
        userCard: { background: '#222', border: '1px solid #2e2e2e', borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' },
        userRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' },
        userLeft: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
        avatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#aaa', fontWeight: 600, flexShrink: 0 },
        userName: { color: '#fff', fontSize: '14px', fontWeight: 600 },
        userMeta: { color: '#666', fontSize: '12px' },
        badge: (color) => ({ background: color + '22', color, borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 600 }),
        userRight: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 },
        statChip: { fontSize: '12px', color: '#666' },
        chevron: (open) => ({ color: '#555', fontSize: '12px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }),
        detail: { padding: '0 16px 16px', borderTop: '1px solid #2a2a2a' },
        detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' },
        detailSection: { background: '#1a1a1a', borderRadius: '8px', padding: '12px' },
        detailLabel: { fontSize: '11px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
        inputRow: { display: 'flex', gap: '8px' },
        input: { flex: 1, background: '#222', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '7px 10px', color: '#e0e0e0', fontSize: '13px', outline: 'none' },
        select: { flex: 1, background: '#222', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '7px 10px', color: '#e0e0e0', fontSize: '13px', outline: 'none' },
        actionBtn: (color) => ({ background: color, color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }),
        srvItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#222', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px' },
        srvName: { color: '#ddd', fontSize: '13px' },
        srvMeta: { color: '#555', fontSize: '11px' },
        dangerSection: { background: '#2a1a1a', border: '1px solid #5a2020', borderRadius: '8px', padding: '12px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        dangerText: { color: '#f87171', fontSize: '13px' },
        dangerBtn: { background: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 },
    };

    if (loading) return <div style={{ color: '#555', fontSize: '14px', padding: '2rem 0' }}>Cargando usuarios...</div>;

    return (
        <div style={s.wrap}>
            {modalNuevo && (
                <NuevoUsuarioForm
                    onCreado={() => { setModalNuevo(false); cargar(); }}
                    onCancel={() => setModalNuevo(false)}
                />
            )}

            <div style={s.header}>
                <p style={s.title}>👑 Panel de administración</p>
                <div style={s.headerBtns}>
                    <button style={s.reloadBtn} onClick={cargar}>↺ Actualizar</button>
                    <button style={s.newBtn} onClick={() => setModalNuevo(true)}>+ Nuevo usuario</button>
                </div>
            </div>

            {usuarios.filter(u => u.id !== usuarioActualId).map(u => (
                <div key={u.id} style={s.userCard}>
                    <div style={s.userRow} onClick={() => toggleExpand(u.id)}>
                        <div style={s.userLeft}>
                            <div style={s.avatar}>{u.username[0].toUpperCase()}</div>
                            <div>
                                <p style={s.userName}>{u.username}</p>
                                <p style={s.userMeta}>{u.email}</p>
                            </div>
                            <span style={s.badge(u.activo ? '#4ade80' : '#f87171')}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                            <span style={s.badge('#60a5fa')}>{u.plan}</span>
                            {u.rol === 'admin' && <span style={s.badge('#fbbf24')}>Admin</span>}
                        </div>
                        <div style={s.userRight}>
                            <span style={s.statChip}>🖥️ {u.cpu_usada}/{u.cpu_limit}</span>
                            <span style={s.statChip}>💾 {u.ram_usada}/{u.ram_limit_gb} GB</span>
                            <span style={s.statChip}>📦 {u.total_servidores} srv</span>
                            <span style={s.chevron(expandido === u.id)}>▼</span>
                        </div>
                    </div>

                    {expandido === u.id && (
                        <div style={s.detail}>
                            <div style={s.detailGrid}>
                                <div style={s.detailSection}>
                                    <p style={s.detailLabel}>Contraseña</p>
                                    <div style={s.inputRow}>
                                        <input style={s.input} type="password" placeholder="Nueva contraseña"
                                               value={nuevaPass[u.id] || ''}
                                               onChange={e => setNuevaPass(p => ({ ...p, [u.id]: e.target.value }))} />
                                        <button style={s.actionBtn('#1677ff')} disabled={guardando[u.id] === 'pass'}
                                                onClick={() => cambiarPassword(u.id)}>
                                            {guardando[u.id] === 'pass' ? '...' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>

                                <div style={s.detailSection}>
                                    <p style={s.detailLabel}>Plan</p>
                                    <div style={s.inputRow}>
                                        <select style={s.select} value={u.plan_id || 1}
                                                onChange={e => cambiarPlan(u.id, e.target.value)}>
                                            {PLANES.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={s.detailSection}>
                                    <p style={s.detailLabel}>Estado</p>
                                    <button style={s.actionBtn(u.activo ? '#c0392b' : '#27ae60')}
                                            disabled={guardando[u.id] === 'activo'}
                                            onClick={() => toggleActivo(u.id, u.activo)}>
                                        {guardando[u.id] === 'activo' ? '...' : u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                                    </button>
                                </div>

                                <div style={s.detailSection}>
                                    <p style={s.detailLabel}>Rol</p>
                                    <div style={s.inputRow}>
                                        <select style={s.select} value={u.rol}
                                                onChange={e => cambiarRol(u.id, e.target.value)}
                                                disabled={guardando[u.id] === 'rol'}>
                                            <option value="user">Usuario</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ ...s.detailSection, marginTop: '10px' }}>
                                <p style={s.detailLabel}>Servidores ({u.total_servidores})</p>
                                {!servidores[u.id] ? (
                                    <p style={{ color: '#555', fontSize: '12px' }}>Cargando...</p>
                                ) : servidores[u.id].length === 0 ? (
                                    <p style={{ color: '#555', fontSize: '12px' }}>Sin servidores</p>
                                ) : servidores[u.id].map(srv => (
                                    <div key={srv.id} style={s.srvItem}>
                                        <div>
                                            <p style={s.srvName}>{JUEGO_EMOJI[srv.juego]} {srv.nombre}</p>
                                            <p style={s.srvMeta}>{srv.cpu_asignada} vCPU · {srv.ram_asignada_gb} GB · :{srv.puerto}</p>
                                        </div>
                                        <span style={s.badge(ESTADO_COLOR[srv.estado] || '#555')}>{srv.estado}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={s.dangerSection}>
                                <p style={s.dangerText}>⚠️ Eliminar usuario permanentemente</p>
                                <button style={s.dangerBtn}
                                        disabled={guardando[u.id] === 'eliminar'}
                                        onClick={() => eliminarUsuario(u.id, u.username)}>
                                    {guardando[u.id] === 'eliminar' ? '...' : 'Eliminar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const [usuario, setUsuario]       = useState(null);
    const [servidores, setServidores] = useState([]);
    const [modal, setModal]           = useState(false);
    const [loading, setLoading]       = useState(true);
    const [vistaAdmin, setVistaAdmin] = useState(false);
    const router = useRouter();

    const cargar = useCallback(async () => {
        try {
            const [me, srvs] = await Promise.all([api.me(), api.listarServidores()]);
            setUsuario(me);
            setServidores(srvs);
        } catch { router.push('/'); }
        finally { setLoading(false); }
    }, [router]);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => { const t = setInterval(cargar, 5000); return () => clearInterval(t); }, [cargar]);

    async function handleLogout() { await api.logout(); router.push('/'); }

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
            <p style={{ color: '#666' }}>Cargando...</p>
        </div>
    );

    const cpuUsada = servidores.reduce((acc, s) => acc + s.cpu_asignada, 0);
    const ramUsada = servidores.reduce((acc, s) => acc + s.ram_asignada_gb, 0);
    const esAdmin  = usuario?.rol === 'admin';

    return (
        <div style={{ minHeight: '100vh', background: '#1a1a1a', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
            <nav style={{ background: '#222', borderBottom: '1px solid #2e2e2e', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <img src="/panel.svg" alt="Astral App" style={{ height: '32px', width: 'auto' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {esAdmin && (
                        <button onClick={() => setVistaAdmin(v => !v)}
                                style={{ background: vistaAdmin ? '#1677ff' : '#2a2a2a', color: vistaAdmin ? '#fff' : '#888', border: '1px solid ' + (vistaAdmin ? '#1677ff' : '#3a3a3a'), borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                            👑 Admin
                        </button>
                    )}
                    <span style={{ fontSize: '13px', color: '#888' }}>
                        {usuario?.username}
                        <span style={{ background: '#1677ff22', color: '#60a5fa', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, marginLeft: '6px' }}>{usuario?.plan}</span>
                    </span>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#666', fontSize: '13px', cursor: 'pointer' }}>Cerrar sesión</button>
                </div>
            </nav>

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
                {vistaAdmin && esAdmin ? (
                    <AdminPanel usuarioActualId={usuario?.id} />
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '2rem' }}>
                            {[
                                { label: 'CPU en uso', valor: cpuUsada, limite: usuario?.cpu_limit, unit: 'vCPU' },
                                { label: 'RAM en uso', valor: ramUsada, limite: usuario?.ram_limit_gb, unit: 'GB' },
                            ].map(({ label, valor, limite, unit }) => (
                                <div key={label} style={{ background: '#222', border: '1px solid #2e2e2e', borderRadius: '10px', padding: '1.25rem' }}>
                                    <p style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>{label}</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
                                        {valor}<span style={{ color: '#555', fontSize: '14px', fontWeight: 400 }}>/{limite} {unit}</span>
                                    </p>
                                    <div style={{ height: '6px', background: '#2a2a2a', borderRadius: '3px', marginTop: '10px' }}>
                                        <div style={{ height: '6px', borderRadius: '3px', background: '#1677ff', width: `${Math.min((valor / limite) * 100, 100)}%`, transition: 'width 0.3s' }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Mis servidores</p>
                            <button onClick={() => setModal(true)}
                                    style={{ background: '#1677ff', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                                + Nuevo servidor
                            </button>
                        </div>

                        {servidores.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#555' }}>
                                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖥️</p>
                                <p>No tienes servidores todavía.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                                {servidores.map(srv => (
                                    <ServidorCard key={srv.id} servidor={srv} onRefresh={cargar} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {modal && (
                <CrearServidorModal
                    usuario={usuario}
                    cpuUsada={cpuUsada}
                    ramUsada={ramUsada}
                    onClose={() => setModal(false)}
                    onCreado={() => { setModal(false); cargar(); }}
                />
            )}
        </div>
    );
}
