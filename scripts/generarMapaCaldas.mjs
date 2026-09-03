/**
 * Genera src/utils/mapaCaldas.js a partir del GeoJSON municipal del DANE.
 *
 *   node scripts/generarMapaCaldas.mjs
 *
 * - Descarga el MGN 2018 (departamentos + municipios) de un espejo público.
 * - Filtra el departamento de Caldas (código DANE 17).
 * - Reconcilia los nombres contra src/utils/municipios.js. Aborta si no casan los 27.
 * - Proyecta a coordenadas de pantalla con d3-geo (offline, sin dependencias en runtime).
 * - Emite paths SVG + centroides.
 *
 * Si la descarga o la reconciliación fallan, NO sobrescribe el archivo: se
 * conserva el cartograma de respaldo (mismo contrato de datos).
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

const aqui = dirname(fileURLToPath(import.meta.url))
const raizSrc = resolve(aqui, '../src/utils')
const salida = resolve(raizSrc, 'mapaCaldas.js')
const cache = resolve(aqui, '.cache')

const ANCHO = 820
const ALTO = 560

// Espejos candidatos (TopoJSON nacional a nivel municipio).
const FUENTES = [
  'https://raw.githubusercontent.com/caticoa3/colombia_mapa/master/co_2018_MGN_MPIO_POLITICO.geojson',
]

const CODIGO_CALDAS = '17'

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .trim()

async function descargar() {
  mkdirSync(cache, { recursive: true })
  for (const url of FUENTES) {
    const nombre = resolve(cache, url.split('/').pop())
    try {
      if (existsSync(nombre)) return JSON.parse(readFileSync(nombre, 'utf8'))
      console.log('· Descargando', url)
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const txt = await res.text()
      writeFileSync(nombre, txt)
      return JSON.parse(txt)
    } catch (e) {
      console.warn('  falló:', e.message)
    }
  }
  throw new Error('Ninguna fuente de GeoJSON respondió.')
}

function extraerFeatures(topo) {
  // Soporta TopoJSON (objects.*) y GeoJSON (FeatureCollection).
  if (topo.type === 'Topology') {
    const clave = Object.keys(topo.objects).find((k) => /mpio|municip/i.test(k)) || Object.keys(topo.objects)[0]
    return feature(topo, topo.objects[clave]).features
  }
  if (topo.type === 'FeatureCollection') return topo.features
  throw new Error('Formato no reconocido')
}

function propMunicipio(props) {
  // Distintos espejos nombran distinto: MPIO_CNMBR, NOMBRE_MPI, nombre, NOM_MUNICI…
  for (const k of ['MPIO_CNMBR', 'NOMBRE_MPI', 'NOM_MUNICI', 'nombre', 'NOMBRE', 'name']) {
    if (props[k]) return props[k]
  }
  return ''
}
function propDepto(props) {
  for (const k of ['DPTO_CCDGO', 'COD_DEPTO', 'dpto', 'DPT']) {
    if (props[k] != null) return String(props[k]).padStart(2, '0')
  }
  return ''
}
function propCodMun(props) {
  for (const k of ['MPIO_CCNCT', 'DPTOMPIO', 'id']) {
    if (props[k] != null) return String(props[k])
  }
  const dep = propDepto(props)
  for (const k of ['MPIO_CCDGO', 'MPIOS']) {
    if (props[k] != null) return dep + String(props[k]).padStart(3, '0')
  }
  return ''
}

// Reduce la precisión de los números del path a 1 decimal (menos peso, sin
// pérdida visible a esta escala).
function aligerar(d) {
  return d.replace(/-?\d+\.\d+/g, (n) => (+n).toFixed(1))
}

async function main() {
  const municipiosMod = readFileSync(resolve(raizSrc, 'municipios.js'), 'utf8')
  const MUNICIPIOS = [...municipiosMod.matchAll(/'([^']+)'/g)].map((m) => m[1])
  if (MUNICIPIOS.length !== 27) throw new Error(`Se esperaban 27 municipios, hay ${MUNICIPIOS.length}`)

  const topo = await descargar()
  const todas = extraerFeatures(topo)

  let caldas = todas.filter((f) => {
    const dep = propDepto(f.properties)
    if (dep) return dep === CODIGO_CALDAS
    // Sin código de depto: filtrar por código de municipio que empiece en 17
    return propCodMun(f.properties).replace(/^0+/, '').startsWith('17')
  })

  if (caldas.length < 20) throw new Error(`Solo se encontraron ${caldas.length} municipios de Caldas`)

  // Reconciliar nombres
  const canon = new Map(MUNICIPIOS.map((n) => [norm(n), n]))
  const ALIAS = {
    [norm('San Jose')]: 'San José',
    [norm('Belalcazar')]: 'Belalcázar',
  }
  const reconciliadas = []
  const sinCasar = []
  for (const f of caldas) {
    const bruto = propMunicipio(f.properties)
    const n = norm(bruto)
    const nombre = canon.get(n) || ALIAS[n]
    if (!nombre) { sinCasar.push(bruto); continue }
    reconciliadas.push({ nombre, feature: f })
  }

  const faltan = MUNICIPIOS.filter((m) => !reconciliadas.some((r) => r.nombre === m))
  if (faltan.length || sinCasar.length) {
    throw new Error(
      `Reconciliación incompleta.\n  Sin casar en GeoJSON: ${sinCasar.join(', ') || '—'}\n  Municipios faltantes: ${faltan.join(', ') || '—'}`,
    )
  }

  // Proyección offline ajustada al conjunto
  const fc = { type: 'FeatureCollection', features: reconciliadas.map((r) => r.feature) }
  const proy = geoMercator().fitSize([ANCHO - 20, ALTO - 20], fc)
  const camino = geoPath(proy)

  const MUNICIPIOS_SVG = reconciliadas
    .map((r) => {
      const d = aligerar(camino(r.feature))
      const [cx, cy] = camino.centroid(r.feature)
      return {
        nombre: r.nombre,
        dane: propCodMun(r.feature.properties),
        d,
        cx: +cx.toFixed(1),
        cy: +cy.toFixed(1),
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const contenido = `// GENERADO por scripts/generarMapaCaldas.mjs — no editar a mano.
// Fuente: DANE MGN (marco geoestadístico nacional), departamento de Caldas (17).
export const VIEWBOX = '0 0 ${ANCHO} ${ALTO}'
export const ORIGEN = 'DANE MGN 2018'
export const MUNICIPIOS_SVG = ${JSON.stringify(MUNICIPIOS_SVG, null, 2)}
`
  writeFileSync(salida, contenido)
  console.log(`✓ ${salida}`)
  console.log(`  ${MUNICIPIOS_SVG.length} municipios · ${(contenido.length / 1024).toFixed(1)} KB`)
}

main().catch((e) => {
  console.error('\n✗ No se pudo generar el mapa:\n ', e.message)
  console.error('  Se conserva el cartograma de respaldo en src/utils/mapaCaldas.js\n')
  process.exit(1)
})
