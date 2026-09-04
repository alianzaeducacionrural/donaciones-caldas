import { useCallback, useEffect, useState } from 'react'
import { cargarDatos, cargarPublico } from '../utils/api'
import { tituloPropio } from '../utils/formatear'

// Nombres de artículos, categorías/unidades y de personas/entidades se
// muestran en formato "Nombre Propio" en toda la app, sin importar cómo
// quedaron guardados en el Sheet. Categorías y unidades se normalizan igual
// en la lista maestra (config) y en cada artículo, para que sigan
// coincidiendo exactamente al filtrar o agrupar.
function normalizar(d) {
  const config = d.config || {}
  const categorias = (config.categorias || []).map(tituloPropio)
  const unidades = (config.unidades || []).map(tituloPropio)
  return {
    articulos: (d.articulos || []).map((a) => ({
      ...a,
      descripcion: tituloPropio(a.descripcion),
      categoria: tituloPropio(a.categoria),
      unidad: tituloPropio(a.unidad),
    })),
    entradas: (d.entradas || []).map((e) => ({ ...e, donante_nombre: tituloPropio(e.donante_nombre) })),
    salidas: (d.salidas || []).map((x) => ({ ...x, beneficiario_nombre: tituloPropio(x.beneficiario_nombre) })),
    terceros: (d.terceros || []).map((t) => ({ ...t, nombre: tituloPropio(t.nombre) })),
    auditoria: d.auditoria || [],
    config: { ...config, categorias, unidades },
    resumen: d.resumen || null,
    generado: d.generado || null,
  }
}

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
        setDatos(normalizar(d))
      })
      .catch((e) => { if (vivo) setError(e.message) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [clave, nonce])

  return { datos, cargando, error, recargar }
}
