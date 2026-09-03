import styles from './Vacio.module.css'

export default function Vacio({ glifo = '∅', titulo = 'Sin datos', children }) {
  return (
    <div className={styles.envoltura}>
      <span className={styles.glifo} aria-hidden="true">{glifo}</span>
      <p className={styles.titulo}>{titulo}</p>
      {children && <p className={styles.detalle}>{children}</p>}
    </div>
  )
}
