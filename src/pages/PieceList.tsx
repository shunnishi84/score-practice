import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import type { Instrument } from '../types'
import { INSTRUMENT_ICONS, INSTRUMENT_LABELS } from '../types'

const FILTER_OPTIONS: { value: Instrument | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'piano', label: 'ピアノ' },
  { value: 'guitar', label: 'ギター' },
  { value: 'melody', label: '単旋律' },
  { value: 'other', label: 'その他' },
]

export default function PieceList() {
  const navigate = useNavigate()
  const { pieces, spots, loaded, loadPieces, loadAllSpots } = useStore()
  const [search, setSearch] = useState('')
  const [instrumentFilter, setInstrumentFilter] = useState<Instrument | 'all'>('all')
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title'>('updatedAt')

  useEffect(() => {
    loadPieces().then(() => loadAllSpots())
  }, [])

  const filtered = pieces
    .filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.composer ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesInstrument = instrumentFilter === 'all' || p.instrument === instrumentFilter
      return matchesSearch && matchesInstrument
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title, 'ja')
      return b.updatedAt.localeCompare(a.updatedAt)
    })

  const spotsCount = (pieceId: string) => spots.filter((s) => s.pieceId === pieceId).length

  const lastPracticed = (pieceId: string) => {
    const pieceSpots = spots.filter((s) => s.pieceId === pieceId)
    const dates = pieceSpots.map((s) => s.lastPracticedAt).filter(Boolean) as string[]
    if (dates.length === 0) return null
    return dates.sort().reverse()[0]
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">🎼 ScorePractice</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg hover:bg-blue-600 transition-colors"
              aria-label="設定"
            >
              ⚙️
            </button>
            <button
              onClick={() => navigate('/export')}
              className="p-2 rounded-lg hover:bg-blue-600 transition-colors"
              aria-label="エクスポート/インポート"
            >
              📦
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="search"
            placeholder="曲名・作曲者で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
          <select
            value={instrumentFilter}
            onChange={(e) => setInstrumentFilter(e.target.value as Instrument | 'all')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updatedAt' | 'title')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="updatedAt">更新日順</option>
            <option value="title">曲名順</option>
          </select>
        </div>

        {/* Add button */}
        <button
          onClick={() => navigate('/pieces/new')}
          className="w-full mb-6 py-3 border-2 border-dashed border-blue-400 rounded-xl text-blue-600 font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span> 新しい曲を追加
        </button>

        {/* Piece list */}
        {!loaded ? (
          <div className="text-center text-gray-400 py-16">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            {pieces.length === 0 ? '曲を追加してはじめましょう' : '該当する曲が見つかりません'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((piece) => {
              const count = spotsCount(piece.id)
              const lp = lastPracticed(piece.id)
              return (
                <button
                  key={piece.id}
                  onClick={() => navigate(`/pieces/${piece.id}/score`)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-left hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg" role="img" aria-label={INSTRUMENT_LABELS[piece.instrument]}>
                          {INSTRUMENT_ICONS[piece.instrument]}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {INSTRUMENT_LABELS[piece.instrument]}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-gray-800 truncate">{piece.title}</h2>
                      {piece.composer && (
                        <p className="text-sm text-gray-500 truncate">{piece.composer}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/pieces/${piece.id}/edit`) }}
                      className="text-gray-400 hover:text-blue-500 transition-colors p-1 flex-shrink-0"
                      aria-label="編集"
                    >
                      ✏️
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>📍 苦手箇所 {count}件</span>
                    <span>🕒 {lp ? formatDate(lp) : '未練習'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
