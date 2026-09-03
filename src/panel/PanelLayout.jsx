import { useState } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { useSesion } from '../hooks/useSesion'
import { useDatos } from '../hooks/useDatos'
import Acceso from './Acceso'
import Cargando from '../components/Cargando'
import { inventarioCuadra, resumen } from '../utils/agregados'
import { numero } from '../utils/formatear'
import isologo from '../assets/isologo-blanco.png'
import styles from './PanelLayout.module.css'

const ENLACES = [
  { a: '/panel', txt: 'Resumen', fin: true, glifo: '▤' },
  { a: '/panel/entradas', txt: 'Entradas', glifo: '↓' },
  { a: '/panel/salidas', txt: 'Salidas', glifo: '↑' },
  { a: '/panel/articulos', txt: 'Artículos', glifo: '▦' },
  { a: '/panel/terceros', txt: 'Donantes y beneficiarios', glifo: '◈' },
  { a: '/panel/auditoria', txt: 'Auditoría', glifo: '≡' },
]

export default function PanelLayout() {
  const { sesion, activa, ingresar, cambiarOperador, salir } = useSesion()
  const estado = useDatos(activa ? sesion : null)
  const [menu, setMenu] = useState(false)
  const location = useLocation()

  if (!activa) return <Acceso onIngresar={ingresar} />

  const d = estado.datos
  const cuadre = d ? inventarioCuadra(d.articulos, d.entradas, d.salidas) : null
  const r = d ? resumen(d.articulos, d.entradas, d.salidas, d.terceros) : null

  const ctx = {
    ...estado,
    sesion,
    recargar: estado.recargar,
  }

  return (
    <div className={styles.marco}>
      <aside className={`${styles.barra} ${menu ? styles.barraAbierta : ''}`}>
        <div className={styles.marca}>
          <img src={isologo} alt="Comité de Cafeteros de Caldas" />
        </div>
        <nav className={styles.nav}>
          {ENLACES.map((e) => (
            <NavLink
              key={e.a}
              to={e.a}
              end={e.fin}
              className={({ isActive }) => (isActive ? `${styles.enlace} ${styles.activo}` : styles.enlace)}
              onClick={() => setMenu(false)}
            >
              <span aria-hidden="true" className={styles.glifo}>{e.glifo}</span>
              {e.txt}
            </NavLink>
          ))}
        </nav>
        <div className={styles.pie}>
          <label className={styles.opLabel}>Operador</label>
          <select
            className={styles.opSelect}
            value={sesion.operador || ''}
            onChange={(e) => cambiarOperador(e.target.value)}
          >
            <option value={sesion.operador || ''}>{sesion.operador || 'Sin nombre'}</option>
            {(d?.config?.operadores || []).filter((o) => o !== sesion.operador).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <button className={styles.salir} onClick={salir}>Cerrar sesión</button>
          <Link to="/" className={styles.publico}>Ver panorama público ↗</Link>
        </div>
      </aside>

      <div className={styles.principal}>
        <header className={styles.superior}>
          <button className={styles.hamburguesa} onClick={() => setMenu((v) => !v)} aria-label="Menú">☰</button>
          <div className={styles.estado}>
            {cuadre && (
              <span className={cuadre.cuadra ? styles.chipOk : styles.chipMal}>
                {cuadre.cuadra ? '✓ Inventario cuadrado' : `⚠ Descuadre: ${numero(Math.abs(cuadre.diferencia))}`}
              </span>
            )}
            {r?.pendientes > 0 && (
              <span className={styles.chipAviso}>{r.pendientes} entradas por completar</span>
            )}
          </div>
          <button className={styles.recargar} onClick={estado.recargar} disabled={estado.cargando}>
            ↻ Actualizar
          </button>
        </header>

        <main className={styles.contenido} key={location.pathname}>
          {estado.cargando && !d && <Cargando texto="Cargando datos del panel…" bloques={3} />}
          {estado.error && <div className="avisoError">{estado.error}</div>}
          {d && <Outlet context={ctx} />}
        </main>
      </div>

      {menu && <div className={styles.velo} onClick={() => setMenu(false)} />}
    </div>
  )
}
