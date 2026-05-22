'use client';
import { useState, useEffect, useRef } from 'react';

const API = '/api';

async function apiFetch(url, opts = {}) {
    const headers = {};
    if (opts.body && typeof opts.body === 'string') headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { credentials: 'include', headers, ...opts });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

function formatBytes(bytes) {
    if (bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ICONO = {
    carpeta:      '📁',
    archivo:      '📄',
    properties:   '⚙️',
    yml:          '⚙️',
    yaml:         '⚙️',
    json:         '⚙️',
    jar:          '☕',
    dll:          '🔧',
    log:          '📋',
    txt:          '📝',
};

function getIcono(entrada) {
    if (entrada.tipo === 'carpeta') return ICONO.carpeta;
    const ext = entrada.nombre.split('.').pop().toLowerCase();
    return ICONO[ext] || ICONO.archivo;
}

export default function GestorArchivos({ servidorId, juego }) {
    const [ruta, setRuta]           = useState('');
    const [entradas, setEntradas]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [subiendo, setSubiendo]   = useState(false);
    const [editor, setEditor]       = useState(null);   // { ruta, nombre, contenido }
    const [guardando, setGuardando] = useState(false);
    const [error, setError]         = useState('');
    const inputRef = useRef();

    async function cargar(nuevaRuta) {
        setLoading(true);
        setError('');
        try {
            const data = await apiFetch(
                `${API}/servidores/${servidorId}/archivos?ruta=${encodeURIComponent(nuevaRuta)}`
            );
            setEntradas(data.entradas || []);
            setRuta(nuevaRuta);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { cargar(''); }, [servidorId]);

    // Navegar a carpeta o abrir editor
    async function handleEntrada(entrada) {
        if (entrada.tipo === 'carpeta') {
            if (entrada.permitido) cargar(entrada.ruta);
        } else if (entrada.editable) {
            try {
                const data = await apiFetch(
                    `${API}/servidores/${servidorId}/archivos/contenido?ruta=${encodeURIComponent(entrada.ruta)}`
                );
                setEditor({ ruta: entrada.ruta, nombre: entrada.nombre, contenido: data.contenido });
            } catch (err) {
                alert('Error abriendo archivo: ' + err.message);
            }
        }
    }

    // Guardar archivo editado
    async function handleGuardar() {
        setGuardando(true);
        try {
            await apiFetch(`${API}/servidores/${servidorId}/archivos/contenido`, {
                method: 'PUT',
                body: JSON.stringify({ ruta: editor.ruta, contenido: editor.contenido }),
            });
            setEditor(null);
            cargar(ruta);
        } catch (err) {
            alert('Error guardando: ' + err.message);
        } finally {
            setGuardando(false);
        }
    }

    // Subir archivo
    async function handleSubir(e) {
        const file = e.target.files[0];
        if (!file) return;
        setSubiendo(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(
                `${API}/servidores/${servidorId}/archivos?ruta=${encodeURIComponent(ruta)}`,
                { method: 'POST', credentials: 'include', body: formData }
            );
            if (!res.ok) throw new Error((await res.json()).error);
            cargar(ruta);
        } catch (err) {
            alert('Error subiendo: ' + err.message);
        } finally {
            setSubiendo(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    // Eliminar archivo
    async function handleEliminar(entrada) {
        if (!confirm(`¿Eliminar "${entrada.nombre}"?`)) return;
        try {
            await apiFetch(
                `${API}/servidores/${servidorId}/archivos?ruta=${encodeURIComponent(entrada.ruta)}`,
                { method: 'DELETE' }
            );
            cargar(ruta);
        } catch (err) {
            alert('Error eliminando: ' + err.message);
        }
    }

    // Breadcrumb
    const partes = ruta ? ruta.split('/') : [];
    const breadcrumb = [{ label: 'Raíz', ruta: '' }, ...partes.map((p, i) => ({
        label: p,
        ruta: partes.slice(0, i + 1).join('/'),
    }))];

    // ── EDITOR ────────────────────────────────────────────────────────────────
    if (editor) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setEditor(null)}
                            className="text-gray-400 hover:text-white transition-colors text-sm"
                        >
                            ← Volver
                        </button>
                        <span className="text-gray-600">/</span>
                        <span className="text-white text-sm font-medium">{editor.nombre}</span>
                    </div>
                    <button
                        onClick={handleGuardar}
                        disabled={guardando}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                                   text-white text-sm rounded-lg transition-colors"
                    >
                        {guardando ? 'Guardando...' : '💾 Guardar'}
                    </button>
                </div>
                <textarea
                    value={editor.contenido}
                    onChange={e => setEditor(prev => ({ ...prev, contenido: e.target.value }))}
                    className="w-full h-[500px] bg-gray-950 text-green-400 font-mono text-xs
                               rounded-lg p-4 border border-gray-700 focus:outline-none
                               focus:border-indigo-500 resize-none"
                    spellCheck={false}
                />
            </div>
        );
    }

    // ── EXPLORADOR ────────────────────────────────────────────────────────────
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">Gestor de archivos</h3>
                <div>
                    <input ref={inputRef} type="file" onChange={handleSubir}
                           className="hidden" id="file-upload" />
                    <label htmlFor="file-upload"
                           className={`cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-500
                                       text-white text-sm rounded-lg transition-colors inline-block
                                       ${subiendo ? 'opacity-50 pointer-events-none' : ''}`}>
                        {subiendo ? 'Subiendo...' : '↑ Subir archivo'}
                    </label>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
                {breadcrumb.map((parte, i) => (
                    <span key={parte.ruta} className="flex items-center gap-1">
                        {i > 0 && <span className="text-gray-600">/</span>}
                        <button
                            onClick={() => cargar(parte.ruta)}
                            className={`transition-colors ${
                                i === breadcrumb.length - 1
                                    ? 'text-white font-medium cursor-default'
                                    : 'text-indigo-400 hover:text-indigo-300'
                            }`}
                            disabled={i === breadcrumb.length - 1}
                        >
                            {parte.label}
                        </button>
                    </span>
                ))}
            </div>

            {/* Error */}
            {error && (
                <p className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg mb-4">
                    {error}
                </p>
            )}

            {/* Contenido */}
            {loading ? (
                <p className="text-gray-500 text-sm">Cargando...</p>
            ) : entradas.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                    <p className="text-3xl mb-2">📂</p>
                    <p className="text-sm">Carpeta vacía</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {entradas.map(entrada => (
                        <div
                            key={entrada.ruta}
                            className="flex items-center justify-between px-3 py-2.5
                                       rounded-lg hover:bg-gray-800 transition-colors group"
                        >
                            <button
                                onClick={() => handleEntrada(entrada)}
                                disabled={entrada.tipo === 'carpeta' && !entrada.permitido}
                                className={`flex items-center gap-3 flex-1 text-left min-w-0
                                    ${entrada.tipo === 'carpeta' && entrada.permitido
                                        ? 'cursor-pointer'
                                        : entrada.editable
                                            ? 'cursor-pointer'
                                            : 'cursor-default'}`}
                            >
                                <span className="text-lg flex-shrink-0">{getIcono(entrada)}</span>
                                <div className="min-w-0">
                                    <p className={`text-sm truncate ${
                                        entrada.protegido ? 'text-gray-500' : 'text-white'
                                    }`}>
                                        {entrada.nombre}
                                        {entrada.protegido && (
                                            <span className="ml-2 text-xs text-gray-600">(protegido)</span>
                                        )}
                                    </p>
                                    {entrada.tamaño !== null && (
                                        <p className="text-xs text-gray-500">{formatBytes(entrada.tamaño)}</p>
                                    )}
                                </div>
                            </button>

                            {/* Acciones */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {entrada.editable && (
                                    <button
                                        onClick={() => handleEntrada(entrada)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        ✏️ Editar
                                    </button>
                                )}
                                {!entrada.protegido && entrada.tipo === 'archivo' && (
                                    <button
                                        onClick={() => handleEliminar(entrada)}
                                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
