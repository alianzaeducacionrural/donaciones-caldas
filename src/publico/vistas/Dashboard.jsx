import { useMemo } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend, ComposedChart, Area, Line,
} from 'recharts'
import TarjetaKpi from '../../components/TarjetaKpi'
import Panel from '../../components/Panel'
import { EJE, REJILLA, TooltipDonaciones } from '../../components/graficas'
import {
  resumen, porCategoria, serieDiaria, topDisponibles, inventarioCuadra,
} from '../../utils/agregados'
import { PALETA_HEX, HEX_RESPALDO } from '../../utils/categorias'
import { numero, fechaCorta } from '../../utils/formatear'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { datos } = useOutletContext()
  const { articulos, entradas, salidas, terceros, config } = datos

  const r = useMemo(() => resumen(articulos, entradas, salidas, terceros), [articulos, entradas, salidas, terceros])
  const cats = useMemo(() => porCategoria(articulos, entradas, salidas), [articulos, entradas, salidas])
  const serie = useMemo(() => serieDiaria(entradas, salidas), [entradas, salidas])
  const top = useMemo(() => topDisponibles(articulos, entradas, salidas, 10), [articulos, entradas, salidas])
  const cuadre = useMemo(() => inventarioCuadra(articulos, entradas, salidas), [articulos, entradas, salidas])

  const listaCats = cats.map((c) => c.categoria)
  const colorCat = (cat) => {
    const i = listaCats.indexOf(cat)
    return i === -1 ? HEX_RESPALDO : PALETA_HEX[i % PALETA_HEX.length]
  }

  const totalMunicipios = 27
  const sinFecha = entradas.filter((e) => !/^\d{4}-\d{2}-\d{2}/.test(String(e.fecha || ''))).length

  const donut = cats
    .filter((c) => c.disponible > 0)
    .map((c) => ({ name: c.categoria, value: c.disponible }))

  return (
    <div className={styles.pagina}>
      {/* ── KPIs ── */}
      <section className={styles.kpis}>
        <TarjetaKpi glifo="↓" valor={r.recibido} etiqueta="Artículos recibidos"
          detalle={`de ${r.donantes} ${r.donantes === 1 ? 'donante' : 'donantes'}`} tono="amarillo" indice={0} />
        <TarjetaKpi glifo="↑" valor={r.entregado} etiqueta="Artículos entregados"
          detalle={`en ${r.actas} ${r.actas === 1 ? 'acta' : 'actas'} de entrega`} tono="vino" indice={1} />
        <TarjetaKpi glifo="■" valor={r.disponible} etiqueta="Disponibles en bodega"
          detalle={`${r.articulos} referencias en catálogo`} tono="ok" indice={2} />
        <TarjetaKpi glifo="%" valor={Math.round(r.tasaEntrega * 100)} sufijo=" %" etiqueta="Tasa de entrega"
          detalle="entregado sobre recibido" tono="neutro" indice={3} />
        <TarjetaKpi glifo="◈" valor={r.donantes} etiqueta="Donantes registrados"
          detalle="personas y entidades" tono="amarillo" indice={4} />
        <TarjetaKpi glifo="⚑" valor={r.municipiosAtendidos} sufijo={` / ${totalMunicipios}`}
          etiqueta="Municipios atendidos" detalle="del departamento de Caldas" tono="vino" indice={5} />
        <TarjetaKpi glifo="!" valor={r.agotados} etiqueta="Referencias agotadas"
          detalle={r.bajos ? `${r.bajos} más con stock bajo` : 'stock en cero'}
          tono={r.agotados ? 'agotado' : 'ok'} indice={6} />
      </section>

      {/* ── Banda de estado ── */}
      <div className={`${styles.banda} ${cuadre.cuadra ? styles.bandaOk : styles.bandaMal}`}>
        {cuadre.cuadra
          ? <>✓ Inventario cuadrado — recibido menos entregado coincide con el stock disponible.</>
          : <>⚠ Descuadre de {numero(Math.abs(cuadre.diferencia))} unidades entre movimientos y stock.</>}
        {r.pendientes > 0 && (
          <span className={styles.bandaNota}>
            · {r.pendientes} entradas sin fecha en el archivo original
          </span>
        )}
      </div>

      {/* ── Gráficas ── */}
      <div className={styles.rejilla}>
        <Panel titulo="Donaciones por categoría" subtitulo="Entregado y disponible sobre el total recibido"
          ancho="ancho">
          <ResponsiveContainer width="100%" height={Math.max(220, cats.length * 54)}>
            <BarChart data={cats} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid {...REJILLA} horizontal={false} />
              <XAxis type="number" {...EJE} />
              <YAxis type="category" dataKey="categoria" width={110} {...EJE} />
              <Tooltip content={<TooltipDonaciones />} cursor={{ fill: 'rgba(245,179,1,.08)' }} />
              <Legend />
              <Bar dataKey="entregado" name="Entregado" stackId="a" fill="#971427" radius={[0, 0, 0, 0]} />
              <Bar dataKey="disponible" name="Disponible" stackId="a" fill="#F5B301" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel titulo="Composición del inventario disponible" subtitulo={`${numero(r.disponible)} unidades en bodega`}>
          <div className={styles.donutWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={68} outerRadius={104} paddingAngle={2}>
                  {donut.map((d) => <Cell key={d.name} fill={colorCat(d.name)} />)}
                </Pie>
                <Tooltip content={<TooltipDonaciones />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.donutCentro}>
              <strong>{numero(r.disponible)}</strong>
              <span>disponibles</span>
            </div>
          </div>
        </Panel>

        <Panel titulo="Top 10 en disponibilidad" subtitulo="Referencias con más unidades en bodega">
          {top.length ? (
            <ResponsiveContainer width="100%" height={Math.max(220, top.length * 30)}>
              <BarChart data={top} layout="vertical" margin={{ left: 12, right: 20 }}>
                <CartesianGrid {...REJILLA} horizontal={false} />
                <XAxis type="number" {...EJE} />
                <YAxis type="category" dataKey="descripcion" width={140} {...EJE} tick={{ fill: '#7A6A5C', fontSize: 11 }} />
                <Tooltip content={<TooltipDonaciones />} cursor={{ fill: 'rgba(245,179,1,.08)' }} />
                <Bar dataKey="stock" name="Disponible" radius={[0, 6, 6, 0]}>
                  {top.map((t) => <Cell key={t.id} fill={colorCat(t.categoria)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className={styles.aviso}>Sin stock disponible por ahora.</p>}
        </Panel>

        <Panel titulo="Flujo de la campaña" subtitulo="Stock acumulado, entradas y salidas por fecha"
          ancho="ancho"
          pie={sinFecha > 0 ? `Nota: ${sinFecha} de ${entradas.length} entradas no tienen fecha registrada y quedan fuera de esta serie.` : null}>
          {serie.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={serie} margin={{ left: 4, right: 16 }}>
                <defs>
                  <linearGradient id="degAcum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E7A35" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#1E7A35" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...REJILLA} />
                <XAxis dataKey="fecha" tickFormatter={fechaCorta} {...EJE} />
                <YAxis {...EJE} />
                <Tooltip content={<TooltipDonaciones />} labelFormatter={fechaCorta} />
                <Legend />
                <Area type="monotone" dataKey="acumulado" name="Stock acumulado" stroke="#1E7A35" strokeWidth={2} fill="url(#degAcum)" />
                <Bar dataKey="entradas" name="Entradas" fill="#F5B301" barSize={14} radius={[3, 3, 0, 0]} />
                <Bar dataKey="salidas" name="Salidas" fill="#971427" barSize={14} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="acumulado" name="Stock acumulado" stroke="#1E7A35" strokeWidth={2} dot={false} legendType="none" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <p className={styles.aviso}>Aún no hay movimientos con fecha para graficar.</p>}
        </Panel>
      </div>

      <div className={styles.accesos}>
        <Link to="/disponibilidad" className="btn btn-plano">Ver disponibilidad detallada →</Link>
        <Link to="/municipios" className="btn btn-plano">Mapa de entregas por municipio →</Link>
        <Link to="/donantes" className="btn btn-plano">Quiénes han donado →</Link>
      </div>
    </div>
  )
}
