/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * SOPORTE DEL PROYECTO. Se conserva la lógica original; consultar la guía para su papel en construcción, enrutamiento o estilos.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import * as React from "react";
const MOBILE_BREAKPOINT = 768;
export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
    React.useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const onChange = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        mql.addEventListener("change", onChange);
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        return () => mql.removeEventListener("change", onChange);
    }, []);
    return !!isMobile;
}
