import Contador from './Contador'
import styles from './TarjetaKpi.module.css'

// tono: 'amarillo' | 'vino' | 'ok' | 'bajo' | 'agotado' | 'neutro'
export default function TarjetaKpi({
  glifo,
  valor,
  sufijo = '',
  decimales = 0,
  etiqueta,
  detalle,
  tono = 'amarillo',
  indice = 0,
  animar = true,
}) {
  return (
    <article
      className={`${styles.tarjeta} ${styles[tono] || ''} entra`}
      style={{ animationDelay: `${indice * 0.06}s` }}
    >
      {glifo && <span className={styles.glifo} aria-hidden="true">{glifo}</span>}
      <div className={styles.valor}>
        {animar
          ? <Contador valor={valor} sufijo={sufijo} decimales={decimales} />
          : <span className="tabular">{valor}{sufijo}</span>}
      </div>
      <div className={styles.etiqueta}>{etiqueta}</div>
      {detalle && <div className={styles.detalle}>{detalle}</div>}
    </article>
  )
}
