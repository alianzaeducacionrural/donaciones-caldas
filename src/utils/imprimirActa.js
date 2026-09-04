import isologo from '../assets/isologo.png'
import { fechaCorta, numero } from './formatear'

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

// Abre una ventana nueva con el acta de entrega lista para imprimir o
// guardar como PDF (Ctrl+P / "Guardar como PDF" del navegador). No usa
// ninguna librería de PDF: es HTML + una hoja de impresión.
export function imprimirActa(lineas, artMap) {
  if (!lineas.length) return

  const acta = lineas[0].acta
  const fecha = lineas.find((l) => l.fecha)?.fecha || ''
  const responsable = lineas.find((l) => l.responsable)?.responsable || ''
  const beneficiario = lineas.find((l) => l.beneficiario_nombre)?.beneficiario_nombre || ''
  const municipios = [...new Set(lineas.map((l) => l.municipio).filter(Boolean))]
  const total = lineas.reduce((n, l) => n + (Number(l.cantidad) || 0), 0)

  const filas = lineas.map((l) => {
    const a = artMap[l.articulo_id] || {}
    return `
      <tr>
        <td>${esc(l.articulo_id)}</td>
        <td>${esc(a.descripcion)}</td>
        <td>${esc(a.categoria)}</td>
        <td>${esc(a.unidad || 'UNIDAD')}</td>
        <td class="num">${numero(l.cantidad)}</td>
      </tr>`
  }).join('')

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Acta de entrega ${esc(acta)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #2B1A0E; margin: 0; padding: 28px 36px; }
  .encabezado { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #971427; padding-bottom: 14px; margin-bottom: 18px; }
  .encabezado img { height: 52px; }
  .encabezado h1 { font-size: 17px; margin: 0 0 2px; color: #971427; }
  .encabezado p { margin: 0; font-size: 12px; color: #555; }
  .titulo { text-align: center; margin: 6px 0 20px; }
  .titulo h2 { font-size: 15px; letter-spacing: .04em; text-transform: uppercase; margin: 0; }
  .titulo span { font-size: 12px; color: #555; }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 12.5px; margin-bottom: 18px; }
  .datos div b { display: inline-block; min-width: 130px; color: #555; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #FEF6E0; text-transform: uppercase; font-size: 10.5px; letter-spacing: .03em; }
  td.num, th.num { text-align: right; }
  tfoot td { font-weight: 700; background: #FBF7EF; }
  .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 56px; }
  .firma { text-align: center; }
  .firma .linea { border-top: 1px solid #333; margin-bottom: 6px; padding-top: 6px; }
  .pie { margin-top: 40px; font-size: 10px; color: #888; text-align: center; }
  @media print {
    body { padding: 10mm 14mm; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="encabezado">
    <img src="${isologo}" alt="Comité de Cafeteros de Caldas">
    <div>
      <h1>Comité de Cafeteros de Caldas</h1>
      <p>Sistema de Gestión de Donaciones</p>
    </div>
  </div>

  <div class="titulo">
    <h2>Acta de entrega de donaciones</h2>
    <span>N° ${esc(acta)}</span>
  </div>

  <div class="datos">
    <div><b>Fecha:</b> ${esc(fechaCorta(fecha) || '—')}</div>
    <div><b>Municipio(s) de destino:</b> ${esc(municipios.join(', ') || '—')}</div>
    <div><b>Beneficiario:</b> ${esc(beneficiario || '—')}</div>
    <div><b>Responsable de la entrega:</b> ${esc(responsable || '—')}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Código</th><th>Artículo</th><th>Categoría</th><th>Unidad</th><th class="num">Cantidad</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
    <tfoot>
      <tr><td colspan="4">Total de unidades entregadas</td><td class="num">${numero(total)}</td></tr>
    </tfoot>
  </table>

  <div class="firmas">
    <div class="firma">
      <div class="linea">Entregado por</div>
      <div>${esc(responsable || '')}</div>
    </div>
    <div class="firma">
      <div class="linea">Recibido por</div>
      <div>Nombre, documento y firma</div>
    </div>
  </div>

  <p class="pie">Generado el ${new Date().toLocaleString('es-CO')} · Comité de Cafeteros de Caldas — Sistema de Gestión de Donaciones</p>

  <script>window.onload = () => setTimeout(() => window.print(), 200);</script>
</body>
</html>`

  const ventana = window.open('', '_blank')
  if (!ventana) {
    alert('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes para este sitio.')
    return
  }
  ventana.document.write(html)
  ventana.document.close()
}
