# PROYECTO.md — Especificación técnica

## Objetivo

Reemplazar el archivo `Gestion_Donaciones_Inventario.xlsx` por un sistema web con:

1. **Panorama público** (transparencia con donantes, proyección en reuniones).
2. **Panel de gestión con clave** (CRUD de todo el inventario, sin volver al Excel).

Motivación: dos personas no podían editar el Excel a la vez, no había forma de
compartir el estado sin mandar el archivo, y nada validaba que una entrega no
superara el stock.

## Modelo de datos — Google Sheets

Libro `Gestión de Donaciones — Comité de Cafeteros de Caldas`. Encabezados en la
fila 1, datos desde la fila 2.

| Pestaña | Columnas |
|---|---|
| `articulos` | `id · descripcion · categoria · unidad · stock_minimo · activo · creado · actualizado` |
| `entradas` | `id · fecha · recibo · articulo_id · donante_id · donante_nombre · cantidad · observaciones · pendiente · operador · creado · actualizado · anulado` |
| `salidas` | `id · fecha · acta · articulo_id · municipio · beneficiario_id · beneficiario_nombre · cantidad · responsable · observaciones · operador · creado · actualizado · anulado` |
| `terceros` | `id · tipo · nombre · documento · telefono · correo · direccion · municipio · notas · activo · creado · actualizado` |
| `config` | `clave · valor · descripcion` |
| `auditoria` | `timestamp · operador · accion · entidad · entidad_id · detalle` |

### Decisiones frente al Excel

1. **Stock calculado, no almacenado** — `calcularStock()` en GAS. Los `SUMIF` del Excel
   se rompían al insertar/borrar filas.
2. **`id` propio y estable** (`ENTR-0001`, `SAL-0001`) distinto del folio físico
   (`recibo`, `acta`). Editar/borrar apuntan al `id`, no a la posición de fila.
3. **Borrado lógico** (`anulado` / `activo`), nunca `deleteRow`.
4. **`municipio` en cada línea de salida**, validado contra los 27 municipios. El acta
   `ENT-006` del Excel reparte entre 3 municipios distintos.
5. **`donante_nombre` denormalizado** junto al `donante_id`.

### `config`

| clave | ejemplo |
|---|---|
| `clave_panel` | `donaciones2026` (cámbiala) |
| `operadores` | `Operador 1, Operador 2` |
| `categorias` | `HOGAR, ROPA, ALIMENTOS` — **lista maestra** |
| `unidades` | `UNIDAD, PACA, PAQUETE, ROLLO, BOTELLÓN` |
| `titulo_campana` | subtítulo del panorama público |
| `fecha_inicio_campana` | `2026-09-01` |
| `dominio` | `https://alianzaeducacionrural.github.io/donaciones-caldas` |

## Migración (`Semilla.gs`)

Datos embebidos como literales, fieles al Excel. **No se inventan datos.**

- **28 artículos**, 3 categorías tal como estaban en el Excel (editables desde el panel).
- **28 entradas**: 7 completas; **21 de CAROLINA BERNAL sin fecha ni recibo**, marcadas
  `pendiente = SI`. El panel las resalta con filtro propio; las gráficas temporales las
  excluyen con nota visible.
- **11 salidas**, municipios canónicos, una fila por artículo (`ENT-006` → 6 filas).
- **4 terceros** con datos; las 2 filas vacías del Excel no se migran.
- `observaciones` de entradas se descarta (solo repetía la descripción).

`verificarSemilla()` confirma **193 / 33 / 160**, 28 artículos, 11 salidas, 6 agotados
(ART-001, 002, 003, 005, 006, 007).

## Rutas

| Ruta | Acceso | Contenido |
|---|---|---|
| `/` | público | KPIs animados, 5 gráficas Recharts |
| `/disponibilidad` | público | tabla de artículos, semáforo, filtros, CSV |
| `/municipios` | público | mapa de Caldas + barras + tabla (clic filtra) |
| `/donantes` | público | quiénes donaron y cuánto |
| `/panel` | clave | resumen de gestión |
| `/panel/entradas` `/salidas` `/articulos` `/terceros` | clave | CRUD |
| `/panel/auditoria` | clave | historial de cambios |

## Dashboard

- **KPIs** (`<Contador>` con `requestAnimationFrame`): recibido · entregado · disponible
  · tasa de entrega · donantes · municipios · agotados.
- **Gráficas** (Recharts 3):
  - Donaciones por categoría — `BarChart` horizontal apilado.
  - Composición del disponible — `PieChart` tipo dona.
  - Flujo de la campaña — `ComposedChart` (área acumulada + barras). Nota al pie: las
    21 entradas sin fecha quedan fuera.
  - Top 10 en disponibilidad — `BarChart` horizontal.
  - Entregas por municipio — `BarChart` (en `/municipios`).
- **Mapa** — `src/utils/mapaCaldas.js` (paths SVG pre-proyectados con `d3-geo`, cero
  dependencias en runtime). Genera con `npm run mapa`. Respaldo: cartograma de azulejos
  con la misma forma de datos `{nombre, dane, d, cx, cy}`.

## Paleta

Base amarilla (café / cosecha) con el vinotinto `#971427` del isologo como color
institucional. Todos los tokens en el bloque `:root` de `src/index.css` — cambiarla es
editar ese bloque.

## Despliegue

GitHub Pages vía `.github/workflows/deploy.yml` (build + `cp dist/index.html
dist/404.html` + `peaceiris/actions-gh-pages`). Secret del repo: `VITE_GAS_URL`.
`base` de Vite = `/donaciones-caldas/` y debe coincidir con el `basename` del router.

## Riesgos conocidos

- La clave del panel no es autenticación (ver `GAS.md`).
- Datos personales de beneficiarios: solo salen por `?action=datos` (con clave), nunca
  por `?action=publico`. Verificar en cada despliegue.
- Latencia de GAS en frío (1-3 s): mitigada con snapshot único + caché 60 s.
- Categorías mal asignadas en el origen (papel higiénico como ROPA, etc.): se migran
  tal cual, corregibles desde `/panel/articulos`.
