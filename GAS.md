# GAS.md — Backend Google Apps Script

`gas/Code.gs` (+ `Lectura.gs`, `Escritura.gs`, `Semilla.gs`, `Utiles.gs`) es la fuente
de verdad. Este documento describe el contrato y el flujo de despliegue.

## Proyecto

| | |
|---|---|
| Script ID | `1mxnp-6F4Od4JQfj7ZSXRujQaXwe0qTQCMbdj-PV0rUDCFjXR-THxt2yl` |
| Libro de cálculo | `1KW4MFlhusrZPhKnWF8LZYgZtDGcpZuQxoAqnuFvEUXc` (constante `LIBRO_ID` en `Utiles.gs`) |
| Deployment del Web App | `AKfycbyFrHkkT0zUsYP3kX316sfoE2hgcfVfAwChAEnsqXgWZRA-L78lPXzRSUTCjMIw3pSTSA` |
| Cuenta | `edurural.osorio.alejandro@gmail.com` |
| `executeAs` | `USER_DEPLOYING` · `access` `ANYONE_ANONYMOUS` |

## Preparación inicial (una sola vez)

Un proyecto nuevo de Apps Script necesita que su dueño **autorice los permisos una vez
desde el navegador** — no se puede automatizar.

1. Abrir el editor: `cd gas && clasp open-script` (o el enlace de arriba).
2. En el desplegable de funciones, elegir **`inicializarHojas`** y pulsar **Ejecutar**.
   Aparece el diálogo de permisos → **Revisar permisos** → elegir la cuenta →
   *Configuración avanzada* → *Ir a … (no seguro)* → **Permitir**.
3. Ejecutar **`sembrarDatosIniciales`**.
4. Ejecutar **`verificarSemilla`** → en el registro (Ver → Registros) debe salir
   `193 / 33 / 160`, 28 artículos, 11 salidas, 6 agotados.
5. Ejecutar **`configurarClave`** tras editarla, o hacerlo desde la pestaña `config`
   del Sheet (fila `clave_panel`).

> Atajo tras el paso 2: `curl "<URL>/exec?action=preparar&clave=preparar-donaciones-2026"`
> corre los pasos 3-4 y devuelve la verificación. La acción es idempotente.

## Endpoints

### `GET ?action=publico` — sin clave, sin datos personales

```json
{ "ok": true, "generado": "…",
  "config": { "titulo", "categorias":[], "unidades":[], "fechaInicio" },
  "resumen": { "recibido":193, "entregado":33, "disponible":160,
               "articulos":28, "agotados":6, "bajos", "donantes":3,
               "municipiosAtendidos":3, "municipiosCaldas":27, "actas":6, "pendientes":21 },
  "articulos": [ { "id","descripcion","categoria","unidad","stock_minimo",
                   "entradas","salidas","stock" } ],
  "entradas":  [ { "id","fecha","recibo","articulo_id","donante_nombre","cantidad","pendiente" } ],
  "salidas":   [ { "id","fecha","acta","articulo_id","municipio","cantidad","responsable" } ] }
```

Cacheado 60 s en `CacheService`, invalidado en cada escritura. Si el JSON supera
90 KB se sirve sin caché.

### `GET ?action=datos&clave=…` — snapshot completo del panel

Igual que `publico` **más** `entradas[]`, `salidas[]`, `terceros[]` fila por fila con
todos los campos (incluidas anuladas, con su bandera) y `auditoria[]` (últimos 200).

### `POST` — escrituras · `Content-Type: text/plain`

Cuerpo: `{ accion, clave, operador, datos }`.

| accion | datos | respuesta |
|---|---|---|
| `verificarClave` | — | `{ ok, operadores, categorias, unidades }` |
| `crearEntrada` | `{fecha, recibo, articulo_id, donante_id, donante_nombre, cantidad, observaciones}` | `{ ok, id, stock }` |
| `editarEntrada` | `{id, actualizado, …}` | `{ ok, id }` |
| `anularEntrada` | `{id, motivo?}` | `{ ok, id }` |
| `crearSalida` | `{fecha, acta?, municipioDefecto, beneficiario_id, responsable, lineas:[{articulo_id, cantidad, municipio}]}` | `{ ok, acta, ids }` |
| `editarSalida` | `{id, actualizado, fecha, municipio, cantidad, responsable}` | `{ ok, id }` |
| `anularSalida` / `anularActa` | `{id}` / `{acta}` | `{ ok }` |
| `crearArticulo` / `editarArticulo` / `desactivarArticulo` | `{descripcion, categoria, unidad, stock_minimo}` / … | `{ ok, id }` |
| `crearTercero` / `editarTercero` / `desactivarTercero` | `{tipo, nombre, documento, telefono, correo, direccion, municipio, notas}` / … | `{ ok, id }` |
| `guardarConfig` | `{clave, valor}` | `{ ok }` |

Error: `{ ok:false, error, codigo }` con `codigo ∈ CLAVE_INVALIDA · STOCK_INSUFICIENTE ·
DESACTUALIZADO · NO_ENCONTRADO · OCUPADO · VALIDACION · ERROR`.

## Garantías de integridad

- **`LockService.getScriptLock()`** serializa todas las escrituras (`doPost`).
- **Validación de stock:** una salida —o un acta completa— se rechaza si excede el
  disponible. El acta se valida entera antes de escribir la primera fila.
- **Concurrencia optimista:** cada fila lleva `actualizado`; `editar*` compara el
  timestamp que cargó el cliente y responde `DESACTUALIZADO` si no coincide.
- **Auditoría:** toda escritura exitosa deja una fila en la pestaña `auditoria`.
- **Cuadre:** el frontend muestra `Σ entradas − Σ salidas === Σ stock` en el pie del panel.

## Despliegue

```bash
npm run gas:push          # clasp push -f
npm run gas:version       # clasp create-version "mensaje"
npm run gas:redeploy      # clasp redeploy <ID> -V <n>   ← NUNCA clasp deploy
```

Un `clasp deploy` nuevo crea otra URL y hay que actualizar `VITE_GAS_URL` (`.env` local
y secret `VITE_GAS_URL` del repo).

## La clave: qué es y qué no es

La URL del Web App está en el bundle compilado y es pública. La clave viaja en el
cuerpo del POST sobre HTTPS. **Frena a quien no debe editar; no es autenticación.**
Se refuerza con: rate-limit en `PropertiesService` (2 s de castigo tras 5 fallos en
10 min; rechazo tras 15), comparación de tiempo constante, borrado lógico + auditoría,
y copia mensual del Sheet.

Ruta de escalamiento (documentar, no construir aún): dos deployments del mismo script,
uno `ANYONE_ANONYMOUS` que solo expone `action=publico`, otro `access: DOMAIN` +
`executeAs: USER_ACCESSING` con login de Google para las escrituras.
