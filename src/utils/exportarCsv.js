// Exporta a CSV con separador ';', CRLF y BOM UTF-8 para que Excel
// (configuración regional de Colombia) lo abra sin pasos extra.

function celda(valor) {
  const s = String(valor ?? '')
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

// columnas: [{ clave, etiqueta, formato? }]
export function exportarCsv(filas, columnas, nombreArchivo = 'datos.csv') {
  const encabezado = columnas.map((c) => celda(c.etiqueta)).join(';')
  const cuerpo = filas.map((fila) =>
    columnas
      .map((c) => {
        const bruto = fila[c.clave]
        return celda(c.formato ? c.formato(bruto, fila) : bruto)
      })
      .join(';'),
  )

  const contenido = '﻿' + [encabezado, ...cuerpo].join('\r\n')
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
