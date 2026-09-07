# Ventexa: código comentado y guía paso a paso

Esta entrega contiene la fuente de la aplicación, con comentarios en español y formato más legible. Es una copia para estudiar y trabajar en equipo; no modifica el sitio publicado.

## Qué abrir primero

1. Lee `GUIA_PASO_A_PASO.md` para entender el sistema y preparar tu equipo.
2. Abre la carpeta `codigo` en Visual Studio Code.
3. Para el plus visual, empieza por `codigo/client/visual-core.mjs`, después `visual.mjs`, `ar-core.mjs` y `ar.mjs`.
4. Para las cotizaciones, empieza por `codigo/lib/domain.mjs` y `codigo/lib/actions.mjs`.
5. Consulta `INDICE_FUNCIONES.md` para localizar una función y conocer su propósito.

## Contenido y alcance de los comentarios

Se comentaron 151 funciones declaradas, los auxiliares principales y 32 bloques de acciones del negocio. Incluye interfaz, API, persistencia, geometría, AR y edición con IA. Los comentarios explican propósito, parámetros y restricciones. No se añadió un comentario redundante a cada llave o cada línea.

Los componentes de interfaz del starter y archivos de soporte se incluyen con una descripción de su función y sus comentarios originales. Los archivos JSON no admiten comentarios y se explican en la guía. Las dependencias externas se instalan con npm; sus fuentes no se duplican en este paquete.

No se incluyen claves, sesiones, bases de datos de producción, archivos de clientes, dependencias instaladas ni historial Git. El catálogo y los datos ficticios que crea `seed` sí forman parte de la fuente.

## Estado real

- El catálogo es de prueba; no es la digitalización del catálogo Sodal.
- La AR necesita comprobación en teléfonos físicos; la selección del vano es guiada.
- La generación con IA necesita `OPENAI_API_KEY` en el servidor. No está activada por incluir su código.
- El despacho no selecciona un vehículo ni implementa un portal de transportista.
- La app completa depende de D1, R2 y de la autenticación del alojamiento original. El ZIP no convierte automáticamente esos servicios en una app de escritorio independiente.

La guía distingue la ejecución de pruebas y compilación local de la puesta en marcha del sistema completo.
