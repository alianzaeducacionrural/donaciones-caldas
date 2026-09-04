import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Tabla from '../../components/Tabla'
import Modal from '../../components/Modal'
import { CampoTexto, CampoNumero, CampoFecha, CampoSelect } from '../../components/Campos'
import SelectorArticulo from '../../components/SelectorArticulo'
import { useGuardar } from '../../hooks/useGuardar'
import { crearSalida, editarSalida, anularSalida, anularActa, crearTercero } from '../../utils/api'
import { esSi, stockPorArticulo, siguienteRecibo, mesesDisponibles, agruparPorFolio } from '../../utils/agregados'
import { MUNICIPIOS_CALDAS } from '../../utils/municipios'
import { fechaCorta, fechaISO, numero } from '../../utils/formatear'
import { exportarCsv } from '../../utils/exportarCsv'
import { imprimirActa } from '../../utils/imprimirActa'
import s from './vistas.module.css'

const OTRO = '__otro__'
const LINEA_VACIA = () => ({ articulo_id: '', cantidad: '' })

export default function GestionSalidas() {
  const { datos, sesion, recargar } = useOutletContext()
  const { articulos, entradas, salidas, terceros, config } = datos
  const { ejecutar, guardando, error, limpiarError } = useGuardar(recargar)

  const stock = useMemo(() => stockPorArticulo(entradas, salidas), [entradas, salidas])
  const artMap = Object.fromEntries(articulos.map((a) => [a.id, a]))
  const beneficiarios = terceros.filter((t) => /BENEFICIARIO|AMBOS/i.test(t.tipo || ''))

  const [texto, setTexto] = useState('')
  const [fArticulo, setFArticulo] = useState('')
  const [fMunicipio, setFMunicipio] = useState('')
  const [fMes, setFMes] = useState('')
  const [vista, setVista] = useState('articulo') // 'articulo' | 'acta'
  const [nueva, setNueva] = useState(null) // form de acta nueva
  const [edicion, setEdicion] = useState(null) // form de línea individual
  const [detalleActa, setDetalleActa] = useState(null) // acta a mostrar en el modal "Ver"

  const meses = useMemo(() => mesesDisponibles(salidas), [salidas])
  const municipiosPresentes = useMemo(
    () => [...new Set(salidas.filter((x) => !esSi(x.anulado)).map((x) => x.municipio).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es')),
    [salidas],
  )

  const filas = useMemo(() => {
    let f = salidas.filter((x) => !esSi(x.anulado))
    if (fArticulo) f = f.filter((x) => x.articulo_id === fArticulo)
    if (fMunicipio) f = f.filter((x) => x.municipio === fMunicipio)
    if (fMes) f = f.filter((x) => String(x.fecha || '').startsWith(fMes))
    if (texto) {
      const q = texto.toLowerCase()
      f = f.filter((x) => `${x.acta} ${x.municipio} ${artMap[x.articulo_id]?.descripcion || ''}`.toLowerCase().includes(q))
    }
    return f
  }, [salidas, fArticulo, fMunicipio, fMes, texto, artMap])

  /* ── Acta nueva ── */
  const abrirNueva = () => {
    limpiarError()
    setNueva({
      fecha: fechaISO(new Date()),
      acta: siguienteRecibo(salidas, 'ENT-', 'acta'),
      municipioDefecto: '',
      beneficiario_id: '',
      beneficiario_nombre_nuevo: '',
      responsable: '',
      lineas: [LINEA_VACIA()],
    })
  }
  const setN = (campo, valor) => setNueva((p) => ({ ...p, [campo]: valor }))
  const setLinea = (i, campo, valor) =>
    setNueva((p) => ({ ...p, lineas: p.lineas.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)) }))
  const agregarLinea = () => setNueva((p) => ({ ...p, lineas: [...p.lineas, LINEA_VACIA()] }))
  const quitarLinea = (i) => setNueva((p) => ({ ...p, lineas: p.lineas.filter((_, j) => j !== i) }))

  const excede = (l) => {
    const disp = stock[l.articulo_id]?.stock ?? 0
    return l.articulo_id && Number(l.cantidad) > disp
  }
  const hayExceso = nueva?.lineas.some(excede)

  const enviarNueva = async (ev) => {
    ev.preventDefault()
    try {
      await ejecutar(async () => {
        let beneficiarioId = nueva.beneficiario_id
        let beneficiarioNombre = terceros.find((t) => t.id === nueva.beneficiario_id)?.nombre || ''

        if (beneficiarioId === OTRO) {
          const nombre = nueva.beneficiario_nombre_nuevo.trim()
          if (!nombre) throw new Error('Escribe el nombre del nuevo beneficiario.')
          const r = await crearTercero({ tipo: 'BENEFICIARIO', nombre }, sesion)
          beneficiarioId = r.id
          beneficiarioNombre = nombre
        }

        const payload = {
          fecha: nueva.fecha,
          acta: nueva.acta || undefined,
          municipioDefecto: nueva.municipioDefecto,
          beneficiario_id: beneficiarioId,
          beneficiario_nombre: beneficiarioNombre,
          responsable: nueva.responsable,
          lineas: nueva.lineas
            .filter((l) => l.articulo_id && l.cantidad)
            .map((l) => ({
              articulo_id: l.articulo_id,
              cantidad: Number(l.cantidad),
              municipio: nueva.municipioDefecto,
            })),
        }
        return crearSalida(payload, sesion)
      })
      setNueva(null)
    } catch { /* el error se muestra en el modal */ }
  }

  /* ── Editar línea ── */
  const abrirEdicion = (x) => {
    limpiarError()
    setEdicion({
      id: x.id, actualizado: x.actualizado,
      fecha: fechaISO(x.fecha), acta: x.acta || '',
      articulo_id: x.articulo_id, municipio: x.municipio || '',
      cantidad: x.cantidad || '', responsable: x.responsable || '',
    })
  }
  const setE = (campo, valor) => setEdicion((p) => ({ ...p, [campo]: valor }))
  const enviarEdicion = async (ev) => {
    ev.preventDefault()
    try {
      await ejecutar(() => editarSalida({
        id: edicion.id, actualizado: edicion.actualizado,
        fecha: edicion.fecha, municipio: edicion.municipio,
        cantidad: Number(edicion.cantidad), responsable: edicion.responsable,
      }, sesion))
      setEdicion(null)
    } catch { /* */ }
  }

  const anularLinea = async (x) => {
    if (!confirm(`¿Anular esta línea de la entrega ${x.acta}?`)) return
    try { await ejecutar(() => anularSalida({ id: x.id }, sesion)) } catch { /* */ }
  }
  const anularActaCompleta = async (acta) => {
    if (!confirm(`¿Anular TODA el acta ${acta} y devolver el stock?`)) return
    try { await ejecutar(() => anularActa({ acta }, sesion)) } catch { /* */ }
  }

  const verActa = (acta) => {
    const lineas = salidas.filter((x) => x.acta === acta && !esSi(x.anulado))
    imprimirActa(lineas, artMap)
  }

  const gruposActa = useMemo(() => agruparPorFolio(filas, 'acta').map((lineas) => ({
    _id: lineas[0].acta || lineas[0].id,
    acta: lineas[0].acta,
    fecha: lineas.find((l) => l.fecha)?.fecha || '',
    municipios: [...new Set(lineas.map((l) => l.municipio).filter(Boolean))].join(', '),
    articulos: lineas.length,
    total: lineas.reduce((n, l) => n + (Number(l.cantidad) || 0), 0),
    responsable: lineas.find((l) => l.responsable)?.responsable || '',
    lineas,
  })), [filas])

  const columnasActa = [
    { clave: 'fecha', etiqueta: 'Fecha', ordenable: true, render: (g) => fechaCorta(g.fecha) },
    { clave: 'acta', etiqueta: 'Acta', ordenable: true, render: (g) => g.acta || <span className={s.marcaPend}>s/n</span> },
    { clave: 'municipios', etiqueta: 'Municipio(s)' },
    { clave: 'articulos', etiqueta: 'Artículos', alinear: 'right', ordenable: true },
    { clave: 'total', etiqueta: 'Unidades', alinear: 'right', ordenable: true, render: (g) => <strong>{numero(g.total)}</strong> },
    { clave: 'responsable', etiqueta: 'Responsable', render: (g) => g.responsable || '—' },
    {
      clave: '_acc', etiqueta: '', alinear: 'right',
      render: (g) => (
        <span className={s.acciones2}>
          <button className={s.iconbtn} onClick={(ev) => { ev.stopPropagation(); setDetalleActa(g) }}>Ver</button>
          <button className={s.iconbtn} title="Descargar el acta completa en PDF"
            onClick={(ev) => { ev.stopPropagation(); imprimirActa(g.lineas, artMap) }}>⭳ PDF</button>
          {g.acta && (
            <button className={`${s.iconbtn} ${s.iconbtnPeligro}`}
              onClick={(ev) => { ev.stopPropagation(); anularActaCompleta(g.acta) }}>Anular</button>
          )}
        </span>
      ),
    },
  ]

  const columnas = [
    { clave: 'fecha', etiqueta: 'Fecha', ordenable: true, render: (x) => fechaCorta(x.fecha) },
    {
      clave: 'acta', etiqueta: 'Acta', ordenable: true,
      render: (x) => (
        <button className={s.iconbtn} title="Anular acta completa"
          onClick={(ev) => { ev.stopPropagation(); anularActaCompleta(x.acta) }}>
          {x.acta}
        </button>
      ),
    },
    { clave: 'articulo_id', etiqueta: 'Artículo', render: (x) => artMap[x.articulo_id]?.descripcion || x.articulo_id },
    { clave: 'municipio', etiqueta: 'Municipio', ordenable: true },
    { clave: 'cantidad', etiqueta: 'Cantidad', alinear: 'right', ordenable: true, render: (x) => numero(x.cantidad) },
    { clave: 'responsable', etiqueta: 'Responsable', render: (x) => x.responsable || '—' },
    {
      clave: '_acc', etiqueta: '', alinear: 'right',
      render: (x) => (
        <span className={s.acciones2}>
          <button className={s.iconbtn} title="Descargar el acta completa en PDF"
            onClick={(ev) => { ev.stopPropagation(); verActa(x.acta) }}>⭳ Acta PDF</button>
          <button className={s.iconbtn} onClick={(ev) => { ev.stopPropagation(); abrirEdicion(x) }}>Editar</button>
          <button className={`${s.iconbtn} ${s.iconbtnPeligro}`} onClick={(ev) => { ev.stopPropagation(); anularLinea(x) }}>Anular</button>
        </span>
      ),
    },
  ]

  const descargar = () => exportarCsv(
    filas.map((x) => ({ ...x, articulo: artMap[x.articulo_id]?.descripcion || x.articulo_id })),
    [
      { clave: 'fecha', etiqueta: 'Fecha', formato: fechaISO },
      { clave: 'acta', etiqueta: 'Acta' },
      { clave: 'articulo', etiqueta: 'Artículo' },
      { clave: 'municipio', etiqueta: 'Municipio' },
      { clave: 'cantidad', etiqueta: 'Cantidad' },
      { clave: 'responsable', etiqueta: 'Responsable' },
    ],
    'salidas-donaciones.csv',
  )

  return (
    <div className={s.pagina}>
      <div className={s.encabezado}>
        <div>
          <h1>Salidas y entregas</h1>
          <p>{filas.length} líneas de entrega registradas</p>
        </div>
        <div className={s.acciones}>
          <button className="btn btn-plano" onClick={descargar}>⭳ CSV</button>
          <button className="btn btn-primario" onClick={abrirNueva}>+ Nueva entrega</button>
        </div>
      </div>

      <div className={s.tarjeta}>
        <div className={s.filtros}>
          <select className="control" value={fArticulo} onChange={(e) => setFArticulo(e.target.value)}>
            <option value="">Todos los artículos</option>
            {articulos.map((a) => <option key={a.id} value={a.id}>{a.descripcion}</option>)}
          </select>
          <select className="control" value={fMunicipio} onChange={(e) => setFMunicipio(e.target.value)}>
            <option value="">Todos los municipios</option>
            {municipiosPresentes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="control" value={fMes} onChange={(e) => setFMes(e.target.value)}>
            <option value="">Todos los meses</option>
            {meses.map((m) => <option key={m.valor} value={m.valor}>{m.texto}</option>)}
          </select>
          <input className="control" placeholder="Buscar acta, municipio o artículo…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>

        <div className={s.vistaToggle} role="tablist">
          <button type="button" role="tab" aria-selected={vista === 'articulo'}
            className={`${s.vistaBtn} ${vista === 'articulo' ? s.vistaActivo : ''}`}
            onClick={() => setVista('articulo')}>Por artículo</button>
          <button type="button" role="tab" aria-selected={vista === 'acta'}
            className={`${s.vistaBtn} ${vista === 'acta' ? s.vistaActivo : ''}`}
            onClick={() => setVista('acta')}>Por acta</button>
        </div>

        {vista === 'articulo' ? (
          <Tabla columnas={columnas} filas={filas} ordenInicial={{ clave: 'fecha', dir: 'desc' }} porPagina={25}
            vacioTitulo="Sin entregas registradas" />
        ) : (
          <Tabla columnas={columnasActa} filas={gruposActa} claveFila="_id" ordenInicial={{ clave: 'fecha', dir: 'desc' }} porPagina={25}
            onFila={(g) => setDetalleActa(g)} vacioTitulo="Sin actas registradas" />
        )}
      </div>

      {/* ── Modal acta nueva ── */}
      <Modal titulo="Nueva entrega" abierto={!!nueva} onCerrar={() => setNueva(null)} ancho={720}>
        {nueva && (
          <form onSubmit={enviarNueva}>
            <div className={s.formGrid}>
              <CampoFecha label="Fecha" nombre="fecha" valor={nueva.fecha} onChange={setN} requerido />
              <CampoTexto label="N° de acta" nombre="acta" valor={nueva.acta} onChange={setN}
                pista="Consecutivo sugerido; puedes cambiarlo" />
              <CampoSelect label="Municipio" nombre="municipioDefecto" valor={nueva.municipioDefecto}
                onChange={setN} requerido opciones={MUNICIPIOS_CALDAS} />
              <CampoSelect label="Beneficiario" nombre="beneficiario_id" valor={nueva.beneficiario_id} onChange={setN}
                opciones={[...beneficiarios.map((t) => ({ valor: t.id, texto: t.nombre })), { valor: OTRO, texto: 'Otro (nuevo beneficiario)' }]} />
              {nueva.beneficiario_id === OTRO && (
                <div className="full">
                  <CampoTexto label="Nombre del nuevo beneficiario" nombre="beneficiario_nombre_nuevo"
                    valor={nueva.beneficiario_nombre_nuevo} onChange={setN} requerido autoFocus />
                </div>
              )}
              <CampoTexto label="Responsable de la entrega" nombre="responsable" valor={nueva.responsable} onChange={setN} />
            </div>

            <p className="etiqueta" style={{ marginTop: '0.5rem' }}>Artículos entregados</p>
            <div className={s.lineas}>
              {nueva.lineas.map((l, i) => {
                const disp = stock[l.articulo_id]?.stock ?? null
                return (
                  <div className={s.linea} key={i}>
                    <SelectorArticulo
                      label="Artículo" valor={l.articulo_id}
                      onChange={(_, v) => setLinea(i, 'articulo_id', v)}
                      articulos={articulos} stock={stock}
                      categorias={config?.categorias} unidades={config?.unidades}
                      sesion={sesion} recargar={recargar}
                    />
                    <CampoNumero label="Cantidad" nombre={`cant-${i}`} valor={l.cantidad}
                      onChange={(_, v) => setLinea(i, 'cantidad', v)} min={1}
                      pista={disp != null ? `disp. ${numero(disp)}` : undefined} />
                    {nueva.lineas.length > 1 && (
                      <button type="button" className={s.quitar} onClick={() => quitarLinea(i)} aria-label="Quitar">✕</button>
                    )}
                    {excede(l) && <div className="avisoError" style={{ gridColumn: '1 / -1' }}>Excede el stock disponible</div>}
                  </div>
                )
              })}
            </div>
            <button type="button" className="btn btn-plano" onClick={agregarLinea}>+ Agregar artículo</button>

            {error && <div className="avisoError" style={{ marginTop: '0.75rem' }}>{error}</div>}

            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setNueva(null)}>Cancelar</button>
              <button className="btn btn-primario" disabled={guardando || hayExceso}>
                {guardando ? 'Guardando…' : 'Registrar entrega'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: ver acta completa ── */}
      <Modal titulo={`Acta ${detalleActa?.acta || '(sin número)'}`} abierto={!!detalleActa} onCerrar={() => setDetalleActa(null)} ancho={620}>
        {detalleActa && (
          <>
            <div className={s.detalleMeta}>
              <div><b>Fecha:</b>{fechaCorta(detalleActa.fecha)}</div>
              <div><b>Municipio(s):</b>{detalleActa.municipios || '—'}</div>
              <div><b>Responsable:</b>{detalleActa.responsable || '—'}</div>
              <div><b>Artículos:</b>{detalleActa.articulos}</div>
            </div>
            <table className={s.detalleTabla}>
              <thead>
                <tr><th>Artículo</th><th>Municipio</th><th style={{ textAlign: 'right' }}>Cantidad</th></tr>
              </thead>
              <tbody>
                {detalleActa.lineas.map((l) => (
                  <tr key={l.id}>
                    <td>{artMap[l.articulo_id]?.descripcion || l.articulo_id}</td>
                    <td>{l.municipio}</td>
                    <td style={{ textAlign: 'right' }}>{numero(l.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>Total</td><td style={{ textAlign: 'right' }}>{numero(detalleActa.total)}</td></tr>
              </tfoot>
            </table>
            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setDetalleActa(null)}>Cerrar</button>
              <button type="button" className="btn btn-primario" onClick={() => imprimirActa(detalleActa.lineas, artMap)}>⭳ Descargar PDF</button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Modal editar línea ── */}
      <Modal titulo="Editar línea de entrega" abierto={!!edicion} onCerrar={() => setEdicion(null)} ancho={520}>
        {edicion && (
          <form onSubmit={enviarEdicion}>
            <p className="pista" style={{ marginBottom: '0.75rem' }}>
              Acta {edicion.acta} · {artMap[edicion.articulo_id]?.descripcion}
            </p>
            <div className={s.formGrid}>
              <CampoFecha label="Fecha" nombre="fecha" valor={edicion.fecha} onChange={setE} requerido />
              <CampoNumero label="Cantidad" nombre="cantidad" valor={edicion.cantidad} onChange={setE} requerido min={1} />
              <CampoSelect label="Municipio" nombre="municipio" valor={edicion.municipio} onChange={setE} requerido
                opciones={MUNICIPIOS_CALDAS} />
              <CampoTexto label="Responsable" nombre="responsable" valor={edicion.responsable} onChange={setE} />
            </div>
            {error && <div className="avisoError" style={{ marginTop: '0.5rem' }}>{error}</div>}
            <div className={s.pieForm}>
              <button type="button" className="btn btn-plano" onClick={() => setEdicion(null)}>Cancelar</button>
              <button className="btn btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
