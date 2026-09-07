/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * PERSISTENCIA Y ACCESO. D1 guarda datos relacionales y estados; R2 conserva archivos. La identidad es específica del alojamiento actual. No hay una cuenta local con contraseña incluida.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { env } from 'cloudflare:workers';
import { defaultState, ensure } from './domain.mjs';
export const TENANT = 'ventexa';
export const /*
 * Obtiene los enlaces del entorno Worker para la base D1 y el almacén R2.
 */
bindings = () => ({
    DB: (env as any).DB, BUCKET: (env as any).BUCKET
});
/*
 * Carga desde D1 el estado y los registros oficiales; devuelve valores iniciales si aún no existe un taller guardado.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
export async function loadState() {
    const { DB } = bindings();
    ensure(DB, 'El almacenamiento no está disponible.');
    const rows = await DB.batch([
        DB.prepare('SELECT revision,data FROM workspaces WHERE tenant=?').bind(TENANT), DB.prepare('SELECT id,data FROM estimated_measures WHERE tenant=?').bind(TENANT), DB.prepare('SELECT id,data FROM official_measures WHERE tenant=?').bind(TENANT), DB.prepare('SELECT id,data FROM orders WHERE tenant=?').bind(TENANT), DB.prepare('SELECT * FROM audit WHERE tenant=? ORDER BY revision DESC LIMIT 100').bind(TENANT)
    ]);
    const s = rows[0].results[0] ? JSON.parse(rows[0].results[0].data) : defaultState();
    s.revision = rows[0].results[0]?.revision || 0;
    s.estimated = Object.fromEntries(rows[1].results.map((r: any) => [
        r.id, JSON.parse(r.data)
    ]));
    s.official = Object.fromEntries(rows[2].results.map((r: any) => [
        r.id, JSON.parse(r.data)
    ]));
    s.orders = rows[3].results.map((r: any) => JSON.parse(r.data));
    s.audit = rows[4].results;
    return s;
}
/*
 * Obtiene identidad desde cabeceras de la plataforma y resuelve el rol. Fuera de ese alojamiento requiere un proveedor de identidad confiable.
 * Parámetros: request, s.
 */
export function identity(request: Request, s: any) {
    const id = request.headers.get('oai-authenticated-user-id'), email = request.headers.get('oai-authenticated-user-email')?.toLowerCase();
    ensure(id && email, 'Debes iniciar sesión para acceder.');
    const role = email === 'jsalomeds@gmail.com' ? 'Administrador' : s.members.find((m: any) => m.email === email)?.role;
    ensure(role, 'No tienes un rol asignado en esta empresa.');
    return {
        id, email, role, ip: request.headers.get('cf-connecting-ip') || 'No informada por la plataforma'
    };
}
/*
 * Guarda estado, revisiones, actas, órdenes y auditoría en un lote de operaciones D1.
 * Parámetros: s, actor, action, payload, operation, hash, previousHash.
 */
export async function persist(s: any, actor: any, action: string, payload: any, operation: string, hash: string, previousHash: string) {
    const { DB } = bindings(), revision = s.revision + 1, at = new Date().toISOString();
    const { estimated, official, orders, audit, ...data } = s;
    data.revision = revision;
    const stmts = [
        DB.prepare('INSERT INTO revisions(tenant,revision,operation,actor,at) VALUES(?,?,?,?,?)').bind(TENANT, revision, operation, actor.email, at), DB.prepare('INSERT INTO workspaces(tenant,revision,data) VALUES(?,?,?) ON CONFLICT(tenant) DO UPDATE SET revision=excluded.revision,data=excluded.data').bind(TENANT, revision, JSON.stringify(data))
    ];
    for (const [id, m] of Object.entries(estimated))
        stmts.push(DB.prepare('INSERT INTO estimated_measures(id,tenant,vano,data) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id, TENANT, (m as any).vanoId, JSON.stringify(m)));
    for (const [id, m] of Object.entries(official))
        stmts.push(DB.prepare('INSERT INTO official_measures(id,tenant,vano,data) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id, TENANT, (m as any).vanoId, JSON.stringify(m)));
    for (const o of orders) {
        stmts.push(DB.prepare('INSERT INTO orders(id,tenant,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(o.id, TENANT, JSON.stringify(o)));
        for (const v of o.vanos)
            stmts.push(DB.prepare('INSERT OR IGNORE INTO order_measures(order_id,official_id) VALUES(?,?)').bind(o.id, v.officialId));
    }
    stmts.push(DB.prepare('INSERT INTO audit(id,tenant,revision,actor,at,action,data,hash,previous_hash) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), TENANT, revision, actor.email, at, action, JSON.stringify(payload), hash, previousHash));
    await DB.batch(stmts);
    return revision;
}
/*
 * Comprueba que las referencias a archivos del contenido existan para la empresa.
 * Parámetros: p.
 */
export async function validateFileReferences(p: any) {
    const refs = new Set<string>();
    /*
     * Recorre objetos y arreglos para reunir las referencias a archivos que el servidor debe validar.
     * Parámetros: x.
     */
    function walk(x: any) {
        if (typeof x === 'string' && x.startsWith('/api/file/'))
            refs.add(x.slice(10));
        else if (x && typeof x === 'object')
            Object.values(x).forEach(walk);
    }
    walk(p);
    const { DB } = bindings();
    for (const id of refs) {
        const f = await DB.prepare('SELECT id FROM files WHERE id=? AND tenant=?').bind(id, TENANT).first();
        ensure(f, 'Una fotografía o firma no pertenece a esta empresa.');
    }
}
/*
 * Prepara el estado visible por rol; al cliente le oculta costos internos y registros ajenos.
 * Parámetros: s, actor.
 */
export function publicState(s: any, actor: any) {
    if (actor.role === 'Cliente') {
        const r = s.requests.filter((x: any) => x.owner === actor.email);
        s = {
            ...s, requests: r, quotes: s.quotes.filter((q: any) => r.some((x: any) => x.id === q.requestId)).map((q: any) => ({
                ...q, cost: undefined, lines: q.lines.map((l: any) => ({
                    ...l, parts: undefined, cost: undefined
                }))
            })), orders: [], stock: [], payments: [], purchases: [], audit: [], official: {}, members: [], conflicts: [], plans: [], waste: []
        };
        s.estimated = Object.fromEntries(Object.entries(s.estimated).filter(([id]) => r.some((x: any) => x.vanos.some((v: any) => v.estimatedId === id))));
        s.visits = s.visits.filter((v: any) => r.some((x: any) => x.id === v.requestId));
        s.retals = [];
        s.claims = [];
        s.movements = [];
        s.catalog = {
            ...s.catalog, lines: s.catalog.lines.map((l: any) => ({
                ...l, price: 0, margin: 0
            })), glass: s.catalog.glass.map((g: any) => ({
                ...g, price: 0
            })), hardware: s.catalog.hardware.map((h: any) => ({
                ...h, price: 0
            }))
        };
        s.settings = {
            band: s.settings.band, zones: Object.fromEntries(Object.keys(s.settings.zones).map(k => [
                k, 0
            ])), company: s.settings.company, advance: s.settings.advance, leadDays: s.settings.leadDays
        };
    }
    return {
        ...s, actor
    };
}
