# CLAUDE.md — Sistema de Gestión de Donaciones

Guía para trabajar este repositorio con Claude Code.

## Qué es

Dashboard público + panel de gestión del inventario de donaciones del Comité de
Cafeteros de Caldas. React (Vite, GitHub Pages) ↔ Google Apps Script ↔ Google Sheets.

```
React  (Vite, base '/donaciones-caldas/')
  ├─ /                → panorama público (sin clave)
  │    /disponibilidad  /municipios  /donantes
  └─ /panel/*         → gestión (clave, sessionStorage)
        ↓ fetch GET / POST
Apps Script Web App  ←→  Google Sheets (6 pestañas)
```

## Comandos

| Comando | Efecto |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` | build de producción a `dist/` |
| `npm run lint` | ESLint |
| `npm run mapa` | regenera `src/utils/mapaCaldas.js` desde el GeoJSON del DANE |
| `npm run gas:push` | sube `gas/` al proyecto de Apps Script |
| `npm run gas:version` | crea versión inmutable |
| `npm run gas:redeploy` | actualiza el Web App **sin cambiar la URL** |

## Reglas que no se rompen

1. **CORS / GAS:** los POST usan `Content-Type: text/plain` (nunca `application/json`).
   GAS no soporta preflight. Ver `src/utils/api.js`.
2. **Nunca `clasp deploy`.** Siempre `clasp redeploy <id>` (o `npm run gas:redeploy`).
   Un deploy nuevo genera otra URL y rompe `VITE_GAS_URL`.
3. **`base` coincide en dos lugares:** `vite.config.js` (`base: '/donaciones-caldas/'`)
   y `src/App.jsx` (`<BrowserRouter basename="/donaciones-caldas/">`).
4. **El stock se calcula, no se guarda.** GAS lo deriva (`calcularStock`) de
   entradas − salidas. No hay columna de stock ni fórmulas `SUMIF`.
5. **Borrado lógico.** Nunca se borran filas: se marca `anulado = SI` / `activo = NO`.
   Toda agregación filtra con `filasActivas()` (GAS) o el helper `activo` (`agregados.js`).
6. **Datos personales:** el endpoint `?action=publico` **nunca** devuelve `documento`,
   `telefono`, `correo`, `direccion` ni filas de `terceros`. El recorte lo hace GAS
   (`Lectura.gs`), no el frontend.
7. **La clave del panel no es autenticación.** Es un freno (rate-limit + auditoría +
   borrado lógico). La URL de GAS es pública. Ver `GAS.md` para la ruta de escalamiento.
8. **`municipios.js`** (27 municipios de Caldas) es fuente única y llave del mapa. Hay
   una copia en `gas/Utiles.gs` para validación en el servidor — mantener sincronizadas.
9. La lista maestra de **categorías** vive en `config!categorias` (Sheet), no en código.

## Estructura

```
src/
  App.jsx              rutas (único archivo de routing)
  index.css            tokens :root + resets + .campo/.control globales
  utils/               api · agregados (cálculos) · categorias · formatear · exportarCsv
                       municipios · mapaCaldas (GENERADO)
  hooks/               useDatos · useSesion · useGuardar
  components/          Contador · TarjetaKpi · Panel · Tabla · Modal · Campos
                       Semaforo · MapaCaldas · graficas · Cargando · Vacio
  publico/             PublicoLayout + vistas/ (Dashboard, Disponibilidad, PorMunicipio, Donantes)
  panel/               PanelLayout · Acceso + vistas/ (Resumen, Gestion*, Auditoria)
                       vistas/vistas.module.css  (hoja compartida del panel)
gas/
  Code.gs      router doGet/doPost, responder(), validarClave(), despachar(), auditoría
  Lectura.gs   getPublico / getDatos / calcularStock / resumenGeneral
  Escritura.gs crear/editar/anular (dentro del LockService)
  Semilla.gs   inicializarHojas / sembrarDatosIniciales / verificarSemilla / configurarClave
  Utiles.gs    hojas, ids, folios, config, municipios
```

## Convenciones de código

- JSX plano, sin TypeScript. Todo (identificadores, comentarios, UI) en español.
- Sin librerías de UI, sin Tailwind, sin librería de iconos (glifos unicode).
- CSS Modules co-locados; el panel comparte `vistas/vistas.module.css`.
- Componentes PascalCase (default export); hooks `use*` (named export); utilidades camelCase.

## Verificación rápida

`verificarSemilla()` en el editor de Apps Script debe dar **193 / 33 / 160**, 28
artículos, 11 salidas, 6 agotados. Es la prueba de que los datos están bien.
