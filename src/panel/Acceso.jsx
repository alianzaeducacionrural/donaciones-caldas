import { useState } from 'react'
import { Link } from 'react-router-dom'
import isologo from '../assets/isologo.png'
import styles from './Acceso.module.css'

export default function Acceso({ onIngresar }) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await onIngresar(clave)
    } catch (err) {
      setError(
        err.codigo === 'CLAVE_INVALIDA' || /clave/i.test(err.message)
          ? 'Clave incorrecta.'
          : err.message,
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className={styles.pantalla}>
      <div className={`${styles.tarjeta} entra`}>
        <img src={isologo} alt="Comité de Cafeteros de Caldas" className={styles.logo} />
        <h1 className={styles.titulo}>Gestión de donaciones</h1>
        <p className={styles.sub}>Acceso restringido</p>

        <form onSubmit={enviar}>
          <div className="campo">
            <label className="etiqueta" htmlFor="clave">Clave</label>
            <input
              id="clave"
              className="control"
              type="password"
              autoFocus
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>
          {error && <div className="avisoError">{error}</div>}
          <button
            className="btn btn-primario"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={cargando || !clave}
          >
            {cargando ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>

        <Link to="/" className={styles.volver}>← Volver al panorama público</Link>
      </div>
    </div>
  )
}
