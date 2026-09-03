// ─────────────────────────────────────────────────────────────
// Sistema de Gestión de Donaciones — Comité de Cafeteros de Caldas
// Router HTTP  ·  doGet (lecturas)  ·  doPost (escrituras)
// ─────────────────────────────────────────────────────────────

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || ''
  const clave = (e && e.parameter && e.parameter.clave) || ''
  try {
    if (action === 'preparar') {
      // Arranque único: crea pestañas + siembra + verifica. Idempotente.
      if (clave !== 'preparar-donaciones-2026') {
        return responder({ ok: false, error: 'Secreto de preparación incorrecto' })
      }
      inicializarHojas()
      sembrarDatosIniciales()
      return responder({ ok: true, verificacion: verificarSemilla() })
    }
    if (action === 'publico') return responder(getPublico())
    if (action === 'datos') {
      const auth = validarClave(clave)
      if (!auth.ok) return responder(auth)
      return responder(getDatos())
    }
    return responder({ ok: false, error: 'Acción no reconocida', codigo: 'VALIDACION' })
  } catch (err) {
    return responder({ ok: false, error: String(err && err.message || err), codigo: 'ERROR' })
  }
}

function doPost(e) {
  let cuerpo
  try {
    cuerpo = JSON.parse(e.postData.contents)
  } catch (err) {
    return responder({ ok: false, error: 'Cuerpo no válido', codigo: 'VALIDACION' })
  }

  const accion = cuerpo.accion || ''
  const clave = cuerpo.clave || ''
  const operador = cuerpo.operador || 'desconocido'
  const datos = cuerpo.datos || {}

  if (accion === 'verificarClave') return responder(verificarClave(clave))

  const auth = validarClave(clave)
  if (!auth.ok) return responder(auth)

  const lock = LockService.getScriptLock()
  if (!lock.tryLock(20000)) {
    return responder({
      ok: false, codigo: 'OCUPADO',
      error: 'Otra persona está guardando en este momento. Intenta de nuevo en unos segundos.',
    })
  }

  try {
    const r = despachar(accion, datos, operador)
    if (r.ok) {
      registrarAuditoria(operador, accion, r.entidad, r.id, r.detalle)
      invalidarCache()
    }
    return responder(r)
  } catch (err) {
    return responder({
      ok: false,
      error: String(err && err.message || err),
      codigo: (err && err.codigo) || 'ERROR',
    })
  } finally {
    SpreadsheetApp.flush()
    lock.releaseLock()
  }
}

function responder(datos) {
  return ContentService
    .createTextOutput(JSON.stringify(datos))
    .setMimeType(ContentService.MimeType.JSON)
}

// ─────────────────────────────────────────────────────────────
// Enrutado de escrituras
// ─────────────────────────────────────────────────────────────

function despachar(accion, d, operador) {
  switch (accion) {
    case 'crearEntrada': return crearEntrada(d, operador)
    case 'editarEntrada': return editarEntrada(d, operador)
    case 'anularEntrada': return anularRegistro(HOJAS.ENTRADAS, d, operador, 'entrada')

    case 'crearSalida': return crearSalida(d, operador)
    case 'editarSalida': return editarSalida(d, operador)
    case 'anularSalida': return anularRegistro(HOJAS.SALIDAS, d, operador, 'salida')
    case 'anularActa': return anularActa(d, operador)

    case 'crearArticulo': return crearArticulo(d, operador)
    case 'editarArticulo': return editarArticulo(d, operador)
    case 'desactivarArticulo': return desactivarRegistro(HOJAS.ARTICULOS, d, 'articulo')

    case 'crearTercero': return crearTercero(d, operador)
    case 'editarTercero': return editarTercero(d, operador)
    case 'desactivarTercero': return desactivarRegistro(HOJAS.TERCEROS, d, 'tercero')

    case 'guardarConfig': return guardarConfig(d)

    default:
      return { ok: false, error: 'Acción no reconocida: ' + accion, codigo: 'VALIDACION' }
  }
}

// ─────────────────────────────────────────────────────────────
// Autenticación ligera (freno, no cerradura — la URL es pública)
// ─────────────────────────────────────────────────────────────

function verificarClave(clave) {
  const auth = validarClave(clave)
  if (!auth.ok) return auth
  return {
    ok: true,
    operadores: listaConfig('operadores', []),
    categorias: listaConfig('categorias', ['HOGAR', 'ROPA', 'ALIMENTOS']),
    unidades: listaConfig('unidades', ['UNIDAD']),
  }
}

function validarClave(clave) {
  const props = PropertiesService.getScriptProperties()
  const ventanaMin = 10
  const ahora = Date.now()
  const inicio = Number(props.getProperty('rl_inicio') || 0)
  let fallos = Number(props.getProperty('rl_fallos') || 0)

  if (ahora - inicio > ventanaMin * 60000) {
    fallos = 0
    props.setProperty('rl_inicio', String(ahora))
    props.setProperty('rl_fallos', '0')
  }

  if (fallos >= 15) {
    return { ok: false, codigo: 'CLAVE_INVALIDA', error: 'Demasiados intentos. Espera unos minutos.' }
  }

  const esperada = valorConfig('clave_panel', '')
  const correcta = esperada && comparaSegura(String(clave), String(esperada))

  if (!correcta) {
    fallos += 1
    props.setProperty('rl_fallos', String(fallos))
    if (fallos >= 5) Utilities.sleep(2000)
    return { ok: false, codigo: 'CLAVE_INVALIDA', error: 'Clave incorrecta.' }
  }

  props.setProperty('rl_fallos', '0')
  return { ok: true }
}

// Comparación de tiempo (casi) constante.
function comparaSegura(a, b) {
  const ha = Utilities.computeHmacSha256Signature(a, 'donaciones')
  const hb = Utilities.computeHmacSha256Signature(b, 'donaciones')
  if (ha.length !== hb.length) return false
  let dif = 0
  for (let i = 0; i < ha.length; i++) dif |= ha[i] ^ hb[i]
  return dif === 0
}

// ─────────────────────────────────────────────────────────────
// Caché y auditoría
// ─────────────────────────────────────────────────────────────

function invalidarCache() {
  CacheService.getScriptCache().remove('publico_v1')
}

function registrarAuditoria(operador, accion, entidad, id, detalle) {
  try {
    hoja(HOJAS.AUDITORIA).appendRow([
      ahoraISO(), operador || 'desconocido', accion, entidad || '', id || '',
      typeof detalle === 'string' ? detalle : JSON.stringify(detalle || {}),
    ])
  } catch (err) {
    // La auditoría nunca debe tumbar una escritura válida.
  }
}
