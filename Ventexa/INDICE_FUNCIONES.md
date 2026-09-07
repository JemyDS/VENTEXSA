# Índice de funciones comentadas

Archivo | Función | Propósito
---|---|---
[app/api/action/route.ts](codigo/app/api/action/route.ts) | `POST` | POST /api/action. Valida origen, revisión e idempotencia, ejecuta la acción, persiste el resultado y conserva una instantánea diaria cuando hay actividad.
[app/api/backup/route.ts](codigo/app/api/backup/route.ts) | `GET` | GET /api/backup. Exportación manual del estado, exclusiva del administrador. No implementa por sí sola una restauración.
[app/api/document/[id]/route.ts](codigo/app/api/document/[id]/route.ts) | `GET` | GET /api/document/:id. Busca una cotización, verifica acceso y devuelve su PDF.
[app/api/estimate/route.ts](codigo/app/api/estimate/route.ts) | `POST` | POST /api/estimate. Calcula en servidor y devuelve únicamente el rango estimativo, sin desglosar costos internos.
[app/api/file/[id]/route.ts](codigo/app/api/file/[id]/route.ts) | `GET` | GET /api/file/:id. Lee un objeto R2 con controles de acceso. Para clientes verifica su relación con los antecedentes de su solicitud.
[app/api/files/route.ts](codigo/app/api/files/route.ts) | `POST` | POST /api/files. Valida el archivo, almacena bytes en R2 y metadatos en D1. El identificador devuelto se utiliza como referencia.
[app/api/state/route.ts](codigo/app/api/state/route.ts) | `GET` | GET /api/state. Devuelve el estado filtrado para el usuario autenticado; prohíbe el almacenamiento en caché HTTP.
[app/api/visual-edit/route.ts](codigo/app/api/visual-edit/route.ts) | `actor` | Restringe el uso de generación de imágenes a administrador o vendedor.
[app/api/visual-edit/route.ts](codigo/app/api/visual-edit/route.ts) | `GET` | EDICIÓN IA HTTP. GET informa disponibilidad sin exponer secretos. POST limita tamaño, rol y solicitudes diarias; devuelve un PNG generado.
[app/api/visual-edit/route.ts](codigo/app/api/visual-edit/route.ts) | `POST` | EDICIÓN IA HTTP. GET informa disponibilidad sin exponer secretos. POST limita tamaño, rol y solicitudes diarias; devuelve un PNG generado.
[client/app.mjs](codigo/client/app.mjs) | `title` | Construye el encabezado de una pantalla: etiqueta, título, explicación y acción principal.
[client/app.mjs](codigo/client/app.mjs) | `toast` | Muestra un aviso temporal al usuario.
[client/app.mjs](codigo/client/app.mjs) | `local` | Abre la base IndexedDB del navegador para conservar datos de trabajo sin conexión.
[client/app.mjs](codigo/client/app.mjs) | `cache` | Lee o escribe un registro en IndexedDB; se usa para el estado, borradores y la cola de operaciones.
[client/app.mjs](codigo/client/app.mjs) | `refresh` | Consulta el estado del servidor; si falla la conexión, intenta recuperar la copia local. Un error de autenticación solicita iniciar sesión.
[client/app.mjs](codigo/client/app.mjs) | `queueStatus` | Actualiza el indicador de operaciones que esperan sincronización.
[client/app.mjs](codigo/client/app.mjs) | `upload` | Sube una fotografía o firma al servidor y obtiene la referencia al archivo.
[client/app.mjs](codigo/client/app.mjs) | `resolveUploads` | Recorre un contenido y convierte imágenes locales pendientes en referencias almacenadas.
[client/app.mjs](codigo/client/app.mjs) | `act` | Envía una acción con revisión e identificador único; gestiona errores y conservación local según disponibilidad de conexión.
[client/app.mjs](codigo/client/app.mjs) | `syncQueue` | Reenvía operaciones pendientes y conserva los conflictos para su revisión.
[client/app.mjs](codigo/client/app.mjs) | `nav` | Construye la navegación disponible para el rol activo.
[client/app.mjs](codigo/client/app.mjs) | `go` | Cambia la pantalla seleccionada y solicita dibujarla.
[client/app.mjs](codigo/client/app.mjs) | `render` | Selecciona la función de pantalla según la navegación actual.
[client/app.mjs](codigo/client/app.mjs) | `effectiveStatus` | Calcula el estado que se muestra, considerando la vigencia de la cotización.
[client/app.mjs](codigo/client/app.mjs) | `tableRequests` | Construye la tabla de solicitudes con sus acciones.
[client/app.mjs](codigo/client/app.mjs) | `home` | Dibuja el resumen del taller y sus indicadores.
[client/app.mjs](codigo/client/app.mjs) | `requests` | Dibuja la lista de solicitudes.
[client/app.mjs](codigo/client/app.mjs) | `filterRequests` | Filtra las solicitudes visibles según la búsqueda.
[client/app.mjs](codigo/client/app.mjs) | `triple` | Genera tres campos de medición: cada vano registra tres anchos y tres altos.
[client/app.mjs](codigo/client/app.mjs) | `configFields` | Genera los campos de tipología, perfiles, vidrio y condiciones de instalación.
[client/app.mjs](codigo/client/app.mjs) | `readC` | Convierte los campos del formulario en la configuración de una ventana.
[client/app.mjs](codigo/client/app.mjs) | `readM` | Convierte los campos del formulario en el registro de medidas.
[client/app.mjs](codigo/client/app.mjs) | `diagram` | Dibuja una representación de la ventana con SVG para el formulario.
[client/app.mjs](codigo/client/app.mjs) | `config` | Abre el configurador y conecta los eventos del formulario.
[client/app.mjs](codigo/client/app.mjs) | `configPreview` | Recalcula la vista previa y la estimación de la configuración actual.
[client/app.mjs](codigo/client/app.mjs) | `removeDraftVano` | Quita un vano del borrador que se está editando.
[client/app.mjs](codigo/client/app.mjs) | `saveDraft` | Conserva o envía la solicitud preparada en el configurador.
[client/app.mjs](codigo/client/app.mjs) | `readImages` | Lee imágenes del usuario y prepara versiones reducidas para adjuntarlas.
[client/app.mjs](codigo/client/app.mjs) | `openRequest` | Selecciona una solicitud y abre su detalle.
[client/app.mjs](codigo/client/app.mjs) | `detail` | Dibuja antecedentes y acciones de una solicitud según su estado.
[client/app.mjs](codigo/client/app.mjs) | `modal` | Abre el diálogo reutilizable de formularios.
[client/app.mjs](codigo/client/app.mjs) | `signaturePad` | Genera el área donde se capturará una firma dibujada.
[client/app.mjs](codigo/client/app.mjs) | `initSignature` | Conecta los eventos del puntero para dibujar la firma en canvas.
[client/app.mjs](codigo/client/app.mjs) | `clearSignature` | Borra el trazo de la firma actual.
[client/app.mjs](codigo/client/app.mjs) | `getSignature` | Obtiene la imagen de la firma y verifica que haya un trazo.
[client/app.mjs](codigo/client/app.mjs) | `measure` | Abre el levantamiento técnico: medidas verificadas, diagonales, condiciones, fotografías y firma.
[client/app.mjs](codigo/client/app.mjs) | `quoteForm` | Solicita los datos necesarios para emitir una cotización firme.
[client/app.mjs](codigo/client/app.mjs) | `acceptForm` | Captura la aceptación y firma asociada a una cotización.
[client/app.mjs](codigo/client/app.mjs) | `rejectForm` | Registra el motivo de rechazo de la cotización.
[client/app.mjs](codigo/client/app.mjs) | `schedule` | Abre el formulario de asignación de una visita.
[client/app.mjs](codigo/client/app.mjs) | `availableSlots` | Consulta los bloques compatibles con la cuadrilla y el servicio.
[client/app.mjs](codigo/client/app.mjs) | `agenda` | Dibuja las visitas programadas y su situación.
[client/app.mjs](codigo/client/app.mjs) | `visitForm` | Permite registrar avance o causa de una visita no realizada.
[client/app.mjs](codigo/client/app.mjs) | `production` | Dibuja las órdenes de trabajo organizadas por su etapa.
[client/app.mjs](codigo/client/app.mjs) | `openOrder` | Selecciona una orden de trabajo y abre su detalle.
[client/app.mjs](codigo/client/app.mjs) | `orderDetail` | Muestra el despiece, etapas, documentos y acciones de una orden.
[client/app.mjs](codigo/client/app.mjs) | `paymentForm` | Abre el registro manual de un pago; no conecta una pasarela bancaria.
[client/app.mjs](codigo/client/app.mjs) | `advanceForm` | Recoge controles necesarios para avanzar una orden de fabricación.
[client/app.mjs](codigo/client/app.mjs) | `installForm` | Solicita evidencias anteriores y posteriores a la instalación por vano.
[client/app.mjs](codigo/client/app.mjs) | `receiptForm` | Captura la recepción conforme una vez resueltas las observaciones.
[client/app.mjs](codigo/client/app.mjs) | `resolveObservation` | Registra que una observación de instalación fue resuelta.
[client/app.mjs](codigo/client/app.mjs) | `wasteForm` | Recoge material, cantidad, costo y causa de una merma.
[client/app.mjs](codigo/client/app.mjs) | `scanForm` | Busca una pieza por su etiqueta y registra la estación de trabajo.
[client/app.mjs](codigo/client/app.mjs) | `labelsQR` | Genera etiquetas QR para identificar las piezas de una orden.
[client/app.mjs](codigo/client/app.mjs) | `dispatchDoc` | Genera el comprobante interno imprimible de despacho; no asigna transportista ni vehículo.
[client/app.mjs](codigo/client/app.mjs) | `csv` | Escapa los datos y construye una tabla en formato CSV.
[client/app.mjs](codigo/client/app.mjs) | `download` | Inicia la descarga de un contenido generado por la aplicación.
[client/app.mjs](codigo/client/app.mjs) | `exportCut` | Exporta las piezas de corte de la orden seleccionada.
[client/app.mjs](codigo/client/app.mjs) | `plans` | Dibuja planes de corte y aprovechamiento de materiales.
[client/app.mjs](codigo/client/app.mjs) | `exportPlan` | Exporta un plan de corte para su revisión.
[client/app.mjs](codigo/client/app.mjs) | `inventory` | Muestra stock, reservas y retales disponibles.
[client/app.mjs](codigo/client/app.mjs) | `stockForm` | Registra un ajuste de inventario con su motivo.
[client/app.mjs](codigo/client/app.mjs) | `purchases` | Dibuja las órdenes de compra y sus recepciones.
[client/app.mjs](codigo/client/app.mjs) | `purchaseForm` | Abre el formulario para comprar un material a un proveedor.
[client/app.mjs](codigo/client/app.mjs) | `receiveForm` | Registra una recepción parcial o completa de una compra.
[client/app.mjs](codigo/client/app.mjs) | `payments` | Muestra pagos y saldos registrados manualmente.
[client/app.mjs](codigo/client/app.mjs) | `warranties` | Dibuja garantías y reclamos de órdenes cerradas.
[client/app.mjs](codigo/client/app.mjs) | `claimForm` | Abre un reclamo asociado a una garantía.
[client/app.mjs](codigo/client/app.mjs) | `serviceForm` | Registra el seguimiento y costo de atención de un reclamo.
[client/app.mjs](codigo/client/app.mjs) | `reports` | Presenta indicadores calculados a partir de los registros actuales.
[client/app.mjs](codigo/client/app.mjs) | `catalog` | Muestra el catálogo de prueba y sus reglas.
[client/app.mjs](codigo/client/app.mjs) | `catalogForm` | Permite editar datos del catálogo; no descarga ni digitaliza automáticamente el catálogo Sodal.
[client/app.mjs](codigo/client/app.mjs) | `settings` | Abre los parámetros del negocio y administración de miembros.
[client/app.mjs](codigo/client/app.mjs) | `teams` | Muestra cuadrillas, competencias, comunas y horarios.
[client/app.mjs](codigo/client/app.mjs) | `teamForm` | Edita la disponibilidad y habilidades de una cuadrilla.
[client/app.mjs](codigo/client/app.mjs) | `offline` | Muestra la cola sin conexión y los conflictos de sincronización.
[client/app.mjs](codigo/client/app.mjs) | `help` | Muestra la ayuda y las limitaciones documentadas del prototipo.
[client/app.mjs](codigo/client/app.mjs) | `visualFromForm` | Lleva la configuración del formulario al visualizador.
[client/app.mjs](codigo/client/app.mjs) | `visualVano` | Lleva al visualizador la configuración de un vano de una solicitud.
[client/app.mjs](codigo/client/app.mjs) | `visual` | Construye la pantalla de modelos, fotografía, AR y edición con IA.
[client/app.mjs](codigo/client/app.mjs) | `visualConfig` | Recoge la configuración visual con dimensiones en milímetros.
[client/app.mjs](codigo/client/app.mjs) | `generateModel` | Genera el modelo de la configuración actual; descarta respuestas antiguas y conserva una vista estática si falla el visor.
[client/app.mjs](codigo/client/app.mjs) | `toggleLeaves` | Alterna la representación visual de hojas abiertas o cerradas.
[client/app.mjs](codigo/client/app.mjs) | `downloadModel` | Descarga el GLB o USDZ generado para la configuración actual.
[client/app.mjs](codigo/client/app.mjs) | `photoInput` | Carga la foto, la reduce y permite marcar o corregir las cuatro esquinas del vano.
[client/app.mjs](codigo/client/app.mjs) | `resetCorners` | Borra la selección del vano para volver a marcarla.
[client/app.mjs](codigo/client/app.mjs) | `saveComposition` | Descarga la guía dibujada sobre la foto. Este montaje por canvas no es una imagen generada con IA.
[client/app.mjs](codigo/client/app.mjs) | `resumeDraft` | Recupera una solicitud en borrador para continuar su edición.
[client/app.mjs](codigo/client/app.mjs) | `retryQueued` | Presenta un conflicto y exige revisión antes de reenviar contra la nueva versión del servidor.
[client/app.mjs](codigo/client/app.mjs) | `materialForm` | Abre el alta de un material de inventario.
[client/app.mjs](codigo/client/app.mjs) | `arAvailability` | Detecta si hay WebXR inmersivo o un visor AR compatible y actualiza el botón.
[client/app.mjs](codigo/client/app.mjs) | `startAR` | Abre AR guiada en WebXR o Quick Look según compatibilidad. Se invoca desde un gesto del usuario.
[client/app.mjs](codigo/client/app.mjs) | `showStatic` | Dibuja una vista SVG cuando no se dispone del visor 3D.
[client/app.mjs](codigo/client/app.mjs) | `clientEstimate` | Solicita al servidor el rango de precio que puede consultar un cliente.
[client/app.mjs](codigo/client/app.mjs) | `invalidateAI` | Invalida el resultado al cambiar foto o configuración y libera las URL temporales.
[client/app.mjs](codigo/client/app.mjs) | `updateAIButton` | Habilita la edición solo si hay servicio, cuatro esquinas y ninguna generación activa.
[client/app.mjs](codigo/client/app.mjs) | `checkAI` | Consulta si existe una credencial de IA en el servidor; nunca solicita su valor.
[client/app.mjs](codigo/client/app.mjs) | `generateAI` | Prepara foto original, guía y máscara transparente del vano; pide una edición real y descarta resultados de una configuración anterior.
[client/app.mjs](codigo/client/app.mjs) | `downloadAI` | Descarga únicamente el resultado de IA disponible.
[client/app.mjs](codigo/client/app.mjs) | `compareAI` | Alterna la visualización entre la foto original y el resultado generado.
[client/ar-core.mjs](codigo/client/ar-core.mjs) | `wallPlacement` | Lee la normal +Y del hit-test, rechaza superficies no verticales y calcula solo el giro horizontal para mantener la ventana de pie.
[client/ar.mjs](codigo/client/ar.mjs) | `launchWallAR` | Inicia WebXR con hit-test y controles superpuestos: muestra contorno, espera confirmación y permite ajustes de posición.
[client/ar.mjs](codigo/client/ar.mjs) | `cleanup` | Cancela el seguimiento y libera geometrías, materiales, renderizador y elementos HTML al salir de AR.
[client/visual-core.mjs](codigo/client/visual-core.mjs) | `geometry` | Construye marcos, vidrios, hojas y herrajes con Three.js. Convierte milímetros a metros; la ventana está en XY y su frente mira hacia +Z.
[client/visual-core.mjs](codigo/client/visual-core.mjs) | `box` | Añade una pieza rectangular a un grupo con dimensiones, posición y material.
[client/visual-core.mjs](codigo/client/visual-core.mjs) | `homography` | Resuelve ocho coeficientes que proyectan el cuadrado unidad sobre cuatro esquinas de una fotografía.
[client/visual-core.mjs](codigo/client/visual-core.mjs) | `project` | Aplica la homografía a una coordenada del dibujo para obtener su posición en la foto.
[client/visual-core.mjs](codigo/client/visual-core.mjs) | `compose` | Dibuja foto, marcadores y una guía en perspectiva mediante canvas; no utiliza IA.
[client/visual-core.mjs](codigo/client/visual-core.mjs) | `polygon` | Proyecta y rellena una región del dibujo dentro del vano seleccionado.
[client/visual-core.mjs](codigo/client/visual-core.mjs) | `quickLookGeometry` | Prepara una copia para el anclaje vertical de Quick Look: el frente +Z pasa a +Y. Su comportamiento físico sigue pendiente de validación en iPhone.
[client/visual.mjs](codigo/client/visual.mjs) | `showModel` | Exporta GLB y USDZ de la configuración, reutiliza resultados en caché y evita reemplazar un modelo nuevo por una respuesta antigua.
[lib/actions.mjs](codigo/lib/actions.mjs) | `authorize` | Verifica el permiso del rol antes de ejecutar cualquier acción. El administrador tiene acceso general.
[lib/actions.mjs](codigo/lib/actions.mjs) | `findRequest` | Localiza una solicitud y limita al cliente a las solicitudes cuyo propietario coincide con su cuenta.
[lib/actions.mjs](codigo/lib/actions.mjs) | `createQuote` | Exige actas oficiales vigentes y crea una instantánea de precios y condiciones para que cambios posteriores no alteren esa versión.
[lib/actions.mjs](codigo/lib/actions.mjs) | `digest` | Obtiene un hash SHA-256 del contenido para comprobación de integridad; no es una firma digital certificada.
[lib/actions.mjs](codigo/lib/actions.mjs) | `execute` | Aplica una operación autorizada sobre el estado cargado. La ruta HTTP guarda después los cambios en D1; esta función no persiste por sí sola.
[lib/actions.mjs](codigo/lib/actions.mjs) | `seed` | Carga cinco casos ficticios, inventario y retales para explorar el sistema. Las firmas e imágenes demo no constituyen evidencias reales.
[lib/domain.mjs](codigo/lib/domain.mjs) | `ensure` | Interrumpe la operación con un mensaje si una condición de negocio no se cumple.
[lib/domain.mjs](codigo/lib/domain.mjs) | `number` | Convierte y valida un número finito dentro del rango permitido.
[lib/domain.mjs](codigo/lib/domain.mjs) | `defaultState` | Construye el estado inicial vacío con catálogo y parámetros de demostración, no valores industriales certificados.
[lib/domain.mjs](codigo/lib/domain.mjs) | `dims` | Exige tres anchos y tres altos y elige el mínimo de cada grupo para el vano.
[lib/domain.mjs](codigo/lib/domain.mjs) | `configItems` | Resuelve las referencias al perfil, vidrio, herraje y regla de la tipología seleccionada.
[lib/domain.mjs](codigo/lib/domain.mjs) | `validate` | Comprueba compatibilidades y límites del catálogo de prueba; acumula condiciones de riesgo y rechaza combinaciones no admitidas.
[lib/domain.mjs](codigo/lib/domain.mjs) | `price` | Calcula costos de prueba, margen, descuento e IVA; devuelve total y rango estimativo. Requiere validación de fórmulas con el fabricante.
[lib/domain.mjs](codigo/lib/domain.mjs) | `cut` | Genera piezas desde un acta oficial firmada y aplica las deducciones del catálogo. El despiece es demostrativo y no cubre fichas industriales completas por tipología.
[lib/domain.mjs](codigo/lib/domain.mjs) | `pack1D` | Distribuye largos de perfil en barras con una heurística de mayor a menor; descuenta el ancho del corte y aprovecha retales. No garantiza el óptimo global.
[lib/domain.mjs](codigo/lib/domain.mjs) | `pack2D` | Distribuye vidrios con particiones de guillotina, giro de piezas, borde y ancho de corte. Es una heurística, no una garantía de óptimo global.
[lib/domain.mjs](codigo/lib/domain.mjs) | `locate` | Busca recursivamente un rectángulo libre donde quepa la pieza, con o sin giro.
[lib/domain.mjs](codigo/lib/domain.mjs) | `emptyRects` | Recorre la partición del plan y devuelve los rectángulos libres.
[lib/domain.mjs](codigo/lib/domain.mjs) | `makePlans` | Agrupa piezas por material, elige el algoritmo de corte y calcula aprovechamiento.
[lib/domain.mjs](codigo/lib/domain.mjs) | `slots` | Calcula bloques libres según habilidades, comuna, días y horarios; excluye solapamientos.
[lib/image-edit.mjs](codigo/lib/image-edit.mjs) | `editPrompt` | Valida dimensiones y cuatro esquinas, y redacta la instrucción que pide reelaborar la foto respetando el vano.
[lib/image-edit.mjs](codigo/lib/image-edit.mjs) | `editImage` | Envía foto, guía y máscara a OpenAI Images Edits y decodifica el PNG. Sin clave del servidor no hay generación real.
[lib/pdf.mjs](codigo/lib/pdf.mjs) | `quotePDF` | Genera el PDF de una instantánea de cotización; fija fecha e identificador para obtener un documento reproducible.
[lib/pdf.mjs](codigo/lib/pdf.mjs) | `text` | Escribe texto con ajuste de línea y avance vertical en el PDF.
[lib/storage.ts](codigo/lib/storage.ts) | `loadState` | Carga desde D1 el estado y los registros oficiales; devuelve valores iniciales si aún no existe un taller guardado.
[lib/storage.ts](codigo/lib/storage.ts) | `identity` | Obtiene identidad desde cabeceras de la plataforma y resuelve el rol. Fuera de ese alojamiento requiere un proveedor de identidad confiable.
[lib/storage.ts](codigo/lib/storage.ts) | `persist` | Guarda estado, revisiones, actas, órdenes y auditoría en un lote de operaciones D1.
[lib/storage.ts](codigo/lib/storage.ts) | `validateFileReferences` | Comprueba que las referencias a archivos del contenido existan para la empresa.
[lib/storage.ts](codigo/lib/storage.ts) | `walk` | Recorre objetos y arreglos para reunir las referencias a archivos que el servidor debe validar.
[lib/storage.ts](codigo/lib/storage.ts) | `publicState` | Prepara el estado visible por rol; al cliente le oculta costos internos y registros ajenos.
