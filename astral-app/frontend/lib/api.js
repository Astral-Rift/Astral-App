const BASE = '/api';

async function request(path, options = {}) {
    const headers = {};
    if (options.body) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${BASE}${path}`, {
        headers: { ...headers, ...options.headers },
        credentials: 'include',
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export const api = {
    // Auth
    login:   (username, password) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    logout:  () => request('/auth/logout', { method: 'POST' }),
    me:      () => request('/auth/me'),

    // Servidores
    listarServidores:   () => request('/servidores'),
    crearServidor:      (data) => request('/servidores', { method: 'POST', body: JSON.stringify(data) }),
    encenderServidor:   (id) => request(`/servidores/${id}/encender`,  { method: 'POST', body: JSON.stringify({}) }),
    apagarServidor:     (id) => request(`/servidores/${id}/apagar`,    { method: 'POST', body: JSON.stringify({}) }),
    reiniciarServidor:  (id) => request(`/servidores/${id}/reiniciar`, { method: 'POST', body: JSON.stringify({}) }),
    eliminarServidor:   (id) => request(`/servidores/${id}`,           { method: 'DELETE', body: JSON.stringify({}) }),
    logsServidor:       (id) => request(`/servidores/${id}/logs`),
    statsServidor:      (id) => request(`/servidores/${id}/stats`),
    ejecutarComando:    (id, comando) =>
        request(`/servidores/${id}/comando`, { method: 'POST', body: JSON.stringify({ comando }) }),
    actualizarRecursos: (id, cpu, ram) =>
        request(`/servidores/${id}/recursos`, { method: 'PUT', body: JSON.stringify({ cpu, ram }) }),

    // Archivos
    listarArchivos:  (id) => request(`/servidores/${id}/archivos`),
    eliminarArchivo: (id, nombre) => request(`/servidores/${id}/archivos/${nombre}`, { method: 'DELETE' }),
    subirArchivo: (id, file) => {
        const form = new FormData();
        form.append('file', file);
        return fetch(`${BASE}/servidores/${id}/archivos`, {
            method: 'POST', credentials: 'include', body: form,
        }).then(r => r.json());
    },

    // Admin
    adminListarUsuarios:    () => request('/admin/usuarios'),
    adminServidoresUsuario: (id) => request(`/admin/usuarios/${id}/servidores`),
    adminCrearUsuario:      (data) => request('/admin/usuarios', { method: 'POST', body: JSON.stringify(data) }),
    adminEliminarUsuario:   (id) => request(`/admin/usuarios/${id}`, { method: 'DELETE' }),
    adminCambiarPassword:   (id, password) =>
        request(`/admin/usuarios/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
    adminToggleActivo:      (id, activo) =>
        request(`/admin/usuarios/${id}/activo`, { method: 'PUT', body: JSON.stringify({ activo }) }),
    adminCambiarPlan:       (id, plan_id) =>
        request(`/admin/usuarios/${id}/plan`, { method: 'PUT', body: JSON.stringify({ plan_id }) }),
    adminCambiarRol:        (id, rol) =>
        request(`/admin/usuarios/${id}/rol`, { method: 'PUT', body: JSON.stringify({ rol }) }),
};
