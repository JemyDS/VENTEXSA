/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * INTERFAZ PRINCIPAL. JavaScript del navegador: pantallas, formularios, navegación, cola offline y conexión con la API. No es la autoridad final de permisos ni de reglas.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { defaultState, types, roles, steps, dims, price, validate, slots } from '../lib/domain.mjs';
import { showModel, compose } from './visual.mjs';
import { launchWallAR } from './ar.mjs';
import QRCode from 'qrcode';
const /*
 * Selecciona el primer elemento HTML que coincide con un selector.
 */
$ = s => document.querySelector(s), /*
 * Devuelve todos los elementos HTML que coinciden con un selector.
 */
$$ = s => [
    ...document.querySelectorAll(s)
], /*
 * Escapa caracteres especiales antes de insertar texto en HTML.
 */
esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c])), /*
 * Formatea un importe para mostrarlo en pesos chilenos.
 */
money = n => new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0
}).format(n || 0), /*
 * Formatea una fecha para su visualización en la zona horaria configurada.
 */
date = d => d ? new Date(d).toLocaleString('es-CL', {
    timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short'
}) : '—', /*
 * Convierte minutos desde medianoche a hora y minuto.
 */
time = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'), /*
 * Genera el identificador de una operación del navegador.
 */
uid = () => crypto.randomUUID();
let aiConfigured = false, aiBusy = false, aiVersion = 0, aiURL = null, aiOriginalURL = null, showingOriginal = false;
let webXRReady = false;
let db = defaultState(), page = 'Resumen', selected = null, orderSelected = null, draft = {
    client: '', vanos: []
}, busy = false, signatureDirty = false, lastModel = null, currentVano = null, openLeaf = false;
const labels = {
    BORRADOR: 'Borrador', ESTIMACION_ENVIADA: 'Estimación enviada', VISITA_AGENDADA: 'Visita agendada', VISITA_REALIZADA: 'Visita realizada', COTIZACION_FIRME: 'Cotización firme', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', VENCIDA: 'Vencida', CREADA: 'Creada', ANTICIPO_OK: 'Anticipo registrado', DESPIECE_APROBADO: 'Despiece aprobado', EN_CORTE: 'En corte', EN_ARMADO: 'En armado', CONTROL_CALIDAD: 'Control de calidad', TERMINADA: 'Terminada', DESPACHADA: 'Despachada', INSTALADA: 'Instalada', RECEPCIONADA: 'Recepcionada', CERRADA: 'Cerrada'
};
const /*
 * Construye una etiqueta visual de estado.
 */
badge = s => `<span class="badge">${esc(labels[s] || s)}</span>`, /*
 * Genera un campo HTML con etiqueta.
 */
input = (name, label, value = '', type = 'text', extra = '') => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`, /*
 * Genera un selector HTML a partir de opciones.
 */
sel = (name, label, items, value) => `<label>${label}<select name="${name}">${items.map(x => {
    let v = typeof x === 'string' ? x : x.id, t = typeof x === 'string' ? x : x.name;
    return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`;
}).join('')}</select></label>`, /*
 * Genera una casilla de selección.
 */
check = (name, label, checked = false) => `<label><input name="${name}" type="checkbox" ${checked ? 'checked' : ''}>${label}</label>`, /*
 * Genera un botón HTML y su acción.
 */
btn = (text, fn, secondary = false, disabled = false) => `<button ${disabled ? 'disabled' : ''} class="${secondary ? 'secondary' : ''}" onclick="${fn}">${text}</button>`;
/*
 * Construye el encabezado de una pantalla: etiqueta, título, explicación y acción principal.
 * Parámetros: k, h, p, action.
 */
function title(k, h, p, action = '') {
    return `<div class="title"><div><div class="tagline">${k}</div><h1>${h}</h1><p>${p}</p></div>${action}</div>`;
}
/*
 * Muestra un aviso temporal al usuario.
 * Parámetros: s.
 */
function toast(s) {
    $('#toast').textContent = s;
    $('#toast').style.display = 'block';
    setTimeout(() => $('#toast').style.display = 'none', 5000);
}
let localDB;
/*
 * Abre la base IndexedDB del navegador para conservar datos de trabajo sin conexión.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function local() {
    return localDB ??= new Promise((resolve, reject) => {
        let r = indexedDB.open('ventexa-offline-v2', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('cache');
        r.onsuccess = () => resolve(r.result);
        r.onerror = reject;
    });
}
/*
 * Lee o escribe un registro en IndexedDB; se usa para el estado, borradores y la cola de operaciones.
 * Parámetros: key, value.
 */
async function cache(key, value) {
    let d = await local();
    return new Promise((resolve, reject) => {
        let tx = d.transaction('cache', value === undefined ? 'readonly' : 'readwrite'), r = value === undefined ? tx.objectStore('cache').get(key) : tx.objectStore('cache').put(value, key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = reject;
    });
}
/*
 * Consulta el estado del servidor; si falla la conexión, intenta recuperar la copia local. Un error de autenticación solicita iniciar sesión.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
async function refresh() {
    try {
        let r = await fetch('/api/state', {
            cache: 'no-store'
        }), v = await r.json();
        if (!r.ok)
            throw Object.assign(Error(v.error), {
                auth: true
            });
        db = v;
        await cache('state', v);
        $('#identity').innerHTML = esc(v.actor.email) + `<small>${esc(v.actor.role)}</small>`;
        $('#connection').textContent = 'Guardado central · revisión ' + db.revision;
    }
    catch (e) {
        if (e.auth) {
            $('#app').innerHTML = `<section class="card"><h2>Acceso al taller</h2><p>${esc(e.message)}</p><a class="button" href="/signin-with-chatgpt?return_to=/workspace.html" target="_top">Iniciar sesión</a></section>`;
            throw e;
        }
        let v = await cache('state');
        if (!v)
            throw Error('Abre el taller con conexión al menos una vez para usar terreno sin red.');
        db = v;
        $('#identity').innerHTML = esc(v.actor.email) + `<small>${esc(v.actor.role)} · copia sin conexión</small>`;
        $('#connection').textContent = 'Sin conexión · copia local';
    }
    await queueStatus();
}
/*
 * Actualiza el indicador de operaciones que esperan sincronización.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
async function queueStatus() {
    let q = await cache('queue') || [];
    $('#sync').textContent = q.length ? 'Sincronizar (' + q.length + ')' : 'Sincronizar';
}
/*
 * Sube una fotografía o firma al servidor y obtiene la referencia al archivo.
 * Parámetros: data.
 */
async function upload(data) {
    let blob = await (await fetch(data)).blob(), f = new FormData();
    f.append('file', blob, 'captura.' + (blob.type.includes('png') ? 'png' : 'jpg'));
    let r = await fetch('/api/files', {
        method: 'POST', body: f
    }), j = await r.json();
    if (!r.ok)
        throw Error(j.error);
    return j.url;
}
/*
 * Recorre un contenido y convierte imágenes locales pendientes en referencias almacenadas.
 * Parámetros: p.
 */
async function resolveUploads(p) {
    if (typeof p === 'string' && p.startsWith('data:image/'))
        return upload(p);
    if (Array.isArray(p))
        return Promise.all(p.map(resolveUploads));
    if (p && typeof p === 'object') {
        let out = {};
        for (let [k, v] of Object.entries(p))
            out[k] = await resolveUploads(v);
        return out;
    }
    return p;
}
/*
 * Envía una acción con revisión e identificador único; gestiona errores y conservación local según disponibilidad de conexión.
 * Parámetros: action, payload, after.
 */
async function act(action, payload, after) {
    if (busy)
        return;
    busy = true;
    let operation = uid();
    try {
        if (!navigator.onLine) {
            if (![
                'measure', 'visit', 'install'
            ].includes(action))
                throw Error('Esta operación necesita conexión. En terreno puedes guardar mediciones e instalación.');
            let q = await cache('queue') || [];
            q.push({
                action, payload, revision: db.revision, operation, owner: db.actor.email
            });
            await cache('queue', q);
            await queueStatus();
            $('#modal').close();
            toast('Guardado en la cola local. Pendiente de sincronización.');
            return;
        }
        let resolved = await resolveUploads(payload), res = await fetch('/api/action', {
            method: 'POST', headers: {
                'Content-Type': 'application/json'
            }, body: JSON.stringify({
                action, payload: resolved, revision: db.revision, operation
            })
        }), j = await res.json();
        if (!res.ok) {
            if (j.conflict) {
                await cache('last-conflict', {
                    action, payload, revision: db.revision
                });
                await refresh();
            }
            throw Error(j.error);
        }
        await refresh();
        $('#modal').close();
        if (after)
            after(j);
        else
            render();
        toast('Cambios guardados');
    }
    catch (e) {
        toast(e.message || 'No se pudo guardar. Conserva este formulario e intenta de nuevo.');
    }
    finally {
        busy = false;
    }
}
/*
 * Reenvía operaciones pendientes y conserva los conflictos para su revisión.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
async function syncQueue() {
    if (!navigator.onLine)
        return toast('Aún no hay conexión.');
    try {
        await refresh();
        let q = await cache('queue') || [];
        for (let op of [
            ...q
        ]) {
            if (op.owner !== db.actor.email)
                throw Error('Hay registros pendientes de otra cuenta. Inicia sesión con su propietario.');
            let payload = await resolveUploads(op.payload), res = await fetch('/api/action', {
                method: 'POST', headers: {
                    'Content-Type': 'application/json'
                }, body: JSON.stringify({
                    ...op, payload
                })
            }), j = await res.json();
            if (!res.ok)
                throw Error(j.error);
            q = q.filter(x => x.operation !== op.operation);
            await cache('queue', q);
            await refresh();
        }
        render();
        toast('Datos sincronizados');
    }
    catch (e) {
        toast(e.message);
    }
    await queueStatus();
}
/*
 * Construye la navegación disponible para el rol activo.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function nav() {
    let names = db.actor?.role === 'Cliente' ? [
        'Resumen', 'Solicitudes', 'Configurador', 'Visualizador 3D', 'Ayuda'
    ] : [
        'Resumen', 'Solicitudes', 'Configurador', 'Visualizador 3D', 'Agenda', 'Producción', 'Planes de corte', 'Inventario', 'Compras', 'Cobranza', 'Garantías', 'Reportes', 'Catálogo', 'Parámetros', 'Equipo', 'Sin conexión', 'Ayuda'
    ];
    $('#nav').innerHTML = names.map(n => `<button class="${page === n ? 'active' : ''}" onclick="go('${n}')">${n}</button>`).join('');
    $('#crumb').textContent = 'Operación / ' + page;
}
/*
 * Cambia la pantalla seleccionada y solicita dibujarla.
 * Parámetros: p.
 */
function go(p) {
    page = p;
    selected = null;
    orderSelected = null;
    render();
}
/*
 * Selecciona la función de pantalla según la navegación actual.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function render() {
    nav();
    if (selected)
        return detail(selected);
    if (orderSelected)
        return orderDetail(orderSelected);
    ({
        Resumen: home, Solicitudes: requests, Configurador: config, 'Visualizador 3D': visual, Agenda: agenda, Producción: production, 'Planes de corte': plans, Inventario: inventory, Compras: purchases, Cobranza: payments, Garantías: warranties, Reportes: reports, Catálogo: catalog, Parámetros: settings, Equipo: teams, 'Sin conexión': offline, Ayuda: help
    })[page]();
}
/*
 * Calcula el estado que se muestra, considerando la vigencia de la cotización.
 * Parámetros: r.
 */
function effectiveStatus(r) {
    let q = db.quotes.find(q => q.id === r.quoteId);
    return r.status === 'COTIZACION_FIRME' && q && Date.parse(q.expires) < Date.now() ? 'VENCIDA' : r.status;
}
/*
 * Construye la tabla de solicitudes con sus acciones.
 * Parámetros: items.
 */
function tableRequests(items) {
    return `<div class="tablewrap"><table><thead><tr><th>Solicitud / cliente</th><th>Vanos</th><th>Estado</th><th>Precio</th><th></th></tr></thead><tbody>${items.map(r => {
        let q = db.quotes.find(q => q.id === r.quoteId);
        return `<tr><td><strong>${esc(r.code)} · ${esc(r.client)}</strong><small>${esc(r.comuna)} · ${esc(r.channel)}</small></td><td>${r.vanos.length}</td><td>${badge(effectiveStatus(r))}</td><td>${q ? money(q.total) : r.range ? money(r.range.min) + '–' + money(r.range.max) : 'Pendiente'}</td><td>${btn('Abrir', `openRequest('${r.id}')`, true)}</td></tr>`;
    }).join('') || '<tr><td colspan="5" class="empty">Todavía no hay solicitudes.</td></tr>'}</tbody></table></div>`;
}
/*
 * Dibuja el resumen del taller y sus indicadores.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function home() {
    $('#app').innerHTML = title('TU TALLER, EN ORDEN', 'De la primera medida a la entrega.', 'Configura, mide, fabrica y entrega con trazabilidad.', btn('＋ Nueva solicitud', "go('Configurador')")) + `<div class="stats"><div class="stat"><span>Solicitudes activas</span><strong>${db.requests.filter(r => ![
        'CERRADA', 'RECHAZADA'
    ].includes(r.status)).length}</strong><small>En seguimiento</small></div><div class="stat"><span>Visitas pendientes</span><strong>${db.visits.filter(v => [
        'Agendada', 'Confirmada', 'En ruta'
    ].includes(v.status)).length}</strong><small>Medición e instalación</small></div><div class="stat"><span>Órdenes de trabajo</span><strong>${db.orders.filter(o => o.state !== 'CERRADA').length}</strong><small>En proceso</small></div><div class="stat"><span>Cotizaciones firmes</span><strong>${money(db.requests.reduce((a, r) => a + (db.quotes.find(q => q.id === r.quoteId)?.total || 0), 0))}</strong><small>IVA incluido</small></div></div><div class="grid"><section class="card accent"><h2>Explora una ventana en tu espacio</h2><p>Cambia tipología, medidas y color. Gira el modelo 3D o coloca la ventana sobre una fotografía.</p>${btn('Abrir visualizador', "go('Visualizador 3D')")}</section><section class="card"><h2>Casos de prueba</h2><p>Cinco solicitudes ficticias en distintas etapas, existencias y retales para recorrer el sistema.</p>${btn('Cargar datos de prueba', "act('seed',{})", false, db.requests.some(r => r.demo) || db.actor.role !== 'Administrador')}</section></div><section class="card"><h2>Últimas solicitudes</h2>${tableRequests(db.requests.slice(-6).reverse())}</section><div class="note">El catálogo incluye valores de prueba. Las fichas de fabricación y sus límites todavía requieren validación del proveedor. ${btn('Ver alcance y verificaciones', "go('Ayuda')", true)}</div>`;
}
/*
 * Dibuja la lista de solicitudes.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function requests() {
    $('#app').innerHTML = title('COMERCIAL', 'Solicitudes', 'Borradores, estimaciones y versiones de cotización.', btn('＋ Nueva solicitud', "go('Configurador')")) + `<label>Buscar<input id="search" placeholder="Cliente, comuna o número" oninput="filterRequests(this.value)"></label><section class="card" id="requests">${tableRequests(db.requests.slice().reverse())}</section>`;
}
/*
 * Filtra las solicitudes visibles según la búsqueda.
 * Parámetros: v.
 */
function filterRequests(v) {
    $('#requests').innerHTML = tableRequests(db.requests.filter(r => (r.client + r.code + r.comuna).toLowerCase().includes(v.toLowerCase())).reverse());
}
const /*
 * Construye la configuración visual inicial de prueba.
 */
defaultC = () => ({
    intervention: 'Retiro completo', type: 'Corredera', leaves: 2, direction: 'Izquierda', line: 'alu', color: 'Blanco', glass: 'mono', hardware: 'standard', sill: 1000, workHeight: 1800, comuna: 'San Fernando', safetyZone: false
});
/*
 * Genera tres campos de medición: cada vano registra tres anchos y tres altos.
 * Parámetros: prefix, m.
 */
function triple(prefix, m = {
    w: [
        '', '', ''
    ], h: [
        '', '', ''
    ]
}) {
    return `<h3>Medidas en milímetros</h3><div class="triple">${[
        'Superior', 'Centro', 'Inferior'
    ].map((l, i) => input(prefix + 'w' + i, 'Ancho · ' + l, m.w[i], 'number', 'required min="1" max="12000"')).join('')}</div><div class="triple">${[
        'Izquierda', 'Centro', 'Derecha'
    ].map((l, i) => input(prefix + 'h' + i, 'Alto · ' + l, m.h[i], 'number', 'required min="1" max="12000"')).join('')}</div>`;
}
/*
 * Genera los campos de tipología, perfiles, vidrio y condiciones de instalación.
 * Parámetros: c.
 */
function configFields(c = defaultC()) {
    return `${sel('intervention', 'Intervención', [
        'Retiro completo', 'Marco existente', 'Solo vidrio'
    ], c.intervention)}<div class="note" id="reference">Mide la abertura del muro en tres puntos por dimensión.</div><div class="fields">${sel('type', 'Tipología', types, c.type)}${input('leaves', 'Número de hojas', c.leaves, 'number', 'min="1" max="4" required')}${sel('line', 'Línea de perfil', db.catalog.lines, c.line)}${sel('direction', 'Sentido de apertura', [
        'Izquierda', 'Derecha'
    ], c.direction)}${sel('color', 'Color', [
        'Blanco', 'Negro', 'Bronce'
    ], c.color)}${sel('glass', 'Vidrio', db.catalog.glass, c.glass)}${sel('hardware', 'Herraje', db.catalog.hardware, c.hardware)}${input('sill', 'Altura antepecho (mm)', c.sill, 'number', 'min="0" required')}${input('workHeight', 'Altura de trabajo (mm)', c.workHeight, 'number', 'min="0" required')}</div>${check('safetyZone', 'Ubicación de riesgo: baño, puerta o circulación')}`;
}
/*
 * Convierte los campos del formulario en la configuración de una ventana.
 * Parámetros: form.
 */
function readC(form) {
    let f = new FormData(form);
    return {
        intervention: f.get('intervention'), type: f.get('type'), direction: f.get('direction') || 'Izquierda', leaves: +f.get('leaves'), line: f.get('line'), color: f.get('color'), glass: f.get('glass'), hardware: f.get('hardware'), sill: +f.get('sill'), workHeight: +f.get('workHeight'), safetyZone: f.has('safetyZone'), comuna: f.get('comuna') || draft.comuna || 'San Fernando'
    };
}
/*
 * Convierte los campos del formulario en el registro de medidas.
 * Parámetros: form, prefix.
 */
function readM(form, prefix = '') {
    let f = new FormData(form);
    return {
        w: [
            0, 1, 2
        ].map(i => +f.get(prefix + 'w' + i)), h: [
            0, 1, 2
        ].map(i => +f.get(prefix + 'h' + i)), confirmed: f.has('confirmed'), tapeConfirmed: f.has('tapeConfirmed')
    };
}
/*
 * Dibuja una representación de la ventana con SVG para el formulario.
 * Parámetros: c, m.
 */
function diagram(c, m) {
    let d;
    try {
        d = dims(m);
    }
    catch {
        d = {
            w: 1500, h: 1200
        };
    }
    return `<svg viewBox="0 0 440 330" role="img" aria-label="Puntos de medición: tres anchos y tres altos"><rect x="90" y="55" width="270" height="210" fill="#b1d0dc" stroke="#fefefe" stroke-width="12"/>${c.leaves > 1 ? '<path d="M225 55V265" stroke="#fff" stroke-width="9"/>' : ''}${[
        75, 160, 245
    ].map((y, i) => `<path d="M90 ${y}H360" stroke="#147c79" stroke-dasharray="5 4"/><text x="20" y="${y + 5}" font-size="13" fill="#24616d">A${i + 1}</text>`).join('')}${[
        110, 225, 340
    ].map((x, i) => `<path d="M${x} 55V265" stroke="#39708a" stroke-dasharray="5 4"/><text x="${x}" y="38" font-size="13" fill="#24616d">H${i + 1}</text>`).join('')}<text x="225" y="307" text-anchor="middle" font-size="15" fill="#224a5c">${d.w} × ${d.h} mm · menor de cada dimensión</text></svg>`;
}
let estimatePhotos = [];
/*
 * Abre el configurador y conecta los eventos del formulario.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function config() {
    estimatePhotos = [];
    $('#app').innerHTML = title('PORTAL DEL CLIENTE', 'Configura tu solicitud', 'Agrega uno o varios vanos. Puedes guardar el borrador y retomarlo.') + `<form id="configform"><div class="grid"><div><section class="card"><h2>01 · Cliente y dirección</h2><div class="fields">${input('client', 'Nombre', draft.client, 'text', 'required')}${input('rut', 'RUT', draft.rut)}${input('phone', 'Teléfono', draft.phone, 'tel', 'required')}${input('email', 'Email de referencia', draft.email, 'email')}${input('address', 'Dirección', draft.address, 'text', 'required')}${sel('comuna', 'Comuna', Object.keys(db.settings.zones), draft.comuna)}${input('region', 'Región', draft.region || "O’Higgins")}${sel('channel', 'Canal', [
        'Portal', 'WhatsApp', 'Presencial', 'Referido'
    ], draft.channel)}</div></section><section class="card"><h2>02 · Configuración del vano</h2>${input('name', 'Nombre del vano', 'Living', 'text', 'required')}${configFields()}${triple('', {
        w: [
            1500, 1500, 1500
        ], h: [
            1200, 1200, 1200
        ]
    })}${check('confirmed', 'He revisado las medidas; confirmo si están fuera del rango habitual.')}<label>Fotografía con huincha visible<input id="estimate-photo" type="file" accept="image/*"></label><div class="photos" id="estimate-photos"></div>${check('tapeConfirmed', 'Confirmo que la fotografía muestra la huincha y el vano.')}</section></div><div><section class="card"><h2>Referencia de medición</h2><div class="drawing" id="drawing"></div><div id="estimate-result"></div><div class="actions"><button type="submit">Agregar vano</button><button type="button" class="secondary" onclick="visualFromForm()">Ver en 3D / AR</button></div></section><section class="card"><h2>Vanos agregados · ${draft.vanos.length}</h2>${draft.vanos.map((v, i) => `<div class="split"><span>${esc(v.name)} · ${v.config.type}</span><button type="button" class="secondary smallbutton" onclick="removeDraftVano(${i})">Quitar</button></div>`).join('') || '<p>No hay vanos agregados.</p>'}<div class="actions"><button type="button" onclick="saveDraft()" ${draft.vanos.length ? '' : 'disabled'}>Guardar borrador</button></div></section><div class="note">Estimación en CLP, IVA 19% incluido. La visita puede añadir retiro, terminaciones, andamio, ajuste de escuadría o dificultad de acceso. El visor nunca obtiene medidas de la imagen.</div></div></div></form>`;
    $('#configform').oninput = configPreview;
    $('#configform').onchange = configPreview;
    $('#estimate-photo').onchange = async (e) => {
        estimatePhotos = await readImages(e.target.files);
        $('#estimate-photos').innerHTML = estimatePhotos.map(u => `<img class="thumb" src="${u}" alt="Foto del vano">`).join('');
    };
    $('#configform').onsubmit = e => {
        e.preventDefault();
        const c = readC(e.target), measure = readM(e.target);
        try {
            validate(db, c, measure, measure.confirmed);
            if (!estimatePhotos.length || !measure.tapeConfirmed)
                throw Error('Agrega la foto y confirma la huincha visible.');
            let f = new FormData(e.target);
            for (let k of [
                'client', 'rut', 'phone', 'email', 'address', 'comuna', 'region', 'channel'
            ])
                draft[k] = f.get(k);
            draft.vanos.push({
                name: f.get('name'), config: c, measure, photos: estimatePhotos, confirmed: measure.confirmed
            });
            cache('draft', draft);
            config();
            toast('Vano agregado al borrador');
        }
        catch (e) {
            toast(e.message);
        }
    };
    configPreview();
}
/*
 * Recalcula la vista previa y la estimación de la configuración actual.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function configPreview() {
    let c = readC($('#configform')), m = readM($('#configform'));
    $('#reference').textContent = c.intervention === 'Solo vidrio' ? 'Mide el vidrio visible, sin desmontarlo. El técnico confirmará la medida de corte.' : c.intervention === 'Marco existente' ? 'Mide la abertura interior del marco que se conserva.' : 'Mide la abertura del muro de lado a lado en los seis puntos del diagrama.';
    $('#drawing').innerHTML = diagram(c, m);
    if (db.actor.role === 'Cliente') {
        clientEstimate(c, m);
        return;
    }
    try {
        let p = price(db, c, m);
        $('#estimate-result').innerHTML = `<p>Banda estimada del vano</p><div class="price">${money(p.min)}–${money(p.max)}</div>${badge('±' + db.settings.band + '%')}`;
    }
    catch (e) {
        $('#estimate-result').innerHTML = `<div class="note error">${esc(e.message)}</div>`;
    }
}
/*
 * Quita un vano del borrador que se está editando.
 * Parámetros: i.
 */
function removeDraftVano(i) {
    draft.vanos.splice(i, 1);
    cache('draft', draft);
    config();
}
/*
 * Conserva o envía la solicitud preparada en el configurador.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function saveDraft() {
    act(draft.id ? 'editDraft' : 'draft', {
        ...draft, requestId: draft.id
    }, j => {
        draft = {
            client: '', vanos: []
        };
        cache('draft', draft);
        openRequest(j.requestId);
    });
}
/*
 * Lee imágenes del usuario y prepara versiones reducidas para adjuntarlas.
 * Parámetros: files.
 */
async function readImages(files) {
    let out = [];
    for (let file of [
        ...files
    ]) {
        if (!file.type.startsWith('image/'))
            throw Error('Selecciona fotografías.');
        let url = URL.createObjectURL(file);
        try {
            let img = new Image;
            img.src = url;
            await img.decode();
            let c = document.createElement('canvas'), scale = Math.min(1, 1280 / img.width, 1280 / img.height);
            c.width = img.width * scale;
            c.height = img.height * scale;
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            out.push(c.toDataURL('image/jpeg', .7));
        }
        finally {
            URL.revokeObjectURL(url);
        }
    }
    return out;
}
/*
 * Selecciona una solicitud y abre su detalle.
 * Parámetros: id.
 */
function openRequest(id) {
    page = 'Solicitudes';
    selected = id;
    orderSelected = null;
    nav();
    detail(id);
}
/*
 * Dibuja antecedentes y acciones de una solicitud según su estado.
 * Parámetros: id.
 */
function detail(id) {
    let r = db.requests.find(r => r.id === id), q = db.quotes.find(q => q.id === r.quoteId), o = db.orders.find(o => o.requestId === id);
    $('#app').innerHTML = btn('← Solicitudes', "go('Solicitudes')", true) + '<br><br>' + title(r.code, esc(r.client), esc(r.address) + ' · ' + esc(r.comuna), badge(effectiveStatus(r))) + `<div class="grid"><div><section class="card"><h2>Vanos y trazabilidad</h2>${r.vanos.map(v => {
        let m = db.estimated[v.estimatedId], a = dims(m), official = db.official[v.officialId], b = official ? dims(official) : null;
        return `<section class="card"><h3>${esc(v.name)} · ${v.config.type}</h3><p>${db.catalog.lines.find(x => x.id === v.config.line)?.name} · ${db.catalog.glass.find(x => x.id === v.config.glass)?.name}</p><div class="split"><span>Cliente · mínimo</span><b>${a.w} × ${a.h} mm</b></div><div class="split"><span>Oficial · mínimo</span><b>${b ? b.w + ' × ' + b.h + ' mm' : 'Pendiente'}</b></div>${b ? `<p>Desviación: ${b.w - a.w} mm / ${b.h - a.h} mm.<br>${Math.abs(official.d1 - official.d2) > 6 ? 'Fuera de escuadra: se incluye ajuste.' : 'Escuadría dentro del umbral.'}</p><small>${esc(official.technician)} · ${esc(official.instrument)} · ${date(official.at)}</small>` : ''}<div class="photos">${m.photos.map(u => `<img class="thumb" src="${u}" alt="${m.demo ? 'Ejemplo ficticio' : 'Foto del vano'}">`).join('')}</div><div class="actions">${btn('3D / AR', `visualVano('${id}','${v.id}')`, true)}${btn(official ? 'Revisar / corregir acta' : 'Registrar acta oficial', `measure('${id}','${v.id}')`, true, !!o)}${o ? btn('Solicitar corrección autorizada', `measure('${id}','${v.id}',true)`, true) : ''}</div></section>`;
    }).join('')}</section><section class="card"><h2>Historial de etapas</h2>${(r.history || []).slice().reverse().map(h => `<div class="audit">${badge(h.status)}<small>${date(h.at)}</small></div>`).join('')}</section></div><div><section class="card"><h2>Gestión comercial</h2>${r.range ? `<p>Estimación inicial con IVA</p><div class="price">${money(r.range.min)}–${money(r.range.max)}</div>` : '<p>Borrador guardado en tu cuenta.</p>'}<div class="actions">${r.status === 'BORRADOR' ? btn('Retomar borrador', `resumeDraft('${id}')`, true) + btn('Emitir estimación', `act('estimate',{requestId:'${id}'})`) : btn('Agendar visita', `schedule('${id}')`, true)}${btn('Cotizar / revalidar', `quoteForm('${id}')`, true, !r.vanos.every(v => v.officialId))}</div>${q ? `<hr><h3>Cotización firme · v${q.version}</h3><div class="split"><span>Neto</span><b>${money(q.net)}</b></div><div class="split"><span>IVA</span><b>${money(q.iva)}</b></div><div class="price">${money(q.total)}</div><small>Vence ${date(q.expires)}${Date.parse(q.expires) - Date.now() < 3 * 864e5 ? ' · Próxima a vencer o vencida' : ''}</small><div class="actions"><a class="button secondary" target="_blank" href="/api/document/${q.id}">Descargar PDF</a>${[
        'COTIZACION_FIRME', 'VENCIDA'
    ].includes(effectiveStatus(r)) ? btn('Aceptar y firmar', `acceptForm('${id}')`) + btn('Rechazar', `rejectForm('${id}')`, true) : ''}</div>` : ''}</section>${o ? `<section class="card accent"><h2>${o.code}</h2><p>${labels[o.state]}</p>${btn('Abrir orden de trabajo', `openOrder('${o.id}')`)}</section>` : ''}<section class="card"><h2>Versiones conservadas</h2>${db.quotes.filter(q => q.requestId === id).map(q => `<div class="split"><span>v${q.version} · ${money(q.total)}</span><a href="/api/document/${q.id}" target="_blank">PDF</a></div>`).join('') || '<p>No hay versiones firmes.</p>'}</section>${r.acceptance ? `<section class="card"><h2>Aceptación registrada</h2><p>${date(r.acceptance.at)}</p><small>Huella SHA-256 del documento</small><p style="overflow-wrap:anywhere">${esc(r.acceptance.hash)}</p></section>` : ''}</div></div>`;
}
/*
 * Abre el diálogo reutilizable de formularios.
 * Parámetros: html.
 */
function modal(html) {
    $('#modal-body').innerHTML = html;
    if (!$('#modal').open)
        $('#modal').showModal();
}
/*
 * Genera el área donde se capturará una firma dibujada.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function signaturePad() {
    return `<label>Firma del cliente</label><canvas id="signature" class="signature" width="700" height="170"></canvas><button type="button" class="secondary smallbutton" onclick="clearSignature()">Limpiar firma</button>`;
}
/*
 * Conecta los eventos del puntero para dibujar la firma en canvas.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function initSignature() {
    signatureDirty = false;
    let c = $('#signature'), ctx = c.getContext('2d'), down = false;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#133d4e';
    let pt = e => {
        let r = c.getBoundingClientRect();
        return [
            (e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height
        ];
    };
    c.onpointerdown = e => {
        down = true;
        c.setPointerCapture(e.pointerId);
        ctx.beginPath();
        ctx.moveTo(...pt(e));
    };
    c.onpointermove = e => {
        if (down) {
            ctx.lineTo(...pt(e));
            ctx.stroke();
            signatureDirty = true;
        }
    };
    c.onpointerup = c.onpointercancel = () => down = false;
}
/*
 * Borra el trazo de la firma actual.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function clearSignature() {
    let c = $('#signature');
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    signatureDirty = false;
}
/*
 * Obtiene la imagen de la firma y verifica que haya un trazo.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function getSignature() {
    if (!signatureDirty)
        throw Error('Dibuja la firma del cliente.');
    return $('#signature').toDataURL('image/png');
}
/*
 * Abre el levantamiento técnico: medidas verificadas, diagonales, condiciones, fotografías y firma.
 * Parámetros: rid, vid, change.
 */
function measure(rid, vid, change = false) {
    let r = db.requests.find(r => r.id === rid), v = r.vanos.find(v => v.id === vid), old = db.official[v.officialId], pics = [];
    modal(`<h2>Levantamiento · ${esc(v.name)}</h2><p>La medida oficial se captura de forma independiente. Cada corrección conserva la versión anterior.</p><form id="measureform">${triple('', old || undefined)}<div class="fields">${input('d1', 'Diagonal 1 (mm)', old?.d1, 'number', 'required min="1"')}${input('d2', 'Diagonal 2 (mm)', old?.d2, 'number', 'required min="1"')}${input('technician', 'Técnico', old?.technician || db.actor.email, 'text', 'required')}${sel('instrument', 'Instrumento', [
        'Huincha · manual', 'Láser · ingreso manual'
    ], old?.instrument)}${sel('wall', 'Material del muro', [
        'Albañilería', 'Hormigón', 'Tabique'
    ], old?.wall)}${sel('level', 'Aplome y nivel', [
        'Correcto', 'Requiere ajuste'
    ], old?.level)}${sel('access', 'Acceso', [
        'Normal', 'Difícil'
    ], old?.access)}${sel('sillCondition', 'Antepecho', [
        'Bueno', 'Requiere reparación'
    ], old?.sillCondition)}${sel('lintelCondition', 'Dintel', [
        'Bueno', 'Requiere reparación'
    ], old?.lintelCondition)}${sel('jambCondition', 'Jambas', [
        'Bueno', 'Requiere reparación'
    ], old?.jambCondition)}</div>${check('finish', 'Incluye terminaciones / retape', old?.finish)}${check('confirmed', 'Confirmo las medidas aunque estén fuera del rango habitual.')}<label>Notas<textarea name="notes">${esc(old?.notes)}</textarea></label><label>Tres fotografías diferentes del vano<input id="measure-photos" type="file" accept="image/*" multiple required></label><div id="pics" class="photos"></div>${signaturePad()}${check('consent', 'El cliente confirma el acta y autoriza su almacenamiento para el trabajo solicitado.')} ${change ? input('reason', 'Motivo de la corrección', '', 'text', 'required') + input('changeCost', 'Costo asociado (CLP)', 0, 'number', 'required min="0"') : ''}<div class="actions"><button>Guardar acta firmada</button></div></form>`);
    initSignature();
    $('#measure-photos').onchange = async (e) => {
        try {
            pics = await readImages(e.target.files);
            $('#pics').innerHTML = pics.map(p => `<img class="thumb" src="${p}" alt="Foto técnica">`).join('');
        }
        catch (e) {
            toast(e.message);
        }
    };
    $('#measureform').onsubmit = e => {
        e.preventDefault();
        try {
            let f = new FormData(e.target);
            if (!f.has('consent'))
                throw Error('Confirma el consentimiento del acta.');
            const m = {
                ...readM(e.target), ...Object.fromEntries([
                    'technician', 'instrument', 'wall', 'level', 'access', 'sillCondition', 'lintelCondition', 'jambCondition', 'notes'
                ].map(k => [
                    k, f.get(k)
                ])), d1: +f.get('d1'), d2: +f.get('d2'), finish: f.has('finish'), photos: pics, signature: getSignature()
            };
            act(change ? 'changeMeasure' : 'measure', {
                requestId: rid, vanoId: vid, measure: m, reason: f.get('reason'), changeCost: +f.get('changeCost')
            });
        }
        catch (e) {
            toast(e.message);
        }
    };
}
/*
 * Solicita los datos necesarios para emitir una cotización firme.
 * Parámetros: id.
 */
function quoteForm(id) {
    modal(`<h2>Emitir cotización firme</h2><form id="quoteform">${input('discount', 'Descuento (%)', 0, 'number', 'min="0" max="30" required')}<p>Hasta 10% para vendedor. Sobre ese límite requiere administrador. Se crea una versión nueva y se conservan las anteriores.</p><button>Calcular cotización</button></form>`);
    $('#quoteform').onsubmit = e => {
        e.preventDefault();
        act('quote', {
            requestId: id, discount: +new FormData(e.target).get('discount')
        });
    };
}
/*
 * Captura la aceptación y firma asociada a una cotización.
 * Parámetros: id.
 */
function acceptForm(id) {
    modal(`<h2>Aceptación de cotización</h2><p>La aceptación se asocia a la versión vigente, fecha, identidad y huella del documento.</p><form id="acceptform">${signaturePad()}${check('accept', 'Confirmo la aceptación de la cotización mostrada.')}<button>Aceptar y crear OT</button></form>`);
    initSignature();
    $('#acceptform').onsubmit = e => {
        e.preventDefault();
        try {
            if (!new FormData(e.target).has('accept'))
                throw Error('Confirma la aceptación.');
            act('accept', {
                requestId: id, signature: getSignature()
            });
        }
        catch (e) {
            toast(e.message);
        }
    };
}
/*
 * Registra el motivo de rechazo de la cotización.
 * Parámetros: id.
 */
function rejectForm(id) {
    modal(`<h2>Motivo de rechazo</h2><form id="rejectform">${sel('reason', 'Causal', [
        'Precio', 'Plazo', 'Otro proveedor', 'Proyecto cancelado'
    ])}<button>Registrar rechazo</button></form>`);
    $('#rejectform').onsubmit = e => {
        e.preventDefault();
        act('reject', {
            requestId: id, reason: new FormData(e.target).get('reason')
        });
    };
}
/*
 * Abre el formulario de asignación de una visita.
 * Parámetros: id, replaceId.
 */
function schedule(id, replaceId) {
    let r = db.requests.find(r => r.id === id);
    modal(`<h2>Agendar · ${esc(r.code)}</h2><form id="scheduleform">${sel('type', 'Tipo de visita', [
        'Medición', 'Instalación', 'Servicio'
    ])}${sel('teamId', 'Técnico / cuadrilla', db.teams)}${input('from', 'Buscar desde', new Date().toISOString().slice(0, 10), 'date', 'required')}<button type="button" class="secondary" onclick="availableSlots('${id}')">Consultar disponibilidad</button><div id="slots"></div><p>Solo se ofrecen bloques sin solapamientos. Se prioriza agrupar visitas de la misma comuna. La instalación respeta el plazo mínimo de fabricación.</p><button>Guardar visita</button></form>`);
    $('#scheduleform').onsubmit = e => {
        e.preventDefault();
        let f = new FormData(e.target), value = f.get('slot');
        if (!value)
            return toast('Consulta y selecciona un bloque disponible.');
        let [day, minute] = value.split('|');
        act('schedule', {
            requestId: id, type: f.get('type'), teamId: f.get('teamId'), day, minute: +minute, replaceId
        });
    };
    availableSlots(id);
}
/*
 * Consulta los bloques compatibles con la cuadrilla y el servicio.
 * Parámetros: id.
 */
function availableSlots(id) {
    try {
        let r = db.requests.find(r => r.id === id), f = new FormData($('#scheduleform')), from = f.get('from');
        if (f.get('type') === 'Instalación') {
            let d = new Date();
            d.setUTCDate(d.getUTCDate() + db.settings.leadDays);
            from = from < d.toISOString().slice(0, 10) ? d.toISOString().slice(0, 10) : from;
        }
        const list = slots(db, r, f.get('type'), f.get('teamId'), from);
        $('#slots').innerHTML = sel('slot', 'Bloques disponibles', list.map(x => ({
            id: x.day + '|' + x.minute, name: x.day + ' · ' + time(x.minute) + ' · ' + x.duration + ' min' + (x.priority ? ' · misma comuna' : '')
        })));
        if (!list.length)
            $('#slots').innerHTML = '<p>No hay disponibilidad con esa cuadrilla.</p>';
    }
    catch (e) {
        $('#slots').innerHTML = `<div class="note error">${esc(e.message)}</div>`;
    }
}
/*
 * Dibuja las visitas programadas y su situación.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function agenda() {
    $('#app').innerHTML = title('TERRENO', 'Agenda y ruta del día', 'Visitas de medición, instalación y servicio.') + `<section class="card"><div class="tablewrap"><table><thead><tr><th>Fecha / hora</th><th>Cliente</th><th>Visita</th><th>Cuadrilla</th><th>Estado</th><th></th></tr></thead><tbody>${db.visits.slice().sort((a, b) => a.day.localeCompare(b.day) || a.minute - b.minute).map(v => {
        let r = db.requests.find(r => r.id === v.requestId);
        return `<tr><td>${v.day}<small>${time(v.minute)} · ${v.duration} min</small></td><td>${esc(r.client)}<small>${esc(v.comuna)}</small></td><td>${v.type}</td><td>${esc(db.teams.find(t => t.id === v.teamId)?.name)}</td><td>${badge(v.status)}</td><td>${btn('Abrir', `openRequest('${r.id}')`, true)} ${btn('Estado', `visitForm('${v.id}')`, true)} ${btn('Reagendar', `schedule('${r.id}','${v.id}')`, true)}</td></tr>`;
    }).join('') || '<tr><td colspan="6">Agenda visitas desde una solicitud.</td></tr>'}</tbody></table></div></section>`;
}
/*
 * Permite registrar avance o causa de una visita no realizada.
 * Parámetros: id.
 */
function visitForm(id) {
    modal(`<h2>Actualizar visita</h2><form id="visitform">${sel('status', 'Estado', [
        'Confirmada', 'En ruta', 'Ejecutada', 'No realizada'
    ])}${sel('reason', 'Causal si no se realizó', [
        'Cliente ausente', 'Acceso bloqueado', 'Dirección incorrecta'
    ])}<button>Guardar</button></form>`);
    $('#visitform').onsubmit = e => {
        e.preventDefault();
        act('visit', {
            id, ...Object.fromEntries(new FormData(e.target))
        });
    };
}
/*
 * Dibuja las órdenes de trabajo organizadas por su etapa.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function production() {
    $('#app').innerHTML = title('TALLER', 'Órdenes de trabajo', 'Medidas oficiales, anticipo, material y control de calidad.') + db.orders.map(o => `<section class="card"><div class="statusline"><div><h2>${o.code} · ${esc(db.requests.find(r => r.id === o.requestId)?.client)}</h2>${badge(o.state)}<p>${o.vanos.length} vano(s) · pagado ${money(o.advance)} / ${money(o.total)}</p></div>${btn('Abrir orden', `openOrder('${o.id}')`)}</div></section>`).join('');
    if (!db.orders.length)
        $('#app').innerHTML += '<section class="card empty">Una cotización aceptada y firmada crea la orden de trabajo.</section>';
}
/*
 * Selecciona una orden de trabajo y abre su detalle.
 * Parámetros: id.
 */
function openOrder(id) {
    selected = null;
    orderSelected = id;
    page = 'Producción';
    nav();
    orderDetail(id);
}
/*
 * Muestra el despiece, etapas, documentos y acciones de una orden.
 * Parámetros: id.
 */
function orderDetail(id) {
    let o = db.orders.find(x => x.id === id), r = db.requests.find(x => x.id === o.requestId), idx = steps.indexOf(o.state), next = steps[idx + 1];
    $('#app').innerHTML = btn('← Producción', "go('Producción')", true) + '<br><br>' + title(o.code, esc(r.client), 'La OT conserva la referencia a cada versión oficial firmada.', badge(o.state)) + `<div class="flow">${steps.map((s, i) => `<span class="step ${i <= idx ? 'done' : ''}">${labels[s]}</span>`).join('')}</div><div class="grid"><div><section class="card"><h2>Despiece y actas oficiales</h2>${o.vanos.map(v => `<h3>${esc(v.name)} · ${v.cut.w} × ${v.cut.h} mm</h3><small>Holgura ${v.cut.gap} mm por lado · deducción vidrio ${v.cut.glassDeduction} mm · acta ${v.officialId.slice(0, 8)}</small><div class="tablewrap"><table><thead><tr><th>Pieza</th><th>Corte (mm)</th><th>Ángulo</th><th>Estado / lote</th></tr></thead><tbody>${v.cut.pieces.map(p => `<tr><td>${p.name}</td><td>${p.w}${p.h ? ' × ' + p.h : ''}</td><td>${p.angle}°</td><td>${esc(p.state)}<small>${esc(p.lot || 'Sin lote')}</small></td></tr>`).join('')}</tbody></table></div><br>`).join('')}<div class="actions">${btn('Exportar despiece CSV', `exportCut('${id}')`, true)}${btn('Etiquetas QR', `labelsQR('${id}')`, true)}${btn('Registrar pieza / QR', `scanForm('${id}')`, true)}${btn('Registrar merma', `wasteForm('${id}')`, true)}</div></section><section class="card"><h2>Notas de terreno</h2>${o.vanos.map(v => {
        let a = db.official[v.officialId];
        return `<h3>${esc(v.name)}</h3><p>${esc(a.wall)} · ${esc(a.level)} · ${esc(a.access)}<br>${esc(a.notes || 'Sin notas adicionales')}</p><div class="photos">${(a.photos || []).map(u => `<a href="${u}" target="_blank"><img class="thumb" src="${u}" alt="Foto del levantamiento"></a>`).join('')}</div>`;
    }).join('')}</section></div><div><section class="card accent"><h2>Siguiente paso</h2>${idx === 0 ? `<p>Anticipo mínimo ${db.settings.advance}%: ${money(Math.ceil(o.total * db.settings.advance / 100))}</p>${btn('Registrar pago manual', `paymentForm('${id}')`)}` : idx === 1 ? `<p>Genera el plan de corte y reserva material al aprobar el despiece.</p>${btn('Generar plan para esta OT', `act('plan',{orderIds:['${id}']})`)} ${btn('Ver planes', "go('Planes de corte')", true)}<div class="actions">${btn('Aprobar despiece y reservar', `act('approve',{orderId:'${id}'})`, false, !o.planIds.length)}</div>` : idx >= 2 && idx <= 6 ? `<p>${labels[o.state]} → ${labels[next]}</p>${btn('Continuar', `advanceForm('${id}')`)}` : idx === 7 ? btn('Registrar instalación', `installForm('${id}')`) : idx === 8 ? btn('Gestionar observaciones y recepción', `receiptForm('${id}')`) : idx === 9 ? btn('Cerrar OT y activar garantías', `act('close',{orderId:'${id}'})`) : '<p>OT cerrada con recepción conforme.</p>'}</section><section class="card"><h2>Pagos y saldo</h2><div class="split"><span>Total</span><b>${money(o.total)}</b></div><div class="split"><span>Conciliado</span><b>${money(o.advance)}</b></div><div class="price">Saldo ${money(o.total - o.advance)}</div>${btn('Registrar pago', `paymentForm('${id}')`, true, o.advance >= o.total)}</section><section class="card"><h2>Despacho e instalación</h2><div class="actions">${btn('Programar instalación', `schedule('${r.id}')`, true)}${btn('Comprobante de despacho', `dispatchDoc('${id}')`, true)}</div><p>El comprobante interno identifica piezas frágiles. No reemplaza una guía tributaria.</p></section>${o.observations.length ? `<section class="card"><h2>Observaciones</h2>${o.observations.map(x => `<div class="audit">${esc(x.text)}<small>${esc(x.owner)} · ${x.due} · ${x.status}</small></div>`).join('')}</section>` : ''}</div></div><div class="note">Despiece calculado con el catálogo de prueba. El sistema permanece sin habilitación de fabricación real hasta validar las fichas técnicas del proveedor.</div>`;
}
/*
 * Abre el registro manual de un pago; no conecta una pasarela bancaria.
 * Parámetros: id.
 */
function paymentForm(id) {
    let o = db.orders.find(x => x.id === id);
    modal(`<h2>Registrar pago · ${o.code}</h2><p>Registra un comprobante de transferencia ya recibido. Esta acción no cobra dinero.</p><form id="paymentform">${input('amount', 'Monto CLP', Math.min(o.total - o.advance, Math.ceil(o.total * db.settings.advance / 100)), 'number', 'required min="1"')}${input('reference', 'Referencia única del comprobante', '', 'text', 'required')}${sel('method', 'Medio', [
        'Transferencia', 'Efectivo', 'Otro comprobante'
    ])}${check('confirm', 'Confirmo haber verificado el comprobante.')}<button>Registrar y conciliar</button></form>`);
    $('#paymentform').onsubmit = e => {
        e.preventDefault();
        let f = new FormData(e.target);
        if (!f.has('confirm'))
            return toast('Confirma la verificación del comprobante.');
        act('payment', {
            orderId: id, amount: +f.get('amount'), reference: f.get('reference'), method: f.get('method')
        });
    };
}
/*
 * Recoge controles necesarios para avanzar una orden de fabricación.
 * Parámetros: id.
 */
function advanceForm(id) {
    let o = db.orders.find(o => o.id === id);
    if (o.state === 'CONTROL_CALIDAD') {
        modal(`<h2>Control de calidad</h2><form id="advanceform"><div class="checklist">${db.settings.qc.map((q, i) => check('q' + i, esc(q))).join('')}</div><div class="actions"><button>Confirmar control</button></div></form>`);
        $('#advanceform').onsubmit = e => {
            e.preventDefault();
            let f = new FormData(e.target);
            act('advance', {
                orderId: id, qc: db.settings.qc.filter((q, i) => f.has('q' + i))
            });
        };
    }
    else if (o.state === 'TERMINADA') {
        modal(`<h2>Preparación de despacho</h2><form id="advanceform">${check('fragility', 'Confirmo protección, piezas completas y manipulación de vidrio frágil.')}<button>Despachar</button></form>`);
        $('#advanceform').onsubmit = e => {
            e.preventDefault();
            act('advance', {
                orderId: id, fragility: new FormData(e.target).has('fragility')
            });
        };
    }
    else
        act('advance', {
            orderId: id
        });
}
/*
 * Solicita evidencias anteriores y posteriores a la instalación por vano.
 * Parámetros: id.
 */
function installForm(id) {
    let o = db.orders.find(o => o.id === id), data = {};
    modal(`<h2>Instalación · ${o.code}</h2><form id="installform">${o.vanos.map(v => `<section class="card"><h3>${esc(v.name)}</h3><label>Antes de instalar<input type="file" accept="image/*" data-vano="${v.id}" data-phase="before" required></label><label>Después de instalar<input type="file" accept="image/*" data-vano="${v.id}" data-phase="after" required></label></section>`).join('')}<button>Guardar instalación</button></form>`);
    $$('#installform input[type=file]').forEach(el => el.onchange = async (e) => {
        let a = await readImages(e.target.files);
        (data[el.dataset.vano] ??= {
            id: el.dataset.vano
        })[el.dataset.phase] = a[0];
    });
    $('#installform').onsubmit = e => {
        e.preventDefault();
        act('install', {
            orderId: id, vanos: Object.values(data)
        });
    };
}
/*
 * Captura la recepción conforme una vez resueltas las observaciones.
 * Parámetros: id.
 */
function receiptForm(id) {
    let o = db.orders.find(o => o.id === id);
    modal(`<h2>Recepción · ${o.code}</h2>${o.observations.map(x => `<div class="split"><span>${esc(x.text)}<small> · ${x.status}</small></span>${x.status === 'Abierta' ? btn('Resolver', `resolveObservation('${id}','${x.id}')`, true) : ''}</div>`).join('')}<form id="obsform">${input('text', 'Observación', '', 'text', 'required')}${input('owner', 'Responsable', '', 'text', 'required')}${input('due', 'Plazo', new Date().toISOString().slice(0, 10), 'date', 'required')}<button class="secondary">Agregar observación</button></form><hr><form id="receiptform">${signaturePad()}${check('conform', 'Confirmo recepción conforme de todos los vanos.')}<div class="actions"><button ${o.observations.some(x => x.status === 'Abierta') ? 'disabled' : ''}>Firmar recepción conforme</button></div></form>`);
    initSignature();
    $('#obsform').onsubmit = e => {
        e.preventDefault();
        act('observation', {
            orderId: id, ...Object.fromEntries(new FormData(e.target))
        }, () => receiptForm(id));
    };
    $('#receiptform').onsubmit = e => {
        e.preventDefault();
        try {
            if (!new FormData(e.target).has('conform'))
                throw Error('Confirma recepción conforme.');
            act('receipt', {
                orderId: id, signature: getSignature()
            });
        }
        catch (e) {
            toast(e.message);
        }
    };
}
/*
 * Registra que una observación de instalación fue resuelta.
 * Parámetros: orderId, id.
 */
function resolveObservation(orderId, id) {
    act('resolve', {
        orderId, id
    }, () => receiptForm(orderId));
}
/*
 * Recoge material, cantidad, costo y causa de una merma.
 * Parámetros: id.
 */
function wasteForm(id) {
    modal(`<h2>Merma / rotura</h2><form id="wasteform">${input('material', 'Material', '', 'text', 'required')}${sel('cause', 'Causa', [
        'Medición', 'Corte', 'Rotura', 'Armado', 'Instalación'
    ])}${input('qty', 'Cantidad', 1, 'number', 'required min="1"')}${input('cost', 'Costo CLP', 0, 'number', 'required min="0"')}<button>Registrar</button></form>`);
    $('#wasteform').onsubmit = e => {
        e.preventDefault();
        act('waste', {
            orderId: id, ...Object.fromEntries(new FormData(e.target))
        });
    };
}
/*
 * Busca una pieza por su etiqueta y registra la estación de trabajo.
 * Parámetros: id.
 */
function scanForm(id) {
    let o = db.orders.find(o => o.id === id);
    modal(`<h2>Registrar pieza en estación</h2><p>Escanea con un lector de códigos o pega el identificador de la etiqueta. La estación corresponde al estado actual de la OT.</p><form id="scanform">${input('id', 'ID de pieza o contenido QR', '', 'text', 'required')}${input('lot', 'Lote de vidrio / perfil', o.code, 'text', 'required')}<button>Registrar avance</button></form>`);
    $('#scanform').onsubmit = e => {
        e.preventDefault();
        let f = new FormData(e.target), piece = f.get('id');
        if (piece.includes('piece='))
            piece = new URL(piece).searchParams.get('piece');
        act('piece', {
            orderId: id, id: piece, lot: f.get('lot')
        });
    };
}
/*
 * Genera etiquetas QR para identificar las piezas de una orden.
 * Parámetros: id.
 */
async function labelsQR(id) {
    let o = db.orders.find(o => o.id === id), cards = [];
    for (let v of o.vanos)
        for (let p of v.cut.pieces) {
            let data = await QRCode.toDataURL(location.origin + '/workspace.html?order=' + id + '&piece=' + p.id, {
                width: 160, margin: 1
            });
            cards.push(`<div class="qr-label"><img src="${data}" alt="QR de pieza"><b>${o.code} · ${esc(v.name)}</b><p>${p.name} · ${p.w}${p.h ? ' × ' + p.h : ''} mm</p><small>${p.id}</small></div>`);
        }
    modal(`<h2>Etiquetas por pieza</h2><div class="qrgrid">${cards.join('')}</div><div class="actions">${btn('Imprimir etiquetas', 'window.print()')}</div>`);
}
/*
 * Genera el comprobante interno imprimible de despacho; no asigna transportista ni vehículo.
 * Parámetros: id.
 */
function dispatchDoc(id) {
    let o = db.orders.find(o => o.id === id), r = db.requests.find(r => r.id === o.requestId);
    modal(`<div class="tagline">VENTEXA · DOCUMENTO INTERNO NO TRIBUTARIO</div><h2>Despacho ${o.code}</h2><p>${esc(r.client)}<br>${esc(r.address)}, ${esc(r.comuna)}</p><h3>FRÁGIL · VIDRIO · TRANSPORTAR VERTICAL</h3><table><thead><tr><th>Vano</th><th>Piezas</th><th>Medidas marco</th></tr></thead><tbody>${o.vanos.map(v => `<tr><td>${esc(v.name)}</td><td>${v.cut.pieces.length}</td><td>${v.cut.w} × ${v.cut.h} mm</td></tr>`).join('')}</tbody></table><p>Recibe: ___________________ Fecha: ___________________</p>${btn('Imprimir comprobante', 'window.print()')}`);
}
/*
 * Escapa los datos y construye una tabla en formato CSV.
 * Parámetros: name, rows.
 */
function csv(name, rows) {
    const q = s => '"' + String(s ?? '').replace(/^[=+@-]/, "'").replace(/"/g, '""') + '"';
    download(name, rows.map(r => r.map(q).join(';')).join('\n'), 'text/csv');
}
/*
 * Inicia la descarga de un contenido generado por la aplicación.
 * Parámetros: name, data, type.
 */
function download(name, data, type) {
    let url = URL.createObjectURL(new Blob([
        type === 'text/csv' ? '\uFEFF' : '', data
    ], {
        type
    })), a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/*
 * Exporta las piezas de corte de la orden seleccionada.
 * Parámetros: id.
 */
function exportCut(id) {
    let o = db.orders.find(o => o.id === id);
    csv(o.code + '-despiece.csv', [
        [
            'OT', 'Vano', 'ID', 'Pieza', 'Ancho mm', 'Alto mm', 'Angulo', 'Acta oficial'
        ], ...o.vanos.flatMap(v => v.cut.pieces.map(p => [
            o.code, v.name, p.id, p.name, p.w, p.h, p.angle, v.officialId
        ]))
    ]);
}
/*
 * Dibuja planes de corte y aprovechamiento de materiales.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function plans() {
    $('#app').innerHTML = title('MATERIAL', 'Planes de corte', 'Vidrio con cortes guillotina y perfiles por barras. Retales disponibles primero.') + `<section class="card"><h2>Crear lote de producción</h2><form id="batchform"><div class="checklist">${db.orders.filter(o => o.state === 'ANTICIPO_OK').map(o => check(o.id, o.code + ' · ' + esc(db.requests.find(r => r.id === o.requestId)?.client))).join('') || '<p>No hay órdenes pendientes con anticipo.</p>'}</div><div class="actions"><button>Generar planes agrupados</button></div></form></section>${db.plans.slice().reverse().map(p => `<section class="card"><div class="title"><div><h2>${p.kind === 'glass' ? 'Vidrio' : 'Perfiles'} · ${esc(p.material)}</h2><p>${date(p.at)} · aprovechamiento ${p.utilization.toFixed(1)}% · ${p.consumed ? 'Consumido' : 'Planificado'}</p></div>${btn('Exportar coordenadas', `exportPlan('${p.id}')`, true)}</div>${p.layouts.map((l, i) => p.kind === 'glass' ? `<h3>Plancha ${i + 1} · ${l.w} × ${l.h} mm ${l.retalId ? '· Retal' : ''}</h3><svg class="cut-sheet" viewBox="0 0 ${l.w} ${l.h}" role="img" aria-label="Plancha con posiciones de piezas">${l.pieces.map((x, k) => `<rect x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}" fill="${[
        '#5a939e', '#86b4bd', '#407580'
    ][k % 3]}" stroke="#fff" stroke-width="8"/><text x="${x.x + x.w / 2}" y="${x.y + x.h / 2}" font-size="55" fill="white" text-anchor="middle">${x.w} × ${x.h}</text>`).join('')}</svg><details><summary>Secuencia de cortes guillotina</summary><ol>${l.cuts.map(c => `<li>${c.axis} = ${c.position} mm, desde ${c.from} hasta ${c.to} mm</li>`).join('')}</ol></details>` : `<h3>Barra ${i + 1} · ${l.length} mm ${l.retalId ? '· Retal' : ''}</h3><div class="bar">${l.parts.map(x => `<span style="width:${(x.w + db.settings.kerf) / l.length * 100}%">${x.w}</span>`).join('')}</div><small>Sobrante ${l.remaining} mm</small>`).join('<br>')}</section>`).join('')}`;
    $('#batchform').onsubmit = e => {
        e.preventDefault();
        act('plan', {
            orderIds: [
                ...new FormData(e.target).keys()
            ]
        });
    };
}
/*
 * Exporta un plan de corte para su revisión.
 * Parámetros: id.
 */
function exportPlan(id) {
    let p = db.plans.find(x => x.id === id);
    csv('plan-' + id.slice(0, 8) + '.csv', [
        [
            'Material', 'Soporte', 'Pieza', 'X', 'Y', 'Ancho', 'Alto', 'Secuencia / tipo'
        ], ...p.layouts.flatMap((l, i) => p.kind === 'glass' ? [
            ...l.pieces.map(x => [
                p.material, i + 1, x.id, x.x, x.y, x.w, x.h, 'Pieza'
            ]), ...l.cuts.map((c, k) => [
                p.material, i + 1, 'Corte ' + (k + 1), c.axis, c.position, c.from, c.to, 'Guillotina'
            ])
        ] : l.parts.map(x => [
            p.material, i + 1, x.id, x.x, 0, x.w, 0, 'Perfil'
        ]))
    ]);
}
/*
 * Muestra stock, reservas y retales disponibles.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function inventory() {
    $('#app').innerHTML = title('BODEGA', 'Inventario y retales', 'Existencias centrales, reservas de fabricación y trazabilidad de movimientos.', btn('Registrar material', 'materialForm()', true)) + `<section class="card"><div class="tablewrap"><table><thead><tr><th>Material</th><th>Stock</th><th>Reservado</th><th>Disponible</th><th>Estado</th><th></th></tr></thead><tbody>${db.stock.map(x => {
        let reserved = (x.reservations || []).reduce((a, r) => a + r.qty, 0);
        return `<tr><td>${esc(x.name)}</td><td>${x.qty}</td><td>${reserved}</td><td>${x.qty - reserved}</td><td>${badge(x.qty - reserved < x.min ? 'Reponer' : 'Disponible')}</td><td>${btn('Movimiento', `stockForm('${x.id}')`, true)}</td></tr>`;
    }).join('')}</tbody></table></div></section><section class="card"><h2>Retales individuales</h2><table><thead><tr><th>Material</th><th>Dimensiones</th><th>Ubicación</th><th>Estado</th></tr></thead><tbody>${db.retals.map(r => `<tr><td>${esc(r.material)}</td><td>${r.w}${r.h ? ' × ' + r.h : ''} mm</td><td>${esc(r.location)}</td><td>${r.used ? 'Consumido' : r.reserved ? 'Reservado' : 'Disponible'}</td></tr>`).join('')}</tbody></table></section><section class="card"><h2>Últimos movimientos</h2>${db.movements.slice(-20).reverse().map(m => `<div class="split"><span>${esc(db.stock.find(x => x.id === m.materialId)?.name)} · ${esc(m.reason)}</span><b>${m.qty}</b></div>`).join('') || '<p>Sin movimientos manuales.</p>'}</section>`;
}
/*
 * Registra un ajuste de inventario con su motivo.
 * Parámetros: id.
 */
function stockForm(id) {
    modal(`<h2>Movimiento de inventario</h2><form id="stockform">${input('qty', 'Cantidad (negativa para salida)', 1, 'number', 'required')}${input('reason', 'Motivo', '', 'text', 'required')}<button>Guardar movimiento</button></form>`);
    $('#stockform').onsubmit = e => {
        e.preventDefault();
        act('stock', {
            id, ...Object.fromEntries(new FormData(e.target))
        });
    };
}
/*
 * Dibuja las órdenes de compra y sus recepciones.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function purchases() {
    $('#app').innerHTML = title('ABASTECIMIENTO', 'Compras', 'Órdenes de compra y recepciones parciales.', btn('＋ Nueva compra', 'purchaseForm()')) + `<section class="card"><table><thead><tr><th>Orden / proveedor</th><th>Material</th><th>Pedida / recibida</th><th>Costo unitario</th><th></th></tr></thead><tbody>${db.purchases.map(p => `<tr><td>${p.code}<small>${esc(p.supplier)}</small></td><td>${esc(db.stock.find(x => x.id === p.materialId)?.name)}</td><td>${p.qty} / ${p.received}<small>${p.status}</small></td><td>${money(p.unitCost)}</td><td>${btn('Recibir', `receiveForm('${p.id}')`, true, p.status === 'Recibida')}</td></tr>`).join('') || '<tr><td colspan="5">Sin órdenes de compra.</td></tr>'}</tbody></table></section>`;
}
/*
 * Abre el formulario para comprar un material a un proveedor.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function purchaseForm() {
    modal(`<h2>Nueva orden de compra</h2><form id="purchaseform">${input('supplier', 'Proveedor', '', 'text', 'required')}${sel('materialId', 'Material', db.stock)}${input('qty', 'Cantidad', 1, 'number', 'required min="1"')}${input('unitCost', 'Costo por plancha / barra / unidad (CLP)', 1, 'number', 'required min="1"')}<button>Crear compra</button></form>`);
    $('#purchaseform').onsubmit = e => {
        e.preventDefault();
        act('purchase', Object.fromEntries(new FormData(e.target)));
    };
}
/*
 * Registra una recepción parcial o completa de una compra.
 * Parámetros: id.
 */
function receiveForm(id) {
    let p = db.purchases.find(p => p.id === id);
    modal(`<h2>Recibir ${p.code}</h2><p>Pendiente: ${p.qty - p.received} unidades. Una recepción menor conserva la diferencia pendiente.</p><form id="receiveform">${input('qty', 'Unidades recibidas', p.qty - p.received, 'number', `min="1" max="${p.qty - p.received}" required`)}${check('updatePrice', 'Actualizar costo de referencia del catálogo a partir de esta compra.')}<button>Registrar recepción</button></form>`);
    $('#receiveform').onsubmit = e => {
        e.preventDefault();
        let f = new FormData(e.target);
        act('receive', {
            id, qty: +f.get('qty'), updatePrice: f.has('updatePrice')
        });
    };
}
/*
 * Muestra pagos y saldos registrados manualmente.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function payments() {
    $('#app').innerHTML = title('ADMINISTRACIÓN', 'Cobranza', 'Anticipos y saldos conciliados manualmente. Sin pasarela ni DTE.') + `<section class="card"><table><thead><tr><th>OT / cliente</th><th>Total</th><th>Pagado</th><th>Saldo</th><th></th></tr></thead><tbody>${db.orders.map(o => `<tr><td>${o.code}<small>${esc(db.requests.find(r => r.id === o.requestId)?.client)}</small></td><td>${money(o.total)}</td><td>${money(o.advance)}</td><td>${money(o.total - o.advance)}</td><td>${btn('Registrar', `paymentForm('${o.id}')`, true, o.advance >= o.total)}</td></tr>`).join('')}</tbody></table></section><section class="card"><h2>Comprobantes conciliados</h2>${db.payments.slice().reverse().map(p => `<div class="split"><span>${esc(p.reference)}<small> · ${date(p.at)} · ${esc(p.method)}</small></span><b>${money(p.amount)}</b></div>`).join('')}</section>`;
}
/*
 * Dibuja garantías y reclamos de órdenes cerradas.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function warranties() {
    $('#app').innerHTML = title('POSTVENTA', 'Garantías y reclamos', 'Plazos por componente y visitas de servicio.') + `<section class="card"><h2>Órdenes con garantía activada</h2>${db.orders.filter(o => o.state === 'CERRADA').map(o => `<div class="split"><div><h3>${o.code}</h3>${o.warranty.map(w => `<small>${w.component}: ${date(w.expires)}<br></small>`).join('')}</div>${btn('Registrar reclamo', `claimForm('${o.id}')`, true)}</div>`).join('') || '<p>La garantía se activa después de la recepción conforme y el cierre de la OT.</p>'}</section><section class="card"><h2>Reclamos y costo de servicio</h2>${db.claims.map(c => `<div class="card"><h3>${esc(c.component)} · ${esc(c.cause)}</h3><p>${esc(c.text)}<br>${c.covered ? 'Dentro del plazo de garantía' : 'Fuera del plazo de garantía'} · ${c.status} · costo ${money(c.cost)}</p>${btn('Actualizar servicio', `serviceForm('${c.id}')`, true)} ${btn('Agendar visita', `schedule('${db.orders.find(o => o.id === c.orderId).requestId}')`, true)}</div>`).join('') || '<p>Sin reclamos.</p>'}</section>`;
}
/*
 * Abre un reclamo asociado a una garantía.
 * Parámetros: id.
 */
function claimForm(id) {
    let o = db.orders.find(o => o.id === id);
    modal(`<h2>Registrar reclamo</h2><form id="claimform">${sel('component', 'Componente', o.warranty.map(w => w.component))}${sel('cause', 'Causa', [
        'Medición', 'Fabricación', 'Instalación', 'Uso', 'Por determinar'
    ])}${input('text', 'Descripción', '', 'text', 'required')}<button>Guardar reclamo</button></form>`);
    $('#claimform').onsubmit = e => {
        e.preventDefault();
        act('claim', {
            orderId: id, ...Object.fromEntries(new FormData(e.target))
        });
    };
}
/*
 * Registra el seguimiento y costo de atención de un reclamo.
 * Parámetros: id.
 */
function serviceForm(id) {
    modal(`<h2>Actualizar servicio</h2><form id="serviceform">${sel('status', 'Estado', [
        'Abierto', 'En visita', 'Resuelto'
    ])}${input('cost', 'Costo CLP', 0, 'number', 'min="0" required')}${input('resolution', 'Resolución / notas', '', 'text', 'required')}<button>Guardar</button></form>`);
    $('#serviceform').onsubmit = e => {
        e.preventDefault();
        act('service', {
            id, ...Object.fromEntries(new FormData(e.target))
        });
    };
}
/*
 * Presenta indicadores calculados a partir de los registros actuales.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function reports() {
    let pairs = db.requests.flatMap(r => r.vanos.filter(v => v.officialId).map(v => {
        let a = dims(db.estimated[v.estimatedId]), b = dims(db.official[v.officialId]);
        return {
            client: r.client, type: v.config.type, channel: r.channel, name: v.name, w: b.w - a.w, h: b.h - a.h, pw: (b.w - a.w) / a.w * 100, ph: (b.h - a.h) / a.h * 100
        };
    })), missed = db.visits.filter(v => v.status === 'No realizada'), closed = db.orders.filter(o => o.closedAt);
    $('#app').innerHTML = title('CONTROL OPERACIONAL', 'Reportes', 'Indicadores calculados desde los registros del taller.') + `<div class="stats"><div class="stat"><span>Desviación media absoluta</span><strong>${pairs.length ? (pairs.reduce((a, x) => a + Math.abs(x.w) + Math.abs(x.h), 0) / (pairs.length * 2)).toFixed(1) : 0} mm</strong><small>Medidas cliente / oficial</small></div><div class="stat"><span>Visitas perdidas</span><strong>${db.visits.length ? (missed.length / db.visits.length * 100).toFixed(1) : 0}%</strong><small>${missed.length} de ${db.visits.length} visitas</small></div><div class="stat"><span>Ocupación de fábrica</span><strong>${Math.round(db.orders.filter(o => ![
        'CERRADA', 'INSTALADA', 'RECEPCIONADA'
    ].includes(o.state)).length / db.settings.capacity * 100)}%</strong><small>${db.settings.capacity} OT simultáneas de capacidad</small></div><div class="stat"><span>Plazo medio total</span><strong>${closed.length ? (closed.reduce((a, o) => a + (Date.parse(o.closedAt) - Date.parse(o.at)) / 864e5, 0) / closed.length).toFixed(1) : '—'}</strong><small>Días · solo OT cerradas</small></div></div><div class="grid"><section class="card"><h2>Etapas comerciales</h2>${[
        'BORRADOR', 'ESTIMACION_ENVIADA', 'VISITA_AGENDADA', 'VISITA_REALIZADA', 'COTIZACION_FIRME', 'ACEPTADA', 'RECHAZADA', 'CERRADA'
    ].map(k => {
        let n = db.requests.filter(r => r.status === k).length;
        return `<div class="split"><span>${labels[k]}</span><b>${n}</b></div><div class="bar"><span style="width:${n / Math.max(db.requests.length, 1) * 100}%"></span></div>`;
    }).join('')}</section><section class="card"><h2>Aprovechamiento por material</h2>${db.plans.map(p => `<div class="split"><span>${esc(p.material)} · ${date(p.at)}</span><b>${p.utilization.toFixed(1)}%</b></div>`).join('') || '<p>Genera un plan de corte para medir aprovechamiento.</p>'}<h2 style="margin-top:25px">Visitas perdidas por causa</h2>${[
        'Cliente ausente', 'Acceso bloqueado', 'Dirección incorrecta'
    ].map(c => `<div class="split"><span>${c}</span><b>${missed.filter(v => v.reason === c).length}</b></div>`).join('')}</section></div><section class="card"><h2>Desviación por tipología y canal</h2><div class="tablewrap"><table><thead><tr><th>Cliente / vano</th><th>Tipología / canal</th><th>Ancho</th><th>Alto</th></tr></thead><tbody>${pairs.map(x => `<tr><td>${esc(x.client)}<small>${esc(x.name)}</small></td><td>${x.type} · ${x.channel}</td><td>${x.w} mm (${x.pw.toFixed(2)}%)</td><td>${x.h} mm (${x.ph.toFixed(2)}%)</td></tr>`).join('')}</tbody></table></div></section><section class="card"><h2>Margen cotizado y costo de retrabajo registrado</h2><table><thead><tr><th>OT</th><th>Margen cotizado</th><th>Merma / corrección</th><th>Margen ajustado estimado</th></tr></thead><tbody>${db.orders.map(o => {
        let q = db.quotes.find(q => q.id === o.quoteId), extra = db.waste.filter(w => w.orderId === o.id).reduce((a, w) => a + w.cost, 0) + (o.changeNotes || []).reduce((a, w) => a + w.cost, 0);
        return `<tr><td>${o.code}</td><td>${((q.net - q.cost) / q.net * 100).toFixed(1)}%</td><td>${money(extra)}</td><td>${((q.net - q.cost - extra) / q.net * 100).toFixed(1)}%</td></tr>`;
    }).join('')}</tbody></table><p>El margen ajustado utiliza los costos cotizados más mermas registradas. No sustituye el costeo real completo de horas y consumos.</p></section>`;
}
/*
 * Muestra el catálogo de prueba y sus reglas.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function catalog() {
    let sections = [
        [
            'lines', 'Líneas de perfil'
        ], [
            'glass', 'Vidrios'
        ], [
            'hardware', 'Herrajes'
        ], [
            'rules', 'Reglas por tipología'
        ]
    ];
    $('#app').innerHTML = title('ADMINISTRACIÓN', 'Catálogo y fabricabilidad', 'Parámetros editables. Todos los valores iniciales son de prueba.') + sections.map(([kind, title]) => `<section class="card"><div class="title"><h2>${title}</h2>${kind !== 'rules' ? btn('Agregar', `catalogForm('${kind}',-1)`, true) : ''}</div><table><thead><tr><th>Elemento</th><th>Parámetros</th><th></th></tr></thead><tbody>${db.catalog[kind].map((x, i) => `<tr><td>${esc(x.name || x.type)}</td><td>${kind === 'lines' ? esc(x.material) + ' · ' + money(x.price) + '/m · holgura ' + x.gap + ' mm' : kind === 'glass' ? x.thickness + ' mm · ' + money(x.price) + '/m²' : kind === 'hardware' ? x.capacity + ' kg · ' + money(x.price) : x.minW + '–' + x.maxW + ' mm ancho · ' + x.hours + ' h'}</td><td>${btn('Editar', `catalogForm('${kind}',${i})`, true)}</td></tr>`).join('')}</tbody></table></section>`).join('');
}
/*
 * Permite editar datos del catálogo; no descarga ni digitaliza automáticamente el catálogo Sodal.
 * Parámetros: kind, index.
 */
function catalogForm(kind, index) {
    const defaults = {
        lines: {
            id: uid(), name: 'Nueva línea', supplier: '', material: 'Aluminio', depth: 70, u: 3, air: 'Sin certificar', colors: [
                'Blanco'
            ], types: [
                ...types
            ], price: 8500, gap: 5, glassDeduction: 70, maxArea: 3, margin: 30
        }, glass: {
            id: uid(), name: 'Nuevo vidrio', thickness: 6, chamber: 0, lowE: false, safety: false, color: 'Incoloro', u: 5.7, price: 42000
        }, hardware: {
            id: uid(), name: 'Nuevo herraje', capacity: 80, price: 18000, types: [
                ...types
            ]
        }
    };
    let x = index >= 0 ? db.catalog[kind][index] : defaults[kind];
    modal(`<h2>Editar ${kind === 'rules' ? esc(x.type) : 'elemento de catálogo'}</h2><form id="catalogform"><div class="fields">${Object.entries(x).filter(([k]) => ![
        'id', 'type'
    ].includes(k)).map(([k, v]) => typeof v === 'boolean' ? check(k, ({
        lowE: 'Low-E', safety: 'Vidrio de seguridad'
    })[k] || k, v) : Array.isArray(v) ? input(k, ({
        types: 'Tipologías (separadas por coma)', colors: 'Colores (separados por coma)'
    })[k], v.join(', '), 'text', 'required') : input(k, ({
        name: 'Nombre', supplier: 'Proveedor', material: 'Material', depth: 'Profundidad mm', u: 'Valor U', air: 'Permeabilidad al aire', price: 'Precio de referencia CLP', gap: 'Holgura por lado mm', glassDeduction: 'Deducción vidrio mm', maxArea: 'Área máxima por hoja m²', margin: 'Margen %', thickness: 'Espesor total de vidrio mm', chamber: 'Cámara mm', color: 'Color', capacity: 'Capacidad kg', minW: 'Ancho mínimo mm', maxW: 'Ancho máximo mm', minH: 'Alto mínimo mm', maxH: 'Alto máximo mm', maxSlender: 'Esbeltez máxima', minThickness: 'Espesor mínimo mm', maxAreaThin: 'Área máxima vidrio delgado m²', highInstall: 'Altura de trabajo umbral mm', highMinThickness: 'Espesor mínimo sobre umbral mm', hours: 'Horas de fabricación', minLeaves: 'Hojas mínimas', maxLeaves: 'Hojas máximas'
    })[k] || k, v, typeof v === 'number' ? 'number' : 'text', typeof v === 'number' ? 'step="any" required' : 'required')).join('')}</div><button>Guardar catálogo</button></form>`);
    $('#catalogform').onsubmit = e => {
        e.preventDefault();
        let f = new FormData(e.target), v = {
            ...x
        };
        for (let [k, old] of Object.entries(x)) {
            if ([
                'id', 'type'
            ].includes(k))
                continue;
            v[k] = typeof old === 'boolean' ? f.has(k) : typeof old === 'number' ? +f.get(k) : Array.isArray(old) ? f.get(k).split(',').map(x => x.trim()).filter(Boolean) : f.get(k);
        }
        let cat = structuredClone(db.catalog);
        index >= 0 ? cat[kind][index] = v : cat[kind].push(v);
        act('catalog', {
            catalog: cat
        });
    };
}
/*
 * Abre los parámetros del negocio y administración de miembros.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function settings() {
    let fields = {
        company: 'Nombre empresa', rut: 'RUT empresa', address: 'Dirección empresa', quoteDays: 'Vigencia cotización · días', actDays: 'Vigencia acta · días', band: 'Amplitud banda · %', margin: 'Margen por defecto · %', advance: 'Anticipo · %', hour: 'Hora fabricación · CLP', installHour: 'Hora instalación · CLP', consumables: 'Consumibles · CLP', removal: 'Retiro · CLP', finish: 'Terminaciones · CLP', scaffold: 'Andamio · CLP', adjust: 'Ajuste escuadría · CLP', minGlass: 'Mínimo facturable vidrio · m²', kerf: 'Espesor de corte · mm', edge: 'Margen plancha · mm', retalMin: 'Umbral retal · mm', uf: 'Valor UF manual · CLP', ufDate: 'Fecha del valor UF', leadDays: 'Plazo fabricación · días', capacity: 'Capacidad fábrica · OT simultáneas'
    };
    $('#app').innerHTML = title('ADMINISTRACIÓN', 'Parámetros', 'Afectan nuevas cotizaciones y planes. Las versiones existentes se conservan.') + `<form id="settingsform"><section class="card"><div class="fields wide">${Object.entries(fields).map(([k, l]) => input(k, l, db.settings[k], typeof db.settings[k] === 'number' ? 'number' : k === 'ufDate' ? 'date' : 'text', typeof db.settings[k] === 'number' ? 'step="any" required' : '')).join('')}</div><h3>Traslados por comuna (CLP)</h3><div class="fields">${Object.entries(db.settings.zones).map(([k, v], i) => input('zone' + i, k, v, 'number', 'required min="0"')).join('')}</div><h3>Garantías por componente (meses)</h3><div class="fields">${Object.entries(db.settings.warranty).map(([k, v], i) => input('war' + i, k, v, 'number', 'required min="1"')).join('')}</div>${input('qc', 'Checklist de calidad (separado por coma)', db.settings.qc.join(', '), 'text', 'required')}<button>Guardar parámetros</button></section></form><section class="card"><h2>Respaldo y trazabilidad</h2><p>Descarga los registros centrales. Los archivos y firmas permanecen asociados a sus referencias protegidas.</p><a class="button secondary" href="/api/backup">Exportar respaldo de registros</a><p>Se conserva una instantánea por día con actividad. El respaldo programado en días sin actividad, su retención automática y un procedimiento completo de restauración aún requieren configuración operacional.</p></section>`;
    $('#settingsform').onsubmit = e => {
        e.preventDefault();
        let f = new FormData(e.target), s = structuredClone(db.settings);
        for (let k of Object.keys(fields))
            s[k] = typeof db.settings[k] === 'number' ? +f.get(k) : f.get(k);
        Object.keys(s.zones).forEach((k, i) => s.zones[k] = +f.get('zone' + i));
        Object.keys(s.warranty).forEach((k, i) => s.warranty[k] = +f.get('war' + i));
        s.qc = f.get('qc').split(',').map(x => x.trim()).filter(Boolean);
        act('settings', {
            settings: s
        });
    };
}
/*
 * Muestra cuadrillas, competencias, comunas y horarios.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function teams() {
    $('#app').innerHTML = title('PERSONAS', 'Equipo y permisos', 'Roles comprobados en el servidor. El acceso al sitio se administra por separado.') + `<section class="card"><h2>Usuarios asignados</h2><p>Propietaria del taller: administración. Los demás usuarios deben contar también con acceso privado al sitio.</p><table><thead><tr><th>Email</th><th>Rol</th><th>Sucursal</th></tr></thead><tbody>${db.members.map(m => `<tr><td>${esc(m.email)}</td><td>${m.role}</td><td>${esc(m.branch)}</td></tr>`).join('')}</tbody></table><form id="memberform"><div class="fields">${input('email', 'Email de usuario', '', 'email', 'required')}${sel('role', 'Rol', roles)}${input('branch', 'Sucursal', 'Principal', 'text', 'required')}</div><button>Asignar rol</button></form></section><section class="card"><div class="title"><h2>Técnicos y cuadrillas</h2>${btn('Agregar cuadrilla', 'teamForm(-1)', true)}</div>${db.teams.map((t, i) => `<div class="split"><div><h3>${esc(t.name)}</h3><p>${t.skills.join(', ')} · ${t.start}:00–${t.end}:00<br>${t.zones.join(', ')}</p></div>${btn('Editar', `teamForm(${i})`, true)}</div>`).join('')}</section>`;
    $('#memberform').onsubmit = e => {
        e.preventDefault();
        act('member', Object.fromEntries(new FormData(e.target)));
    };
}
/*
 * Edita la disponibilidad y habilidades de una cuadrilla.
 * Parámetros: i.
 */
function teamForm(i) {
    let t = i >= 0 ? db.teams[i] : {
        id: uid(), name: 'Nueva cuadrilla', skills: [
            'Medición'
        ], zones: [
            'San Fernando'
        ], start: 9, end: 18, days: [
            1, 2, 3, 4, 5
        ]
    };
    modal(`<h2>Disponibilidad de cuadrilla</h2><form id="teamform">${input('name', 'Nombre', t.name, 'text', 'required')}${input('skills', 'Competencias (Medición, Instalación, Servicio)', t.skills.join(', '), 'text', 'required')}${input('zones', 'Comunas (separadas por coma)', t.zones.join(', '), 'text', 'required')}<div class="fields">${input('start', 'Hora de inicio', t.start, 'number', 'required min="0" max="23"')}${input('end', 'Hora de término', t.end, 'number', 'required min="1" max="24"')}</div>${input('days', 'Días: 0 domingo, 1 lunes…6 sábado', t.days.join(', '), 'text', 'required')}<button>Guardar cuadrilla</button></form>`);
    $('#teamform').onsubmit = e => {
        e.preventDefault();
        let f = new FormData(e.target), x = {
            id: t.id, name: f.get('name'), skills: f.get('skills').split(',').map(x => x.trim()), zones: f.get('zones').split(',').map(x => x.trim()), start: +f.get('start'), end: +f.get('end'), days: f.get('days').split(',').map(x => +x.trim())
        }, a = structuredClone(db.teams);
        i >= 0 ? a[i] = x : a.push(x);
        act('teams', {
            teams: a
        });
    };
}
/*
 * Muestra la cola sin conexión y los conflictos de sincronización.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
async function offline() {
    let q = await cache('queue') || [];
    $('#app').innerHTML = title('TERRENO', 'Sin conexión y conflictos', 'Los registros pendientes no se consideran confirmados hasta que el servidor los acepta.') + `<section class="card"><h2>Cola de este dispositivo · ${q.length}</h2>${q.map((x, i) => `<div class="split"><span>${x.action} · revisión ${x.revision}</span>${btn('Revisar / reenviar', `retryQueued(${i})`, true)}</div>`).join('') || '<p>No hay registros pendientes.</p>'}<div class="actions">${btn('Sincronizar ahora', 'syncQueue()')}</div></section><section class="card"><h2>Conflictos conservados</h2>${db.conflicts.map(c => `<div class="card"><h3>${c.action} · ${date(c.at)}</h3><p>${c.status}: revisión local ${c.attemptedRevision}, servidor ${c.currentRevision}</p><details><summary>Comparar ambas versiones</summary><pre style="white-space:pre-wrap">${esc(JSON.stringify({
        servidor: c.current, intento: c.payload.measure
    }, null, 2))}</pre></details>${btn('Marcar revisado', `act('resolveConflict',{id:'${c.id}'})`, true)}</div>`).join('') || '<p>Sin conflictos registrados.</p>'}</section>`;
}
/*
 * Muestra la ayuda y las limitaciones documentadas del prototipo.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function help() {
    $('#app').innerHTML = title('ALCANCE Y USO', 'Qué puedes probar', 'Esta versión amplía el prototipo. No certifica el cumplimiento completo de la especificación.') + `<section class="card"><h2>Recorrido recomendado</h2><ol><li>Carga los cinco casos ficticios desde Resumen.</li><li>Abre Visualizador 3D, cambia medidas y prueba abrir / cerrar hojas.</li><li>En una OT con anticipo, genera el plan de corte, revisa retales y aprueba el despiece.</li><li>Avanza corte, armado y control de calidad.</li><li>Registra fotos antes y después por vano, resuelve observaciones y firma recepción.</li></ol></section><section class="card"><a class="button secondary" href="/cobertura-requisitos.md" target="_blank">Ver matriz completa de los 120 requisitos</a><br><br><h2>Funciones implementadas</h2><p>Registros centrales, fotografías y firmas protegidas; roles; catálogo y reglas editables; seis tipologías; solicitudes con varios vanos; cotizaciones versionadas y PDF; agenda con capacidad; actas oficiales separadas; aceptación con huella; pagos manuales; reservas; planes guillotina 2D y barras 1D; retales; etiquetas QR; mermas; compras; recepción por vano; observaciones; garantías y reclamos; reportes; captura de terreno en cola sin conexión.</p><h2>Realidad aumentada</h2><p>Modelos paramétricos en metros, GLB y USDZ, visor 3D y apertura de hojas. AR disponible según equipo y navegador; configuración de escala fija y colocación en pared. En este sitio privado se utilizan WebXR y Quick Look. Scene Viewer no se activa porque necesita descargar el modelo desde una dirección accesible fuera de la sesión privada. Falta validar la cámara y la colocación en teléfonos físicos.</p><h2>Límites que siguen pendientes</h2><ul><li>Validación industrial del catálogo y de todas las fórmulas de despiece por tipología.</li><li>Costeo real completo de consumos y tiempos, planificación avanzada de capacidad y rutas.</li><li>Respaldo diario sin actividad, retención automática y restauración operacional probada.</li><li>Pruebas en teléfonos reales, rendimiento 4G, accesibilidad y uso prolongado sin conexión.</li><li>Arquitectura Azure/PostgreSQL/React Native de la especificación: esta versión es una aplicación web alojada con base central.</li><li>Integraciones excluidas por solicitud: SII/DTE, pagos en línea, WhatsApp, mapas, láser, contabilidad y BI externo.</li></ul><p>Los CSV son genéricos. No se declara compatibilidad con una máquina de corte específica sin conocer su formato.</p></section>`;
}
/*
 * Lleva la configuración del formulario al visualizador.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function visualFromForm() {
    currentVano = {
        config: readC($('#configform')), measure: readM($('#configform'))
    };
    go('Visualizador 3D');
}
/*
 * Lleva al visualizador la configuración de un vano de una solicitud.
 * Parámetros: rid, vid.
 */
function visualVano(rid, vid) {
    let r = db.requests.find(r => r.id === rid), v = r.vanos.find(v => v.id === vid);
    currentVano = {
        config: v.config, measure: db.estimated[v.estimatedId]
    };
    go('Visualizador 3D');
}
/*
 * Construye la pantalla de modelos, fotografía, AR y edición con IA.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function visual() {
    let c = currentVano?.config || defaultC(), m = currentVano?.measure || {
        w: [
            1500, 1500, 1500
        ], h: [
            1200, 1200, 1200
        ]
    }, d = dims(m);
    $('#app').innerHTML = title('TU VENTANA EN TU ESPACIO', 'Visualizador 3D y realidad aumentada', 'La vista usa las medidas ingresadas. Nunca mide desde la cámara o la fotografía.') + `<div class="grid"><section class="card"><form id="visualform">${sel('type', 'Tipología', types, c.type)}<div class="fields">${input('w', 'Ancho ingresado (mm)', d.w, 'number', 'min="300" max="6000" required')}${input('h', 'Alto ingresado (mm)', d.h, 'number', 'min="300" max="6000" required')}${sel('line', 'Perfil', db.catalog.lines, c.line)}${sel('glass', 'Vidrio', db.catalog.glass, c.glass)}${input('leaves', 'Hojas', c.leaves, 'number', 'min="1" max="4" required')}${sel('direction', 'Sentido de apertura', [
        'Izquierda', 'Derecha'
    ], c.direction)}${sel('color', 'Color', [
        'Blanco', 'Negro', 'Bronce'
    ], c.color)}</div><button>Actualizar modelo</button></form><div class="note">Vista visual, independiente de la validación para cotizar. Para modelos fabricables utiliza el Configurador.</div><h3>Reelaborar tu fotografía con IA</h3><p>Marca las esquinas en orden: superior izquierda, superior derecha, inferior derecha e inferior izquierda.</p><label>Foto del espacio<input id="room-photo" type="file" accept="image/*"></label><div class="actions">${btn('Reiniciar esquinas', 'resetCorners()', true)}${btn('Guardar guía', 'saveComposition()', true)}<button id="ai-generate" disabled onclick="generateAI()">Reelaborar con IA</button></div><p id="ai-status" role="status">Comprobando servicio de IA…</p><p class="help">Al generar se envía esta foto al servicio de IA. Se conserva la foto original para comparar. La imagen resultante es una propuesta visual.</p></section><div><section class="card"><model-viewer id="viewer" camera-controls touch-action="pan-y" ar ar-modes="webxr quick-look" ar-placement="wall" ar-scale="fixed" camera-orbit="-25deg 75deg 3m" shadow-intensity="1" alt="Modelo paramétrico de ventana"><span slot="ar-button"></span></model-viewer><div id="model-state" class="help" role="status">Generando modelo…</div><div class="actions"><button id="enter-ar" disabled onclick="startAR()">Abrir cámara · realidad aumentada</button></div><div id="ar-guide" class="note">Apunta a una pared bien iluminada y mueve el teléfono lentamente. La escala permanece fija en 1:1. En AR guiada confirma el centro del vano con el contorno verde; detecta paredes, no reconoce automáticamente aberturas. En iPhone abre este enlace en Safari si el navegador de la aplicación no permite activar AR.</div><div id="static-fallback"></div><div class="actions">${btn('Abrir / cerrar hojas', 'toggleLeaves()', true)}${btn('Descargar GLB', "downloadModel('glb')", true)}${btn('Descargar USDZ', "downloadModel('usdz')", true)}</div><p class="help">Gira con el dedo y acerca con dos dedos. Si el botón AR no aparece, utiliza la foto. La AR depende del dispositivo.</p></section><section class="card"><h2>Sobre tu fotografía</h2><canvas id="photo-canvas" class="photo-canvas" width="900" height="600"></canvas><small id="corners">Carga una fotografía para comenzar.</small><section id="ai-result" hidden><h3>Imagen reelaborada con IA</h3><img id="ai-image" alt="Propuesta de instalación generada con IA" style="width:100%;border-radius:12px"><div class="actions"><button onclick="downloadAI()">Descargar imagen IA</button><button class="secondary" onclick="compareAI()">Ver original / resultado</button></div><p id="ai-result-note" class="help"></p></section></section></div></div>`;
    $('#visualform').onsubmit = e => {
        e.preventDefault();
        generateModel();
    };
    $('#viewer').addEventListener('ar-status', e => {
        const texts = {
            'session-started': 'Cámara abierta. Apunta a una pared y mueve el teléfono lentamente.', 'object-placed': 'Modelo colocado. Acércate para revisar el encaje visual.', 'failed': 'No se pudo iniciar AR. Prueba Safari en iPhone o Chrome en Android; también puedes usar la fotografía.', 'not-presenting': 'Visor 3D disponible. Puedes volver a entrar en AR.'
        };
        $('#ar-guide').textContent = texts[e.detail.status] || 'Preparando realidad aumentada.';
    });
    $('#viewer').addEventListener('ar-tracking', e => {
        if (e.detail.status === 'not-tracking')
            $('#ar-guide').textContent = 'Se perdió el seguimiento. Mejora la iluminación y mueve el teléfono lentamente.';
    });
    $('#viewer').addEventListener('load', arAvailability);
    $('#viewer').addEventListener('error', () => $('#model-state').textContent = 'No se pudo abrir el visor. El montaje fotográfico y la cotización siguen disponibles.');
    $('#room-photo').onchange = photoInput;
    roomImage = null;
    corners = [];
    invalidateAI();
    checkAI();
    generateModel();
}
/*
 * Recoge la configuración visual con dimensiones en milímetros.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function visualConfig() {
    let f = new FormData($('#visualform'));
    return {
        c: {
            ...defaultC(), type: f.get('type'), direction: f.get('direction') || 'Izquierda', color: f.get('color'), line: f.get('line'), glass: f.get('glass'), lineName: db.catalog.lines.find(x => x.id === f.get('line'))?.name, glassName: db.catalog.glass.find(x => x.id === f.get('glass'))?.name, depth: db.catalog.lines.find(x => x.id === f.get('line'))?.depth || 70, thickness: db.catalog.glass.find(x => x.id === f.get('glass'))?.thickness || 6, leaves: +f.get('leaves')
        }, w: +f.get('w'), h: +f.get('h')
    };
}
let modelGeneration = 0;
/*
 * Genera el modelo de la configuración actual; descarta respuestas antiguas y conserva una vista estática si falla el visor.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
async function generateModel() {
    invalidateAI();
    let g = ++modelGeneration;
    if ($('#enter-ar'))
        $('#enter-ar').disabled = true;
    lastModel = null;
    try {
        let { c, w, h } = visualConfig();
        if (w < 300 || w > 6000 || h < 300 || h > 6000 || c.leaves < 1 || c.leaves > 4)
            throw Error('Revisa medidas y cantidad de hojas.');
        let v = $('#viewer');
        showStatic();
        const ready = await showModel(v, c, w, h, openLeaf);
        if (g !== modelGeneration || !ready)
            return;
        lastModel = ready;
        arAvailability();
        $('#static-fallback').innerHTML = '';
        $('#model-state').textContent = 'Modelo a escala métrica · ' + (w / 1000) + ' × ' + (h / 1000) + ' m · ' + (openLeaf ? 'hojas abiertas' : 'hojas cerradas');
        if (roomImage)
            compose($('#photo-canvas'), roomImage, corners, c);
    }
    catch (e) {
        if ($('#model-state')) {
            $('#model-state').textContent = 'El visor 3D no está disponible. Puedes continuar con la vista estática y el montaje sobre foto.';
            showStatic();
        }
    }
}
/*
 * Alterna la representación visual de hojas abiertas o cerradas.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function toggleLeaves() {
    openLeaf = !openLeaf;
    generateModel();
}
/*
 * Descarga el GLB o USDZ generado para la configuración actual.
 * Parámetros: type.
 */
function downloadModel(type) {
    if (!lastModel)
        return toast('Espera a que termine el modelo.');
    let a = document.createElement('a');
    a.href = lastModel[type + 'URL'];
    a.download = 'ventana.' + type;
    a.click();
}
let roomImage = null, corners = [];
/*
 * Carga la foto, la reduce y permite marcar o corregir las cuatro esquinas del vano.
 * Parámetros: e.
 */
async function photoInput(e) {
    try {
        let file = e.target.files[0];
        if (!file)
            return;
        let url = URL.createObjectURL(file), img = new Image;
        img.src = url;
        await img.decode();
        URL.revokeObjectURL(url);
        invalidateAI();
        roomImage = img;
        let canvas = $('#photo-canvas');
        canvas.width = Math.min(img.width, 1200);
        canvas.height = img.height * (canvas.width / img.width);
        corners = [];
        updateAIButton();
        compose(canvas, img, corners, visualConfig().c);
        $('#corners').textContent = 'Marca la esquina superior izquierda.';
        canvas.onclick = e => {
            let r = canvas.getBoundingClientRect(), point = {
                x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height
            };
            invalidateAI();
            if (corners.length === 4) {
                let nearest = corners.reduce((best, p, i) => Math.hypot(p.x - point.x, p.y - point.y) < Math.hypot(corners[best].x - point.x, corners[best].y - point.y) ? i : best, 0);
                corners[nearest] = point;
            }
            else
                corners.push(point);
            try {
                compose(canvas, roomImage, corners, visualConfig().c);
                $('#corners').textContent = corners.length === 4 ? 'Vano definido. Puedes generar la imagen con IA o tocar una esquina para corregirla.' : `Esquina ${corners.length + 1}: ${[
                    '', 'superior derecha', 'inferior derecha', 'inferior izquierda'
                ][corners.length]}`;
            }
            catch (e) {
                toast(e.message);
                corners = [];
            }
            updateAIButton();
        };
    }
    catch (e) {
        toast('No se pudo abrir la fotografía. Usa JPG o PNG.');
    }
}
/*
 * Borra la selección del vano para volver a marcarla.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function resetCorners() {
    invalidateAI();
    corners = [];
    updateAIButton();
    if (roomImage)
        compose($('#photo-canvas'), roomImage, corners, visualConfig().c);
    $('#corners').textContent = 'Marca de nuevo las cuatro esquinas.';
}
/*
 * Descarga la guía dibujada sobre la foto. Este montaje por canvas no es una imagen generada con IA.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function saveComposition() {
    if (corners.length !== 4)
        return toast('Marca las cuatro esquinas primero.');
    let a = document.createElement('a');
    a.href = $('#photo-canvas').toDataURL('image/png');
    a.download = 'ventana-sobre-foto.png';
    a.click();
}
Object.assign(window, {
    go, act, openRequest, openOrder, filterRequests, removeDraftVano, saveDraft, visualFromForm, visualVano, measure, clearSignature, quoteForm, acceptForm, rejectForm, schedule, availableSlots, visitForm, paymentForm, advanceForm, installForm, receiptForm, resolveObservation, wasteForm, scanForm, labelsQR, dispatchDoc, exportCut, exportPlan, stockForm, purchaseForm, receiveForm, claimForm, serviceForm, catalogForm, teamForm, syncQueue, toggleLeaves, downloadModel, resetCorners, saveComposition
});
$('#close').onclick = () => $('#modal').close();
$('#sync').onclick = syncQueue;
window.addEventListener('online', syncQueue);
window.addEventListener('offline', () => {
    toast('Sin conexión: los registros de terreno pueden guardarse en la cola.');
    $('#connection').textContent = 'Sin conexión · pendiente de sincronización';
});
try {
    await refresh();
    draft = await cache('draft') || draft;
    render();
    const p = new URLSearchParams(location.search);
    if (p.has('order') && db.orders.some(o => o.id === p.get('order'))) {
        openOrder(p.get('order'));
        if (p.has('piece')) {
            scanForm(p.get('order'));
            $('#scanform input[name=id]').value = p.get('piece');
        }
    }
    if ('serviceWorker' in navigator)
        navigator.serviceWorker.register('/sw.js').catch(() => {
        });
}
catch (e) {
    toast(e.message);
}
/*
 * Recupera una solicitud en borrador para continuar su edición.
 * Parámetros: id.
 */
function resumeDraft(id) {
    let r = db.requests.find(r => r.id === id);
    draft = {
        ...r, vanos: r.vanos.map(v => ({
            name: v.name, config: v.config, measure: db.estimated[v.estimatedId], photos: db.estimated[v.estimatedId].photos, confirmed: db.estimated[v.estimatedId].confirmed
        }))
    };
    go('Configurador');
}
window.resumeDraft = resumeDraft;
/*
 * Presenta un conflicto y exige revisión antes de reenviar contra la nueva versión del servidor.
 * Parámetros: index.
 */
async function retryQueued(index) {
    await refresh();
    let q = await cache('queue') || [], op = q[index];
    if (!op)
        return;
    modal(`<h2>Revisar registro pendiente</h2><p>El servidor está en la revisión ${db.revision}. Revisa el registro con el levantamiento actual antes de reenviarlo.</p><details><summary>Registro local</summary><pre style="white-space:pre-wrap">${esc(JSON.stringify(op.payload, (k, v) => typeof v === 'string' && v.startsWith('data:image/') ? '[Fotografía o firma local]' : v, 2))}</pre></details><form id="retryform">${check('reviewed', 'He comparado este registro con los datos actuales y confirmo reenviarlo.')}<button>Reenviar registro revisado</button></form>`);
    $('#retryform').onsubmit = async (e) => {
        e.preventDefault();
        if (!new FormData(e.target).has('reviewed'))
            return toast('Confirma la revisión.');
        op.revision = db.revision;
        op.operation = uid();
        await cache('queue', q);
        $('#modal').close();
        syncQueue();
    };
}
window.retryQueued = retryQueued;
/*
 * Abre el alta de un material de inventario.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function materialForm() {
    modal(`<h2>Registrar material en inventario</h2><form id="materialform">${input('name', 'Nombre descriptivo', '', 'text', 'required')}${sel('kind', 'Tipo', [
        {
            id: 'glass', name: 'Plancha de vidrio'
        }, {
            id: 'profile', name: 'Barra de perfil'
        }, {
            id: 'hardware', name: 'Herraje'
        }, {
            id: 'consumable', name: 'Consumible'
        }
    ])}${input('material', 'Código del catálogo (perfil: ID-color)', '', 'text', 'required')}<p class="help">Vidrios: ${db.catalog.glass.map(x => esc(x.id) + ' = ' + esc(x.name)).join('; ')}. Perfiles: ${db.catalog.lines.map(x => esc(x.id) + '-Blanco').join(', ')}.</p>${input('qty', 'Stock inicial', 0, 'number', 'min="0" required')}${input('min', 'Punto de reposición', 1, 'number', 'min="0" required')}${input('unitCost', 'Costo unitario CLP', 0, 'number', 'min="0" required')}<button>Guardar material</button></form>`);
    $('#materialform').onsubmit = e => {
        e.preventDefault();
        act('material', Object.fromEntries(new FormData(e.target)));
    };
}
window.materialForm = materialForm;
/*
 * Detecta si hay WebXR inmersivo o un visor AR compatible y actualiza el botón.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
async function arAvailability() {
    const v = $('#viewer'), b = $('#enter-ar');
    if (!v || !b)
        return;
    webXRReady = await navigator.xr?.isSessionSupported('immersive-ar').catch(() => false) || false;
    if (!b.isConnected)
        return;
    b.disabled = !(webXRReady || v.canActivateAR);
    b.textContent = webXRReady ? 'AR guiada · colocar en el vano' : v.canActivateAR ? 'Abrir AR en iPhone' : 'AR no disponible en este navegador';
}
/*
 * Abre AR guiada en WebXR o Quick Look según compatibilidad. Se invoca desde un gesto del usuario.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
async function startAR() {
    try {
        if (webXRReady)
            await launchWallAR(visualConfig());
        else if ($('#viewer')?.canActivateAR)
            await $('#viewer').activateAR();
        else
            toast('Utiliza un navegador compatible o la fotografía.');
    }
    catch (e) {
        toast('No se pudo iniciar AR guiada. Revisa permisos y compatibilidad. Puedes usar la fotografía.');
    }
}
/*
 * Dibuja una vista SVG cuando no se dispone del visor 3D.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function showStatic() {
    let { c, w, h } = visualConfig(), height = Math.min(240, 240 * h / w), y = (300 - height) / 2, col = {
        Blanco: '#fafafa', Negro: '#26343c', Bronce: '#8b7054'
    }[c.color];
    $('#static-fallback').innerHTML = `<svg viewBox="0 0 400 330" role="img" aria-label="Vista estática en tres cuartos"><path d="M65 ${y}L315 ${y + 28}V${y + height + 28}L65 ${y + height}Z" fill="#afd0dc" stroke="${col}" stroke-width="12"/><path d="M315 ${y + 28}l22 -13v${height}l-22 13" fill="#597783"/>${Array.from({
        length: c.leaves - 1
    }, (_, i) => {
        let u = (i + 1) / c.leaves, x = 65 + 250 * u;
        return `<path d="M${x} ${y + 28 * u}v${height}" stroke="${col}" stroke-width="9"/>`;
    }).join('')}<text x="200" y="318" text-anchor="middle" fill="#244a5a">${w} × ${h} mm · vista estática</text></svg>`;
}
Object.assign(window, {
    startAR
});
let estimateTimer;
/*
 * Solicita al servidor el rango de precio que puede consultar un cliente.
 * Parámetros: config, measure.
 */
function clientEstimate(config, measure) {
    clearTimeout(estimateTimer);
    estimateTimer = setTimeout(async () => {
        try {
            const r = await fetch('/api/estimate', {
                method: 'POST', headers: {
                    'Content-Type': 'application/json'
                }, body: JSON.stringify({
                    config, measure
                })
            }), p = await r.json();
            if (!r.ok)
                throw Error(p.error);
            if ($('#estimate-result'))
                $('#estimate-result').innerHTML = `<p>Banda estimada con IVA</p><div class="price">${money(p.min)}–${money(p.max)}</div>`;
        }
        catch (e) {
            if ($('#estimate-result'))
                $('#estimate-result').textContent = e.message;
        }
    }, 250);
}
/*
 * Invalida el resultado al cambiar foto o configuración y libera las URL temporales.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function invalidateAI() {
    aiVersion++;
    if (aiURL)
        URL.revokeObjectURL(aiURL);
    if (aiOriginalURL)
        URL.revokeObjectURL(aiOriginalURL);
    aiURL = aiOriginalURL = null;
    const result = $('#ai-result');
    if (result)
        result.hidden = true;
}
/*
 * Habilita la edición solo si hay servicio, cuatro esquinas y ninguna generación activa.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function updateAIButton() {
    const b = $('#ai-generate');
    if (b) {
        b.disabled = !aiConfigured || aiBusy || corners.length !== 4;
        b.textContent = aiBusy ? 'Reelaborando…' : 'Reelaborar con IA';
    }
}
/*
 * Consulta si existe una credencial de IA en el servidor; nunca solicita su valor.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
async function checkAI() {
    try {
        const r = await fetch('/api/visual-edit', {
            cache: 'no-store'
        }), data = await r.json();
        aiConfigured = r.ok && data.configured;
        if ($('#ai-status'))
            $('#ai-status').textContent = aiConfigured ? 'IA disponible · define el vano y pulsa Reelaborar.' : data.error || 'IA pendiente de activación: falta conectar la credencial del servicio.';
    }
    catch {
        aiConfigured = false;
        if ($('#ai-status'))
            $('#ai-status').textContent = 'Sin conexión al servicio de IA.';
    }
    updateAIButton();
}
const /*
 * Convierte el contenido del canvas a un archivo PNG de forma asíncrona.
 */
canvasBlob = canvas => new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('No se pudo preparar la fotografía.')), 'image/png'));
/*
 * Prepara foto original, guía y máscara transparente del vano; pide una edición real y descarta resultados de una configuración anterior.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
async function generateAI() {
    if (aiBusy || !aiConfigured || corners.length !== 4)
        return;
    aiBusy = true;
    invalidateAI();
    const version = aiVersion;
    updateAIButton();
    const status = $('#ai-status');
    status.textContent = 'La IA está reelaborando la foto. Puede tardar varios minutos.';
    try {
        const guide = $('#photo-canvas'), original = document.createElement('canvas'), mask = document.createElement('canvas');
        original.width = mask.width = guide.width;
        original.height = mask.height = guide.height;
        original.getContext('2d').drawImage(roomImage, 0, 0, original.width, original.height);
        const ctx = mask.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, mask.width, mask.height);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        corners.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        const form = new FormData(), orig = await canvasBlob(original);
        form.set('photo', orig, 'room.png');
        form.set('guide', await canvasBlob(guide), 'guide.png');
        form.set('mask', await canvasBlob(mask), 'mask.png');
        form.set('config', JSON.stringify(visualConfig()));
        form.set('points', JSON.stringify(corners.map(p => ({
            x: p.x / guide.width, y: p.y / guide.height
        }))));
        const response = await fetch('/api/visual-edit', {
            method: 'POST', body: form, signal: AbortSignal.timeout(210000)
        });
        if (!response.ok)
            throw Error((await response.json()).error);
        const blob = await response.blob();
        if (version !== aiVersion || !status.isConnected)
            return;
        aiURL = URL.createObjectURL(blob);
        aiOriginalURL = URL.createObjectURL(orig);
        showingOriginal = false;
        $('#ai-image').src = aiURL;
        $('#ai-result').hidden = false;
        $('#ai-result-note').textContent = 'Resultado IA · revisa que el diseño y la cantidad de hojas correspondan a tu selección.';
        status.textContent = 'Imagen reelaborada. Puedes compararla con la foto original y descargarla.';
    }
    catch (e) {
        if (version === aiVersion && status.isConnected)
            status.textContent = e.name === 'TimeoutError' ? 'La generación tardó demasiado. Intenta nuevamente.' : e.message;
    }
    finally {
        aiBusy = false;
        updateAIButton();
    }
}
/*
 * Descarga únicamente el resultado de IA disponible.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function downloadAI() {
    if (!aiURL)
        return;
    const a = document.createElement('a');
    a.href = aiURL;
    a.download = 'ventana-IA.png';
    a.click();
}
/*
 * Alterna la visualización entre la foto original y el resultado generado.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
function compareAI() {
    if (!aiURL)
        return;
    showingOriginal = !showingOriginal;
    $('#ai-image').src = showingOriginal ? aiOriginalURL : aiURL;
    $('#ai-result-note').textContent = showingOriginal ? 'Fotografía original' : 'Resultado generado con IA';
}
Object.assign(window, {
    generateAI, downloadAI, compareAI
});
