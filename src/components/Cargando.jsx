import styles from './Cargando.module.css'

export default function Cargando({ texto = 'Cargando…', bloques = 0 }) {
  return (
    <div className={styles.envoltura} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.texto}>{texto}</p>
      {bloques > 0 && (
        <div className={styles.rejilla}>
          {Array.from({ length: bloques }).map((_, i) => (
            <div key={i} className={styles.esqueleto} style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      )}
    </div>
  )
}
