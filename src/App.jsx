import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicoLayout from './publico/PublicoLayout'
import Dashboard from './publico/vistas/Dashboard'
import Disponibilidad from './publico/vistas/Disponibilidad'
import Donantes from './publico/vistas/Donantes'
import PanelLayout from './panel/PanelLayout'
import PanelResumen from './panel/vistas/PanelResumen'
import GestionEntradas from './panel/vistas/GestionEntradas'
import GestionSalidas from './panel/vistas/GestionSalidas'
import GestionArticulos from './panel/vistas/GestionArticulos'
import GestionTerceros from './panel/vistas/GestionTerceros'
import Cargando from './components/Cargando'

// El mapa carga su propio chunk (geometría ~30 KB).
const PorMunicipio = lazy(() => import('./publico/vistas/PorMunicipio'))

export default function App() {
  return (
    <BrowserRouter basename="/donaciones-caldas/">
      <Routes>
        <Route element={<PublicoLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="disponibilidad" element={<Disponibilidad />} />
          <Route
            path="municipios"
            element={
              <Suspense fallback={<Cargando texto="Cargando el mapa de Caldas…" />}>
                <PorMunicipio />
              </Suspense>
            }
          />
          <Route path="donantes" element={<Donantes />} />
        </Route>

        <Route path="panel" element={<PanelLayout />}>
          <Route index element={<PanelResumen />} />
          <Route path="entradas" element={<GestionEntradas />} />
          <Route path="salidas" element={<GestionSalidas />} />
          <Route path="articulos" element={<GestionArticulos />} />
          <Route path="terceros" element={<GestionTerceros />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
