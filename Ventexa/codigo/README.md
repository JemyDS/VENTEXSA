# Ventexa

Aplicación web privada de gestión de vidriería para evaluación. Fuente, catálogo, API y documentación de cobertura versionados juntos.

- Cliente: `client/app.mjs`, `client/visual.mjs`, `client/visual-core.mjs`.
- Dominio y operaciones autorizadas: `lib/domain.mjs`, `lib/actions.mjs`.
- Persistencia: `lib/storage.ts`, `db/schema.ts`, `drizzle/`.
- API: `app/api/`.
- Matriz de cobertura: `public/cobertura-requisitos.md`.
- Pruebas: `node --test tests/ventexa.test.mjs`.
- Build: `npm run build` (incluye bundle del cliente).

Las migraciones incluyen índices y triggers adicionales de solo anexado; conservarlos en futuras migraciones. El código inicial local permanece en el historial de Git. Las pruebas previas en localStorage no se importan automáticamente a la base central.

No se declara listo para fabricación real ni cumplimiento total. Consultar la matriz para límites de AR física, stack industrial, respaldos y operación multiempresa.
