/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * COMPONENTE DE INTERFAZ DEL STARTER. Se conserva la implementación y sus comentarios originales; no contiene reglas específicas de fabricación.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { cn } from "@/lib/utils";
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
    return (<div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-accent", className)} {...props}/>);
}
export { Skeleton };
