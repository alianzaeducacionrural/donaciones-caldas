import { useState } from 'react'
import { Link } from 'react-router-dom'
import isologo from '../assets/isologo.png'
import styles from './Acceso.module.css'

export default function Acceso({ onIngresar }) {
  const [clave, setClave] = useState('')
  const [operador, setOperador] = useState('')
  const [operadores, setOperadores] = useState([])
  const [paso, setPaso] = useState('clave') // 'clave' | 'operador'
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const enviarClave = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const r = await onIngresar(clave, null)
      if (r.requiereOperador) {
        setOperadores(r.operadores || [])
        setPaso('operador')
      }
      // si hay 0 o 1 operador, useSesion ya dejó la sesión lista
    } catch (err) {
      setError(err.codigo === 'CLAVE_INVALIDA' || /clave/i.test(err.message)
        ? 'Clave incorrecta.'
        : err.message)
    } finally {
      setCargando(false)
    }
  }

  const confirmarOperador = async (e) => {
    e.preventDefault()
    setCargando(true)
    try {
      await onIngresar(clave, operador)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className={styles.pantalla}>
      <div className={`${styles.tarjeta} entra`}>
        <img src={isologo} alt="Comité de Cafeteros de Caldas" className={styles.logo} />
        <h1 className={styles.titulo}>Panel de gestión</h1>
        <p className={styles.sub}>Sistema de Donaciones · acceso restringido</p>

        {paso === 'clave' && (
          <form onSubmit={enviarClave}>
            <div className="campo">
              <label className="etiqueta" htmlFor="clave">Clave del panel</label>
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
            <button className="btn btn-primario" style={{ width: '100%', marginTop: '0.75rem' }} disabled={cargando || !clave}>
              {cargando ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>
        )}

        {paso === 'operador' && (
          <form onSubmit={confirmarOperador}>
            <div className="campo">
              <label className="etiqueta" htmlFor="op">¿Quién está registrando?</label>
              <select id="op" className="control" value={operador} onChange={(e) => setOperador(e.target.value)} required>
                <option value="">Seleccione…</option>
                {operadores.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <button className="btn btn-primario" style={{ width: '100%', marginTop: '0.5rem' }} disabled={cargando || !operador}>
              Continuar
            </button>
          </form>
        )}

        <Link to="/" className={styles.volver}>← Volver al panorama público</Link>
      </div>
      <p className={styles.nota}>
        Esta clave restringe el acceso al equipo del Comité. No sustituye una autenticación completa.
      </p>
    </div>
  )
}
