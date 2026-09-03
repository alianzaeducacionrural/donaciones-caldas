// ─────────────────────────────────────────────────────────────
// Preparación inicial. Ejecutar UNA VEZ desde el editor de Apps Script:
//   1) inicializarHojas()
//   2) sembrarDatosIniciales()
//   3) verificarSemilla()   ->  debe dar 193 / 33 / 160
//   4) configurarClave('LA-CLAVE-QUE-QUIERAS')
// ─────────────────────────────────────────────────────────────

function inicializarHojas() {
  const libro = ss()
  Object.keys(ENCABEZADOS).forEach((nombre) => {
    let s = libro.getSheetByName(nombre)
    if (!s) s = libro.insertSheet(nombre)
    s.clear()
    s.getRange(1, 1, 1, ENCABEZADOS[nombre].length).setValues([ENCABEZADOS[nombre]])
    s.setFrozenRows(1)
  })
  // Quitar la hoja por defecto si quedó vacía.
  const h1 = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1') || libro.getSheetByName('Hoja1')
  if (h1 && libro.getSheets().length > 1) libro.deleteSheet(h1)

  sembrarConfig()
  Logger.log('Hojas inicializadas: ' + Object.keys(ENCABEZADOS).join(', '))
}

function sembrarConfig() {
  const s = hoja(HOJAS.CONFIG)
  const filas = [
    ['clave_panel', 'donaciones2026', 'Clave de acceso al panel — CÁMBIALA con configurarClave()'],
    ['operadores', 'Operador 1, Operador 2', 'Nombres que aparecen al ingresar al panel'],
    ['categorias', 'HOGAR, ROPA, ALIMENTOS', 'Lista maestra de categorías de artículos'],
    ['unidades', 'UNIDAD, PACA, PAQUETE, ROLLO, BOTELLÓN', 'Unidades de medida'],
    ['titulo_campana', 'Comité de Cafeteros de Caldas', 'Subtítulo bajo el título del panorama público'],
    ['fecha_inicio_campana', '2026-09-01', 'Primera fecha de la campaña'],
    ['dominio', 'https://alianzaeducacionrural.github.io/donaciones-caldas', 'URL pública del sitio'],
  ]
  // Solo agrega las que falten.
  const existentes = leerHoja(HOJAS.CONFIG).map((f) => String(f.clave))
  filas.forEach((f) => { if (existentes.indexOf(f[0]) === -1) s.appendRow(f) })
}

function configurarClave(nueva) {
  if (!nueva) { Logger.log('Pasa la clave: configurarClave("mi-clave")'); return }
  guardarConfig({ clave: 'clave_panel', valor: String(nueva) })
  invalidarCache()
  Logger.log('Clave del panel actualizada.')
}

// ─────────────────────────────────────────────────────────────
// Datos migrados del archivo Gestion_Donaciones_Inventario.xlsx
// (fieles al original: no se inventan fechas ni recibos)
// ─────────────────────────────────────────────────────────────

const SEMILLA_ARTICULOS = [
  ['ART-001', 'COBIJAS', 'HOGAR', 'UNIDAD'],
  ['ART-002', 'MANTAS', 'HOGAR', 'UNIDAD'],
  ['ART-003', 'ALMOHADAS/COJINES', 'HOGAR', 'UNIDAD'],
  ['ART-004', 'SLEEPING', 'HOGAR', 'UNIDAD'],
  ['ART-005', 'CARPA', 'HOGAR', 'UNIDAD'],
  ['ART-006', 'COLCHONES/COLCHONETAS', 'HOGAR', 'UNIDAD'],
  ['ART-007', 'TOALLAS', 'HOGAR', 'UNIDAD'],
  ['ART-008', 'PANTALONES MUJER', 'HOGAR', 'UNIDAD'],
  ['ART-009', 'BLUSAS MUJER', 'ROPA', 'UNIDAD'],
  ['ART-010', 'ROPA DEPORTIVA MUJER', 'ROPA', 'UNIDAD'],
  ['ART-011', 'VESTIDOS MUJER', 'ROPA', 'UNIDAD'],
  ['ART-012', 'PIJAMA MUJER', 'ROPA', 'UNIDAD'],
  ['ART-013', 'CAMISA HOMBRE', 'ROPA', 'UNIDAD'],
  ['ART-014', 'GORRAS', 'ROPA', 'UNIDAD'],
  ['ART-015', 'PONCHOS', 'ROPA', 'UNIDAD'],
  ['ART-016', 'ROLLOS PAPEL HIGIENICO', 'ROPA', 'ROLLO'],
  ['ART-017', 'PAQUETES TOALLA HIGIENICAS', 'ROPA', 'PAQUETE'],
  ['ART-018', 'CREMA DENTAL', 'ROPA', 'UNIDAD'],
  ['ART-019', 'CEPILLOS DE DIENTES', 'ROPA', 'UNIDAD'],
  ['ART-020', 'MAQUINAS DE AFEITAR', 'ROPA', 'UNIDAD'],
  ['ART-021', 'JABÓN DE BAÑO', 'ROPA', 'UNIDAD'],
  ['ART-022', 'AGUA POR PACA', 'ALIMENTOS', 'PACA'],
  ['ART-023', 'AGUA POR UNIDAD', 'ALIMENTOS', 'UNIDAD'],
  ['ART-024', 'AGUA BOTELLON', 'ALIMENTOS', 'BOTELLÓN'],
  ['ART-025', 'GUANTES', 'ALIMENTOS', 'UNIDAD'],
  ['ART-026', 'PILAS POR PAQUETE', 'ALIMENTOS', 'PAQUETE'],
  ['ART-027', 'LINTERNAS', 'ALIMENTOS', 'UNIDAD'],
  ['ART-028', 'GAFAS DE SEGURIDAD', 'ALIMENTOS', 'UNIDAD'],
]

// Nota: los datos de contacto del beneficiario (documento, teléfono, dirección)
// NO se incluyen aquí — este archivo va en un repositorio público. Se cargan
// desde el panel (/panel/terceros), quedando solo en el Sheet.
const SEMILLA_TERCEROS = [
  ['TER-001', 'DONANTE', 'MARCELA BOTERO/MIGUEL TRUJILLO', '', '', '', '', '', ''],
  ['TER-002', 'DONANTE', 'CAROLINA BERNAL', '', '', '', '', '', ''],
  ['TER-003', 'DONANTE', 'MANUELA MEJÍA/SERGIO FRANCO', '', '', '', '', '', ''],
  ['TER-004', 'BENEFICIARIO', 'GERARDO ANTONIO ALZATE', '', '', '', '', '', 'Completar datos de contacto desde el panel'],
]

// [fecha, recibo, articulo_id, donante_id, cantidad]  ('' = dato faltante en el original)
const SEMILLA_ENTRADAS = [
  ['2026-09-01', 'REC-001', 'ART-001', 'TER-001', 11],
  ['2026-09-02', 'REC-002', 'ART-002', 'TER-001', 7],
  ['2026-09-03', 'REC-003', 'ART-003', 'TER-001', 11],
  ['2026-09-05', 'REC-004', 'ART-004', 'TER-001', 2],
  ['2026-09-06', 'REC-005', 'ART-005', 'TER-001', 1],
  ['2026-09-08', 'REC-006', 'ART-006', 'TER-001', 1],
  ['2026-09-10', 'REC-007', 'ART-007', 'TER-001', 1],
  ['', '', 'ART-008', 'TER-002', 9],
  ['', '', 'ART-009', 'TER-002', 40],
  ['', '', 'ART-010', 'TER-002', 6],
  ['', '', 'ART-011', 'TER-002', 1],
  ['', '', 'ART-012', 'TER-002', 2],
  ['', '', 'ART-013', 'TER-002', 5],
  ['', '', 'ART-014', 'TER-002', 9],
  ['', '', 'ART-015', 'TER-002', 5],
  ['', '', 'ART-016', 'TER-002', 18],
  ['', '', 'ART-017', 'TER-002', 8],
  ['', '', 'ART-018', 'TER-002', 2],
  ['', '', 'ART-019', 'TER-002', 2],
  ['', '', 'ART-020', 'TER-002', 4],
  ['', '', 'ART-021', 'TER-002', 8],
  ['', '', 'ART-022', 'TER-002', 6],
  ['', '', 'ART-023', 'TER-002', 4],
  ['', '', 'ART-024', 'TER-002', 14],
  ['', '', 'ART-025', 'TER-002', 5],
  ['', '', 'ART-026', 'TER-002', 4],
  ['', '', 'ART-027', 'TER-002', 2],
  ['', '', 'ART-028', 'TER-002', 5],
]

// [fecha, acta, articulo_id, municipio, cantidad]
const SEMILLA_SALIDAS = [
  ['2026-09-03', 'ENT-001', 'ART-001', 'Chinchiná', 2],
  ['2026-09-04', 'ENT-002', 'ART-001', 'Anserma', 6],
  ['2026-09-06', 'ENT-003', 'ART-001', 'Riosucio', 3],
  ['2026-09-07', 'ENT-004', 'ART-002', 'Chinchiná', 2],
  ['2026-09-09', 'ENT-005', 'ART-002', 'Anserma', 5],
  ['2026-09-11', 'ENT-006', 'ART-003', 'Chinchiná', 2],
  ['2026-09-11', 'ENT-006', 'ART-003', 'Anserma', 9],
  ['2026-09-11', 'ENT-006', 'ART-004', 'Riosucio', 1],
  ['2026-09-11', 'ENT-006', 'ART-005', 'Chinchiná', 1],
  ['2026-09-11', 'ENT-006', 'ART-006', 'Anserma', 1],
  ['2026-09-11', 'ENT-006', 'ART-007', 'Chinchiná', 1],
]

function sembrarDatosIniciales() {
  const FORZAR = false
  if (leerHoja(HOJAS.ARTICULOS).length > 0 && !FORZAR) {
    Logger.log('Ya hay artículos. Pon FORZAR = true si de verdad quieres re-sembrar.')
    return
  }

  const ahora = ahoraISO()

  // Artículos
  const hArt = hoja(HOJAS.ARTICULOS)
  const filArt = SEMILLA_ARTICULOS.map((a) => [a[0], a[1], a[2], a[3], 3, 'SI', ahora, ahora])
  hArt.getRange(2, 1, filArt.length, ENCABEZADOS.articulos.length).setValues(filArt)

  // Terceros
  const hTer = hoja(HOJAS.TERCEROS)
  const filTer = SEMILLA_TERCEROS.map((t) => [
    t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], 'SI', ahora, ahora,
  ])
  hTer.getRange(2, 1, filTer.length, ENCABEZADOS.terceros.length).setValues(filTer)

  // Entradas
  const nombrePorId = {}
  SEMILLA_TERCEROS.forEach((t) => { nombrePorId[t[0]] = t[2] })
  const hEnt = hoja(HOJAS.ENTRADAS)
  const filEnt = SEMILLA_ENTRADAS.map((e, i) => {
    const pendiente = (!e[0] || !e[1]) ? 'SI' : ''
    return [
      'ENTR-' + String(i + 1).padStart(4, '0'),
      e[0], e[1], e[2], e[3], nombrePorId[e[3]] || '', e[4],
      '', pendiente, 'semilla', ahora, ahora, '',
    ]
  })
  hEnt.getRange(2, 1, filEnt.length, ENCABEZADOS.entradas.length).setValues(filEnt)

  // Salidas
  const hSal = hoja(HOJAS.SALIDAS)
  const filSal = SEMILLA_SALIDAS.map((s, i) => [
    'SAL-' + String(i + 1).padStart(4, '0'),
    s[0], s[1], s[2], s[3], '', '', s[4], '', '', 'semilla', ahora, ahora, '',
  ])
  hSal.getRange(2, 1, filSal.length, ENCABEZADOS.salidas.length).setValues(filSal)

  invalidarCache()
  Logger.log('Sembrado: ' + filArt.length + ' artículos, ' + filEnt.length + ' entradas, '
    + filSal.length + ' salidas, ' + filTer.length + ' terceros.')
}

function verificarSemilla() {
  const r = resumenGeneral()
  const arts = articulosPublicos()
  const agotados = arts.filter((a) => a.stock <= 0)
  const detalle = arts.filter((a) => a.stock !== 0).map((a) => a.id + '=' + a.stock).join(', ')

  const msg = [
    'Recibido:   ' + r.recibido + '  (esperado 193)  ' + (r.recibido === 193 ? 'OK' : 'MAL'),
    'Entregado:  ' + r.entregado + '  (esperado 33)   ' + (r.entregado === 33 ? 'OK' : 'MAL'),
    'Disponible: ' + r.disponible + '  (esperado 160)  ' + (r.disponible === 160 ? 'OK' : 'MAL'),
    'Artículos:  ' + r.articulos + '  (esperado 28)',
    'Entradas:   ' + filasActivas(HOJAS.ENTRADAS).length + '  (esperado 28)',
    'Salidas:    ' + filasActivas(HOJAS.SALIDAS).length + '  (esperado 11)',
    'Agotados:   ' + agotados.length + '  (esperado 6): ' + agotados.map((a) => a.id).join(', '),
    'Con stock:  ' + detalle,
  ].join('\n')
  Logger.log(msg)
  return msg
}
