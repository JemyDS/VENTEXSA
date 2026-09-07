/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * SOPORTE DEL PROYECTO. Se conserva la lógica original; consultar la guía para su papel en construcción, enrutamiento o estilos.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "Ventexa · Gestión de vidriería",
    description: "Configuración, medición oficial y gestión de ventanas a medida.",
    icons: {
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
    },
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="es-CL">
      <body className="antialiased">{children}</body>
    </html>);
}
