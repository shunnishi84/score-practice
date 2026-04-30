import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import * as pdfjsLib from 'pdfjs-dist'
import { useStore } from '../store'
import PdfViewer from '../components/PdfViewer'
import SpotEditor from '../components/SpotEditor'
import type { Spot } from '../types'
import { DIFFICULTY_BORDER_COLORS, INSTRUMENT_ICONS } from '../types'
import * as db from '../db'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function ScoreView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pieces, spots, loadSpots, addSpot, updateSpot, removeSpot } = useStore()

  const piece = pieces.find((p) => p.id === id)

  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1.5)
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
  const [editorState, setEditorState] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    draft: Partial<Spot>
  }>({ open: false, mode: 'create', draft: {} })

  useEffect(() => {
    if (!piece) return
    db.getBlob(piece.pdfBlobId).then((blob) => {
      if (!blob) return
      setPdfBlob(blob)
      const url = URL.createObjectURL(blob)
      pdfjsLib.getDocument(url).promise.then((doc) => {
        setTotalPages(doc.numPages)
        URL.revokeObjectURL(url)
      })
    })
    loadSpots(piece.id)
  }, [piece?.id])

  const pieceSpots = spots.filter((s) => s.pieceId === id)
  const pageSpots = pieceSpots.filter((s) => s.pdfPage === page)
  const handleRectDrawn = useCallback(
    (rect: Spot['rect']) => {
      setEditorState({
        open: true,
        mode: 'create',
        draft: {
          pieceId: id!,
          pdfPage: page,
          rect,
          difficulty: 3,
          practiceCount: 0,
        },
      })
    },
    [id, page],
  )

  const handleSpotClick = useCallback((spotId: string) => {
    setSelectedSpotId(spotId)
    const spot = spots.find((s) => s.id === spotId)
    if (spot) {
      setEditorState({ open: true, mode: 'edit', draft: spot })
    }
  }, [spots])

  const handleSave = async (data: Partial<Spot>) => {
    const now = new Date().toISOString()
    if (editorState.mode === 'create') {
      const newSpot: Spot = {
        id: uuidv4(),
        pieceId: id!,
        measureLabel: data.measureLabel ?? '無題',
        pdfPage: page,
        rect: data.rect!,
        difficulty: data.difficulty ?? 3,
        bpm: data.bpm,
        audioRange: data.audioRange,
        memo: data.memo,
        practiceCount: 0,
        createdAt: now,
        updatedAt: now,
      }
      await addSpot(newSpot)
    } else {
      const existing = pieceSpots.find((s) => s.id === editorState.draft.id)!
      await updateSpot({ ...existing, ...data, updatedAt: now })
    }
    setEditorState((s) => ({ ...s, open: false }))
    setSelectedSpotId(null)
  }

  const handleDelete = async () => {
    if (!editorState.draft.id) return
    if (!confirm('この苦手箇所を削除しますか？')) return
    await removeSpot(editorState.draft.id)
    setEditorState((s) => ({ ...s, open: false }))
    setSelectedSpotId(null)
  }

  const handlePractice = () => {
    if (!editorState.draft.id) return
    navigate(`/pieces/${id}/spots/${editorState.draft.id}/practice`)
  }

  const randomSpot = () => {
    if (pieceSpots.length === 0) return
    const now = Date.now()
    const weighted = pieceSpots.map((s) => {
      const daysSince = s.lastPracticedAt
        ? (now - new Date(s.lastPracticedAt).getTime()) / 86400000
        : 30
      return { spot: s, weight: s.difficulty * Math.min(daysSince, 30) }
    })
    const total = weighted.reduce((a, b) => a + b.weight, 0)
    let rand = Math.random() * total
    for (const { spot, weight } of weighted) {
      rand -= weight
      if (rand <= 0) {
        setPage(spot.pdfPage)
        setSelectedSpotId(spot.id)
        setEditorState({ open: true, mode: 'edit', draft: spot })
        return
      }
    }
  }

  if (!piece) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        曲が見つかりません
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1 rounded hover:bg-blue-600 transition-colors" aria-label="戻る">
            ←
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base">{INSTRUMENT_ICONS[piece.instrument]}</span>
              <h1 className="text-base font-bold truncate">{piece.title}</h1>
            </div>
            {piece.composer && <p className="text-xs text-blue-200 truncate">{piece.composer}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={randomSpot}
              disabled={pieceSpots.length === 0}
              className="text-xs px-3 py-1.5 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-40 transition-colors"
              title="苦手度の高い箇所をランダムに選出"
            >
              🎲 ランダム
            </button>
            <button
              onClick={() => navigate(`/pieces/${id}/edit`)}
              className="text-xs px-3 py-1.5 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
            >
              ✏️ 編集
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 py-4 gap-4">
        {/* PDF Viewer */}
        <div className="flex-1 min-w-0">
          {pdfBlob ? (
            <PdfViewer
              pdfBlob={pdfBlob}
              page={page}
              totalPages={totalPages}
              spots={pieceSpots}
              selectedSpotId={selectedSpotId}
              zoom={zoom}
              onPageChange={setPage}
              onZoomChange={setZoom}
              onSpotClick={handleSpotClick}
              onRectDrawn={handleRectDrawn}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 h-64 flex items-center justify-center text-gray-400">
              PDFを読み込み中...
            </div>
          )}
        </div>

        {/* Spot list sidebar */}
        <aside className="lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">苦手箇所 ({pageSpots.length}件)</h2>
              <span className="text-xs text-gray-400">このページ</span>
            </div>
            {pageSpots.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                楽譜上をドラッグして<br />苦手箇所を追加しましょう
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {pageSpots.map((spot) => (
                  <li key={spot.id}>
                    <button
                      onClick={() => handleSpotClick(spot.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedSpotId === spot.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ background: DIFFICULTY_BORDER_COLORS[spot.difficulty] }}
                        />
                        <span className="text-sm font-medium text-gray-800 truncate">{spot.measureLabel}</span>
                        <span className="ml-auto text-xs text-yellow-500 flex-shrink-0">
                          {'★'.repeat(spot.difficulty)}{'☆'.repeat(5 - spot.difficulty)}
                        </span>
                      </div>
                      {spot.memo && (
                        <p className="text-xs text-gray-500 truncate ml-5">{spot.memo}</p>
                      )}
                      <div className="text-xs text-gray-400 ml-5 mt-0.5 flex gap-3">
                        {spot.bpm && <span>♩={spot.bpm}</span>}
                        <span>練習{spot.practiceCount}回</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* All spots on other pages */}
            {pieceSpots.filter((s) => s.pdfPage !== page).length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-400 mb-2">他のページ</p>
                <div className="space-y-1">
                  {Array.from(new Set(pieceSpots.filter((s) => s.pdfPage !== page).map((s) => s.pdfPage)))
                    .sort((a, b) => a - b)
                    .map((p) => {
                      const count = pieceSpots.filter((s) => s.pdfPage === p).length
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          p.{p} ({count}件)
                        </button>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Spot editor modal */}
      {editorState.open && (
        <SpotEditor
          spot={editorState.draft}
          onSave={handleSave}
          onCancel={() => { setEditorState((s) => ({ ...s, open: false })); setSelectedSpotId(null) }}
          onDelete={editorState.mode === 'edit' ? handleDelete : undefined}
          onPractice={editorState.mode === 'edit' ? handlePractice : undefined}
        />
      )}
    </div>
  )
}
