/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * GET /api/document/:id. Busca una cotización, verifica acceso y devuelve su PDF.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { loadState, identity } from '../../../../lib/storage';
import { quotePDF } from '../../../../lib/pdf.mjs';
/*
 * GET /api/document/:id. Busca una cotización, verifica acceso y devuelve su PDF.
 * Parámetros: request, {params}.
 */
export async function GET(request: Request, { params }: any) {
    try {
        const s = await loadState(), actor = identity(request, s), { id } = await params, q = s.quotes.find((q: any) => q.id === id);
        if (!q)
            return new Response('No encontrado', {
                status: 404
            });
        const r = s.requests.find((r: any) => r.id === q.requestId);
        if (actor.role === 'Cliente' && r.owner !== actor.email)
            return new Response('No autorizado', {
                status: 403
            });
        return new Response(quotePDF(q), {
            headers: {
                'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="cotizacion-v' + q.version + '.pdf"', 'Cache-Control': 'private, no-store'
            }
        });
    }
    catch (e: any) {
        return Response.json({
            error: e.message
        }, {
            status: 500
        });
    }
}
