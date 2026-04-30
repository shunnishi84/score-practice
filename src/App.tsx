import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PieceList from './pages/PieceList'
import PieceEdit from './pages/PieceEdit'
import ScoreView from './pages/ScoreView'
import Practice from './pages/Practice'
import Settings from './pages/Settings'
import ExportImport from './pages/ExportImport'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PieceList />} />
        <Route path="/pieces/new" element={<PieceEdit />} />
        <Route path="/pieces/:id/edit" element={<PieceEdit />} />
        <Route path="/pieces/:id/score" element={<ScoreView />} />
        <Route path="/pieces/:id/spots/:spotId/practice" element={<Practice />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/export" element={<ExportImport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
