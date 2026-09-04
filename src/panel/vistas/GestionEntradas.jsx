import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Tabla from '../../components/Tabla'
import Modal from '../../components/Modal'
import { CampoTexto, CampoNumero, CampoFecha, CampoSelect, CampoArea } from '../../components/Campos'
import SelectorArticulo from '../../components/SelectorArticulo'
import { useGuardar } from '../../hooks/useGuardar'
import { useConfirmar } from '../../hooks/useConfirmar'
import { crearEntrada, editarEntrada, anularEntrada, crearTercero } from '../../utils/api'
import { esSi, siguienteRecibo, mesesDisponibles, stockPorArticulo, agruparPorFolio } from '../../utils/agregados'
import { fechaCorta, fechaISO, numero } from '../../utils/formatear'
import { exportarCsv } from '../../utils/exportarCsv'
import s from './vistas.module.css'

const OTRO = '__otro__'
const LINEA_VACIA = () => ({ articulo_id: '', cantidad: '' })

export default function GestionEntradas() {
  const { datos, sesion, recargar } = useOutletContext()
  const { articulos, entradas, salidas, terceros, config } = datos
  const { ejecutar, guardando, error, limpiarError } = useGuardar(recargar)
  const confirmar = useConfirmar()
  const stockMap = useMemo(() => stockPorArticulo(entradas, salidas), [entradas, salidas])

  const [texto, setTexto] = useState('')
  const [fDonante, setFDonante] = useState('')
  const [fArticulo, setFArticulo] = useState('')
  const [fMes, setFMes] = useState('')
  const [vista, setVista] = useState('articulo') // 'articulo' | 'recibo'
  const [nueva, setNueva] = useState(null) // form de recibo nuevo (varios artículos)
  const [edicion, setEdicion] = useState(null) // form de una entrada individual
  const [detalleRecibo, setDetalleRecibo] = useState(null) // recibo a mostrar en el modal "Ver"

  const donantes = terceros.filter((t) => /DONANTE|AMBOS/i.test(t.tipo || ''))
  const artMap = Object.fromEntries(articulos.map((a) => [a.id, a]))
  const meses = useMemo(() => mesesDisponibles(entradas), [entradas])

  const filas = useMemo(() => {
    let f = entradas.filter((e) => !esSi(e.anulado))
    if (fDonante) f = f.filter((e) => e.donante_id === fDonante)
    if (fArticulo) f = f.filter((e) => e.articulo_id === fArticulo)
    if (fMes) f = f.filter((e) => String(e.fecha || '').startsWith(fMes))
    if (texto) {
      const q = texto.toLowerCase()
      f = f.filter((e) =>
        `${e.donante_nombre} ${artMap[e.articulo_id]?.descripcion || ''} ${e.recibo}`.toLowerCase().includes(q))
    }
    return f
  }, [entradas, fDonante, fArticulo, fMes, texto, artMap])

  /* ── Recibo nuevo: uno o varios artículos ── */
  const abrirNueva = () => {
    limpiarError()
    setNueva({
      fecha: '', recibo: siguienteRecibo(entradas),
      donante_id: '', donante_nombre_nuevo: '',
      observaciones: '', lineas: [LINEA_VACIA()],
    })
  }
  const setN = (campo, valor) => setNueva((p) => ({ ...p, [campo]: valor }))
  const setLinea = (i, campo, valor) =>
    setNueva((p) => ({ ...p, lineas: p.lineas.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)) }))
  const agregarLinea = () => setNueva((p) => ({ ...p, lineas: [...p.lineas, LINEA_VACIA()] }))
  const quitarLinea = (i) => setNueva((p) => ({ ...p, lineas: p.lineas.filter((_, j) => j !== i) }))

  const enviarNueva = async (ev) => {
    ev.preventDefault()
    try {
      await ejecutar(async () => {
        let donanteId = nueva.donante_id
        let donanteNombre = terceros.find((t) => t.id === nueva.donante_id)?.nombre || ''

        if (donanteId === OTRO) {
          const nombre = nueva.donante_nombre_nuevo.trim()
          if (!nombre) throw new Error('Escribe el nombre del nuevo donante.')
          const r = await crearTercero({ tipo: 'DONANTE', nombre }, sesion)
          donanteId = r.id
          donanteNombre = nombre
        }

        const payload = {
          fecha: nueva.fecha,
          recibo: nueva.recibo,
          donante_id: donanteId,
          donante_nombre: donanteNombre,
          observaciones: nueva.observaciones,
          lineas: nueva.lineas
            .filter((l) => l.articulo_id && l.cantidad)
            .map((l) => ({ articulo_id: l.articulo_id, cantidad: Number(l.cantidad) })),
        }
        return crearEntrada(payload, sesion)
      })
      setNueva(null)
    } catch { /* el error se muestra en el modal */ }
  }

  /* ── Editar una entrada individual ── */
  const abrirEdicion = (e) => {
    limpiarError()
    setEdicion({
      id: e.id,
      actualizado: e.actualizado,
      fecha: fechaISO(e.fecha),
      recibo: e.recibo || '',
      articulo_id: e.articulo_id || '',
      donante_id: e.donante_id || '',
      cantidad: e.cantidad || '',
      observaciones: e.observaciones || '',
    })
  }
  const setE = (campo, valor) => setEdicion((p) => ({ ...p, [campo]: valor }))
  const enviarEdicion = async (ev) => {
    ev.preventDefault()
    const donante = terceros.find((t) => t.id === edicion.donante_id)
    try {
      await ejecutar(() => editarEntrada({
        id: edicion.id,
        actualizado: edicion.actualizado,
        fecha: edicion.fecha,
        recibo: edicion.recibo,
        articulo_id: edicion.articulo_id,
        donante_id: edicion.donante_id,
        donante_nombre: donante?.nombre || '',
        cantidad: Number(edicion.cantidad),
        observaciones: edicion.observaciones,
      }, sesion))
      setEdicion(null)
    } catch { /* el error se muestra en el modal */ }
  }

  const anular = async (e) => {
    const ok = await confirmar(
      `¿Anular la entrada de ${numero(e.cantidad)} × ${artMap[e.articulo_id]?.descripcion || e.articulo_id}?`,
      { peligro: true, textoOk: 'Anular' },
    )
    if (!ok) return
    try { await ejecutar(() => anularEntrada({ id: e.id }, sesion)) } catch { /* */ }
  }

  const columnas = [
    {
      clave: 'fecha', etiqueta: 'Fecha', ordenable: true,
      render: (e) => esSi(e.pendiente) && !e.fecha
        ? <span className={s.marcaPend}>sin fecha</span>
        : fechaCorta(e.fecha),
    },
    { clave: 'recibo', etiqueta: 'Recibo', render: (e) => e.recibo || <span className={s.marcaPend}>s/n</span> },
    { clave: 'articulo_id', etiqueta: 'Artículo', render: (e) => artMap[e.articulo_id]?.descripcion || e.articulo_id },
    { clave: 'donante_nombre', etiqueta: 'Donante', ordenable: true },
    { clave: 'cantidad', etiqueta: 'Cantidad', alinear: 'right', ordenable: true, render: (e) => numero(e.cantidad) },
    {
      clave: '_acc', etiqueta: '', alinear: 'right',
      render: (e) => (
        <span className={s.acciones2}>
          <button className={s.iconbtn} onClick={(ev) => { ev.stopPropagation(); abrirEdicion(e) }}>Editar</button>
          <button className={`${s.iconbtn} ${s.iconbtnPeligro}`} onClick={(ev) => { ev.stopPropagation(); anular(e) }}>Anular</button>
        </span>
      ),
    },
  ]

  const gruposRecibo = useMemo(() => agruparPorFolio(filas, 'recibo').map((lineas) => ({
    _id: lineas[0].recibo || lineas[0].id,
    recibo: lineas[0].recibo,
    fecha: lineas.find((e) => e.fecha)?.fecha || '',
    donante_nombre: lineas.find((e) => e.donante_nombre)?.donante_nombre || '',
    articulos: lineas.length,
    total: lineas.reduce((n, e) => n + (Number(e.cantidad) || 0), 0),
    pendiente: lineas.some((e) => esSi(e.pendiente)),
    lineas,
  })), [filas])

  const columnasRecibo = [
    {
      clave: 'fecha', etiqueta: 'Fecha', ordenable: true,
      render: (g) => g.pendiente && !g.fecha ? <span className={s.marcaPend}>sin fecha</span> : fechaCorta(g.fecha),
    },
    { clave: 'recibo', etiqueta: 'Recibo', ordenable: true, render: (g) => g.recibo || <span className={s.marcaPend}>s/n</span> },
    { clave: 'donante_nombre', etiqueta: 'Donante', ordenable: true },
    { clave: 'articulos', etiqueta: 'Artículos', alinear: 'right', ordenable: true },
    { clave: 'total', etiqueta: 'Unidades', alinear: 'right', ordenable: true, render: (g) => <strong>{numero(g.total)}</strong> },
    {
      clave: '_acc', etiqueta: '', alinear: 'right',
      render: (g) => (
        <span className={s.acciones2}>
          <button className={s.iconbtn} onClick={(ev) => { ev.stopPropagation(); setDetalleRecibo(g) }}>Ver</button>
        </span>
      ),
    },
  ]

  const descargar = () => exportarCsv(
    filas.map((e) => ({ ...e, articulo: artMap[e.articulo_id]?.descripcion || e.articulo_id })),
    [
      { clave: 'fecha', etiqueta: 'Fecha', formato: fechaISO },
      { clave: 'recibo', etiqueta: 'Recibo' },
      { clave: 'articulo', etiqueta: 'Artículo' },
      { clave: 'donante_nombre', etiqueta: 'Donante' },
      { clave: 'cantidad', etiqueta: 'Cantidad' },
      { clave: 'pendiente', etiqueta: 'Pendiente' },
      { clave: 'observaciones', etiqueta: 'Observaciones' },
    ],
    'entradas-donaciones.csv',
  )

  const pendientes = entradas.filter((e) => !esSi(e.anulado) && esSi(e.pendiente)).length

  return (
    <div className={s.pagina}>
      <div className={s.encabezado}>
        <div>
          <h1>Entradas de donaciones</h1>
          <p>{filas.length} registros{pendientes ? ` · ${pendientes} por completar` : ''}</p>
        </div>
        <div className={s.acciones}>
          <button className="btn btn-plano" onClick={descargar}>⭳ CSV</button>
          <button className="btn btn-primario" onClick={abrirNueva}>+ Nueva entrada</button>
        </div>
      </div>

      <div className={s.tarjeta}>
        <div className={s.filtros}>
          <select className="control" value={fDonante} onChange={(e) => setFDonante(e.target.value)}>
            <option value="">Todos los donantes</option>
            {donantes.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <select className="control" value={fArticulo} onChange={(e) => setFArticulo(e.target.value)}>
            <option value="">Todos los artículos</option>
            {articulos.map((a) => <option key={a.id} value={a.id}>{a.descripcion}</option>)}
          </select>
          <select className="control" value={fMes} onChange={(e) => setFMes(e.target.value)}>
            <option value="">Todos los meses</option>
            {meses.map((m) => <option key={m.valor} value={m.valor}>{m.texto}</option>)}
          </select>
          <input className="control" placeholder="Buscar donante, artículo o recibo…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>

        <div className={s.vistaToggle} role="tablist">
          <button type="button" role="tab" aria-selected={vista === 'articulo'}
            className={`${s.vistaBtn} ${vista === 'articulo' ? s.vistaActivo : ''}`}
            onClick={() => setVista('articulo')}>Por artículo</button>
          <button type="button" role="tab" aria-selected={vista === 'recibo'}
            className={`${s.vistaBtn} ${vista === 'recibo' ? s.vistaActivo : ''}`}
            onClick={() => setVista('recibo')}>Por recibo</button>
        </div>

        {vista === 'articulo' ? (
          <Tabla
            columnas={columnas}
            filas={filas}
            ordenInicial={{ clave: 'fecha', dir: 'desc' }}
            porPagina={25}
            vacioTitulo="Sin entradas para este filtro"
          />
        ) : (
          <Tabla
            columnas={columnasRecibo}
            filas={gruposRecibo}
            claveFila="_id"
            ordenInicial={{ clave: 'fecha', dir: 'desc' }}
            porPagina={25}
            onFila={(g) => setDetalleRecibo(g)}
            vacioTitulo="Sin recibos para este filtro"
          />
        )}
      </div>

      {/* ── Modal: recibo nuevo, uno o varios artículos ── */}
      <Modal titulo="Nueva entrada" abierto={!!nueva} onCerrar={() => setNueva(null)} ancho={680}>
        {nueva && (
          <form onSubmit={enviarNueva}>
            <div className={s.formGrid}>
              <CampoFecha label="Fecha" nombre="fecha" valor={nueva.fecha} onChange={setN}
                pista="Déjala vacía si aún no se conoce" />
              <CampoTexto label="N° de recibo / folio" nombre="recibo" valor={nueva.recibo} onChange={setN}
                pista="Consecutivo sugerido; puedes cambiarlo" />
              <div className="full">
                <CampoSelect label="Donante" nombre="donante_id" valor={nueva.donante_id} onChange={setN} requerido
                  opciones={[...donantes.map((t) => ({ valor: t.id, texto: t.nombre })), { valor: OTRO, texto: 'Otro (nuevo donante)' }]}
                  pista={donantes.length ? undefined : 'O elige "Otro" para registrarlo aquí mismo'} />
              </div>
              {nueva.donante_id === OTRO && (
                <div className="full">
                  <CampoTexto label="Nombre del nuevo donante" nombre="donante_nombre_nuevo"
                    valor={nueva.donante_nombre_nuevo} onChange={setN} requerido autoFocus />
                </div>
              )}
            </div>

            <p className="etiqueta" style={{ marginTop: '0.5rem' }}>Artículos recibidos</p>
            <div className={s.lineas}>
              {nueva.lineas.map((l, i) => (
                <div className={s.linea} key={i}>
                  <SelectorArticulo
                    label="Artículo" valor={l.articulo_id}
                    onChange={(_, v) => setLinea(i, 'articulo_id', v)}
                    articulos={articulos} stock={stockMap}
                    categorias={config?.categorias} unidades={config?.unidades}
                    sesion={sesion} recargar={recargar}
                  />
                  <CampoNumero label="Cantidad" nombre={`cant-${i}`} valor={l.cantidad}
                    onChange={(_, v) => setLinea(i, 'cantidad', v)} min={1} />
                  {nueva.lineas.length > 1 && (
                    <button type="button" className={s.quitar} onClick={() => quitarLinea(i)} aria-label="Quitar">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-plano" onClick={agregarLinea}>+ Agregar otro artículo</button>

            <div className="full" style={{ marginTop: '1rem' }}>
              <CampoArea label="Observaciones" nombre="observaciones" valor={nueva.observaciones} onChange={setN} filas={2} />
            </div>

            {error && <div className="avisoError" style={{ marginTop: '0.75rem' }}>{error}</div>}

            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setNueva(null)}>Cancelar</button>
              <button className="btn btn-primario" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Registrar entrada'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: editar una entrada individual ── */}
      {/* ── Modal: ver recibo completo ── */}
      <Modal titulo={`Recibo ${detalleRecibo?.recibo || '(sin número)'}`} abierto={!!detalleRecibo} onCerrar={() => setDetalleRecibo(null)} ancho={600}>
        {detalleRecibo && (
          <>
            <div className={s.detalleMeta}>
              <div><b>Fecha:</b>{detalleRecibo.fecha ? fechaCorta(detalleRecibo.fecha) : 'sin fecha'}</div>
              <div><b>Donante:</b>{detalleRecibo.donante_nombre || '—'}</div>
              <div><b>Artículos:</b>{detalleRecibo.articulos}</div>
              <div><b>Total unidades:</b>{numero(detalleRecibo.total)}</div>
            </div>
            <table className={s.detalleTabla}>
              <thead>
                <tr><th>Artículo</th><th style={{ textAlign: 'right' }}>Cantidad</th></tr>
              </thead>
              <tbody>
                {detalleRecibo.lineas.map((e) => (
                  <tr key={e.id}>
                    <td>{artMap[e.articulo_id]?.descripcion || e.articulo_id}</td>
                    <td style={{ textAlign: 'right' }}>{numero(e.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td>Total</td><td style={{ textAlign: 'right' }}>{numero(detalleRecibo.total)}</td></tr>
              </tfoot>
            </table>
            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setDetalleRecibo(null)}>Cerrar</button>
            </div>
          </>
        )}
      </Modal>

      <Modal titulo="Editar entrada" abierto={!!edicion} onCerrar={() => setEdicion(null)} ancho={560}>
        {edicion && (
          <form onSubmit={enviarEdicion}>
            <div className={s.formGrid}>
              <CampoFecha label="Fecha" nombre="fecha" valor={edicion.fecha} onChange={setE}
                pista="Déjala vacía si aún no se conoce" />
              <CampoTexto label="N° de recibo / folio" nombre="recibo" valor={edicion.recibo} onChange={setE} />
              <div className="full">
                <SelectorArticulo
                  valor={edicion.articulo_id} onChange={setE} requerido
                  articulos={articulos} stock={stockMap}
                  categorias={config?.categorias} unidades={config?.unidades}
                  sesion={sesion} recargar={recargar}
                />
              </div>
              <div className="full">
                <CampoSelect label="Donante" nombre="donante_id" valor={edicion.donante_id} onChange={setE} requerido
                  opciones={donantes.map((t) => ({ valor: t.id, texto: t.nombre }))} />
              </div>
              <CampoNumero label="Cantidad recibida" nombre="cantidad" valor={edicion.cantidad} onChange={setE} requerido min={1} />
              <div className="full">
                <CampoArea label="Observaciones" nombre="observaciones" valor={edicion.observaciones} onChange={setE} filas={2} />
              </div>
            </div>

            {error && <div className="avisoError" style={{ marginTop: '0.5rem' }}>{error}</div>}

            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setEdicion(null)}>Cancelar</button>
              <button className="btn btn-primario" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
