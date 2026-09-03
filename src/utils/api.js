// Cliente del backend Google Apps Script.
// Todas las lecturas pasan por GET; todas las escrituras por POST con
// Content-Type: text/plain para evitar el preflight CORS que GAS no soporta.

const GAS_URL = import.meta.env.VITE_GAS_URL

function exigirUrl() {
  if (!GAS_URL) {
    throw new Error(
      'Falta VITE_GAS_URL. Copia .env.example a .env y pega la URL del Web App de Apps Script.',
    )
  }
}

async function get(params) {
  exigirUrl()
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${GAS_URL}?${qs}`)
  if (!res.ok) throw new Error(`Error de red (${res.status})`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Respuesta no válida del servidor')
  return json
}

async function post(accion, datos, sesion = {}) {
  exigirUrl()
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      accion,
      datos,
      clave: sesion.clave || '',
      operador: sesion.operador || '',
    }),
  })
  if (!res.ok) throw new Error(`Error de red (${res.status})`)
  const json = await res.json()
  if (!json.ok) {
    const err = new Error(json.error || 'No se pudo completar la operación')
    err.codigo = json.codigo
    throw err
  }
  return json
}

/* ── Lecturas ── */

// Snapshot público: KPIs, agregados y catálogo. Sin datos personales.
export const cargarPublico = () => get({ action: 'publico' })

// Snapshot completo del panel: incluye filas individuales y auditoría.
export const cargarDatos = (clave) => get({ action: 'datos', clave })

/* ── Autenticación ligera ── */

export const verificarClave = (clave) => post('verificarClave', {}, { clave })

/* ── Escrituras ── */

export const crearEntrada = (d, s) => post('crearEntrada', d, s)
export const editarEntrada = (d, s) => post('editarEntrada', d, s)
export const anularEntrada = (d, s) => post('anularEntrada', d, s)

export const crearSalida = (d, s) => post('crearSalida', d, s)
export const editarSalida = (d, s) => post('editarSalida', d, s)
export const anularSalida = (d, s) => post('anularSalida', d, s)
export const anularActa = (d, s) => post('anularActa', d, s)

export const crearArticulo = (d, s) => post('crearArticulo', d, s)
export const editarArticulo = (d, s) => post('editarArticulo', d, s)
export const desactivarArticulo = (d, s) => post('desactivarArticulo', d, s)

export const crearTercero = (d, s) => post('crearTercero', d, s)
export const editarTercero = (d, s) => post('editarTercero', d, s)
export const desactivarTercero = (d, s) => post('desactivarTercero', d, s)

export const guardarConfig = (d, s) => post('guardarConfig', d, s)

export { GAS_URL }
