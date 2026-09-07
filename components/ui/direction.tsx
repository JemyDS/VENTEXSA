/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * COMPONENTE DE INTERFAZ DEL STARTER. Se conserva la implementación y sus comentarios originales; no contiene reglas específicas de fabricación.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
"use client";
import * as React from "react";
import { Direction } from "radix-ui";
function DirectionProvider({ dir, direction, children, }: React.ComponentProps<typeof Direction.DirectionProvider> & {
    direction?: React.ComponentProps<typeof Direction.DirectionProvider>["dir"];
}) {
    return (<Direction.DirectionProvider dir={direction ?? dir}>
      {children}
    </Direction.DirectionProvider>);
}
const useDirection = Direction.useDirection;
export { DirectionProvider, useDirection };
