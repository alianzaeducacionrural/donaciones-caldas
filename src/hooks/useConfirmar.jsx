import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Modal from '../components/Modal'

const ConfirmarCtx = createContext(null)

// Reemplazo de window.confirm() con el mismo look & feel de la app.
// confirmar('¿Seguro?', { peligro: true, textoOk: 'Anular' }) devuelve una
// promesa que resuelve true/false, igual que confirm().
export function ConfirmarProvider({ children }) {
  const [estado, setEstado] = useState(null)
  const resolverRef = useRef(null)

  const confirmar = useCallback((mensaje, opciones = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setEstado({ mensaje, ...opciones })
    })
  }, [])

  const cerrar = (resultado) => {
    setEstado(null)
    resolverRef.current?.(resultado)
    resolverRef.current = null
  }

  return (
    <ConfirmarCtx.Provider value={confirmar}>
      {children}
      <Modal
        titulo={estado?.titulo || 'Confirmar'}
        abierto={!!estado}
        onCerrar={() => cerrar(false)}
        ancho={420}
      >
        {estado && (
          <>
            <p style={{ marginBottom: '1.35rem', lineHeight: 1.5 }}>{estado.mensaje}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.6rem' }}>
              <button type="button" className="btn btn-plano" onClick={() => cerrar(false)}>
                {estado.textoCancelar || 'Cancelar'}
              </button>
              <button
                type="button"
                className={estado.peligro ? 'btn btn-peligro-solido' : 'btn btn-primario'}
                onClick={() => cerrar(true)}
              >
                {estado.textoOk || 'Confirmar'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </ConfirmarCtx.Provider>
  )
}

export function useConfirmar() {
  const ctx = useContext(ConfirmarCtx)
  if (!ctx) throw new Error('useConfirmar debe usarse dentro de <ConfirmarProvider>')
  return ctx
}
