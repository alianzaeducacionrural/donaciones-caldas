import { guardarConfig } from './api'
import { tituloPropio } from './formatear'

// Normaliza un valor nuevo de categoría/unidad y, si no existe todavía en la
// lista maestra (config!categorias o config!unidades), lo agrega ahí para
// que quede disponible como opción normal de ahí en adelante.
export async function asegurarOpcion(lista, valorNuevo, claveConfig, sesion) {
  const limpio = tituloPropio(String(valorNuevo || '').trim())
  if (!limpio) throw new Error('Escribe un valor.')
  const yaExiste = lista.some((v) => v.toLowerCase() === limpio.toLowerCase())
  if (!yaExiste) {
    await guardarConfig({ clave: claveConfig, valor: [...lista, limpio].join(', ') }, sesion)
  }
  return limpio
}
