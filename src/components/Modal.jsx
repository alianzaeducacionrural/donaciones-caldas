import { useEffect } from 'react'
import styles from './Modal.module.css'

export default function Modal({ titulo, abierto, onCerrar, children, ancho = 520 }) {
  useEffect(() => {
    if (!abierto) return
    const alTecla = (e) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', alTecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTecla)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div className={styles.fondo} onMouseDown={onCerrar}>
      <div
        className={`${styles.caja} entra`}
        style={{ maxWidth: ancho }}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.cabecera}>
          <h2 className={styles.titulo}>{titulo}</h2>
          <button className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>
        <div className={styles.cuerpo}>{children}</div>
      </div>
    </div>
  )
}
