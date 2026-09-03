import { useEffect, useRef, useState } from 'react'

// Cuenta animada de 0 al valor final. Respeta prefers-reduced-motion.
export default function Contador({ valor = 0, duracion = 1100, decimales = 0, sufijo = '' }) {
  const destino = Number(valor) || 0
  const [n, setN] = useState(destino)
  const rafRef = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setN(destino); return }

    const inicio = performance.now()
    const desde = 0
    const tick = (t) => {
      const p = Math.min((t - inicio) / duracion, 1)
      // easeOutExpo
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      setN(desde + (destino - desde) * e)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [destino, duracion])

  const texto = n.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })

  return <span className="tabular">{texto}{sufijo}</span>
}
