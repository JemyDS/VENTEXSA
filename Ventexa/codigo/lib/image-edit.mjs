/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * EDICIÓN REAL DE IMÁGENES. Contrato del proveedor OpenAI, validación del vano y manejo de errores. Las pruebas simulan el proveedor; no prueban calidad visual real.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
/*
 * Valida dimensiones y cuatro esquinas, y redacta la instrucción que pide reelaborar la foto respetando el vano.
 * Parámetros: config, points.
 */
export function editPrompt(config, points) {
    if (!config || ![
        'Fija', 'Corredera', 'Abatible', 'Proyectante', 'Oscilobatiente', 'Guillotina'
    ].includes(config.c?.type) || ![
        'Blanco', 'Negro', 'Bronce'
    ].includes(config.c?.color) || !Number.isFinite(config.w) || !Number.isFinite(config.h) || config.w < 300 || config.w > 6000 || config.h < 300 || config.h > 6000 || !Number.isInteger(config.c.leaves) || config.c.leaves < 1 || config.c.leaves > 4)
        throw Error('Configuración de ventana inválida.');
    if (!Array.isArray(points) || points.length !== 4 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1))
        throw Error('Marca las cuatro esquinas del vano.');
    const signs = points.map((p, i) => {
        const b = points[(i + 1) % 4], c = points[(i + 2) % 4];
        return (b.x - p.x) * (c.y - b.y) - (b.y - p.y) * (c.x - b.x);
    });
    if (!signs.every(v => v > 0.00001))
        throw Error('El vano debe formar un cuadrilátero sin cruces, en orden horario.');
    return `Edit the FIRST room photograph photorealistically. Install one ${config.c.type} window, ${config.c.color} frame, ${config.c.leaves} leaves, glass specification ${String(config.c.glassName || config.c.glass || 'clear glass').slice(0, 80)}, profile ${String(config.c.lineName || config.c.line || 'standard').slice(0, 80)}, opening direction ${String(config.c.direction || 'Izquierda').slice(0, 20)}, specified width ${config.w} mm and height ${config.h} mm. The SECOND image is only a geometric placement guide. Replace its schematic overlay with a realistically installed window in the FIRST photograph. Opening corners, clockwise from upper left, normalized coordinates: ${JSON.stringify(points)}. Preserve room architecture, furniture, camera viewpoint, aspect ratio and all other openings. Match perspective, existing lighting, realistic contact shadows, glass reflections and frame depth. Do not leave a pasted drawing, colored guide, corner markers, labels or text. Do not rotate the window flat or change the opening. Mask marks the editable region; maintain surrounding room. This is a visual renovation preview, not a measurement.`;
}
/*
 * Envía foto, guía y máscara a OpenAI Images Edits y decodifica el PNG. Sin clave del servidor no hay generación real.
 * Parámetros: {key,photo,guide,mask,prompt,fetcher=fetch}.
 */
export async function editImage({ key, photo, guide, mask, prompt, fetcher = fetch }) {
    const form = new FormData();
    form.set('model', 'gpt-image-1.5');
    form.append('image[]', photo, 'room.png');
    form.append('image[]', guide, 'guide.png');
    form.set('mask', mask, 'mask.png');
    form.set('prompt', prompt);
    form.set('quality', 'high');
    form.set('input_fidelity', 'high');
    form.set('output_format', 'png');
    form.set('size', 'auto');
    form.set('n', '1');
    const response = await fetcher('https://api.openai.com/v1/images/edits', {
        method: 'POST', headers: {
            Authorization: `Bearer ${key}`
        }, body: form, signal: AbortSignal.timeout(180000)
    });
    if (!response.ok)
        throw Error(response.status === 429 ? 'El servicio de IA alcanzó su límite. Intenta más tarde.' : response.status === 401 || response.status === 403 ? 'La conexión de IA necesita una credencial válida con acceso a imágenes.' : 'El servicio de IA no pudo editar la imagen. Intenta nuevamente.');
    const result = await response.json(), encoded = result.data?.[0]?.b64_json;
    if (typeof encoded !== 'string' || encoded.length > 24000000)
        throw Error('La IA no devolvió una imagen válida.');
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    if (bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71)
        throw Error('La IA no devolvió un PNG válido.');
    return bytes;
}
