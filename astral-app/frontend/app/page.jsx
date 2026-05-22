'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const PLANES = [
    {
        juego: 'Minecraft',
        img: '/minecraft.jpg',
        icon: '/mc.png',
        desc: 'Crea tu mundo, construye sin límites. Vanilla, Forge, Fabric — elige tu versión.',
        tags: ['Vanilla', 'Forge', 'Fabric', 'Mods'],
        color: '#4ade80',
    },
    {
        juego: 'Project Zomboid',
        img: '/project.jpg',
        icon: '/projectz.png',
        desc: 'Sobrevive con tus amigos al apocalipsis zombie. Multiplayer con mods.',
        tags: ['Supervivencia', 'Mods', 'Multijugador'],
        color: '#f87171',
    },
    {
        juego: 'Valheim',
        img: '/valheim.jpg',
        icon: '/valheimpng.png',
        desc: 'Explora, construye y combate en el mundo nórdico. Servidor dedicado para tu tribu.',
        tags: ['Vikings', 'Exploración', 'Cooperativo'],
        color: '#fbbf24',
    },
];

export default function Home() {
    const [tab, setTab]         = useState('login');
    const [username, setUser]   = useState('');
    const [password, setPass]   = useState('');
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [contactForm, setContactForm]     = useState({ nombre: '', email: '', mensaje: '' });
    const [contactLoading, setContactLoading] = useState(false);
    const [contactError, setContactError]   = useState('');
    const [enviado, setEnviado]             = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true); setError('');
        try { await api.login(username, password); router.push('/dashboard'); }
        catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }

    async function handleContacto(e) {
        e.preventDefault();
        setContactLoading(true); setContactError('');
        try {
            const res = await fetch('/api/contacto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactForm),
            });
            if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Error al enviar'); }
            setEnviado(true);
        } catch (err) { setContactError(err.message); }
        finally { setContactLoading(false); }
    }

    const s = {
        page:     { minHeight: '100vh', background: '#1a1a1a', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#ccc' },
        hero:     { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem 3rem', textAlign: 'center', position: 'relative', overflow: 'hidden', backgroundImage: 'url(/void.gif)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' },
        logoImg:  { width: '200px', height: 'auto', marginBottom: '1rem' },
        heroTitle:{ fontSize: '42px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' },
        heroSub:  { color: '#666', fontSize: '16px', marginTop: '0.5rem', marginBottom: '2.5rem' },
        card:     { width: '100%', maxWidth: '440px', background: '#222', borderRadius: '12px', border: '1px solid #2e2e2e', padding: '2rem', margin: '0 auto' },
        tabs:     { display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '4px', marginBottom: '1.5rem', gap: '4px' },
        tab:  (a) => ({ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: a ? '#1677ff' : 'transparent', color: a ? '#fff' : '#666', transition: 'all 0.15s' }),
        label:    { display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' },
        input:    { width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '10px 14px', color: '#e0e0e0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
        textarea: { width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '10px 14px', color: '#e0e0e0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' },
        field:    { marginBottom: '1rem' },
        errorBox: { background: '#3a1a1a', border: '1px solid #5a2020', color: '#f87171', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', marginBottom: '1rem' },
        btn:      { width: '100%', background: '#1677ff', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' },

        // Sección juegos
        gamesSection: { padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto' },
        gamesSectionTitle: { textAlign: 'center', fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' },
        gamesSectionSub:   { textAlign: 'center', color: '#555', fontSize: '15px', marginBottom: '3rem' },
        gamesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' },
        gameCard:  { background: '#222', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        gameImg:   { width: '100%', height: '180px', objectFit: 'cover', display: 'block' },
        gameBody:  { padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' },
        gameHeader:{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
        gameIcon:  { width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px' },
        gameName:  { color: '#fff', fontWeight: 700, fontSize: '16px' },
        gameDesc:  { color: '#888', fontSize: '13px', lineHeight: '1.6', marginBottom: '12px', flex: 1 },
        gameTags:  { display: 'flex', flexWrap: 'wrap', gap: '6px' },
        gameTag:   (color) => ({ background: color + '15', color: color, borderRadius: '4px', padding: '3px 9px', fontSize: '11px', fontWeight: 600 }),

        // Footer
        footer: { borderTop: '1px solid #2a2a2a', padding: '2rem 1.5rem', textAlign: 'center', color: '#444', fontSize: '13px' },
    };

    return (
        <div style={s.page}>

            {/* HERO + LOGIN */}
            <div style={s.hero}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 0 }} />
                <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src="/panel.svg" alt="Astral App" style={s.logoImg} />
                <h1 style={s.heroTitle}>Astral App</h1>
                <p style={s.heroSub}>Tu plataforma de hosting de servidores de juego</p>

                <div style={s.card}>
                    <div style={s.tabs}>
                        {['login', 'contacto'].map(t => (
                            <button key={t} style={s.tab(tab === t)}
                                    onClick={() => { setTab(t); setError(''); setContactError(''); }}>
                                {t === 'login' ? 'Iniciar sesión' : 'Contacta con nosotros'}
                            </button>
                        ))}
                    </div>

                    {tab === 'login' && (
                        <form onSubmit={handleLogin}>
                            <div style={s.field}>
                                <label style={s.label}>Usuario</label>
                                <input style={s.input} type="text" value={username}
                                       onChange={e => setUser(e.target.value)}
                                       required placeholder="tu_usuario" autoComplete="username" />
                            </div>
                            <div style={s.field}>
                                <label style={s.label}>Contraseña</label>
                                <input style={s.input} type="password" value={password}
                                       onChange={e => setPass(e.target.value)}
                                       required placeholder="••••••••" autoComplete="current-password" />
                            </div>
                            {error && <div style={s.errorBox}>{error}</div>}
                            <button type="submit" style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                                {loading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </form>
                    )}

                    {tab === 'contacto' && (
                        enviado ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</p>
                                <p style={{ color: '#aaa', fontSize: '14px' }}>Mensaje enviado. Nos pondremos en contacto contigo pronto.</p>
                                <button style={{ ...s.btn, marginTop: '1.5rem', background: '#2a2a2a', color: '#888' }}
                                        onClick={() => { setEnviado(false); setContactForm({ nombre: '', email: '', mensaje: '' }); }}>
                                    Enviar otro mensaje
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleContacto}>
                                <div style={s.field}>
                                    <label style={s.label}>Nombre</label>
                                    <input style={s.input} type="text" required
                                           value={contactForm.nombre}
                                           onChange={e => setContactForm(f => ({ ...f, nombre: e.target.value }))}
                                           placeholder="Tu nombre" />
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>Email</label>
                                    <input style={s.input} type="email" required
                                           value={contactForm.email}
                                           onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                                           placeholder="tu@email.com" />
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>Mensaje</label>
                                    <textarea style={s.textarea} required rows={4}
                                              value={contactForm.mensaje}
                                              onChange={e => setContactForm(f => ({ ...f, mensaje: e.target.value }))}
                                              placeholder="Cuéntanos qué plan te interesa..." />
                                </div>
                                {contactError && <div style={s.errorBox}>{contactError}</div>}
                                <button type="submit" style={{ ...s.btn, opacity: contactLoading ? 0.6 : 1 }} disabled={contactLoading}>
                                    {contactLoading ? 'Enviando...' : 'Enviar mensaje'}
                                </button>
                            </form>
                        )
                    )}
                </div>
                </div>
            </div>

            {/* SECCIÓN JUEGOS */}
            <div style={{ background: '#1f1f1f', borderTop: '1px solid #2a2a2a', borderBottom: '1px solid #2a2a2a', padding: '4rem 1.5rem' }}>
                <div style={s.gamesSection}>
                    <h2 style={s.gamesSectionTitle}>Juegos disponibles</h2>
                    <p style={s.gamesSectionSub}>Despliega tu servidor en segundos, sin complicaciones</p>
                    <div style={s.gamesGrid}>
                        {PLANES.map(p => (
                            <div key={p.juego} style={s.gameCard}>
                                <img src={p.img} alt={p.juego} style={s.gameImg} />
                                <div style={s.gameBody}>
                                    <div style={s.gameHeader}>
                                        <img src={p.icon} alt={p.juego} style={s.gameIcon} />
                                        <span style={s.gameName}>{p.juego}</span>
                                    </div>
                                    <p style={s.gameDesc}>{p.desc}</p>
                                    <div style={s.gameTags}>
                                        {p.tags.map(t => (
                                            <span key={t} style={s.gameTag(p.color)}>{t}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* PLANES */}
            <div style={{ padding: '4rem 1.5rem' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <h2 style={{ ...s.gamesSectionTitle, marginBottom: '0.5rem' }}>Planes</h2>
                    <p style={{ ...s.gamesSectionSub, marginBottom: '3rem' }}>Elige el plan que mejor se adapte a tus necesidades</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                        {[
                            { nombre: 'Básico',    cpu: 1, ram: 2,  puertos: 1, color: '#60a5fa', desc: 'Perfecto para empezar' },
                            { nombre: 'Estándar',  cpu: 2, ram: 4,  puertos: 2, color: '#a78bfa', desc: 'Para grupos medianos' },
                            { nombre: 'Pro',       cpu: 4, ram: 8,  puertos: 4, color: '#fbbf24', desc: 'Para comunidades grandes' },
                        ].map(plan => (
                            <div key={plan.nombre} style={{ background: '#222', border: `1px solid ${plan.color}33`, borderRadius: '12px', padding: '1.5rem' }}>
                                <p style={{ fontSize: '11px', color: plan.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{plan.desc}</p>
                                <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>{plan.nombre}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        ['🖥️', `${plan.cpu} vCPU`],
                                        ['💾', `${plan.ram} GB RAM`],
                                        ['🔌', `${plan.puertos} servidor${plan.puertos > 1 ? 'es' : ''}`],
                                        ['🎮', 'Minecraft, Zomboid, Valheim'],
                                        ['🔒', 'Panel de control incluido'],
                                    ].map(([icon, text]) => (
                                        <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#888' }}>
                                            <span>{icon}</span>
                                            <span>{text}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => { setTab('contacto'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        style={{ marginTop: '1.5rem', width: '100%', background: plan.color + '22', color: plan.color, border: `1px solid ${plan.color}44`, borderRadius: '6px', padding: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                    Solicitar acceso
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div style={s.footer}>
                <img src="/panel.svg" alt="Astral App" style={{ height: '28px', opacity: 0.3, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                <p>© 2026 Astral App — Hosting de servidores de juegos</p>
            </div>
        </div>
    );
}
