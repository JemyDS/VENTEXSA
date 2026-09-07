/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * GET /api/state. Devuelve el estado filtrado para el usuario autenticado; prohíbe el almacenamiento en caché HTTP.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { loadState, identity, publicState } from '../../../lib/storage';
/*
 * GET /api/state. Devuelve el estado filtrado para el usuario autenticado; prohíbe el almacenamiento en caché HTTP.
 * Parámetros: request.
 */
export async function GET(request: Request) {
    try {
        const s = await loadState(), actor = identity(request, s);
        return Response.json(publicState(s, actor), {
            headers: {
                'Cache-Control': 'no-store'
            }
        });
    }
    catch (e: any) {
        return Response.json({
            error: e.message
        }, {
            status: 401
        });
    }
}
