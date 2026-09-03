// Color y glifo por categoría. La lista maestra de categorías vive en la
// pestaña `config` del Sheet y llega por la API; aquí solo se resuelve la
// presentación, con respaldo neutro para categorías que no reconozcamos.

const PALETA = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
]

// Equivalentes en hex para SVG/Recharts (gradientes, celdas, leyendas).
export const PALETA_HEX = ['#B77E00', '#971427', '#1E7A35', '#2563EB', '#7C3AED', '#0891B2']
export const HEX_RESPALDO = '#94A3B8'

export function colorHexCategoria(cat, categorias = []) {
  const i = categorias.indexOf(cat)
  if (i === -1) return HEX_RESPALDO
  return PALETA_HEX[i % PALETA_HEX.length]
}

const GLIFOS = {
  HOGAR: '⌂',        // ⌂
  ROPA: '♦',         // ◆
  ALIMENTOS: '▲',    // ▲
  ASEO: '✴',         // ✴
  HERRAMIENTAS: '⚒', // ⚒
  SALUD: '⚕',        // ⚕
  OTROS: '●',        // ●
}

// Devuelve un mapa { CATEGORIA: { color, glifo, indice } } estable según el
// orden en que llegan las categorías desde config.
export function mapaCategorias(categorias = []) {
  const mapa = {}
  categorias.forEach((cat, i) => {
    mapa[cat] = {
      color: PALETA[i % PALETA.length] || 'var(--cat-0)',
      glifo: GLIFOS[cat] || '●',
      indice: i,
    }
  })
  return mapa
}

export function colorCategoria(cat, categorias = []) {
  const i = categorias.indexOf(cat)
  if (i === -1) return 'var(--cat-0)'
  return PALETA[i % PALETA.length]
}

export function glifoCategoria(cat) {
  return GLIFOS[cat] || '●'
}
