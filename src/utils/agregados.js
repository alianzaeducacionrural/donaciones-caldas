// Cálculos derivados para el dashboard y el panel.
// Operan sobre los arreglos crudos { articulos, entradas, salidas } tal como
// llegan de la API, para poder recalcular al instante tras una edición sin
// esperar una recarga completa.

const activo = (f) => f && !esSi(f.anulado)

export function esSi(v) {
  return String(v || '').trim().toUpperCase() === 'SI' ||
    String(v || '').trim().toUpperCase() === 'SÍ'
}

// Mapa { articulo_id: { entradas, salidas, stock } }
export function stockPorArticulo(entradas = [], salidas = []) {
  const m = {}
  const asegurar = (id) => (m[id] || (m[id] = { entradas: 0, salidas: 0, stock: 0 }))
  entradas.filter(activo).forEach((e) => {
    asegurar(e.articulo_id).entradas += Number(e.cantidad) || 0
  })
  salidas.filter(activo).forEach((s) => {
    asegurar(s.articulo_id).salidas += Number(s.cantidad) || 0
  })
  Object.values(m).forEach((v) => { v.stock = v.entradas - v.salidas })
  return m
}

// Enriquece el catálogo con entradas/salidas/stock/estado
export function articulosConStock(articulos = [], entradas = [], salidas = []) {
  const stock = stockPorArticulo(entradas, salidas)
  return articulos
    .filter((a) => !esSi(a.inactivo) && String(a.activo || 'SI').toUpperCase() !== 'NO')
    .map((a) => {
      const s = stock[a.id] || { entradas: 0, salidas: 0, stock: 0 }
      return { ...a, ...s, estado: estadoStock(s.stock, a.stock_minimo) }
    })
}

export function estadoStock(stock, minimo) {
  const min = Number(minimo) || 0
  if (stock <= 0) return 'agotado'
  if (stock <= min || stock <= 3) return 'bajo'
  return 'ok'
}

// Totales de cabecera
export function resumen(articulos = [], entradas = [], salidas = [], terceros = []) {
  const conStock = articulosConStock(articulos, entradas, salidas)
  const recibido = entradas.filter(activo).reduce((n, e) => n + (Number(e.cantidad) || 0), 0)
  const entregado = salidas.filter(activo).reduce((n, s) => n + (Number(s.cantidad) || 0), 0)
  const donantes = new Set(
    entradas.filter(activo).map((e) => (e.donante_nombre || e.donante_id || '').trim().toUpperCase()).filter(Boolean),
  )
  const municipios = new Set(
    salidas.filter(activo).map((s) => (s.municipio || '').trim()).filter(Boolean),
  )
  const actas = new Set(
    salidas.filter(activo).map((s) => (s.acta || '').trim()).filter(Boolean),
  )
  return {
    recibido,
    entregado,
    disponible: recibido - entregado,
    tasaEntrega: recibido ? entregado / recibido : 0,
    articulos: conStock.length,
    agotados: conStock.filter((a) => a.estado === 'agotado').length,
    bajos: conStock.filter((a) => a.estado === 'bajo').length,
    donantes: donantes.size,
    beneficiarios: terceros.filter((t) => /BENEFICIARIO/i.test(t.tipo || '')).length,
    municipiosAtendidos: municipios.size,
    actas: actas.size,
    pendientes: entradas.filter((e) => activo(e) && esSi(e.pendiente)).length,
  }
}

export function porCategoria(articulos = [], entradas = [], salidas = []) {
  const cat = {}
  const conStock = articulosConStock(articulos, entradas, salidas)
  conStock.forEach((a) => {
    const c = a.categoria || 'OTROS'
    if (!cat[c]) cat[c] = { categoria: c, recibido: 0, entregado: 0, disponible: 0, articulos: 0 }
    cat[c].recibido += a.entradas
    cat[c].entregado += a.salidas
    cat[c].disponible += Math.max(a.stock, 0)
    cat[c].articulos += 1
  })
  return Object.values(cat).sort((a, b) => b.recibido - a.recibido)
}

export function porMunicipio(salidas = [], articulos = []) {
  const catDe = Object.fromEntries(articulos.map((a) => [a.id, a.categoria]))
  const m = {}
  salidas.filter(activo).forEach((s) => {
    const mun = (s.municipio || '').trim()
    if (!mun) return
    if (!m[mun]) m[mun] = { municipio: mun, unidades: 0, actas: new Set(), articulos: new Set(), categorias: {} }
    const q = Number(s.cantidad) || 0
    m[mun].unidades += q
    if (s.acta) m[mun].actas.add(s.acta)
    if (s.articulo_id) m[mun].articulos.add(s.articulo_id)
    const c = catDe[s.articulo_id] || 'OTROS'
    m[mun].categorias[c] = (m[mun].categorias[c] || 0) + q
  })
  return Object.values(m)
    .map((x) => ({
      municipio: x.municipio,
      unidades: x.unidades,
      actas: x.actas.size,
      articulos: x.articulos.size,
      categorias: x.categorias,
    }))
    .sort((a, b) => b.unidades - a.unidades)
}

// Mapa simple { municipio: unidades } para el coroplético
export function unidadesPorMunicipio(salidas = []) {
  const m = {}
  salidas.filter(activo).forEach((s) => {
    const mun = (s.municipio || '').trim()
    if (!mun) return
    m[mun] = (m[mun] || 0) + (Number(s.cantidad) || 0)
  })
  return m
}

// Serie diaria acumulada. Excluye registros sin fecha (se informan aparte).
export function serieDiaria(entradas = [], salidas = []) {
  const dias = {}
  const sumar = (lista, campo) => {
    lista.filter(activo).forEach((r) => {
      const f = String(r.fecha || '').slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return
      if (!dias[f]) dias[f] = { fecha: f, entradas: 0, salidas: 0 }
      dias[f][campo] += Number(r.cantidad) || 0
    })
  }
  sumar(entradas, 'entradas')
  sumar(salidas, 'salidas')
  const orden = Object.values(dias).sort((a, b) => a.fecha.localeCompare(b.fecha))
  let acc = 0
  orden.forEach((d) => { acc += d.entradas - d.salidas; d.acumulado = acc })
  return orden
}

export function porDonante(entradas = [], articulos = []) {
  const catDe = Object.fromEntries(articulos.map((a) => [a.id, a.categoria]))
  const d = {}
  entradas.filter(activo).forEach((e) => {
    const nombre = (e.donante_nombre || '').trim() || '(sin nombre)'
    if (!d[nombre]) d[nombre] = { nombre, unidades: 0, registros: 0, categorias: new Set(), articulos: new Set(), pendientes: 0 }
    d[nombre].unidades += Number(e.cantidad) || 0
    d[nombre].registros += 1
    if (esSi(e.pendiente)) d[nombre].pendientes += 1
    d[nombre].categorias.add(catDe[e.articulo_id] || 'OTROS')
    if (e.articulo_id) d[nombre].articulos.add(e.articulo_id)
  })
  return Object.values(d)
    .map((x) => ({
      ...x,
      categorias: [...x.categorias],
      articulos: x.articulos.size,
    }))
    .sort((a, b) => b.unidades - a.unidades)
}

// Top N artículos por stock disponible
export function topDisponibles(articulos = [], entradas = [], salidas = [], n = 10) {
  return articulosConStock(articulos, entradas, salidas)
    .filter((a) => a.stock > 0)
    .sort((a, b) => b.stock - a.stock)
    .slice(0, n)
}

// Siguiente número de recibo consecutivo (REC-001, REC-002…) mirando los ya
// usados. Ignora recibos que no siguen el patrón (p. ej. los históricos S/N).
export function siguienteRecibo(entradas = [], prefijo = 'REC-') {
  const re = new RegExp('^' + prefijo + '(\\d+)$')
  let max = 0
  entradas.forEach((e) => {
    const m = re.exec(String(e.recibo || '').trim())
    if (m) max = Math.max(max, parseInt(m[1], 10))
  })
  return prefijo + String(max + 1).padStart(3, '0')
}

// Comprobación de cuadre: Σ entradas − Σ salidas === Σ stock
export function inventarioCuadra(articulos = [], entradas = [], salidas = []) {
  const conStock = articulosConStock(articulos, entradas, salidas)
  const sumaStock = conStock.reduce((n, a) => n + a.stock, 0)
  const rec = entradas.filter(activo).reduce((n, e) => n + (Number(e.cantidad) || 0), 0)
  const ent = salidas.filter(activo).reduce((n, s) => n + (Number(s.cantidad) || 0), 0)
  return { cuadra: sumaStock === rec - ent, diferencia: sumaStock - (rec - ent) }
}
