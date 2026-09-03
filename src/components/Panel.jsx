import styles from './Panel.module.css'

// Contenedor de gráfica: título, subtítulo, acción opcional y nota al pie.
export default function Panel({ titulo, subtitulo, accion, pie, ancho = 'normal', children }) {
  return (
    <section className={`${styles.panel} ${styles[ancho] || ''} entra`}>
      {(titulo || accion) && (
        <header className={styles.cabecera}>
          <div>
            {titulo && <h3 className={styles.titulo}>{titulo}</h3>}
            {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
          </div>
          {accion && <div className={styles.accion}>{accion}</div>}
        </header>
      )}
      <div className={styles.cuerpo}>{children}</div>
      {pie && <p className={styles.pie}>{pie}</p>}
    </section>
  )
}
