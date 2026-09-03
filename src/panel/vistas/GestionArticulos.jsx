import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Tabla from '../../components/Tabla'
import Modal from '../../components/Modal'
import Semaforo from '../../components/Semaforo'
import { CampoTexto, CampoSelect, CampoNumero } from '../../components/Campos'
import { useGuardar } from '../../hooks/useGuardar'
import { crearArticulo, editarArticulo, desactivarArticulo } from '../../utils/api'
import { articulosConStock } from '../../utils/agregados'
import { numero } from '../../utils/formatear'
import s from './vistas.module.css'

export default function GestionArticulos() {
  const { datos, sesion, recargar } = useOutletContext()
  const { articulos, entradas, salidas, config } = datos
  const { ejecutar, guardando, error, limpiarError } = useGuardar(recargar)

  const categorias = (config?.categorias || ['HOGAR', 'ROPA', 'ALIMENTOS'])
  const unidades = (config?.unidades || ['UNIDAD', 'PACA', 'PAQUETE', 'ROLLO', 'BOTELLÓN'])

  const filas = useMemo(
    () => articulosConStock(articulos, entradas, salidas),
    [articulos, entradas, salidas],
  )

  const [texto, setTexto] = useState('')
  const [form, setForm] = useState(null)

  const vistas = filas.filter((a) =>
    !texto || `${a.id} ${a.descripcion} ${a.categoria}`.toLowerCase().includes(texto.toLowerCase()))

  const set = (c, v) => setForm((p) => ({ ...p, [c]: v }))
  const abrirNuevo = () => { limpiarError(); setForm({ _nuevo: true, descripcion: '', categoria: '', unidad: 'UNIDAD', stock_minimo: 3 }) }
  const abrirEdicion = (a) => {
    limpiarError()
    setForm({
      _nuevo: false, id: a.id, actualizado: a.actualizado,
      descripcion: a.descripcion, categoria: a.categoria,
      unidad: a.unidad || 'UNIDAD', stock_minimo: a.stock_minimo ?? 3,
    })
  }

  const enviar = async (ev) => {
    ev.preventDefault()
    const payload = {
      descripcion: form.descripcion,
      categoria: form.categoria,
      unidad: form.unidad,
      stock_minimo: Number(form.stock_minimo) || 0,
    }
    try {
      if (form._nuevo) await ejecutar(() => crearArticulo(payload, sesion))
      else await ejecutar(() => editarArticulo({ ...payload, id: form.id, actualizado: form.actualizado }, sesion))
      setForm(null)
    } catch { /* */ }
  }

  const desactivar = async (a) => {
    if (a.stock !== 0 && !confirm(`${a.descripcion} tiene ${numero(a.stock)} unidades en stock. ¿Desactivar de todos modos?`)) return
    if (a.stock === 0 && !confirm(`¿Desactivar ${a.descripcion}?`)) return
    try { await ejecutar(() => desactivarArticulo({ id: a.id }, sesion)) } catch { /* */ }
  }

  const columnas = [
    { clave: 'id', etiqueta: 'Código', ordenable: true, ancho: 90 },
    { clave: 'descripcion', etiqueta: 'Referencia', ordenable: true },
    { clave: 'categoria', etiqueta: 'Categoría', ordenable: true },
    { clave: 'unidad', etiqueta: 'Unidad', render: (a) => a.unidad || 'UNIDAD' },
    { clave: 'entradas', etiqueta: 'Recibido', alinear: 'right', render: (a) => numero(a.entradas) },
    { clave: 'salidas', etiqueta: 'Entregado', alinear: 'right', render: (a) => numero(a.salidas) },
    { clave: 'stock', etiqueta: 'Disponible', alinear: 'right', ordenable: true, render: (a) => <strong>{numero(a.stock)}</strong> },
    { clave: 'estado', etiqueta: 'Estado', render: (a) => <Semaforo estado={a.estado} /> },
    {
      clave: '_acc', etiqueta: '', alinear: 'right',
      render: (a) => (
        <span className={s.acciones2}>
          <button className={s.iconbtn} onClick={(ev) => { ev.stopPropagation(); abrirEdicion(a) }}>Editar</button>
          <button className={`${s.iconbtn} ${s.iconbtnPeligro}`} onClick={(ev) => { ev.stopPropagation(); desactivar(a) }}>Quitar</button>
        </span>
      ),
    },
  ]

  return (
    <div className={s.pagina}>
      <div className={s.encabezado}>
        <div>
          <h1>Catálogo de artículos</h1>
          <p>{vistas.length} referencias activas · categorías: {categorias.join(', ')}</p>
        </div>
        <button className="btn btn-primario" onClick={abrirNuevo}>+ Nuevo artículo</button>
      </div>

      <div className={s.tarjeta}>
        <div className={s.filtros}>
          <input className="control" placeholder="Buscar…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <Tabla columnas={columnas} filas={vistas} ordenInicial={{ clave: 'id', dir: 'asc' }} porPagina={40}
          vacioTitulo="Sin artículos" />
      </div>

      <Modal titulo={form?._nuevo ? 'Nuevo artículo' : 'Editar artículo'} abierto={!!form} onCerrar={() => setForm(null)}>
        {form && (
          <form onSubmit={enviar}>
            <CampoTexto label="Descripción / referencia" nombre="descripcion" valor={form.descripcion} onChange={set} requerido autoFocus />
            <div className={s.formGrid}>
              <CampoSelect label="Categoría" nombre="categoria" valor={form.categoria} onChange={set} requerido opciones={categorias} />
              <CampoSelect label="Unidad" nombre="unidad" valor={form.unidad} onChange={set} opciones={unidades} />
            </div>
            <CampoNumero label="Stock mínimo (para alerta)" nombre="stock_minimo" valor={form.stock_minimo} onChange={set} min={0}
              pista="Por debajo de este valor el artículo se marca en amarillo" />
            {error && <div className="avisoError">{error}</div>}
            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
