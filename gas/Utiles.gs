// ─────────────────────────────────────────────────────────────
// Utilidades compartidas
// ─────────────────────────────────────────────────────────────

const HOJAS = {
  ARTICULOS: 'articulos',
  ENTRADAS: 'entradas',
  SALIDAS: 'salidas',
  TERCEROS: 'terceros',
  CONFIG: 'config',
  AUDITORIA: 'auditoria',
}

const ENCABEZADOS = {
  articulos: ['id', 'descripcion', 'categoria', 'unidad', 'stock_minimo', 'activo', 'creado', 'actualizado'],
  entradas: ['id', 'fecha', 'recibo', 'articulo_id', 'donante_id', 'donante_nombre', 'cantidad',
    'observaciones', 'pendiente', 'operador', 'creado', 'actualizado', 'anulado'],
  salidas: ['id', 'fecha', 'acta', 'articulo_id', 'municipio', 'beneficiario_id', 'beneficiario_nombre',
    'cantidad', 'responsable', 'observaciones', 'operador', 'creado', 'actualizado', 'anulado'],
  terceros: ['id', 'tipo', 'nombre', 'documento', 'telefono', 'correo', 'direccion', 'municipio',
    'notas', 'activo', 'creado', 'actualizado'],
  config: ['clave', 'valor', 'descripcion'],
  auditoria: ['timestamp', 'operador', 'accion', 'entidad', 'entidad_id', 'detalle'],
}

// ID del libro de cálculo (pestaña Donaciones en Drive). Se usa openById en
// vez de getActiveSpreadsheet para que funcione también vía API (clasp run)
// y sea inmune a movimientos del archivo en Drive.
const LIBRO_ID = '1KW4MFlhusrZPhKnWF8LZYgZtDGcpZuQxoAqnuFvEUXc'

function ss() {
  return SpreadsheetApp.openById(LIBRO_ID)
}

function hoja(nombre) {
  const s = ss().getSheetByName(nombre)
  if (!s) throw new Error('Falta la pestaña: ' + nombre)
  return s
}

// Devuelve todas las filas de una pestaña como objetos { encabezado: valor }.
function leerHoja(nombre) {
  const s = hoja(nombre)
  const ultimaFila = s.getLastRow()
  if (ultimaFila < 2) return []
  const ultimaCol = s.getLastColumn()
  const valores = s.getRange(1, 1, ultimaFila, ultimaCol).getValues()
  const cols = valores[0].map((c) => String(c).trim())
  return valores.slice(1).map((fila, i) => {
    const obj = { _fila: i + 2 }
    cols.forEach((col, j) => { obj[col] = normalizarCelda(fila[j]) })
    return obj
  })
}

// Solo filas no anuladas / activas.
function filasActivas(nombre) {
  return leerHoja(nombre).filter((f) => {
    if ('anulado' in f) return !esSi(f.anulado)
    if ('activo' in f) return String(f.activo || 'SI').toUpperCase() !== 'NO'
    return true
  })
}

function normalizarCelda(v) {
  if (v instanceof Date) {
    // Fechas → ISO corto (YYYY-MM-DD); marcas de tiempo → ISO completo.
    const h = v.getHours() + v.getMinutes() + v.getSeconds()
    return h === 0 ? Utilities.formatDate(v, 'America/Bogota', 'yyyy-MM-dd')
      : v.toISOString()
  }
  return v === null || v === undefined ? '' : v
}

function esSi(v) {
  const s = String(v || '').trim().toUpperCase()
  return s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === 'X'
}

function ahoraISO() {
  return new Date().toISOString()
}

function fechaCorta(v) {
  if (!v) return ''
  const s = String(v)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : s
}

// Escribe una fila nueva respetando el orden de ENCABEZADOS[nombre].
function anexarFila(nombre, obj) {
  const s = hoja(nombre)
  const fila = ENCABEZADOS[nombre].map((c) => (obj[c] !== undefined ? obj[c] : ''))
  s.appendRow(fila)
  return s.getLastRow()
}

// Actualiza campos de una fila existente (por número de fila).
function actualizarFila(nombre, numFila, cambios) {
  const s = hoja(nombre)
  const cols = ENCABEZADOS[nombre]
  const rango = s.getRange(numFila, 1, 1, cols.length)
  const actual = rango.getValues()[0]
  cols.forEach((c, i) => {
    if (c in cambios) actual[i] = cambios[c]
  })
  rango.setValues([actual])
}

// Genera un id consecutivo tipo PREFIJO-0001 mirando la columna 'id'.
function siguienteId(nombre, prefijo, extra) {
  const filas = leerHoja(nombre)
  let max = 0
  filas.forEach((f) => {
    const m = String(f.id || '').match(new RegExp('^' + prefijo + '(\\d+)$'))
    if (m) max = Math.max(max, parseInt(m[1], 10))
  })
  const n = max + 1 + (extra || 0)
  return prefijo + String(n).padStart(4, '0')
}

// Consecutivo para folios visibles (acta ENT-, recibo REC-).
function siguienteFolio(nombre, campo, prefijo) {
  const filas = leerHoja(nombre)
  let max = 0
  filas.forEach((f) => {
    const m = String(f[campo] || '').match(new RegExp('^' + prefijo + '(\\d+)'))
    if (m) max = Math.max(max, parseInt(m[1], 10))
  })
  return prefijo + String(max + 1).padStart(3, '0')
}

function valorConfig(clave, porDefecto) {
  const filas = leerHoja(HOJAS.CONFIG)
  const f = filas.find((x) => String(x.clave).trim() === clave)
  return f ? String(f.valor) : (porDefecto || '')
}

function listaConfig(clave, porDefecto) {
  const v = valorConfig(clave, '')
  if (!v) return porDefecto || []
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

function normalizarMunicipio(nombre) {
  const limpio = String(nombre || '').trim()
  if (!limpio) return ''
  const canon = MUNICIPIOS_CALDAS.find(
    (m) => quitarTildes(m).toLowerCase() === quitarTildes(limpio).toLowerCase(),
  )
  return canon || limpio
}

function quitarTildes(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const MUNICIPIOS_CALDAS = [
  'Aguadas', 'Anserma', 'Aranzazu', 'Belalcázar', 'Chinchiná',
  'Filadelfia', 'La Dorada', 'La Merced', 'Manizales', 'Manzanares',
  'Marmato', 'Marquetalia', 'Marulanda', 'Neira', 'Norcasia',
  'Pácora', 'Palestina', 'Pensilvania', 'Riosucio', 'Risaralda',
  'Salamina', 'Samaná', 'San José', 'Supía', 'Victoria',
  'Villamaría', 'Viterbo',
]
