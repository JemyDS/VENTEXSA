/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * EDICIÓN IA HTTP. GET informa disponibilidad sin exponer secretos. POST limita tamaño, rol y solicitudes diarias; devuelve un PNG generado.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { env } from 'cloudflare:workers';
import { loadState, identity, bindings } from '../../../lib/storage';
import { editPrompt, editImage } from '../../../lib/image-edit.mjs';
/*
 * Restringe el uso de generación de imágenes a administrador o vendedor.
 * Parámetros: request.
 */
async function actor(request: Request) {
    const a = identity(request, await loadState());
    if (![
        'Administrador', 'Vendedor'
    ].includes(a.role))
        throw Error('Tu rol no puede generar imágenes de IA.');
    return a;
}
/*
 * EDICIÓN IA HTTP. GET informa disponibilidad sin exponer secretos. POST limita tamaño, rol y solicitudes diarias; devuelve un PNG generado.
 * Parámetros: request.
 */
export async function GET(request: Request) {
    try {
        await actor(request);
        return Response.json({
            configured: !!(env as any).OPENAI_API_KEY
        }, {
            headers: {
                'Cache-Control': 'no-store'
            }
        });
    }
    catch {
        return Response.json({
            error: 'Acceso no autorizado.'
        }, {
            status: 403
        });
    }
}
/*
 * EDICIÓN IA HTTP. GET informa disponibilidad sin exponer secretos. POST limita tamaño, rol y solicitudes diarias; devuelve un PNG generado.
 * Parámetros: request.
 */
export async function POST(request: Request) {
    let job: string | undefined;
    try {
        const a = await actor(request);
        if (request.headers.get('origin') !== new URL(request.url).origin)
            return Response.json({
                error: 'Origen inválido.'
            }, {
                status: 403
            });
        const key = (env as any).OPENAI_API_KEY;
        if (!key)
            return Response.json({
                error: 'Falta activar el servicio de IA: el administrador debe configurar OPENAI_API_KEY como secreto del sitio.'
            }, {
                status: 503
            });
        const reader = request.body?.getReader();
        if (!reader)
            throw Error('Falta la fotografía.');
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.length;
            if (size > 12000000) {
                await reader.cancel();
                return Response.json({
                    error: 'Las imágenes superan 12 MB.'
                }, {
                    status: 413
                });
            }
            chunks.push(value);
        }
        const form = await new Response(new Blob(chunks as BlobPart[]), {
            headers: {
                'Content-Type': request.headers.get('content-type') || ''
            }
        }).formData();
        const photo = form.get('photo') as File, guide = form.get('guide') as File, mask = form.get('mask') as File;
        for (const file of [
            photo, guide, mask
        ]) {
            if (!(file instanceof File) || file.type !== 'image/png' || file.size < 8 || file.size > 5000000)
                throw Error('Se requieren imágenes PNG de hasta 5 MB.');
            const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
            if (b[0] !== 137 || b[1] !== 80 || b[2] !== 78 || b[3] !== 71)
                throw Error('PNG inválido.');
        }
        const prompt = editPrompt(JSON.parse(String(form.get('config'))), JSON.parse(String(form.get('points'))));
        const { DB } = bindings();
        job = crypto.randomUUID();
        const now = Date.now();
        const inserted = await DB.prepare('INSERT INTO image_jobs(id,actor,created_at,status) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM image_jobs WHERE actor=? AND created_at>?)<10 AND NOT EXISTS(SELECT 1 FROM image_jobs WHERE actor=? AND status=? AND created_at>?)').bind(job, a.email, now, 'running', a.email, now - 86400000, a.email, 'running', now - 240000).run();
        if (!inserted.meta.changes) {
            job = undefined;
            return Response.json({
                error: 'Ya hay una imagen en proceso o alcanzaste las 10 solicitudes diarias.'
            }, {
                status: 429
            });
        }
        const bytes = await editImage({
            key, photo, guide, mask, prompt
        });
        await DB.prepare('UPDATE image_jobs SET status=? WHERE id=?').bind('done', job).run();
        return new Response(bytes, {
            headers: {
                'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'Content-Disposition': 'inline; filename="ventana-IA.png"'
            }
        });
    }
    catch (e: any) {
        if (job)
            await bindings().DB.prepare('UPDATE image_jobs SET status=? WHERE id=?').bind('failed', job).run().catch(() => {
            });
        return Response.json({
            error: e.name === 'TimeoutError' ? 'La IA tardó demasiado. Vuelve a intentar.' : e.message || 'No se pudo generar la imagen.'
        }, {
            status: 400
        });
    }
}
