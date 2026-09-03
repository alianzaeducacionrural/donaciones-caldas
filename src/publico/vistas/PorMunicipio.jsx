import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import Panel from '../../components/Panel'
import Tabla from '../../components/Tabla'
import MapaCaldas from '../../components/MapaCaldas'
import { EJE, REJILLA, TooltipDonaciones } from '../../components/graficas'
import { porMunicipio, unidadesPorMunicipio } from '../../utils/agregados'
import { MUNICIPIOS_CALDAS } from '../../utils/municipios'
import { numero } from '../../utils/formatear'
import styles from './PorMunicipio.module.css'

export default function PorMunicipio() {
  const { datos } = useOutletContext()
  const { articulos, salidas } = datos

  const [sel, setSel] = useState(null)

  const detalle = useMemo(() => porMunicipio(salidas, articulos), [salidas, articulos])
  const mapa = useMemo(() => unidadesPorMunicipio(salidas), [salidas])

  const filasTabla = sel ? detalle.filter((d) => d.municipio === sel) : detalle
  const graficaData = (sel ? detalle.filter((d) => d.municipio === sel) : detalle).slice(0, 14)

  const totalEntregado = detalle.reduce((n, d) => n + d.unidades, 0)
  const sinRegistrar = MUNICIPIOS_CALDAS.filter((m) => !mapa[m])

  const columnas = [
    { clave: 'municipio', etiqueta: 'Municipio', ordenable: true },
    { clave: 'actas', etiqueta: 'Actas', alinear: 'right', ordenable: true },
    { clave: 'articulos', etiqueta: 'Referencias', alinear: 'right', ordenable: true },
    {
      clave: 'categorias', etiqueta: 'Categorías',
      render: (d) => Object.keys(d.categorias).join(', ') || '—',
    },
    {
      clave: 'unidades', etiqueta: 'Unidades entregadas', alinear: 'right', ordenable: true,
      render: (d) => <strong>{numero(d.unidades)}</strong>,
    },
  ]

  return (
    <div className={styles.pagina}>
      <div className={styles.tarjetas}>
        <div className={styles.mini}>
          <strong>{numero(totalEntregado)}</strong>
          <span>unidades entregadas en total</span>
        </div>
        <div className={styles.mini}>
          <strong>{detalle.length} / 27</strong>
          <span>municipios atendidos</span>
        </div>
        <div className={styles.mini}>
          <strong>{detalle[0]?.municipio || '—'}</strong>
          <span>mayor volumen recibido</span>
        </div>
      </div>

      <div className={styles.rejilla}>
        <Panel
          titulo="Mapa de entregas — Caldas"
          subtitulo={sel ? `Filtrado: ${sel}` : 'Intensidad por unidades entregadas'}
          accion={sel && <button className="btn btn-plano" onClick={() => setSel(null)}>Quitar filtro ✕</button>}
        >
          <MapaCaldas porMunicipio={mapa} seleccionado={sel} onSeleccionar={setSel} />
        </Panel>

        <Panel titulo="Entregas por municipio" subtitulo="Ordenado por volumen">
          {graficaData.length ? (
            <ResponsiveContainer width="100%" height={Math.max(200, graficaData.length * 34)}>
              <BarChart data={graficaData} layout="vertical" margin={{ left: 12, right: 20 }}>
                <CartesianGrid {...REJILLA} horizontal={false} />
                <XAxis type="number" {...EJE} />
                <YAxis type="category" dataKey="municipio" width={100} {...EJE} />
                <Tooltip content={<TooltipDonaciones />} cursor={{ fill: 'rgba(245,179,1,.08)' }} />
                <Bar dataKey="unidades" name="Unidades" radius={[0, 6, 6, 0]}
                  onClick={(d) => setSel((s) => (s === d.municipio ? null : d.municipio))}>
                  {graficaData.map((d) => (
                    <Cell key={d.municipio} fill={d.municipio === sel ? '#971427' : '#F5B301'} cursor="pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className={styles.aviso}>Aún no hay entregas registradas.</p>}
        </Panel>
      </div>

      <Panel
        titulo={sel ? `Detalle de ${sel}` : 'Detalle por municipio'}
        pie={sinRegistrar.length
          ? `Sin entregas registradas todavía: ${sinRegistrar.join(', ')}.`
          : null}
      >
        <Tabla
          columnas={columnas}
          filas={filasTabla}
          claveFila="municipio"
          ordenInicial={{ clave: 'unidades', dir: 'desc' }}
          porPagina={30}
          onFila={(d) => setSel((s) => (s === d.municipio ? null : d.municipio))}
          vacioTitulo="Sin entregas para este municipio"
        />
      </Panel>
    </div>
  )
}
