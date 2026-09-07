/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * POST /api/files. Valida el archivo, almacena bytes en R2 y metadatos en D1. El identificador devuelto se utiliza como referencia.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { loadState, identity, bindings, TENANT } from '../../../lib/storage';
import { digest } from '../../../lib/actions.mjs';
/*
 * POST /api/files. Valida el archivo, almacena bytes en R2 y metadatos en D1. El identificador devuelto se utiliza como referencia.
 * Parámetros: request.
 */
export async function POST(request: Request) {
    try {
        const s = await loadState();
        identity(request, s);
        if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin)
            throw Error('Origen inválido.');
        const file = (await request.formData()).get('file') as File;
        if (!file || file.size > 8000000 || ![
            'image/jpeg', 'image/png', 'image/webp', 'model/gltf-binary', 'model/vnd.usdz+zip'
        ].includes(file.type))
            throw Error('Archivo no admitido o mayor a 8 MB.');
        const data = await file.arrayBuffer(), bytes = new Uint8Array(data);
        if (file.type === 'image/jpeg' && !(bytes[0] === 255 && bytes[1] === 216) || file.type === 'image/png' && !(bytes[0] === 137 && bytes[1] === 80))
            throw Error('Formato de imagen incorrecto.');
        const id = crypto.randomUUID(), hash = await digest(bytes.toString()), { DB, BUCKET } = bindings();
        await BUCKET.put(TENANT + '/' + id, data, {
            httpMetadata: {
                contentType: file.type
            }
        });
        await DB.prepare('INSERT INTO files(id,tenant,name,mime,size,hash,created_at) VALUES(?,?,?,?,?,?,?)').bind(id, TENANT, file.name.slice(0, 200), file.type, file.size, hash, new Date().toISOString()).run();
        return Response.json({
            url: '/api/file/' + id, id, hash
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
