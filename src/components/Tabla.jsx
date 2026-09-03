import { useMemo, useState } from 'react'
import Vacio from './Vacio'
import styles from './Tabla.module.css'

// columnas: [{ clave, etiqueta, alinear?, ordenable?, render?(fila), ancho? }]
export default function Tabla({
  columnas,
  filas,
  claveFila = 'id',
  porPagina = 20,
  ordenInicial = null,
  onFila = null,
  vacioTitulo = 'Sin registros',
  vacioDetalle,
}) {
  const [orden, setOrden] = useState(ordenInicial) // { clave, dir }
  const [pagina, setPagina] = useState(1)

  const ordenadas = useMemo(() => {
    if (!orden) return filas
    const { clave, dir } = orden
    const f = [...filas].sort((a, b) => {
      const va = a[clave]
      const vb = b[clave]
      const na = Number(va)
      const nb = Number(vb)
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
      return String(va ?? '').localeCompare(String(vb ?? ''), 'es')
    })
    return dir === 'desc' ? f.reverse() : f
  }, [filas, orden])

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = ordenadas.slice((paginaActual - 1) * porPagina, paginaActual * porPagina)

  const alternarOrden = (clave) => {
    setPagina(1)
    setOrden((o) => {
      if (!o || o.clave !== clave) return { clave, dir: 'asc' }
      if (o.dir === 'asc') return { clave, dir: 'desc' }
      return null
    })
  }

  if (!filas.length) {
    return <Vacio titulo={vacioTitulo}>{vacioDetalle}</Vacio>
  }

  return (
    <div className={styles.envoltura}>
      <div className="scroll-x">
        <table className={styles.tabla}>
          <thead>
            <tr>
              {columnas.map((c) => (
                <th
                  key={c.clave}
                  style={{ width: c.ancho, textAlign: c.alinear || 'left' }}
                  className={c.ordenable ? styles.ordenable : ''}
                  onClick={c.ordenable ? () => alternarOrden(c.clave) : undefined}
                >
                  {c.etiqueta}
                  {orden?.clave === c.clave && (
                    <span className={styles.flecha}>{orden.dir === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila) => (
              <tr
                key={fila[claveFila]}
                className={onFila ? styles.clicable : ''}
                onClick={onFila ? () => onFila(fila) : undefined}
              >
                {columnas.map((c) => (
                  <td key={c.clave} style={{ textAlign: c.alinear || 'left' }}>
                    {c.render ? c.render(fila) : (fila[c.clave] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className={styles.paginacion}>
          <button
            className="btn btn-plano"
            disabled={paginaActual === 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            ← Anterior
          </button>
          <span className={styles.info}>
            Página {paginaActual} de {totalPaginas} · {ordenadas.length} registros
          </span>
          <button
            className="btn btn-plano"
            disabled={paginaActual === totalPaginas}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
