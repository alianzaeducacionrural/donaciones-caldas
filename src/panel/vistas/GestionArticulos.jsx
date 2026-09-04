import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Tabla from '../../components/Tabla'
import Modal from '../../components/Modal'
import Semaforo from '../../components/Semaforo'
import { CampoTexto, CampoSelect } from '../../components/Campos'
import { useGuardar } from '../../hooks/useGuardar'
import { useConfirmar } from '../../hooks/useConfirmar'
import { crearArticulo, editarArticulo, desactivarArticulo } from '../../utils/api'
import { asegurarOpcion } from '../../utils/opcionesConfig'
import { articulosConStock, esSi } from '../../utils/agregados'
import { numero, fechaCorta } from '../../utils/formatear'
import s from './vistas.module.css'

const OTRO = '__otro__'

export default function GestionArticulos() {
  const { datos, sesion, recargar } = useOutletContext()
  const { articulos, entradas, salidas, config } = datos
  const { ejecutar, guardando, error, limpiarError } = useGuardar(recargar)
  const confirmar = useConfirmar()

  const categorias = (config?.categorias || ['Hogar', 'Ropa', 'Alimentos'])
  const unidades = (config?.unidades || ['Unidad', 'Paca', 'Paquete', 'Rollo', 'Botellón'])

  const filas = useMemo(
    () => articulosConStock(articulos, entradas, salidas),
    [articulos, entradas, salidas],
  )

  const [texto, setTexto] = useState('')
  const [form, setForm] = useState(null)
  const [detalle, setDetalle] = useState(null) // artículo cuyo historial se muestra

  const vistas = filas.filter((a) =>
    !texto || `${a.id} ${a.descripcion} ${a.categoria}`.toLowerCase().includes(texto.toLowerCase()))

  const set = (c, v) => setForm((p) => ({ ...p, [c]: v }))
  const abrirNuevo = () => {
    limpiarError()
    setForm({ _nuevo: true, descripcion: '', categoria: '', categoriaOtro: '', unidad: unidades[0] || '', unidadOtro: '' })
  }
  const abrirEdicion = (a) => {
    limpiarError()
    setForm({
      _nuevo: false, id: a.id, actualizado: a.actualizado,
      descripcion: a.descripcion, categoria: a.categoria, categoriaOtro: '',
      unidad: a.unidad || unidades[0] || '', unidadOtro: '',
    })
  }

  const faltaOtro = (form?.categoria === OTRO && !form.categoriaOtro.trim())
    || (form?.unidad === OTRO && !form.unidadOtro.trim())

  const enviar = async (ev) => {
    ev.preventDefault()
    try {
      await ejecutar(async () => {
        const categoriaFinal = form.categoria === OTRO
          ? await asegurarOpcion(categorias, form.categoriaOtro, 'categorias', sesion)
          : form.categoria
        const unidadFinal = form.unidad === OTRO
          ? await asegurarOpcion(unidades, form.unidadOtro, 'unidades', sesion)
          : form.unidad
        const payload = { descripcion: form.descripcion, categoria: categoriaFinal, unidad: unidadFinal }
        return form._nuevo
          ? crearArticulo(payload, sesion)
          : editarArticulo({ ...payload, id: form.id, actualizado: form.actualizado }, sesion)
      })
      setForm(null)
    } catch { /* el error se muestra en el modal */ }
  }

  const desactivar = async (a) => {
    const mensaje = a.stock !== 0
      ? `${a.descripcion} tiene ${numero(a.stock)} unidades en stock. ¿Desactivar de todos modos?`
      : `¿Desactivar ${a.descripcion}?`
    if (!await confirmar(mensaje, { peligro: true, textoOk: 'Desactivar' })) return
    try { await ejecutar(() => desactivarArticulo({ id: a.id }, sesion)) } catch { /* */ }
  }

  const historialEntradas = useMemo(
    () => (detalle ? entradas.filter((e) => e.articulo_id === detalle.id && !esSi(e.anulado)) : []),
    [detalle, entradas],
  )
  const historialSalidas = useMemo(
    () => (detalle ? salidas.filter((x) => x.articulo_id === detalle.id && !esSi(x.anulado)) : []),
    [detalle, salidas],
  )

  const columnas = [
    { clave: 'id', etiqueta: 'Código', ordenable: true, ancho: 90 },
    { clave: 'descripcion', etiqueta: 'Referencia', ordenable: true },
    { clave: 'categoria', etiqueta: 'Categoría', ordenable: true },
    { clave: 'unidad', etiqueta: 'Unidad', render: (a) => a.unidad || 'Unidad' },
    { clave: 'entradas', etiqueta: 'Recibido', alinear: 'right', render: (a) => numero(a.entradas) },
    { clave: 'salidas', etiqueta: 'Entregado', alinear: 'right', render: (a) => numero(a.salidas) },
    { clave: 'stock', etiqueta: 'Disponible', alinear: 'right', ordenable: true, render: (a) => <strong>{numero(a.stock)}</strong> },
    { clave: 'estado', etiqueta: 'Estado', render: (a) => <Semaforo estado={a.estado} /> },
    {
      clave: '_acc', etiqueta: '', alinear: 'right',
      render: (a) => (
        <span className={s.acciones2}>
          <button className={s.iconbtn} onClick={(ev) => { ev.stopPropagation(); setDetalle(a) }}>Ver</button>
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
          onFila={(a) => setDetalle(a)} vacioTitulo="Sin artículos" />
      </div>

      {/* ── Modal: crear / editar artículo ── */}
      <Modal titulo={form?._nuevo ? 'Nuevo artículo' : 'Editar artículo'} abierto={!!form} onCerrar={() => setForm(null)}>
        {form && (
          <form onSubmit={enviar}>
            <CampoTexto label="Descripción / referencia" nombre="descripcion" valor={form.descripcion} onChange={set} requerido autoFocus />
            <div className={s.formGrid}>
              <CampoSelect label="Categoría" nombre="categoria" valor={form.categoria} onChange={set} requerido
                opciones={[...categorias, { valor: OTRO, texto: 'Otro (nueva categoría)' }]} />
              <CampoSelect label="Unidad" nombre="unidad" valor={form.unidad} onChange={set}
                opciones={[...unidades, { valor: OTRO, texto: 'Otro (nueva unidad)' }]} />
            </div>
            {form.categoria === OTRO && (
              <CampoTexto label="Nombre de la nueva categoría" nombre="categoriaOtro" valor={form.categoriaOtro} onChange={set} requerido />
            )}
            {form.unidad === OTRO && (
              <CampoTexto label="Nombre de la nueva unidad" nombre="unidadOtro" valor={form.unidadOtro} onChange={set} requerido />
            )}
            {error && <div className="avisoError">{error}</div>}
            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn btn-primario" disabled={guardando || faltaOtro}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: historial del artículo ── */}
      <Modal titulo={detalle?.descripcion} abierto={!!detalle} onCerrar={() => setDetalle(null)} ancho={640}>
        {detalle && (
          <>
            <div className={s.detalleMeta}>
              <div><b>Código:</b>{detalle.id}</div>
              <div><b>Categoría:</b>{detalle.categoria}</div>
              <div><b>Recibido:</b>{numero(detalle.entradas)}</div>
              <div><b>Entregado:</b>{numero(detalle.salidas)}</div>
              <div><b>Disponible:</b>{numero(detalle.stock)}</div>
              <div><b>Estado:</b> <Semaforo estado={detalle.estado} /></div>
            </div>

            <div className={`${s.historialCaja} ${s.historialEntradas}`}>
              <p className={s.historialTitulo}>
                <span aria-hidden="true">↓</span> Entradas <span className={s.historialCuenta}>({historialEntradas.length})</span>
              </p>
              <table className={s.detalleTabla}>
                <thead><tr><th>Fecha</th><th>Recibo</th><th>Donante</th><th style={{ textAlign: 'right' }}>Cantidad</th></tr></thead>
                <tbody>
                  {historialEntradas.length ? historialEntradas.map((e) => (
                    <tr key={e.id}>
                      <td>{e.fecha ? fechaCorta(e.fecha) : 'sin fecha'}</td>
                      <td>{e.recibo || 's/n'}</td>
                      <td>{e.donante_nombre}</td>
                      <td style={{ textAlign: 'right' }}>{numero(e.cantidad)}</td>
                    </tr>
                  )) : <tr><td colSpan={4} style={{ color: 'var(--texto-suave)' }}>Sin entradas registradas</td></tr>}
                </tbody>
              </table>
            </div>

            <div className={`${s.historialCaja} ${s.historialSalidas}`}>
              <p className={s.historialTitulo}>
                <span aria-hidden="true">↑</span> Salidas <span className={s.historialCuenta}>({historialSalidas.length})</span>
              </p>
              <table className={s.detalleTabla}>
                <thead><tr><th>Fecha</th><th>Acta</th><th>Municipio</th><th style={{ textAlign: 'right' }}>Cantidad</th></tr></thead>
                <tbody>
                  {historialSalidas.length ? historialSalidas.map((x) => (
                    <tr key={x.id}>
                      <td>{fechaCorta(x.fecha)}</td>
                      <td>{x.acta || 's/n'}</td>
                      <td>{x.municipio}</td>
                      <td style={{ textAlign: 'right' }}>{numero(x.cantidad)}</td>
                    </tr>
                  )) : <tr><td colSpan={4} style={{ color: 'var(--texto-suave)' }}>Sin salidas registradas</td></tr>}
                </tbody>
              </table>
            </div>

            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
