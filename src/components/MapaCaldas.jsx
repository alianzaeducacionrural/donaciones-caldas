import { useMemo, useState } from 'react'
import { VIEWBOX, MUNICIPIOS_SVG } from '../utils/mapaCaldas'
import { numero } from '../utils/formatear'
import styles from './MapaCaldas.module.css'

const ESCALA = ['#F4EEE3', '#FBE7B6', '#F7CE77', '#F0A93A', '#D98111', '#A85A08']

function tono(valor, max) {
  if (!valor) return ESCALA[0]
  const paso = Math.ceil((valor / max) * (ESCALA.length - 1))
  return ESCALA[Math.min(Math.max(paso, 1), ESCALA.length - 1)]
}

// porMunicipio: { 'Chinchiná': 8, ... }
export default function MapaCaldas({ porMunicipio = {}, seleccionado, onSeleccionar }) {
  const [hover, setHover] = useState(null)

  const max = useMemo(
    () => Math.max(1, ...Object.values(porMunicipio)),
    [porMunicipio],
  )
  const conDatos = Object.values(porMunicipio).filter(Boolean).length

  return (
    <div className={styles.envoltura}>
      <div className={styles.lienzo}>
        <svg
          viewBox={VIEWBOX}
          className={styles.mapa}
          role="img"
          aria-label={`Mapa de Caldas: ${conDatos} de 27 municipios con entregas registradas`}
        >
          {MUNICIPIOS_SVG.map((m) => {
            const valor = porMunicipio[m.nombre] || 0
            const activo = seleccionado === m.nombre
            return (
              <path
                key={m.dane}
                d={m.d}
                fill={tono(valor, max)}
                tabIndex={0}
                className={`${styles.municipio} ${activo ? styles.activo : ''}`}
                onMouseEnter={() => setHover({ ...m, valor })}
                onMouseMove={(e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ ...m, valor })}
                onBlur={() => setHover(null)}
                onClick={() => onSeleccionar?.(activo ? null : m.nombre)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSeleccionar?.(activo ? null : m.nombre)
                  }
                }}
                aria-label={`${m.nombre}: ${valor ? `${numero(valor)} unidades entregadas` : 'sin entregas registradas'}`}
              />
            )
          })}
          {MUNICIPIOS_SVG.filter((m) => porMunicipio[m.nombre]).map((m) => (
            <text key={`t-${m.dane}`} x={m.cx} y={m.cy + 4} className={styles.etiqueta}>
              {numero(porMunicipio[m.nombre])}
            </text>
          ))}
          {MUNICIPIOS_SVG.map((m) => (
            <text key={`n-${m.dane}`} x={m.cx} y={m.cy - 8} className={styles.nombre}>
              {m.nombre}
            </text>
          ))}
        </svg>

        {hover && (
          <div
            className={styles.tooltip}
            style={{ left: hover.x ?? 0, top: hover.y ?? 0 }}
          >
            <strong>{hover.nombre}</strong>
            <span>
              {hover.valor
                ? `${numero(hover.valor)} unidades entregadas`
                : 'sin entregas registradas'}
            </span>
          </div>
        )}
      </div>

      <div className={styles.leyenda}>
        <span className={styles.leyendaTxt}>Menos</span>
        {ESCALA.map((c, i) => (
          <span key={i} className={styles.muestra} style={{ background: c }} />
        ))}
        <span className={styles.leyendaTxt}>Más ({numero(max)})</span>
      </div>
      <p className={styles.pie}>
        {conDatos} de 27 municipios con entregas registradas
        {onSeleccionar ? ' · clic en un municipio para filtrar' : ''}
      </p>
    </div>
  )
}
