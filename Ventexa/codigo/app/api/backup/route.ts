/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * GET /api/backup. Exportación manual del estado, exclusiva del administrador. No implementa por sí sola una restauración.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { loadState, identity } from '../../../lib/storage';
/*
 * GET /api/backup. Exportación manual del estado, exclusiva del administrador. No implementa por sí sola una restauración.
 * Parámetros: request.
 */
export async function GET(request: Request) {
    try {
        const s = await loadState(), actor = identity(request, s);
        if (actor.role !== 'Administrador')
            return new Response('No autorizado', {
                status: 403
            });
        return Response.json(s, {
            headers: {
                'Content-Disposition': 'attachment; filename="ventexa-respaldo.json"', 'Cache-Control': 'no-store'
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
