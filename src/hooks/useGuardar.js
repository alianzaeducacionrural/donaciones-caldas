import { useCallback, useState } from 'react'

// Envuelve una llamada de escritura de la API: estado de envío + error +
// recarga automática del snapshot al terminar bien.
export function useGuardar(recargar) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const ejecutar = useCallback(async (fn) => {
    setGuardando(true)
    setError(null)
    try {
      const r = await fn()
      await recargar?.()
      return r
    } catch (e) {
      setError(e.message || 'No se pudo guardar')
      throw e
    } finally {
      setGuardando(false)
    }
  }, [recargar])

  return { ejecutar, guardando, error, limpiarError: () => setError(null) }
}
