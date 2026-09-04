import isologo from '../assets/isologo.png'
import { fechaCorta, numero } from './formatear'

const VINO = [151, 20, 39]
const TEXTO = [43, 26, 14]
const SUAVE = [110, 96, 84]
const AMARILLO_CLARO = [254, 246, 224]

const MARGEN = 15
const ANCHO_PAG = 210 // A4 mm

let logoDataUrl = null
async function obtenerLogo() {
  if (logoDataUrl) return logoDataUrl
  const res = await fetch(isologo)
  const blob = await res.blob()
  logoDataUrl = await new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(lector.result)
    lector.onerror = reject
    lector.readAsDataURL(blob)
  })
  return logoDataUrl
}

const COLS = [
  { titulo: 'Código', ancho: 22 },
  { titulo: 'Artículo', ancho: 68 },
  { titulo: 'Categoría', ancho: 32 },
  { titulo: 'Unidad', ancho: 26 },
  { titulo: 'Cantidad', ancho: 32, num: true },
]

// Genera y descarga el acta de entrega como PDF real (sin diálogo de
// impresión del navegador). Usa jsPDF con dibujo manual — sin plantillas
// HTML ni la extensión .html() de la librería.
export async function imprimirActa(lineas, artMap) {
  if (!lineas.length) return

  const acta = lineas[0].acta
  const fecha = lineas.find((l) => l.fecha)?.fecha || ''
  const responsable = lineas.find((l) => l.responsable)?.responsable || ''
  const beneficiario = lineas.find((l) => l.beneficiario_nombre)?.beneficiario_nombre || ''
  const municipios = [...new Set(lineas.map((l) => l.municipio).filter(Boolean))].join(', ')
  const total = lineas.reduce((n, l) => n + (Number(l.cantidad) || 0), 0)

  const [{ jsPDF }, logo] = await Promise.all([
    import('jspdf'),
    obtenerLogo().catch(() => null),
  ])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const anchoUtil = ANCHO_PAG - MARGEN * 2
  let y = MARGEN

  // ── Encabezado ──
  if (logo) {
    const alto = 12
    const ancho = alto * 3.6
    doc.addImage(logo, 'PNG', MARGEN, y, ancho, alto)
  }
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...VINO)
  doc.text('Comité de Cafeteros de Caldas', MARGEN + 46, y + 5)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...SUAVE)
  doc.text('Sistema de Gestión de Donaciones', MARGEN + 46, y + 10)
  y += 16
  doc.setDrawColor(...VINO).setLineWidth(0.8)
  doc.line(MARGEN, y, ANCHO_PAG - MARGEN, y)
  y += 10

  // ── Título ──
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...TEXTO)
  doc.text('ACTA DE ENTREGA DE DONACIONES', ANCHO_PAG / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...SUAVE)
  doc.text(`N° ${acta}`, ANCHO_PAG / 2, y, { align: 'center' })
  y += 11

  // ── Datos de la entrega ──
  const campo = (etiqueta, valor, x) => {
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...SUAVE)
    doc.text(etiqueta, x, y)
    doc.setFont('helvetica', 'normal').setTextColor(...TEXTO)
    doc.text(valor || '—', x + 42, y)
  }
  campo('Fecha:', fechaCorta(fecha), MARGEN)
  campo('Municipio(s) de destino:', municipios, MARGEN + 95)
  y += 6
  campo('Beneficiario:', beneficiario, MARGEN)
  campo('Responsable de la entrega:', responsable, MARGEN + 95)
  y += 10

  // ── Tabla ──
  const alturaFila = 7
  const dibujarEncabezadoTabla = () => {
    doc.setFillColor(...AMARILLO_CLARO)
    doc.rect(MARGEN, y, anchoUtil, alturaFila, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEXTO)
    let x = MARGEN
    COLS.forEach((c) => {
      doc.text(c.titulo.toUpperCase(), c.num ? x + c.ancho - 2 : x + 2, y + alturaFila - 2.4, c.num ? { align: 'right' } : {})
      x += c.ancho
    })
    y += alturaFila
  }

  dibujarEncabezadoTabla()
  doc.setFont('helvetica', 'normal').setFontSize(9)

  lineas.forEach((l) => {
    if (y + alturaFila > 297 - MARGEN - 45) {
      doc.addPage()
      y = MARGEN
      dibujarEncabezadoTabla()
      doc.setFont('helvetica', 'normal').setFontSize(9)
    }
    const a = artMap[l.articulo_id] || {}
    const fila = [
      l.articulo_id,
      a.descripcion || '',
      a.categoria || '',
      a.unidad || 'UNIDAD',
      numero(l.cantidad),
    ]
    let x = MARGEN
    doc.setTextColor(...TEXTO)
    fila.forEach((valor, i) => {
      const c = COLS[i]
      const texto = doc.splitTextToSize(String(valor), c.ancho - 4)[0] || ''
      doc.text(texto, c.num ? x + c.ancho - 2 : x + 2, y + alturaFila - 2.4, c.num ? { align: 'right' } : {})
      x += c.ancho
    })
    doc.setDrawColor(225, 218, 200).setLineWidth(0.2)
    doc.line(MARGEN, y + alturaFila, MARGEN + anchoUtil, y + alturaFila)
    y += alturaFila
  })

  // Fila de total
  doc.setFont('helvetica', 'bold').setFontSize(9.5)
  doc.text('TOTAL DE UNIDADES ENTREGADAS', MARGEN + 2, y + alturaFila - 2.4)
  doc.text(numero(total), MARGEN + anchoUtil - 2, y + alturaFila - 2.4, { align: 'right' })
  y += alturaFila + 20

  // ── Firmas ──
  if (y > 297 - MARGEN - 25) { doc.addPage(); y = MARGEN + 20 }
  const anchoFirma = (anchoUtil - 20) / 2
  doc.setDrawColor(...TEXTO).setLineWidth(0.3)
  doc.line(MARGEN, y, MARGEN + anchoFirma, y)
  doc.line(MARGEN + anchoFirma + 20, y, MARGEN + anchoUtil, y)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...TEXTO)
  doc.text('Entregado por', MARGEN, y + 5)
  doc.text(responsable || '', MARGEN, y + 10)
  doc.text('Recibido por', MARGEN + anchoFirma + 20, y + 5)
  doc.text('Nombre, documento y firma', MARGEN + anchoFirma + 20, y + 10)

  // ── Pie ──
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...SUAVE)
  doc.text(
    `Generado el ${new Date().toLocaleString('es-CO')} · Comité de Cafeteros de Caldas — Sistema de Gestión de Donaciones`,
    ANCHO_PAG / 2, 297 - 10, { align: 'center' },
  )

  doc.save(`acta-${acta}.pdf`)
}
