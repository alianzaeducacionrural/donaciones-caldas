import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useDatos } from '../hooks/useDatos'
import Cargando from '../components/Cargando'
import isologo from '../assets/isologo.png'
import styles from './PublicoLayout.module.css'

const ENLACES = [
  { a: '/', txt: 'Resumen', fin: true },
  { a: '/disponibilidad', txt: 'Disponibilidad' },
  { a: '/municipios', txt: 'Municipios' },
  { a: '/donantes', txt: 'Donantes' },
]

export default function PublicoLayout() {
  const estado = useDatos(null)
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className={styles.pagina}>
      <header className={styles.encabezado}>
        <div className={`contenedor ${styles.barra}`}>
          <div className={styles.marca}>
            <img src={isologo} alt="Comité de Cafeteros de Caldas" className={styles.logo} />
          </div>

          <button
            className={styles.hamburguesa}
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label="Menú"
            aria-expanded={menuAbierto}
          >
            ☰
          </button>

          <nav className={`${styles.nav} ${menuAbierto ? styles.navAbierta : ''}`}>
            {ENLACES.map((e) => (
              <NavLink
                key={e.a}
                to={e.a}
                end={e.fin}
                className={({ isActive }) => (isActive ? `${styles.enlace} ${styles.activo}` : styles.enlace)}
                onClick={() => setMenuAbierto(false)}
              >
                {e.txt}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className={styles.titulo}>
          <div className="contenedor">
            <h1>Donaciones</h1>
            <p>{estado.datos?.config?.titulo || 'Comité de Cafeteros de Caldas'}</p>
          </div>
        </div>
      </header>

      <main className={`contenedor ${styles.contenido}`}>
        {estado.cargando && <Cargando texto="Cargando el panorama de donaciones…" bloques={4} />}
        {estado.error && (
          <div className="avisoError" style={{ margin: '2rem 0' }}>
            No se pudieron cargar los datos: {estado.error}
          </div>
        )}
        {!estado.cargando && !estado.error && <Outlet context={estado} />}
      </main>

      <footer className={styles.pie}>
        <div className="contenedor">
          <span>Comité de Cafeteros de Caldas · Federación Nacional de Cafeteros de Colombia</span>
          {estado.datos?.generado && (
            <span className={styles.actualizado}>
              Datos actualizados: {new Date(estado.datos.generado).toLocaleString('es-CO')}
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}
