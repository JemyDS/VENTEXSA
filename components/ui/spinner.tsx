/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * COMPONENTE DE INTERFAZ DEL STARTER. Se conserva la implementación y sus comentarios originales; no contiene reglas específicas de fabricación.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
    return (<Loader2Icon role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props}/>);
}
export { Spinner };
