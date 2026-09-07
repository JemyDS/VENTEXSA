/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * SOPORTE DEL PROYECTO. Se conserva la lógica original; consultar la guía para su papel en construcción, enrutamiento o estilos.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
