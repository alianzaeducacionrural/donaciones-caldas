import { useCallback, useEffect, useState } from 'react'
import { cargarDatos, cargarPublico } from '../utils/api'

// Carga única del snapshot. Sin clave → endpoint público (sin datos
// personales). Con clave → snapshot completo del panel.
export function useDatos(sesion = null) {
  const clave = sesion?.clave || ''
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [nonce, setNonce] = useState(0)

  const recargar = useCallback(() => {
    setError(null)
    setNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    let vivo = true
    setCargando(true)
    const promesa = clave ? cargarDatos(clave) : cargarPublico()
    promesa
      .then((d) => {
        if (!vivo) return
        setDatos({
          articulos: d.articulos || [],
          entradas: d.entradas || [],
          salidas: d.salidas || [],
          terceros: d.terceros || [],
          auditoria: d.auditoria || [],
          config: d.config || {},
          resumen: d.resumen || null,
          generado: d.generado || null,
        })
      })
      .catch((e) => { if (vivo) setError(e.message) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [clave, nonce])

  return { datos, cargando, error, recargar }
}
