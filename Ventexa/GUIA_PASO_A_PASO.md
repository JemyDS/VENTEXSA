# Guía paso a paso: entender y trabajar con Ventexa

## 1. Qué estás recibiendo

La carpeta `codigo` contiene la fuente de la app. JavaScript organiza las pantallas y el comportamiento del navegador; TypeScript define parte del servidor y la configuración; SQL define las tablas; HTML y CSS definen la presentación. No necesitas leer todo de una vez.

Esta es una copia comentada del sistema existente. Explicar su código no significa que todas sus funciones estén certificadas para un taller real. Conserva las limitaciones de la matriz `codigo/public/cobertura-requisitos.md`.

## 2. Preparar el computador

Para leer: descomprime el ZIP y abre la carpeta con Visual Studio Code o un editor de texto.

Para ejecutar pruebas y compilar: utiliza Node.js compatible con el requisito `>=22.13.0` de `package.json`; la copia se verificó con Node 24. Los scripts completos de construcción utilizan Bash y utilidades Linux, por lo que en Windows corresponde usar un entorno Linux como WSL. Esto no se ejecuta directamente desde el iPhone.

Abre una terminal en `codigo` y comprueba:

```bash
node --version
npm --version
```

Instala las versiones fijadas en el archivo de dependencias:

```bash
npm ci
```

Resultado esperado: aparece `node_modules`. No borres `package-lock.json` para solucionar incompatibilidades: conserva las versiones del proyecto y revisa el mensaje de instalación.

## 3. Ejecutar las pruebas antes de cambiar código

Desde `codigo`:

```bash
node --test tests/ventexa.test.mjs tests/visual-upgrade.test.mjs
```

Estas pruebas ejercitan reglas del negocio, estados, cálculos, dimensiones, archivos 3D, colocación matemática en paredes y contrato de edición IA. Las pruebas de IA usan un proveedor simulado: no gastan crédito ni prueban el resultado fotográfico real.

No necesitan una cuenta de cliente ni una base de producción. El archivo `tests/api-integration.mjs` es una prueba adicional de servidor con Miniflare; requiere construir antes el Worker. Ese archivo heredado no es el comando principal de esta entrega ni valida todas las migraciones nuevas.

## 4. Entender las carpetas

| Carpeta o archivo | Para qué sirve |
|---|---|
| `public/workspace.html` | Estructura de la pantalla que carga el JavaScript empaquetado. |
| `public/style.css` | Colores, tamaño, disposición y adaptación de las pantallas. |
| `client/app.mjs` | Navegación, formularios, fotografías, firmas y comunicación con servidor. |
| `lib/domain.mjs` | Validaciones, precios, despiece, planes de corte y disponibilidad. |
| `lib/actions.mjs` | Acciones permitidas y cambios de estado del negocio. |
| `lib/storage.ts` | Acceso a datos e identidad del usuario. |
| `app/api` | Rutas que recibe el servidor. |
| `db/schema.ts` | Descripción de las tablas mediante Drizzle. |
| `drizzle` | Migraciones SQL; también contienen índices y triggers. |
| `lib/pdf.mjs` | Generación de cotizaciones PDF. |
| `client/visual-core.mjs` | Modelo 3D y dibujo sobre foto. |
| `client/visual.mjs` | Exportación de GLB/USDZ y carga del visor. |
| `client/ar-core.mjs` | Cálculo de orientación y rechazo de suelo. |
| `client/ar.mjs` | Cámara AR guiada, confirmación y ajustes. |
| `lib/image-edit.mjs` | Solicitud de edición real al proveedor de IA. |
| `tests` | Casos de comprobación. |
| `components`, `hooks`, `vendor` | Componentes y estilos de soporte del starter. No son las reglas del taller. |

## 5. Seguir una operación de principio a fin

Ejemplo: registrar una medición oficial.

1. `measure()` en `client/app.mjs` abre el formulario.
2. El usuario ingresa tres anchos, tres altos, diagonales, condiciones, fotografías y firma.
3. `act()` identifica la acción y la revisión de datos que se está editando.
4. `resolveUploads()` y `upload()` guardan las imágenes mediante `/api/files`.
5. `act()` envía un POST a `/api/action` con referencias a esos archivos.
6. `identity()` obtiene el usuario a partir de la autenticación confiable del alojamiento.
7. La ruta comprueba la revisión. Si otro dispositivo cambió los datos, devuelve un conflicto en vez de sobrescribirlos silenciosamente.
8. `execute()` verifica el permiso y ejecuta el bloque `measure`.
9. Se valida el levantamiento y se agrega una nueva versión del acta oficial.
10. `persist()` guarda el cambio y su auditoría en D1.
11. `refresh()` vuelve a consultar el estado y actualiza la pantalla.

Las validaciones importantes deben permanecer en el servidor. Ocultar un botón en la interfaz no constituye control de acceso.

### Nombres cortos que encontrarás

| Nombre | Significado habitual |
|---|---|
| `s` | Estado del taller. |
| `c` | Configuración de una ventana. |
| `m` | Medidas registradas. |
| `p` | Datos de una acción. |
| `r` | Solicitud; en algunas funciones también una respuesta HTTP. |
| `o` | Orden de trabajo. |
| `q` | Cotización; ocasionalmente cola, según la función. |
| `actor` | Usuario que realiza la acción. |
| `w`, `h` | Ancho y alto. En el negocio suelen ser milímetros. |

## 6. Leer los cálculos de cotización

En `lib/domain.mjs`, sigue este orden:

1. `dims(m)`: valida tres anchos y tres altos; utiliza el mínimo de cada grupo.
2. `configItems(s,c)`: busca perfil, vidrio, herraje y reglas seleccionados.
3. `validate(s,c,m)`: comprueba compatibilidades y límites del catálogo de demostración.
4. `price(s,c,m)`: calcula materiales, fabricación, instalación y conceptos adicionales; aplica margen, descuento e IVA.
5. `cut(s,c,o)`: produce piezas a partir de un acta oficial firmada.

Para comprobar un cálculo sin abrir toda la app, ejecuta desde `codigo`:

```bash
node --input-type=module <<'JS'
import { defaultState, price } from './lib/domain.mjs';
const s = defaultState();
const c = {
  type: 'Corredera', line: 'alu', color: 'Blanco',
  glass: 'mono', hardware: 'standard', leaves: 2,
  sill: 1000, workHeight: 1800, intervention: 'Retiro completo',
  comuna: 'San Fernando', safetyZone: false
};
const medidas = { w: [1500, 1498, 1502], h: [1200, 1202, 1201] };
console.log(price(s, c, medidas));
JS
```

Verás costos, neto, IVA, total y rango. Los valores no son una oferta comercial real. Cambia una dimensión o el vidrio y compara el resultado. Algunas combinaciones se rechazan deliberadamente.

## 7. Comprender el plus visual: modelo 3D

En `client/visual-core.mjs`:

1. `geometry(c,w,h)` convierte ancho y alto de milímetros a metros.
2. Crea una escena y un grupo que representa la ventana.
3. Añade marcos con cajas rectangulares.
4. Añade vidrio y hojas según la tipología.
5. Configura apertura cuando se solicita una vista abierta.

El modelo usa X para ancho, Y para alto y Z para profundidad. Una ventana de 1500 × 1200 mm se construye como 1,5 × 1,2 m. No es una medición realizada por la cámara.

En `client/visual.mjs`, `showModel()` exporta el GLB y una versión USDZ; reutiliza resultados en caché y los entrega a `model-viewer`. Una respuesta antigua no debe reemplazar la configuración que el usuario acaba de seleccionar.

## 8. Comprender el montaje sobre una fotografía

1. `photoInput()` abre la fotografía y la adapta al canvas.
2. El usuario marca arriba izquierda, arriba derecha, abajo derecha y abajo izquierda.
3. `homography()` comprueba que las esquinas formen un cuadrilátero válido y calcula la transformación de perspectiva.
4. `project()` transforma puntos del dibujo a coordenadas de la foto.
5. `compose()` dibuja vidrio y perfiles dentro del vano.
6. `saveComposition()` descarga la guía.

Este procedimiento utiliza geometría y canvas. No es IA y no descubre el vano automáticamente. Tras marcar las cuatro esquinas, un nuevo toque mueve la esquina más cercana al lugar tocado; `resetCorners()` permite empezar de nuevo.

## 9. Comprender la AR guiada

En `client/ar-core.mjs`, `wallPlacement()` recibe una matriz del hit-test y la posición de la cámara:

1. Comprueba que la matriz contenga números válidos.
2. Lee la normal de la superficie, que en el hit-test corresponde al eje local +Y.
3. Rechaza suelo, techo y superficies demasiado inclinadas.
4. Rechaza puntos excesivamente lejanos.
5. Orienta el frente hacia la cámara y calcula únicamente el giro horizontal.

La ventana utiliza +Z como frente. Aplicar directamente la matriz de la superficie al objeto puede orientarlo incorrectamente; el cálculo separado mantiene su eje vertical.

En `client/ar.mjs`, `launchWallAR()`:

1. Solicita una sesión inmersiva desde el botón pulsado por el usuario.
2. Solicita hit-test, espacio local y controles HTML superpuestos.
3. Busca una pared y dibuja un contorno con las dimensiones de la ventana.
4. Espera que el usuario confirme «Colocar aquí».
5. Permite mover la ventana en pasos de 2 cm o reubicarla.
6. Libera cámara, recursos gráficos y controles al terminar.

El flujo de iPhone utiliza Quick Look y el USDZ preparado por `quickLookGeometry()`. No contiene los mismos controles personalizados que WebXR. Hay que verificar el comportamiento en cada equipo. El código no incluye detección automática de aberturas ni medición certificada.

Para llevar este módulo a otra aplicación, conserva juntos `ar.mjs`, `ar-core.mjs` y `visual-core.mjs`, instala Three.js en el proyecto destino y llama `launchWallAR({c,w,h})` desde un botón. Debes adaptar los estilos `xr-overlay` y `xr-controls`, comprobar compatibilidad y ofrecer la fotografía como alternativa. Para iPhone también se necesita el flujo del visor y exportación, no solo esos tres archivos.

## 10. Comprender la fotografía reelaborada con IA

1. `checkAI()` consulta disponibilidad del servicio.
2. `generateAI()` crea tres PNG: foto original, guía y máscara del vano.
3. La máscara deja transparente el área que se pide editar.
4. La interfaz envía los archivos y la configuración a `/api/visual-edit`.
5. El servidor comprueba usuario, origen, tamaño y límite de solicitudes.
6. `editPrompt()` describe la ventana y la región seleccionada.
7. `editImage()` llama al endpoint de edición del proveedor.
8. El servidor devuelve un PNG y la interfaz ofrece comparación y descarga.

El secreto `OPENAI_API_KEY` debe existir en el entorno del servidor; no se incluye en este ZIP y no debe añadirse al código del navegador. Sin ese secreto, el botón indica que falta activación. El límite de esta implementación es una generación activa y diez solicitudes por usuario al día; también cuentan intentos fallidos. El resultado visual puede variar respecto de la configuración y debe revisarse.

## 11. Compilar el proyecto

En Linux o WSL, desde `codigo` y después de `npm ci`:

```bash
npm run build
```

El comando ejecuta primero `scripts/build-client.mjs` y luego el proceso de construcción del servidor. Produce recursos para navegador y un Worker en `dist/server`.

No edites el archivo generado `public/assets/app.js`: se vuelve a crear desde `client/app.mjs`. Los comentarios de estudio están en las fuentes, no en el paquete minificado.

## 12. Qué falta para abrir la app completa fuera del sitio original

Compilar no configura automáticamente una instalación nueva. Esta fuente utiliza:

- `DB`: base D1 con las migraciones de `drizzle` aplicadas en orden.
- `BUCKET`: almacenamiento R2 para fotos, firmas y respaldos.
- Autenticación del alojamiento original mediante cabeceras verificadas.
- Recursos estáticos y rutas del Worker servidos en el mismo origen.
- HTTPS para AR en el teléfono.

El manifiesto `.openai/hosting.json` conserva la identidad del sitio del que se obtuvo la copia. Es referencia de procedencia, no autorización para que otro proyecto publique sobre ese sitio.

Para una instalación independiente, el responsable técnico debe provisionar sus propios recursos, aplicar todas las migraciones (incluida la de `image_jobs`), configurar el alojamiento y reemplazar o integrar la autenticación de manera segura. `identity()` contiene una cuenta administradora específica del prototipo que debe revisarse al migrar. No habilites acceso público aceptando cabeceras arbitrarias de un navegador.

`npm run dev` existe en el proyecto, pero por sí solo no resuelve autenticación ni inicialización de la base. No se incluye una contraseña de demostración que permita saltarse esos controles. La prueba de cálculo del paso 6 y las pruebas del paso 3 sí se pueden ejecutar de forma independiente.

## 13. Datos de prueba y recorrido para demostrar

En un entorno de aplicación correctamente configurado, utiliza la acción de cargar ejemplos disponible para el administrador. La función `seed()` genera cinco solicitudes ficticias y materiales. No vuelvas a ejecutarla sobre ejemplos ya cargados.

Para demostrar un pedido nuevo, sigue: solicitud → estimación → visita → acta oficial → cotización firme → aceptación → pago manual → plan de corte → aprobación y reserva → fabricación → calidad → despacho interno → instalación → recepción → cierre.

Revisa también los casos negativos: medida sin acta, cotización vencida, falta de anticipo, stock insuficiente, fotos repetidas y observaciones sin resolver. Los archivos de pruebas ofrecen escenarios concretos para estudiar estos bloqueos.

## 14. Qué no prometer al presentar este código

El sistema no tiene catálogo Sodal completo, selección de vehículo, aplicación independiente del transportista, emisión tributaria, pasarela de pago ni verificación industrial de fórmulas. La AR todavía requiere validación física y la IA necesita credencial. Los roles no equivalen a aplicaciones separadas ni a una prueba completa con todos los usuarios.

## 15. Orden de estudio sugerido para el equipo

1. Leer esta guía y ubicar las carpetas.
2. Ejecutar los tests y el ejemplo de precio.
3. Seguir una solicitud en `execute()`.
4. Revisar una ruta HTTP y el guardado en `persist()`.
5. Explorar el modelo 3D y el montaje sobre foto.
6. Estudiar la orientación AR y el contrato de IA.
7. Identificar qué reglas debe confirmar la empresa.
8. Repartir cambios y documentar criterios de aceptación antes de ampliar el alcance.
