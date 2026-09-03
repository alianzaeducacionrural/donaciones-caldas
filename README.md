# Sistema de Gestión de Donaciones — Comité de Cafeteros de Caldas

Dashboard público + panel de gestión para el inventario de donaciones de ayuda
humanitaria del Comité de Cafeteros de Caldas.

- **Panorama público:** KPIs, gráficas por categoría, flujo de la campaña y mapa
  interactivo de los 27 municipios de Caldas.
- **Panel con clave:** CRUD completo de artículos, entradas, salidas y terceros, con
  validación de stock y auditoría de cambios.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8 + React Router 7 + Recharts 3 |
| Backend | Google Apps Script sobre Google Sheets |
| Despliegue | GitHub Pages (`alianzaeducacionrural/donaciones-caldas`) |

## Desarrollo

```bash
npm install
cp .env.example .env      # pega la URL del Web App de Apps Script
npm run dev
```

## Backend (Google Apps Script)

El código vive en `gas/` y se gestiona con [clasp](https://github.com/google/clasp).

```bash
npm run gas:push          # sube gas/ al proyecto
npm run gas:version       # crea una versión inmutable
npm run gas:redeploy      # actualiza el Web App (NUNCA usar clasp deploy)
```

- **Libro de cálculo:** `Gestión de Donaciones — Comité de Cafeteros de Caldas`
  (carpeta *Donaciones* en Drive).
- **Preparación inicial:** ver `GAS.md`.

## Mapa

`src/utils/mapaCaldas.js` se genera desde el GeoJSON del DANE:

```bash
npm run mapa
```

Si la generación falla, se conserva un cartograma de respaldo con la misma forma de datos.

## Documentación

- `PROYECTO.md` — especificación técnica y modelo de datos.
- `GAS.md` — contrato de la API y flujo de despliegue del backend.
- `CLAUDE.md` — guía para trabajar el repo con Claude Code.
