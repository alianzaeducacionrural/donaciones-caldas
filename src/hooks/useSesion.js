import { useCallback, useEffect, useState } from 'react'
import { verificarClave } from '../utils/api'

const LLAVE = 'donaciones.sesion'

// Sesión ligera del panel: solo la clave, guardada en sessionStorage
// (muere al cerrar la pestaña; importa en un equipo compartido).
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

  const ingresar = useCallback(async (clave) => {
    const r = await verificarClave(clave)
    setSesion({ clave })
    return r
  }, [])

  const salir = useCallback(() => setSesion(null), [])

  return { sesion, activa: !!sesion, ingresar, salir }
}

function leer() {
  try {
    const raw = sessionStorage.getItem(LLAVE)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
