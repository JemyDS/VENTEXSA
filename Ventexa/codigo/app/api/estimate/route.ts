/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * POST /api/estimate. Calcula en servidor y devuelve únicamente el rango estimativo, sin desglosar costos internos.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { loadState, identity } from '../../../lib/storage';
import { price } from '../../../lib/domain.mjs';
/*
 * POST /api/estimate. Calcula en servidor y devuelve únicamente el rango estimativo, sin desglosar costos internos.
 * Parámetros: request.
 */
export async function POST(request: Request) {
    try {
        const s = await loadState();
        identity(request, s);
        const { config, measure } = await request.json();
        const result = price(s, config, measure);
        return Response.json({
            min: result.min, max: result.max
        });
    }
    catch (e: any) {
        return Response.json({
            error: e.message
        }, {
            status: 400
        });
    }
}
