/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * GET /api/file/:id. Lee un objeto R2 con controles de acceso. Para clientes verifica su relación con los antecedentes de su solicitud.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { loadState, identity, bindings, TENANT } from '../../../../lib/storage';
/*
 * GET /api/file/:id. Lee un objeto R2 con controles de acceso. Para clientes verifica su relación con los antecedentes de su solicitud.
 * Parámetros: request, {params}.
 */
export async function GET(request: Request, { params }: any) {
    try {
        const s = await loadState(), actor = identity(request, s), { id } = await params;
        if (actor.role === 'Cliente') {
            const ids = s.requests.filter((r: any) => r.owner === actor.email).flatMap((r: any) => r.vanos.map((v: any) => v.estimatedId));
            if (!ids.some((i: string) => JSON.stringify(s.estimated[i]).includes(id)))
                throw Error('Archivo no disponible para este cliente.');
        }
        const { BUCKET } = bindings(), object = await BUCKET.get(TENANT + '/' + id);
        if (!object)
            return new Response('No encontrado', {
                status: 404
            });
        return new Response(object.body, {
            headers: {
                'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff'
            }
        });
    }
    catch {
        return new Response('No autorizado', {
            status: 403
        });
    }
}
