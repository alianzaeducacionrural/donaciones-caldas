import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Tabla from '../../components/Tabla'
import Semaforo from '../../components/Semaforo'
import Panel from '../../components/Panel'
import { articulosConStock } from '../../utils/agregados'
import { exportarCsv } from '../../utils/exportarCsv'
import { numero } from '../../utils/formatear'
import { glifoCategoria } from '../../utils/categorias'
import styles from './Disponibilidad.module.css'

const ESTADOS = [
  { valor: '', texto: 'Todos los estados' },
  { valor: 'ok', texto: 'Disponible' },
  { valor: 'bajo', texto: 'Stock bajo' },
  { valor: 'agotado', texto: 'Agotado' },
]

export default function Disponibilidad() {
  const { datos } = useOutletContext()
  const { articulos, entradas, salidas } = datos

  const filas = useMemo(
    () => articulosConStock(articulos, entradas, salidas),
    [articulos, entradas, salidas],
  )

  const categorias = useMemo(
    () => [...new Set(filas.map((f) => f.categoria))].sort(),
    [filas],
  )

  const [cat, setCat] = useState('')
  const [estado, setEstado] = useState('')
  const [texto, setTexto] = useState('')

  const filtradas = filas.filter((f) => {
    if (cat && f.categoria !== cat) return false
    if (estado && f.estado !== estado) return false
    if (texto && !`${f.id} ${f.descripcion}`.toLowerCase().includes(texto.toLowerCase())) return false
    return true
  })

  const columnas = [
    { clave: 'id', etiqueta: 'Código', ordenable: true, ancho: 90 },
    {
      clave: 'descripcion', etiqueta: 'Referencia', ordenable: true,
      render: (f) => (
        <span>
          <span aria-hidden="true" className={styles.glifo}>{glifoCategoria(f.categoria)}</span>
          {f.descripcion}
        </span>
      ),
    },
    { clave: 'categoria', etiqueta: 'Categoría', ordenable: true },
    { clave: 'unidad', etiqueta: 'Unidad', render: (f) => f.unidad || 'UNIDAD' },
    { clave: 'entradas', etiqueta: 'Recibido', alinear: 'right', ordenable: true, render: (f) => numero(f.entradas) },
    { clave: 'salidas', etiqueta: 'Entregado', alinear: 'right', ordenable: true, render: (f) => numero(f.salidas) },
    {
      clave: 'stock', etiqueta: 'Disponible', alinear: 'right', ordenable: true,
      render: (f) => <strong>{numero(f.stock)}</strong>,
    },
    { clave: 'estado', etiqueta: 'Estado', render: (f) => <Semaforo estado={f.estado} /> },
  ]

  const descargar = () => {
    exportarCsv(
      filtradas,
      [
        { clave: 'id', etiqueta: 'Código' },
        { clave: 'descripcion', etiqueta: 'Referencia' },
        { clave: 'categoria', etiqueta: 'Categoría' },
        { clave: 'unidad', etiqueta: 'Unidad' },
        { clave: 'entradas', etiqueta: 'Recibido' },
        { clave: 'salidas', etiqueta: 'Entregado' },
        { clave: 'stock', etiqueta: 'Disponible' },
        { clave: 'estado', etiqueta: 'Estado' },
      ],
      'disponibilidad-donaciones.csv',
    )
  }

  return (
    <Panel
      titulo="Disponibilidad de artículos"
      subtitulo={`${filtradas.length} de ${filas.length} referencias`}
      accion={<button className="btn btn-plano" onClick={descargar}>⭳ Exportar CSV</button>}
    >
      <div className={styles.filtros}>
        <input
          className="control"
          placeholder="Buscar por código o referencia…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <select className="control" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="control" value={estado} onChange={(e) => setEstado(e.target.value)}>
          {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
        </select>
      </div>

      <Tabla
        columnas={columnas}
        filas={filtradas}
        porPagina={30}
        ordenInicial={{ clave: 'stock', dir: 'desc' }}
        vacioTitulo="Ningún artículo coincide con los filtros"
      />
    </Panel>
  )
}
