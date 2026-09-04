import { useMemo } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import TarjetaKpi from '../../components/TarjetaKpi'
import { resumen } from '../../utils/agregados'
import s from './vistas.module.css'

export default function PanelResumen() {
  const { datos } = useOutletContext()
  const { articulos, entradas, salidas, terceros } = datos
  const r = useMemo(
    () => resumen(articulos, entradas, salidas, terceros),
    [articulos, entradas, salidas, terceros],
  )

  return (
    <div className={s.pagina}>
      <div className={s.encabezado}>
        <div>
          <h1>Resumen de gestión</h1>
          <p>Estado general del inventario de donaciones</p>
        </div>
      </div>

      <div className={s.kpis}>
        <TarjetaKpi glifo="↓" valor={r.recibido} etiqueta="Recibido" tono="amarillo" indice={0} />
        <TarjetaKpi glifo="↑" valor={r.entregado} etiqueta="Entregado" tono="vino" indice={1} />
        <TarjetaKpi glifo="■" valor={r.disponible} etiqueta="Disponible" tono="ok" indice={2} />
        <TarjetaKpi glifo="!" valor={r.agotados} etiqueta="Agotados" tono={r.agotados ? 'agotado' : 'ok'} indice={3} />
        <TarjetaKpi glifo="▲" valor={r.bajos} etiqueta="Stock bajo" tono="bajo" indice={4} />
        <TarjetaKpi glifo="◷" valor={r.pendientes} etiqueta="Por completar" tono="neutro" indice={5} />
      </div>

      {r.pendientes > 0 && (
        <div className="avisoError">
          Hay {r.pendientes} entradas sin fecha o sin número de recibo.{' '}
          <Link to="/panel/entradas?filtro=pendientes"><strong>Completarlas →</strong></Link>
        </div>
      )}

      <div className={s.acc}>
        <Link to="/panel/entradas" className={`${s.accItem} ${s.accAmarillo} entra`} style={{ animationDelay: '.05s' }}>
          <span className={s.accGlifo} aria-hidden="true">↓</span>
          <strong>Registrar entrada</strong>
          <span>Una donación que llega a bodega</span>
        </Link>
        <Link to="/panel/salidas" className={`${s.accItem} ${s.accVino} entra`} style={{ animationDelay: '.1s' }}>
          <span className={s.accGlifo} aria-hidden="true">↑</span>
          <strong>Registrar entrega</strong>
          <span>Un acta de salida a un municipio</span>
        </Link>
        <Link to="/panel/articulos" className={`${s.accItem} ${s.accOk} entra`} style={{ animationDelay: '.15s' }}>
          <span className={s.accGlifo} aria-hidden="true">▦</span>
          <strong>Catálogo de artículos</strong>
          <span>{r.articulos} referencias · categorías</span>
        </Link>
        <Link to="/panel/terceros" className={`${s.accItem} ${s.accAzul} entra`} style={{ animationDelay: '.2s' }}>
          <span className={s.accGlifo} aria-hidden="true">◈</span>
          <strong>Donantes y beneficiarios</strong>
          <span>{r.donantes} donantes registrados</span>
        </Link>
      </div>
    </div>
  )
}
