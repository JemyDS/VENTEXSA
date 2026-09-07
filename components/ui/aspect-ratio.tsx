/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * COMPONENTE DE INTERFAZ DEL STARTER. Se conserva la implementación y sus comentarios originales; no contiene reglas específicas de fabricación.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
"use client";
import { AspectRatio as AspectRatioPrimitive } from "radix-ui";
function AspectRatio({ ...props }: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
    return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props}/>;
}
export { AspectRatio };
