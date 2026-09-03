import { useCallback, useEffect, useState } from 'react'
import { verificarClave } from '../utils/api'

const LLAVE = 'donaciones.sesion'

// Sesión ligera del panel: clave + operador guardados en sessionStorage
// (mueren al cerrar la pestaña; importa en un equipo compartido).
export function useSesion() {
  const [sesion, setSesion] = useState(() => leer())

  useEffect(() => {
    try {
      if (sesion) sessionStorage.setItem(LLAVE, JSON.stringify(sesion))
      else sessionStorage.removeItem(LLAVE)
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
  }, [sesion])

  // Devuelve { ok, operadores, requiereOperador }. Solo crea la sesión cuando
  // hay un operador resuelto (o cuando la lista trae 0-1 opciones).
  const ingresar = useCallback(async (clave, operador = null) => {
    const r = await verificarClave(clave)
    const ops = r.operadores || []
    if (operador) {
      setSesion({ clave, operador })
      return { ok: true, operadores: ops }
    }
    if (ops.length <= 1) {
      setSesion({ clave, operador: ops[0] || '' })
      return { ok: true, operadores: ops }
    }
    return { ok: true, operadores: ops, requiereOperador: true }
  }, [])

  const cambiarOperador = useCallback((operador) => {
    setSesion((s) => (s ? { ...s, operador } : s))
  }, [])

  const salir = useCallback(() => setSesion(null), [])

  return { sesion, activa: !!sesion, ingresar, cambiarOperador, salir }
}

function leer() {
  try {
    const raw = sessionStorage.getItem(LLAVE)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
