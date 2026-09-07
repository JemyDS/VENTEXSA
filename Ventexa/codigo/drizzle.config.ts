/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * SOPORTE DEL PROYECTO. Se conserva la lógica original; consultar la guía para su papel en construcción, enrutamiento o estilos.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { defineConfig } from "drizzle-kit";
export default defineConfig({
    out: "./drizzle",
    schema: "./db/schema.ts",
    dialect: "sqlite",
});
