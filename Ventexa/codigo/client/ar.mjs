/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * AR GUIADA. Requiere WebXR inmersivo, hit-test, espacio local-floor y DOM overlay. Detecta paredes, no reconoce semánticamente ventanas.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import * as THREE from 'three';
import { geometry } from './visual-core.mjs';
import { wallPlacement } from './ar-core.mjs';
/*
 * Inicia WebXR con hit-test y controles superpuestos: muestra contorno, espera confirmación y permite ajustes de posición.
 * Parámetros: {c,w,h}.
 */
export async function launchWallAR({ c, w, h }) {
    const overlay = document.createElement('div');
    overlay.className = 'xr-overlay';
    overlay.innerHTML = '<p role="status">Busca la pared alrededor del vano. Mueve el teléfono lentamente.</p><div class="xr-controls"><button data-place disabled>Colocar aquí</button><button data-reset>Reubicar</button><button data-up>Subir 2 cm</button><button data-down>Bajar 2 cm</button><button data-left>← 2 cm</button><button data-right>2 cm →</button><button data-exit>Salir</button></div>';
    document.body.append(overlay);
    const status = overlay.querySelector('p'), place = overlay.querySelector('[data-place]');
    let session, renderer, source, cleaned = false;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    const windowModel = geometry(c, w, h).children[0];
    windowModel.visible = false;
    scene.add(windowModel);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w / 1000, h / 1000, .01)), new THREE.LineBasicMaterial({
        color: 0x22ffbb
    }));
    outline.visible = false;
    scene.add(outline);
    let candidate = null, locked = false, lastValid = 0;
    /*
     * Cancela el seguimiento y libera geometrías, materiales, renderizador y elementos HTML al salir de AR.
     * Parámetros: ninguno; utiliza el contexto del módulo.
     */
    function cleanup() {
        if (cleaned)
            return;
        cleaned = true;
        source?.cancel();
        renderer?.setAnimationLoop(null);
        renderer?.dispose();
        renderer?.domElement.remove();
        scene.traverse(o => {
            o.geometry?.dispose();
            if (o.material)
                (Array.isArray(o.material) ? o.material : [
                    o.material
                ]).forEach(m => m.dispose());
        });
        overlay.remove();
    }
    try {
        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: [
                'hit-test', 'local-floor', 'dom-overlay'
            ], domOverlay: {
                root: overlay
            }
        });
        session.addEventListener('end', cleanup, {
            once: true
        });
        renderer = new THREE.WebGLRenderer({
            alpha: true, antialias: true
        });
        renderer.xr.enabled = true;
        renderer.xr.setReferenceSpaceType('local-floor');
        renderer.setSize(innerWidth, innerHeight);
        document.body.append(renderer.domElement);
        await renderer.xr.setSession(session);
        const viewer = await session.requestReferenceSpace('viewer');
        source = await session.requestHitTestSource({
            space: viewer
        });
        overlay.addEventListener('beforexrselect', e => e.preventDefault());
        overlay.querySelector('[data-exit]').onclick = () => session.end();
        place.onclick = () => {
            if (!candidate || performance.now() - lastValid > 300)
                return;
            windowModel.position.copy(candidate.position);
            windowModel.rotation.set(0, candidate.yaw, 0);
            windowModel.visible = true;
            locked = true;
            outline.visible = false;
            place.disabled = true;
            status.textContent = 'Ventana vertical fijada a escala 1:1. Ajusta el centro o pulsa Reubicar.';
        };
        overlay.querySelector('[data-reset]').onclick = () => {
            locked = false;
            windowModel.visible = false;
            candidate = null;
            status.textContent = 'Apunta al centro del vano; confirma el contorno verde.';
        };
        for (const [key, dx, dy] of [
            [
                'up', 0, .02
            ], [
                'down', 0, -.02
            ], [
                'left', -.02, 0
            ], [
                'right', .02, 0
            ]
        ])
            overlay.querySelector(`[data-${key}]`).onclick = () => {
                if (!locked)
                    return;
                windowModel.position.x += dx * Math.cos(windowModel.rotation.y);
                windowModel.position.z -= dx * Math.sin(windowModel.rotation.y);
                windowModel.position.y += dy;
            };
        renderer.setAnimationLoop((time, frame) => {
            if (frame && !locked) {
                candidate = null;
                const ref = renderer.xr.getReferenceSpace(), pose = frame.getViewerPose(ref);
                if (pose) {
                    const p = pose.transform.position;
                    for (const hit of frame.getHitTestResults(source)) {
                        const hitPose = hit.getPose(ref);
                        const next = hitPose && wallPlacement(hitPose.transform.matrix, p);
                        if (next) {
                            candidate = next;
                            break;
                        }
                    }
                }
                outline.visible = !!candidate;
                place.disabled = !candidate;
                if (candidate) {
                    lastValid = performance.now();
                    outline.position.copy(candidate.position);
                    outline.rotation.set(0, candidate.yaw, 0);
                    status.textContent = 'Pared detectada. Centra el contorno en el vano y pulsa Colocar aquí.';
                }
                else
                    status.textContent = 'Sin pared vertical válida. Apunta al marco o muro, evitando el vidrio y el suelo.';
            }
            renderer.render(scene, camera);
        });
    }
    catch (e) {
        if (session)
            await session.end().catch(() => {
            });
        cleanup();
        throw e;
    }
}
