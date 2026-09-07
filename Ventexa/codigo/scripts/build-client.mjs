/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * EMPAQUETADO DEL NAVEGADOR. Esbuild transforma client/app.mjs y sus dependencias en public/assets/app.js. Editar siempre la fuente, no el resultado minificado.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { build } from 'esbuild';
await build({
    entryPoints: [
        'client/app.mjs'
    ], bundle: true, format: 'esm', target: 'es2022', outfile: 'public/assets/app.js', minify: true, legalComments: 'eof', loader: {
        '.wasm': 'binary'
    }
});
