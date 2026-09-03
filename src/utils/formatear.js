// Formateo de valores para la interfaz. Todo en español de Colombia.

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

// "2026-09-03" | Date | ISO  ->  "3 sep 2026"
export function fechaCorta(valor) {
  const d = aFecha(valor)
  if (!d) return '—'
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// "2026-09-03"  ->  "03/09/2026"
export function fechaNumerica(valor) {
  const d = aFecha(valor)
  if (!d) return '—'
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

// Solo la parte YYYY-MM-DD, para <input type="date">
export function fechaISO(valor) {
  const d = aFecha(valor)
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}

export function diasDesde(valor) {
  const d = aFecha(valor)
  if (!d) return null
  const ms = Date.now() - d.getTime()
  return Math.floor(ms / 86400000)
}

// 1234567 -> "1.234.567"
export function numero(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  return v.toLocaleString('es-CO')
}

// 0.1735 -> "17 %"   ·   admite ya-porcentaje con base=100
export function porcentaje(parte, total) {
  if (!total) return '0 %'
  return `${Math.round((parte / total) * 100)} %`
}

export function capitalizar(s) {
  if (!s) return ''
  const t = String(s).toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function aFecha(valor) {
  if (!valor) return null
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor
  const s = String(valor).trim()
  if (!s) return null
  // YYYY-MM-DD  ->  fecha UTC exacta (sin corrimiento por zona horaria)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}
