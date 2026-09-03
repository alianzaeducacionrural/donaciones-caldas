import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import Panel from '../../components/Panel'
import Tabla from '../../components/Tabla'
import { EJE, REJILLA, TooltipDonaciones } from '../../components/graficas'
import { porDonante } from '../../utils/agregados'
import { numero } from '../../utils/formatear'
import styles from './Donantes.module.css'

export default function Donantes() {
  const { datos } = useOutletContext()
  const { articulos, entradas } = datos

  const donantes = useMemo(() => porDonante(entradas, articulos), [entradas, articulos])
  const totalUnidades = donantes.reduce((n, d) => n + d.unidades, 0)
  const conPendientes = donantes.filter((d) => d.pendientes > 0)

  const grafica = donantes.slice(0, 12)

  const columnas = [
    { clave: 'nombre', etiqueta: 'Donante', ordenable: true },
    { clave: 'registros', etiqueta: 'Registros', alinear: 'right', ordenable: true },
    { clave: 'articulos', etiqueta: 'Referencias', alinear: 'right', ordenable: true },
    {
      clave: 'categorias', etiqueta: 'Categorías aportadas',
      render: (d) => d.categorias.join(', '),
    },
    {
      clave: 'unidades', etiqueta: 'Unidades donadas', alinear: 'right', ordenable: true,
      render: (d) => <strong>{numero(d.unidades)}</strong>,
    },
  ]

  return (
    <div className={styles.pagina}>
      <div className={styles.tarjetas}>
        <div className={styles.mini}>
          <strong>{donantes.length}</strong>
          <span>donantes registrados</span>
        </div>
        <div className={styles.mini}>
          <strong>{numero(totalUnidades)}</strong>
          <span>unidades recibidas en total</span>
        </div>
        <div className={styles.mini}>
          <strong>{donantes[0]?.nombre?.split('/')[0] || '—'}</strong>
          <span>mayor aportante</span>
        </div>
      </div>

      {conPendientes.length > 0 && (
        <p className={styles.nota}>
          {conPendientes.reduce((n, d) => n + d.pendientes, 0)} de las entradas registradas
          no tienen fecha ni número de recibo en el archivo original.
        </p>
      )}

      <Panel titulo="Unidades donadas por aportante" subtitulo="Personas y entidades que han donado">
        <ResponsiveContainer width="100%" height={Math.max(220, grafica.length * 38)}>
          <BarChart data={grafica} layout="vertical" margin={{ left: 12, right: 24 }}>
            <CartesianGrid {...REJILLA} horizontal={false} />
            <XAxis type="number" {...EJE} />
            <YAxis type="category" dataKey="nombre" width={170} {...EJE} tick={{ fill: '#7A6A5C', fontSize: 11 }} />
            <Tooltip content={<TooltipDonaciones />} cursor={{ fill: 'rgba(245,179,1,.08)' }} />
            <Bar dataKey="unidades" name="Unidades" radius={[0, 6, 6, 0]}>
              {grafica.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#971427' : '#F5B301'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel titulo="Detalle por donante">
        <Tabla
          columnas={columnas}
          filas={donantes}
          claveFila="nombre"
          ordenInicial={{ clave: 'unidades', dir: 'desc' }}
          porPagina={25}
        />
      </Panel>
    </div>
  )
}
