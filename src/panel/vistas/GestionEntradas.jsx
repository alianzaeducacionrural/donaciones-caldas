import { useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import Tabla from '../../components/Tabla'
import Modal from '../../components/Modal'
import { CampoTexto, CampoNumero, CampoFecha, CampoSelect, CampoArea } from '../../components/Campos'
import { useGuardar } from '../../hooks/useGuardar'
import { crearEntrada, editarEntrada, anularEntrada } from '../../utils/api'
import { esSi } from '../../utils/agregados'
import { fechaCorta, fechaISO, numero } from '../../utils/formatear'
import { exportarCsv } from '../../utils/exportarCsv'
import s from './vistas.module.css'

const VACIA = { fecha: '', recibo: '', articulo_id: '', donante_id: '', cantidad: '', observaciones: '' }

export default function GestionEntradas() {
  const { datos, sesion, recargar } = useOutletContext()
  const { articulos, entradas, terceros } = datos
  const { ejecutar, guardando, error, limpiarError } = useGuardar(recargar)

  const [params, setParams] = useSearchParams()
  const filtro = params.get('filtro') || 'todas'
  const [texto, setTexto] = useState('')
  const [form, setForm] = useState(null) // null | {…} (nuevo o edición)

  const donantes = terceros.filter((t) => /DONANTE|AMBOS/i.test(t.tipo || ''))
  const artMap = Object.fromEntries(articulos.map((a) => [a.id, a]))

  const filas = useMemo(() => {
    let f = entradas.filter((e) => !esSi(e.anulado))
    if (filtro === 'pendientes') f = f.filter((e) => esSi(e.pendiente))
    if (texto) {
      const q = texto.toLowerCase()
      f = f.filter((e) =>
        `${e.donante_nombre} ${artMap[e.articulo_id]?.descripcion || ''} ${e.recibo}`.toLowerCase().includes(q))
    }
    return f
  }, [entradas, filtro, texto, artMap])

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }))

  const abrirNuevo = () => { limpiarError(); setForm({ ...VACIA, _nuevo: true }) }
  const abrirEdicion = (e) => {
    limpiarError()
    setForm({
      _nuevo: false,
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

  const enviar = async (ev) => {
    ev.preventDefault()
    const donante = terceros.find((t) => t.id === form.donante_id)
    const payload = {
      fecha: form.fecha,
      recibo: form.recibo,
      articulo_id: form.articulo_id,
      donante_id: form.donante_id,
      donante_nombre: donante?.nombre || '',
      cantidad: Number(form.cantidad),
      observaciones: form.observaciones,
    }
    try {
      if (form._nuevo) await ejecutar(() => crearEntrada(payload, sesion))
      else await ejecutar(() => editarEntrada({ ...payload, id: form.id, actualizado: form.actualizado }, sesion))
      setForm(null)
    } catch { /* el error se muestra en el modal */ }
  }

  const anular = async (e) => {
    if (!confirm(`¿Anular la entrada de ${numero(e.cantidad)} × ${artMap[e.articulo_id]?.descripcion || e.articulo_id}?`)) return
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
          <button className="btn btn-primario" onClick={abrirNuevo}>+ Nueva entrada</button>
        </div>
      </div>

      <div className={s.tarjeta}>
        <div className={s.filtros}>
          <select
            className="control"
            value={filtro}
            onChange={(e) => setParams(e.target.value === 'todas' ? {} : { filtro: e.target.value })}
          >
            <option value="todas">Todas</option>
            <option value="pendientes">Solo por completar</option>
          </select>
          <input className="control" placeholder="Buscar donante, artículo o recibo…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>

        <Tabla
          columnas={columnas}
          filas={filas}
          ordenInicial={{ clave: 'fecha', dir: 'desc' }}
          porPagina={25}
          vacioTitulo="Sin entradas para este filtro"
        />
      </div>

      <Modal
        titulo={form?._nuevo ? 'Nueva entrada' : 'Editar entrada'}
        abierto={!!form}
        onCerrar={() => setForm(null)}
        ancho={560}
      >
        {form && (
          <form onSubmit={enviar}>
            <div className={s.formGrid}>
              <CampoFecha label="Fecha" nombre="fecha" valor={form.fecha} onChange={set}
                pista="Déjala vacía si aún no se conoce" />
              <CampoTexto label="N° de recibo / folio" nombre="recibo" valor={form.recibo} onChange={set} />
              <div className="full">
                <CampoSelect label="Artículo" nombre="articulo_id" valor={form.articulo_id} onChange={set} requerido
                  opciones={articulos.map((a) => ({ valor: a.id, texto: `${a.id} · ${a.descripcion}` }))} />
              </div>
              <div className="full">
                <CampoSelect label="Donante" nombre="donante_id" valor={form.donante_id} onChange={set} requerido
                  opciones={donantes.map((t) => ({ valor: t.id, texto: t.nombre }))}
                  pista={donantes.length ? undefined : 'Registra primero el donante en la sección Donantes y beneficiarios'} />
              </div>
              <CampoNumero label="Cantidad recibida" nombre="cantidad" valor={form.cantidad} onChange={set} requerido min={1} />
              <div className="full">
                <CampoArea label="Observaciones" nombre="observaciones" valor={form.observaciones} onChange={set} filas={2} />
              </div>
            </div>

            {error && <div className="avisoError" style={{ marginTop: '0.5rem' }}>{error}</div>}

            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setForm(null)}>Cancelar</button>
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
