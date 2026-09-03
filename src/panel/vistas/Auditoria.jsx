import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Tabla from '../../components/Tabla'
import { fechaCorta } from '../../utils/formatear'
import s from './vistas.module.css'

export default function Auditoria() {
  const { datos } = useOutletContext()
  const registros = useMemo(() => datos.auditoria || [], [datos.auditoria])
  const [texto, setTexto] = useState('')

  const filas = useMemo(() => {
    const f = registros.map((r, i) => ({ ...r, _id: i }))
    if (!texto) return f
    const q = texto.toLowerCase()
    return f.filter((r) => `${r.accion} ${r.entidad} ${r.entidad_id} ${r.detalle}`.toLowerCase().includes(q))
  }, [registros, texto])

  const columnas = [
    {
      clave: 'timestamp', etiqueta: 'Fecha y hora', ordenable: true,
      render: (r) => {
        const d = new Date(r.timestamp)
        return Number.isNaN(d.getTime()) ? r.timestamp : `${fechaCorta(r.timestamp)} ${d.toLocaleTimeString('es-CO')}`
      },
    },
    { clave: 'accion', etiqueta: 'Acción', ordenable: true, render: (r) => <span className="pildora pildora-neutra">{r.accion}</span> },
    { clave: 'entidad', etiqueta: 'Entidad' },
    { clave: 'entidad_id', etiqueta: 'ID' },
    { clave: 'detalle', etiqueta: 'Detalle', render: (r) => <code style={{ fontSize: '0.75rem' }}>{r.detalle}</code> },
  ]

  return (
    <div className={s.pagina}>
      <div className={s.encabezado}>
        <div>
          <h1>Auditoría</h1>
          <p>Historial de cambios · últimos {registros.length} movimientos</p>
        </div>
      </div>
      <div className={s.tarjeta}>
        <div className={s.filtros}>
          <input className="control" placeholder="Buscar…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <Tabla columnas={columnas} filas={filas} claveFila="_id" ordenInicial={{ clave: 'timestamp', dir: 'desc' }}
          porPagina={30} vacioTitulo="Sin movimientos registrados" />
      </div>
    </div>
  )
}
