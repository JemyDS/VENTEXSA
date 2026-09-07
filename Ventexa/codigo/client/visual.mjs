/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * EXPORTACIÓN Y VISOR. Conserva modelos GLB/USDZ en memoria y configura model-viewer.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { geometry, quickLookGeometry } from './visual-core.mjs';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
const modelCache = new Map();
/*
 * Exporta GLB y USDZ de la configuración, reutiliza resultados en caché y evita reemplazar un modelo nuevo por una respuesta antigua.
 * Parámetros: element, c, w, h, opened.
 */
export async function showModel(element, c, w, h, opened = false) {
    const requestToken = (element.__modelRequest || 0) + 1;
    element.__modelRequest = requestToken;
    const key = [
        ...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({
            c, w, h, opened
        }))))
    ].map(x => x.toString(16).padStart(2, '0')).join('');
    let cached = modelCache.get(key);
    if (!cached) {
        const scene = geometry(c, w, h, opened);
        const glb = await new GLTFExporter().parseAsync(scene, {
            binary: true
        }); // Quick Look vertical anchor: +Y is the wall normal, unlike WebXR world +Y.
        const wallScene = quickLookGeometry(c, w, h, opened);
        const usdz = await new USDZExporter().parseAsync(wallScene, {
            quickLookCompatible: true, ar: {
                anchoring: {
                    type: 'plane'
                }, planeAnchoring: {
                    alignment: 'vertical'
                }
            }
        });
        cached = {
            glb: new Blob([
                glb
            ], {
                type: 'model/gltf-binary'
            }), usdz: new Blob([
                usdz
            ], {
                type: 'model/vnd.usdz+zip'
            })
        };
        cached.glbURL = URL.createObjectURL(cached.glb);
        cached.usdzURL = URL.createObjectURL(cached.usdz);
        modelCache.set(key, cached);
        if (modelCache.size > 12) {
            const first = modelCache.keys().next().value, old = modelCache.get(first);
            URL.revokeObjectURL(old.glbURL);
            URL.revokeObjectURL(old.usdzURL);
            modelCache.delete(first);
        }
    }
    await import('@google/model-viewer');
    if (element.__modelRequest !== requestToken)
        return null;
    element.src = cached.glbURL;
    element.setAttribute('ios-src', cached.usdzURL);
    return cached;
}
export { homography, project, compose, geometry } from './visual-core.mjs';
