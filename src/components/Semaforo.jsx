// Píldora de estado de inventario.
const TEXTO = { ok: 'Disponible', bajo: 'Stock bajo', agotado: 'Agotado' }
const GLIFO = { ok: '●', bajo: '▲', agotado: '■' }

export default function Semaforo({ estado }) {
  return (
    <span className={`pildora pildora-${estado}`}>
      <span aria-hidden="true">{GLIFO[estado]}</span> {TEXTO[estado] || estado}
    </span>
  )
}
