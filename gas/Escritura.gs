// ─────────────────────────────────────────────────────────────
// Escrituras — todas se ejecutan dentro del LockService (ver doPost)
// ─────────────────────────────────────────────────────────────

function buscarFila(nombre, id) {
  const filas = leerHoja(nombre)
  return filas.find((f) => String(f.id) === String(id)) || null
}

// Rechaza si otro operador modificó la fila desde que este la cargó.
function verificarVersion(fila, actualizadoCliente) {
  if (!actualizadoCliente) return
  if (String(fila.actualizado || '') !== String(actualizadoCliente)) {
    const e = new Error('Otro usuario modificó este registro. Actualiza y vuelve a intentarlo.')
    e.codigo = 'DESACTUALIZADO'
    throw e
  }
}

function exigir(cond, mensaje) {
  if (!cond) {
    const e = new Error(mensaje)
    e.codigo = 'VALIDACION'
    throw e
  }
}

// ── Entradas ──────────────────────────────────────────────────

function crearEntrada(d, operador) {
  exigir(d.articulo_id, 'Falta el artículo.')
  exigir(Number(d.cantidad) > 0, 'La cantidad debe ser mayor que cero.')

  const fecha = fechaCorta(d.fecha)
  const recibo = String(d.recibo || '').trim()
  const pendiente = (!fecha || !recibo) ? 'SI' : ''
  const id = siguienteId(HOJAS.ENTRADAS, 'ENTR-')
  const ahora = ahoraISO()

  anexarFila(HOJAS.ENTRADAS, {
    id: id, fecha: fecha, recibo: recibo,
    articulo_id: d.articulo_id, donante_id: d.donante_id || '',
    donante_nombre: d.donante_nombre || '', cantidad: Number(d.cantidad),
    observaciones: d.observaciones || '', pendiente: pendiente,
    operador: operador, creado: ahora, actualizado: ahora, anulado: '',
  })

  return { ok: true, id: id, entidad: 'entrada', stock: stockDisponible(d.articulo_id), detalle: { cantidad: Number(d.cantidad), articulo: d.articulo_id } }
}

function editarEntrada(d, operador) {
  const fila = buscarFila(HOJAS.ENTRADAS, d.id)
  exigir(fila, 'Entrada no encontrada.')
  verificarVersion(fila, d.actualizado)

  const fecha = fechaCorta(d.fecha)
  const recibo = String(d.recibo || '').trim()
  actualizarFila(HOJAS.ENTRADAS, fila._fila, {
    fecha: fecha, recibo: recibo,
    articulo_id: d.articulo_id || fila.articulo_id,
    donante_id: d.donante_id || '', donante_nombre: d.donante_nombre || '',
    cantidad: Number(d.cantidad),
    observaciones: d.observaciones || '',
    pendiente: (!fecha || !recibo) ? 'SI' : '',
    actualizado: ahoraISO(),
  })
  return { ok: true, id: d.id, entidad: 'entrada', detalle: { cantidad: Number(d.cantidad) } }
}

// ── Salidas ───────────────────────────────────────────────────

function crearSalida(d, operador) {
  const lineas = (d.lineas || []).filter((l) => l.articulo_id && Number(l.cantidad) > 0)
  exigir(lineas.length, 'La entrega no tiene artículos.')
  exigir(d.responsable, 'Falta el responsable de la entrega.')
  const municipioDefecto = normalizarMunicipio(d.municipioDefecto)
  exigir(municipioDefecto, 'Falta el municipio de destino.')

  // Validar el acta COMPLETA antes de escribir una sola fila.
  const stock = calcularStock()
  const pedido = {}
  lineas.forEach((l) => { pedido[l.articulo_id] = (pedido[l.articulo_id] || 0) + Number(l.cantidad) })
  const faltan = Object.keys(pedido).filter((id) => (stock[id] || 0) < pedido[id])
  if (faltan.length) {
    const detalle = faltan.map((id) => id + ' (disponible ' + (stock[id] || 0) + ', solicitado ' + pedido[id] + ')').join('; ')
    const e = new Error('Stock insuficiente en ' + detalle)
    e.codigo = 'STOCK_INSUFICIENTE'
    throw e
  }

  const s = hoja(HOJAS.SALIDAS)
  const acta = String(d.acta || '').trim() || siguienteFolio(HOJAS.SALIDAS, 'acta', 'ENT-')
  const fecha = fechaCorta(d.fecha) || Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd')
  const ahora = ahoraISO()

  const filas = lineas.map((l, i) => ({
    id: siguienteId(HOJAS.SALIDAS, 'SAL-', i),
    fecha: fecha, acta: acta, articulo_id: l.articulo_id,
    municipio: normalizarMunicipio(l.municipio) || municipioDefecto,
    beneficiario_id: d.beneficiario_id || '', beneficiario_nombre: d.beneficiario_nombre || '',
    cantidad: Number(l.cantidad), responsable: d.responsable || '',
    observaciones: l.observaciones || '', operador: operador,
    creado: ahora, actualizado: ahora, anulado: '',
  }))

  const matriz = filas.map((f) => ENCABEZADOS.salidas.map((c) => (f[c] !== undefined ? f[c] : '')))
  s.getRange(s.getLastRow() + 1, 1, matriz.length, matriz[0].length).setValues(matriz)

  return {
    ok: true, id: acta, entidad: 'salida', acta: acta,
    ids: filas.map((f) => f.id),
    detalle: pedido,
  }
}

function editarSalida(d, operador) {
  const fila = buscarFila(HOJAS.SALIDAS, d.id)
  exigir(fila, 'Salida no encontrada.')
  verificarVersion(fila, d.actualizado)

  const nuevaCantidad = Number(d.cantidad)
  exigir(nuevaCantidad > 0, 'La cantidad debe ser mayor que cero.')

  // Disponible sin contar esta misma línea.
  const disp = stockDisponible(fila.articulo_id, fila.id)
  if (nuevaCantidad > disp) {
    const e = new Error('Solo hay ' + disp + ' unidades disponibles de ' + fila.articulo_id + '.')
    e.codigo = 'STOCK_INSUFICIENTE'
    throw e
  }

  actualizarFila(HOJAS.SALIDAS, fila._fila, {
    fecha: fechaCorta(d.fecha) || fila.fecha,
    municipio: normalizarMunicipio(d.municipio) || fila.municipio,
    cantidad: nuevaCantidad,
    responsable: d.responsable || fila.responsable,
    actualizado: ahoraISO(),
  })
  return { ok: true, id: d.id, entidad: 'salida', detalle: { cantidad: nuevaCantidad } }
}

function anularActa(d, operador) {
  const acta = String(d.acta || '').trim()
  exigir(acta, 'Falta el número de acta.')
  const filas = leerHoja(HOJAS.SALIDAS).filter((f) => String(f.acta) === acta && !esSi(f.anulado))
  exigir(filas.length, 'No hay líneas activas para el acta ' + acta + '.')
  const ahora = ahoraISO()
  filas.forEach((f) => actualizarFila(HOJAS.SALIDAS, f._fila, { anulado: 'SI', actualizado: ahora }))
  return { ok: true, id: acta, entidad: 'acta', anuladas: filas.length, detalle: { acta: acta, lineas: filas.length } }
}

// ── Artículos ─────────────────────────────────────────────────

function crearArticulo(d, operador) {
  exigir(d.descripcion, 'Falta la descripción.')
  exigir(d.categoria, 'Falta la categoría.')
  const id = siguienteId(HOJAS.ARTICULOS, 'ART-')
  const ahora = ahoraISO()
  anexarFila(HOJAS.ARTICULOS, {
    id: id, descripcion: String(d.descripcion).trim().toUpperCase(),
    categoria: String(d.categoria).trim().toUpperCase(),
    unidad: String(d.unidad || 'UNIDAD').trim().toUpperCase(),
    stock_minimo: Number(d.stock_minimo || 0), activo: 'SI',
    creado: ahora, actualizado: ahora,
  })
  return { ok: true, id: id, entidad: 'articulo', detalle: { descripcion: d.descripcion } }
}

function editarArticulo(d, operador) {
  const fila = buscarFila(HOJAS.ARTICULOS, d.id)
  exigir(fila, 'Artículo no encontrado.')
  verificarVersion(fila, d.actualizado)
  actualizarFila(HOJAS.ARTICULOS, fila._fila, {
    descripcion: String(d.descripcion).trim().toUpperCase(),
    categoria: String(d.categoria).trim().toUpperCase(),
    unidad: String(d.unidad || 'UNIDAD').trim().toUpperCase(),
    stock_minimo: Number(d.stock_minimo || 0),
    actualizado: ahoraISO(),
  })
  return { ok: true, id: d.id, entidad: 'articulo', detalle: {} }
}

// ── Terceros ──────────────────────────────────────────────────

function crearTercero(d, operador) {
  exigir(d.nombre, 'Falta el nombre.')
  const id = siguienteId(HOJAS.TERCEROS, 'TER-')
  const ahora = ahoraISO()
  anexarFila(HOJAS.TERCEROS, {
    id: id, tipo: String(d.tipo || 'DONANTE').toUpperCase(),
    nombre: String(d.nombre).trim(),
    documento: d.documento || '', telefono: d.telefono || '', correo: d.correo || '',
    direccion: d.direccion || '', municipio: normalizarMunicipio(d.municipio),
    notas: d.notas || '', activo: 'SI', creado: ahora, actualizado: ahora,
  })
  return { ok: true, id: id, entidad: 'tercero', detalle: { nombre: d.nombre } }
}

function editarTercero(d, operador) {
  const fila = buscarFila(HOJAS.TERCEROS, d.id)
  exigir(fila, 'Registro no encontrado.')
  verificarVersion(fila, d.actualizado)
  actualizarFila(HOJAS.TERCEROS, fila._fila, {
    tipo: String(d.tipo || fila.tipo).toUpperCase(),
    nombre: String(d.nombre).trim(),
    documento: d.documento || '', telefono: d.telefono || '', correo: d.correo || '',
    direccion: d.direccion || '', municipio: normalizarMunicipio(d.municipio),
    notas: d.notas || '', actualizado: ahoraISO(),
  })
  return { ok: true, id: d.id, entidad: 'tercero', detalle: {} }
}

// ── Genéricas ─────────────────────────────────────────────────

function anularRegistro(nombre, d, operador, etiqueta) {
  const fila = buscarFila(nombre, d.id)
  exigir(fila, 'Registro no encontrado.')
  actualizarFila(nombre, fila._fila, { anulado: 'SI', actualizado: ahoraISO() })
  return { ok: true, id: d.id, entidad: etiqueta, detalle: { motivo: d.motivo || '' } }
}

function desactivarRegistro(nombre, d, etiqueta) {
  const fila = buscarFila(nombre, d.id)
  exigir(fila, 'Registro no encontrado.')
  actualizarFila(nombre, fila._fila, { activo: 'NO', actualizado: ahoraISO() })
  return { ok: true, id: d.id, entidad: etiqueta, detalle: {} }
}

function guardarConfig(d) {
  exigir(d.clave, 'Falta la clave de configuración.')
  const s = hoja(HOJAS.CONFIG)
  const filas = leerHoja(HOJAS.CONFIG)
  const existente = filas.find((f) => String(f.clave) === String(d.clave))
  if (existente) {
    s.getRange(existente._fila, 2).setValue(d.valor)
  } else {
    s.appendRow([d.clave, d.valor, d.descripcion || ''])
  }
  return { ok: true, id: d.clave, entidad: 'config', detalle: { clave: d.clave } }
}
