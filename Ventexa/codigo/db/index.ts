/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * SOPORTE DEL PROYECTO. Se conserva la lógica original; consultar la guía para su papel en construcción, enrutamiento o estilos.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
export function getDb() {
    if (!env.DB) {
        throw new Error("Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.");
    }
    return drizzle(env.DB, {
        schema
    });
}
