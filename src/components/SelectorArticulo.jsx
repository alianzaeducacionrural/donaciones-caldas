import { useState } from 'react'
import { CampoTexto, CampoSelect } from './Campos'
import Semaforo from './Semaforo'
import { useGuardar } from '../hooks/useGuardar'
import { crearArticulo } from '../utils/api'
import { asegurarOpcion } from '../utils/opcionesConfig'
import { estadoStock } from '../utils/agregados'
import { numero } from '../utils/formatear'

const NUEVO = '__nuevo__'
const OTRO = '__otro__'

// Select de artículo reutilizado en Entradas y Salidas: permite crear un
// artículo nuevo sin salir del formulario (con su propia categoría/unidad
// "Otro" si hace falta) y muestra el stock del elegido.
export default function SelectorArticulo({
  label = 'Artículo', nombre = 'articulo_id', valor, onChange,
  articulos, stock = {}, categorias = [], unidades = [], sesion, recargar,
  requerido, pista,
}) {
  const [agregando, setAgregando] = useState(false)
  const [nuevo, setNuevo] = useState({ descripcion: '', categoria: '', categoriaOtro: '', unidad: unidades[0] || '', unidadOtro: '' })
  const { ejecutar, guardando, error, limpiarError } = useGuardar(recargar)

  const elegir = (v) => {
    if (v === NUEVO) {
      limpiarError()
      setNuevo({ descripcion: '', categoria: '', categoriaOtro: '', unidad: unidades[0] || '', unidadOtro: '' })
      setAgregando(true)
      onChange(nombre, '')
    } else {
      setAgregando(false)
      onChange(nombre, v)
    }
  }

  const setN = (campo, v) => setNuevo((p) => ({ ...p, [campo]: v }))

  const faltaOtro = (nuevo.categoria === OTRO && !nuevo.categoriaOtro.trim())
    || (nuevo.unidad === OTRO && !nuevo.unidadOtro.trim())

  const crear = async () => {
    if (!nuevo.descripcion.trim() || !nuevo.categoria || faltaOtro) return
    try {
      await ejecutar(async () => {
        const categoriaFinal = nuevo.categoria === OTRO
          ? await asegurarOpcion(categorias, nuevo.categoriaOtro, 'categorias', sesion)
          : nuevo.categoria
        const unidadFinal = nuevo.unidad === OTRO
          ? await asegurarOpcion(unidades, nuevo.unidadOtro, 'unidades', sesion)
          : nuevo.unidad
        const r = await crearArticulo({ descripcion: nuevo.descripcion, categoria: categoriaFinal, unidad: unidadFinal }, sesion)
        onChange(nombre, r.id)
        return r
      })
      setAgregando(false)
    } catch {
      /* el error se muestra debajo del mini-formulario */
    }
  }

  const info = valor && stock[valor] ? { ...stock[valor], estado: estadoStock(stock[valor].stock) } : null

  return (
    <div className="campo">
      <CampoSelect
        label={label} nombre={nombre} valor={agregando ? NUEVO : (valor || '')}
        onChange={(_, v) => elegir(v)} requerido={requerido} pista={pista}
        opciones={[
          ...articulos.map((a) => ({ valor: a.id, texto: a.descripcion })),
          { valor: NUEVO, texto: '+ Agregar artículo nuevo…' },
        ]}
      />

      {info && (
        <p style={{ margin: '-0.6rem 0 1rem', fontSize: '.82rem', color: 'var(--texto-suave)' }}>
          Stock actual: <strong>{numero(info.stock)}</strong>{' '}
          <Semaforo estado={info.estado} />
        </p>
      )}

      {agregando && (
        <div style={{
          background: 'var(--superficie-2)', border: '1px dashed var(--borde-fuerte)',
          borderRadius: 'var(--radio)', padding: '.9rem', marginTop: '-0.4rem', marginBottom: '1.25rem',
        }}>
          <CampoTexto label="Descripción del artículo nuevo" nombre="descripcion" valor={nuevo.descripcion} onChange={setN} requerido autoFocus />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <CampoSelect label="Categoría" nombre="categoria" valor={nuevo.categoria} onChange={setN} requerido
              opciones={[...categorias, { valor: OTRO, texto: 'Otro (nueva categoría)' }]} />
            <CampoSelect label="Unidad" nombre="unidad" valor={nuevo.unidad} onChange={setN}
              opciones={[...unidades, { valor: OTRO, texto: 'Otro (nueva unidad)' }]} />
          </div>
          {nuevo.categoria === OTRO && (
            <CampoTexto label="Nombre de la nueva categoría" nombre="categoriaOtro" valor={nuevo.categoriaOtro} onChange={setN} requerido />
          )}
          {nuevo.unidad === OTRO && (
            <CampoTexto label="Nombre de la nueva unidad" nombre="unidadOtro" valor={nuevo.unidadOtro} onChange={setN} requerido />
          )}
          {error && <div className="avisoError" style={{ marginBottom: '.75rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button type="button" className="btn btn-amarillo" disabled={guardando || !nuevo.descripcion.trim() || !nuevo.categoria || faltaOtro} onClick={crear}>
              {guardando ? 'Creando…' : 'Crear y usar este artículo'}
            </button>
            <button type="button" className="btn btn-plano" onClick={() => { setAgregando(false); onChange(nombre, '') }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
