// Piezas compartidas para las gráficas Recharts: paleta, tooltip y ejes.
import { numero } from '../utils/formatear'

export const EJE = {
  tick: { fill: '#7A6A5C', fontSize: 12 },
  axisLine: { stroke: '#D8C9B2' },
  tickLine: false,
}

export const REJILLA = { stroke: '#EDE4D3', strokeDasharray: '3 3', vertical: false }

// Tooltip con estilo de la plataforma.
export function TooltipDonaciones({ active, payload, label, unidad = 'unidades' }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E9DFCF',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(43,26,14,.14)',
        padding: '0.6rem 0.8rem',
        fontSize: 13,
      }}
    >
      {label != null && (
        <div style={{ fontWeight: 800, marginBottom: 4, color: '#2B1A0E' }}>{label}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#7A6A5C' }}>
          <span
            style={{
              width: 10, height: 10, borderRadius: 3,
              background: p.color || p.payload?.fill || '#B77E00',
              flexShrink: 0,
            }}
          />
          <span>{p.name}:</span>
          <strong style={{ color: '#2B1A0E' }}>{numero(p.value)} {unidad}</strong>
        </div>
      ))}
    </div>
  )
}
