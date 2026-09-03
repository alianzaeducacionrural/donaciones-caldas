// ─────────────────────────────────────────────────────────────
// Lecturas
// ─────────────────────────────────────────────────────────────

// Stock por artículo (entradas − salidas, ignorando anuladas).
function calcularStock() {
  const stock = {}
  filasActivas(HOJAS.ENTRADAS).forEach((e) => {
    stock[e.articulo_id] = (stock[e.articulo_id] || 0) + Number(e.cantidad || 0)
  })
  filasActivas(HOJAS.SALIDAS).forEach((s) => {
    stock[s.articulo_id] = (stock[s.articulo_id] || 0) - Number(s.cantidad || 0)
  })
  return stock
}

function stockDisponible(articuloId, excluirSalidaId) {
  let n = 0
  filasActivas(HOJAS.ENTRADAS).forEach((e) => {
    if (e.articulo_id === articuloId) n += Number(e.cantidad || 0)
  })
  filasActivas(HOJAS.SALIDAS).forEach((s) => {
    if (s.articulo_id === articuloId && s.id !== excluirSalidaId) n -= Number(s.cantidad || 0)
  })
  return n
}

function configPublica() {
  return {
    titulo: valorConfig('titulo_campana', 'Comité de Cafeteros de Caldas'),
    categorias: listaConfig('categorias', ['HOGAR', 'ROPA', 'ALIMENTOS']),
    unidades: listaConfig('unidades', ['UNIDAD']),
    fechaInicio: valorConfig('fecha_inicio_campana', ''),
  }
}

// Catálogo enriquecido con stock (sin datos personales).
function articulosPublicos() {
  const stock = calcularStock()
  const ent = {}
  const sal = {}
  filasActivas(HOJAS.ENTRADAS).forEach((e) => { ent[e.articulo_id] = (ent[e.articulo_id] || 0) + Number(e.cantidad || 0) })
  filasActivas(HOJAS.SALIDAS).forEach((s) => { sal[s.articulo_id] = (sal[s.articulo_id] || 0) + Number(s.cantidad || 0) })

  return filasActivas(HOJAS.ARTICULOS).map((a) => ({
    id: a.id,
    descripcion: a.descripcion,
    categoria: a.categoria || 'OTROS',
    unidad: a.unidad || 'UNIDAD',
    stock_minimo: Number(a.stock_minimo || 0),
    entradas: ent[a.id] || 0,
    salidas: sal[a.id] || 0,
    stock: stock[a.id] || 0,
  }))
}

// Entradas sin datos personales del donante (solo el nombre, que es público
// por transparencia, igual que se muestran las instituciones en otras plataformas).
function entradasPublicas() {
  return filasActivas(HOJAS.ENTRADAS).map((e) => ({
    id: e.id,
    fecha: fechaCorta(e.fecha),
    recibo: e.recibo,
    articulo_id: e.articulo_id,
    donante_nombre: e.donante_nombre,
    cantidad: Number(e.cantidad || 0),
    pendiente: esSi(e.pendiente) ? 'SI' : '',
  }))
}

// Salidas: municipio y artículo no son datos personales. Se omite el
// nombre del beneficiario individual.
function salidasPublicas() {
  return filasActivas(HOJAS.SALIDAS).map((s) => ({
    id: s.id,
    fecha: fechaCorta(s.fecha),
    acta: s.acta,
    articulo_id: s.articulo_id,
    municipio: s.municipio,
    cantidad: Number(s.cantidad || 0),
    responsable: s.responsable || '',
  }))
}

function resumenGeneral() {
  const arts = articulosPublicos()
  const entradas = filasActivas(HOJAS.ENTRADAS)
  const salidas = filasActivas(HOJAS.SALIDAS)

  const recibido = entradas.reduce((n, e) => n + Number(e.cantidad || 0), 0)
  const entregado = salidas.reduce((n, s) => n + Number(s.cantidad || 0), 0)

  const donantes = {}
  entradas.forEach((e) => { if (e.donante_nombre) donantes[e.donante_nombre] = true })

  const municipios = {}
  salidas.forEach((s) => { if (s.municipio) municipios[s.municipio] = true })

  const actas = {}
  salidas.forEach((s) => { if (s.acta) actas[s.acta] = true })

  const agotados = arts.filter((a) => a.stock <= 0).length
  const bajos = arts.filter((a) => a.stock > 0 && a.stock <= Math.max(a.stock_minimo, 3)).length
  const pendientes = entradas.filter((e) => esSi(e.pendiente)).length

  return {
    recibido: recibido,
    entregado: entregado,
    disponible: recibido - entregado,
    articulos: arts.length,
    agotados: agotados,
    bajos: bajos,
    donantes: Object.keys(donantes).length,
    municipiosAtendidos: Object.keys(municipios).length,
    municipiosCaldas: 27,
    actas: Object.keys(actas).length,
    pendientes: pendientes,
  }
}

function getPublico() {
  const cache = CacheService.getScriptCache()
  const guardado = cache.get('publico_v1')
  if (guardado) return JSON.parse(guardado)

  const salida = {
    ok: true,
    generado: ahoraISO(),
    config: configPublica(),
    resumen: resumenGeneral(),
    articulos: articulosPublicos(),
    entradas: entradasPublicas(),
    salidas: salidasPublicas(),
  }

  const json = JSON.stringify(salida)
  if (json.length < 90000) cache.put('publico_v1', json, 60)
  return salida
}

// Snapshot completo del panel (requiere clave — validada en doGet/doPost).
function getDatos() {
  return {
    ok: true,
    generado: ahoraISO(),
    config: {
      titulo: valorConfig('titulo_campana', ''),
      categorias: listaConfig('categorias', ['HOGAR', 'ROPA', 'ALIMENTOS']),
      unidades: listaConfig('unidades', ['UNIDAD']),
      operadores: listaConfig('operadores', []),
      fechaInicio: valorConfig('fecha_inicio_campana', ''),
    },
    resumen: resumenGeneral(),
    articulos: leerHoja(HOJAS.ARTICULOS).map(limpiarFila),
    entradas: leerHoja(HOJAS.ENTRADAS).map(limpiarFila),
    salidas: leerHoja(HOJAS.SALIDAS).map(limpiarFila),
    terceros: leerHoja(HOJAS.TERCEROS).map(limpiarFila),
    auditoria: leerHoja(HOJAS.AUDITORIA).map(limpiarFila).slice(-200).reverse(),
  }
}

function limpiarFila(f) {
  const o = {}
  Object.keys(f).forEach((k) => { if (k !== '_fila') o[k] = f[k] })
  o._fila = f._fila
  return o
}
