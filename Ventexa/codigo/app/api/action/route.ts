/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * POST /api/action. Valida origen, revisión e idempotencia, ejecuta la acción, persiste el resultado y conserva una instantánea diaria cuando hay actividad.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { bindings, loadState, identity, persist, TENANT, validateFileReferences } from '../../../lib/storage';
import { execute, digest } from '../../../lib/actions.mjs';
import { ensure } from '../../../lib/domain.mjs';
/*
 * POST /api/action. Valida origen, revisión e idempotencia, ejecuta la acción, persiste el resultado y conserva una instantánea diaria cuando hay actividad.
 * Parámetros: request.
 */
export async function POST(request: Request) {
    try {
        ensure(request.headers.get('content-type')?.includes('application/json'), 'Formato no válido.');
        const origin = request.headers.get('origin');
        ensure(!origin || origin === new URL(request.url).origin, 'Origen no permitido.');
        const body = await request.text();
        ensure(body.length < 2000000, 'Solicitud demasiado grande.');
        const { action, payload, revision, operation } = JSON.parse(body);
        ensure(typeof operation === 'string' && operation.length <= 100, 'Identificador de operación obligatorio.');
        let s = await loadState(), actor = identity(request, s);
        const { DB, BUCKET } = bindings();
        const seen = await DB.prepare('SELECT revision FROM revisions WHERE tenant=? AND operation=?').bind(TENANT, operation).first();
        if (seen)
            return Response.json({
                ok: true, revision: seen.revision, replayed: true
            });
        await validateFileReferences(payload);
        if (revision !== s.revision) {
            if (action === 'measure' && !(await DB.prepare('SELECT revision FROM revisions WHERE tenant=? AND operation=?').bind(TENANT, operation + ':conflict').first())) {
                s.conflicts.push({
                    id: crypto.randomUUID(), at: new Date().toISOString(), actor: actor.email, action, payload, currentRevision: s.revision, attemptedRevision: revision, status: 'Pendiente', current: s.official[s.requests.find((r: any) => r.id === payload.requestId)?.vanos.find((v: any) => v.id === payload.vanoId)?.officialId] || null
                });
                const previous = s.audit[0]?.hash || '';
                await persist(s, actor, 'conflict', payload, operation + ':conflict', await digest({
                    previous, action: 'conflict', payload
                }), previous);
            }
            return Response.json({
                error: 'Los datos cambiaron en otro dispositivo. Conservamos tu formulario. Actualiza y revisa antes de reenviar.', conflict: true
            }, {
                status: 409
            });
        }
        const previousHash = s.audit[0]?.hash || '', result = await execute(s, action, payload, actor), hash = await digest({
            previousHash, actor: actor.email, action, payload, revision: s.revision + 1
        });
        const next = await persist(s, actor, action, payload, operation, hash, previousHash);
        try {
            const day = new Date().toISOString().slice(0, 10), key = TENANT + '/backups/' + day + '.json';
            if (!(await BUCKET.head(key)))
                await BUCKET.put(key, JSON.stringify({
                    ...s, revision: next
                }), {
                    httpMetadata: {
                        contentType: 'application/json'
                    }
                });
        }
        catch {
        }
        return Response.json({
            ok: true, revision: next, ...result
        });
    }
    catch (e: any) {
        if (String(e.message).includes('UNIQUE constraint'))
            return Response.json({
                error: 'Otra operación acaba de guardar cambios. Actualiza y vuelve a intentar.', conflict: true
            }, {
                status: 409
            });
        return Response.json({
            error: e.message || 'No se pudo guardar. Tus datos no se han confirmado.'
        }, {
            status: 400
        });
    }
}
