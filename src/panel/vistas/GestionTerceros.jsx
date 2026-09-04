import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Tabla from '../../components/Tabla'
import Modal from '../../components/Modal'
import { CampoTexto, CampoSelect, CampoArea } from '../../components/Campos'
import { useGuardar } from '../../hooks/useGuardar'
import { useConfirmar } from '../../hooks/useConfirmar'
import { crearTercero, editarTercero, desactivarTercero } from '../../utils/api'
import { MUNICIPIOS_CALDAS } from '../../utils/municipios'
import s from './vistas.module.css'

const TIPOS = ['DONANTE', 'BENEFICIARIO', 'AMBOS']

export default function GestionTerceros() {
  const { datos, sesion, recargar } = useOutletContext()
  const { terceros } = datos
  const { ejecutar, guardando, error, limpiarError } = useGuardar(recargar)
  const confirmar = useConfirmar()

  const [tipo, setTipo] = useState('')
  const [texto, setTexto] = useState('')
  const [form, setForm] = useState(null)

  const filas = useMemo(() => {
    let f = terceros.filter((t) => String(t.activo || 'SI').toUpperCase() !== 'NO')
    if (tipo) f = f.filter((t) => (t.tipo || '').toUpperCase() === tipo)
    if (texto) f = f.filter((t) => `${t.nombre} ${t.documento}`.toLowerCase().includes(texto.toLowerCase()))
    return f
  }, [terceros, tipo, texto])

  const set = (c, v) => setForm((p) => ({ ...p, [c]: v }))
  const abrirNuevo = () => { limpiarError(); setForm({ _nuevo: true, tipo: 'DONANTE', nombre: '', documento: '', telefono: '', correo: '', direccion: '', municipio: '', notas: '' }) }
  const abrirEdicion = (t) => { limpiarError(); setForm({ _nuevo: false, id: t.id, actualizado: t.actualizado, tipo: (t.tipo || 'DONANTE').toUpperCase(), nombre: t.nombre || '', documento: t.documento || '', telefono: t.telefono || '', correo: t.correo || '', direccion: t.direccion || '', municipio: t.municipio || '', notas: t.notas || '' }) }

  const enviar = async (ev) => {
    ev.preventDefault()
    const { _nuevo, id, actualizado, ...campos } = form
    try {
      if (_nuevo) await ejecutar(() => crearTercero(campos, sesion))
      else await ejecutar(() => editarTercero({ ...campos, id, actualizado }, sesion))
      setForm(null)
    } catch { /* */ }
  }

  const quitar = async (t) => {
    const ok = await confirmar(`¿Desactivar a ${t.nombre}?`, { peligro: true, textoOk: 'Desactivar' })
    if (!ok) return
    try { await ejecutar(() => desactivarTercero({ id: t.id }, sesion)) } catch { /* */ }
  }

  const columnas = [
    { clave: 'tipo', etiqueta: 'Tipo', ordenable: true, render: (t) => <span className="pildora pildora-neutra">{t.tipo}</span> },
    { clave: 'nombre', etiqueta: 'Nombre / organización', ordenable: true },
    { clave: 'documento', etiqueta: 'Documento / NIT', render: (t) => t.documento || '—' },
    { clave: 'telefono', etiqueta: 'Teléfono', render: (t) => t.telefono || '—' },
    { clave: 'municipio', etiqueta: 'Municipio', render: (t) => t.municipio || '—' },
    {
      clave: '_acc', etiqueta: '', alinear: 'right',
      render: (t) => (
        <span className={s.acciones2}>
          <button className={s.iconbtn} onClick={(ev) => { ev.stopPropagation(); abrirEdicion(t) }}>Editar</button>
          <button className={`${s.iconbtn} ${s.iconbtnPeligro}`} onClick={(ev) => { ev.stopPropagation(); quitar(t) }}>Quitar</button>
        </span>
      ),
    },
  ]

  return (
    <div className={s.pagina}>
      <div className={s.encabezado}>
        <div>
          <h1>Donantes y beneficiarios</h1>
          <p>{filas.length} registros en el directorio</p>
        </div>
        <button className="btn btn-primario" onClick={abrirNuevo}>+ Nuevo registro</button>
      </div>

      <div className={s.tarjeta}>
        <div className={s.filtros}>
          <select className="control" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="control" placeholder="Buscar por nombre o documento…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <Tabla columnas={columnas} filas={filas} ordenInicial={{ clave: 'nombre', dir: 'asc' }} porPagina={30}
          vacioTitulo="Sin registros" />
      </div>

      <Modal titulo={form?._nuevo ? 'Nuevo registro' : 'Editar registro'} abierto={!!form} onCerrar={() => setForm(null)} ancho={560}>
        {form && (
          <form onSubmit={enviar}>
            <div className={s.formGrid}>
              <CampoSelect label="Tipo" nombre="tipo" valor={form.tipo} onChange={set} requerido opciones={TIPOS} />
              <CampoTexto label="Documento / NIT" nombre="documento" valor={form.documento} onChange={set} />
              <div className="full">
                <CampoTexto label="Nombre / organización" nombre="nombre" valor={form.nombre} onChange={set} requerido />
              </div>
              <CampoTexto label="Teléfono" nombre="telefono" valor={form.telefono} onChange={set} tipo="tel" />
              <CampoTexto label="Correo" nombre="correo" valor={form.correo} onChange={set} tipo="email" />
              <div className="full">
                <CampoTexto label="Dirección / ubicación" nombre="direccion" valor={form.direccion} onChange={set} />
              </div>
              <CampoSelect label="Municipio" nombre="municipio" valor={form.municipio} onChange={set} opciones={MUNICIPIOS_CALDAS} />
            </div>
            <CampoArea label="Notas" nombre="notas" valor={form.notas} onChange={set} filas={2} />
            <p className="pista">Los datos personales (documento, teléfono, dirección) no se muestran en el panorama público.</p>
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
