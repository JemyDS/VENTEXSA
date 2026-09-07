/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * MATEMÁTICA DE AR. Filtro de pared y orientación vertical desacoplados del navegador para poder probarlos.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
// XR hit poses use local +Y as the surface normal. The window uses +Z.
// Rebuild an upright basis instead of applying the hit matrix to the window.
/*
 * Lee la normal +Y del hit-test, rechaza superficies no verticales y calcula solo el giro horizontal para mantener la ventana de pie.
 * Parámetros: matrix, camera.
 */
export function wallPlacement(matrix, camera) {
    if (!matrix || matrix.length !== 16 || !Array.from(matrix).every(Number.isFinite))
        return null;
    let nx = matrix[4], ny = matrix[5], nz = matrix[6], len = Math.hypot(nx, ny, nz);
    if (len < .9 || Math.abs(ny / len) > .25)
        return null;
    const position = {
        x: matrix[12], y: matrix[13], z: matrix[14]
    };
    if (Math.hypot(position.x - camera.x, position.y - camera.y, position.z - camera.z) > 5)
        return null;
    if (nx * (camera.x - position.x) + nz * (camera.z - position.z) < 0) {
        nx = -nx;
        nz = -nz;
    }
    return {
        position, yaw: Math.atan2(nx, nz)
    };
}
