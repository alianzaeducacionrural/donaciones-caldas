// Campos de formulario. Firma uniforme:
//   ({ label, nombre, valor, onChange, requerido, pista, ... })
//   onChange(nombre, nuevoValor)
// Usan las clases globales .campo / .etiqueta / .control de index.css.

function Etiqueta({ label, requerido, htmlFor }) {
  return (
    <label className="etiqueta" htmlFor={htmlFor}>
      {label}
      {requerido && <span className="asterisco" aria-hidden="true">*</span>}
    </label>
  )
}

export function CampoTexto({ label, nombre, valor, onChange, requerido, pista, tipo = 'text', placeholder, autoFocus }) {
  return (
    <div className="campo">
      <Etiqueta label={label} requerido={requerido} htmlFor={nombre} />
      <input
        id={nombre}
        className="control"
        type={tipo}
        value={valor ?? ''}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(nombre, e.target.value)}
      />
      {pista && <span className="pista">{pista}</span>}
    </div>
  )
}

export function CampoNumero({ label, nombre, valor, onChange, requerido, pista, min = 0, max, placeholder }) {
  return (
    <div className="campo">
      <Etiqueta label={label} requerido={requerido} htmlFor={nombre} />
      <input
        id={nombre}
        className="control"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={valor ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(nombre, e.target.value === '' ? '' : Number(e.target.value))}
      />
      {pista && <span className="pista">{pista}</span>}
    </div>
  )
}

export function CampoFecha({ label, nombre, valor, onChange, requerido, pista }) {
  return (
    <div className="campo">
      <Etiqueta label={label} requerido={requerido} htmlFor={nombre} />
      <input
        id={nombre}
        className="control"
        type="date"
        value={valor ?? ''}
        onChange={(e) => onChange(nombre, e.target.value)}
      />
      {pista && <span className="pista">{pista}</span>}
    </div>
  )
}

export function CampoSelect({ label, nombre, valor, onChange, requerido, pista, opciones = [], placeholder = 'Seleccione…' }) {
  return (
    <div className="campo">
      <Etiqueta label={label} requerido={requerido} htmlFor={nombre} />
      <select
        id={nombre}
        className="control"
        value={valor ?? ''}
        onChange={(e) => onChange(nombre, e.target.value)}
      >
        <option value="" disabled>{placeholder}</option>
        {opciones.map((o) => {
          const val = typeof o === 'string' ? o : o.valor
          const txt = typeof o === 'string' ? o : o.texto
          return <option key={val} value={val}>{txt}</option>
        })}
      </select>
      {pista && <span className="pista">{pista}</span>}
    </div>
  )
}

export function CampoArea({ label, nombre, valor, onChange, requerido, pista, filas = 3, placeholder }) {
  return (
    <div className="campo">
      <Etiqueta label={label} requerido={requerido} htmlFor={nombre} />
      <textarea
        id={nombre}
        className="control"
        rows={filas}
        value={valor ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(nombre, e.target.value)}
      />
      {pista && <span className="pista">{pista}</span>}
    </div>
  )
}
