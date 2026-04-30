import { useEffect, useState } from 'react'
import type { Spot } from '../../types'

interface Props {
  spot: Partial<Spot>
  onSave: (spot: Partial<Spot>) => void
  onCancel: () => void
  onDelete?: () => void
  onPractice?: () => void
}

const STARS = [1, 2, 3, 4, 5] as const
const DIFFICULTY_LABELS = ['', 'やや難しい', '難しい', 'かなり難しい', 'とても難しい', '最難関'] as const

export default function SpotEditor({ spot, onSave, onCancel, onDelete, onPractice }: Props) {
  const [measureLabel, setMeasureLabel] = useState(spot.measureLabel ?? '')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(spot.difficulty ?? 3)
  const [bpm, setBpm] = useState(spot.bpm?.toString() ?? '')
  const [memo, setMemo] = useState(spot.memo ?? '')
  const [audioStart, setAudioStart] = useState(spot.audioRange?.startSec?.toString() ?? '')
  const [audioEnd, setAudioEnd] = useState(spot.audioRange?.endSec?.toString() ?? '')

  useEffect(() => {
    setMeasureLabel(spot.measureLabel ?? '')
    setDifficulty(spot.difficulty ?? 3)
    setBpm(spot.bpm?.toString() ?? '')
    setMemo(spot.memo ?? '')
    setAudioStart(spot.audioRange?.startSec?.toString() ?? '')
    setAudioEnd(spot.audioRange?.endSec?.toString() ?? '')
  }, [spot.id])

  const handleSave = () => {
    const bpmNum = bpm ? parseInt(bpm, 10) : undefined
    const startNum = audioStart ? parseFloat(audioStart) : undefined
    const endNum = audioEnd ? parseFloat(audioEnd) : undefined
    onSave({
      ...spot,
      measureLabel: measureLabel.trim() || '無題',
      difficulty,
      bpm: bpmNum,
      memo: memo.trim() || undefined,
      audioRange: startNum != null && endNum != null ? { startSec: startNum, endSec: endNum } : undefined,
    })
  }

  const isEditing = !!spot.id

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-2xl">
          <h2 className="text-base font-semibold text-gray-800">
            {isEditing ? '苦手箇所を編集' : '苦手箇所を追加'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">×</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Measure label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">小節ラベル</label>
            <input
              type="text"
              value={measureLabel}
              onChange={(e) => setMeasureLabel(e.target.value)}
              placeholder="例: M.4, M.4-6, A1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              苦手度 <span className="text-gray-400 font-normal">— {DIFFICULTY_LABELS[difficulty]}</span>
            </label>
            <div className="flex gap-2">
              {STARS.map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setDifficulty(star)}
                  className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`難易度${star}`}
                >
                  {star <= difficulty ? '★' : '☆'}
                </button>
              ))}
            </div>
          </div>

          {/* BPM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">練習テンポ（BPM）</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="例: 80"
                min={20}
                max={400}
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {bpm && (
                <div className="flex gap-2">
                  {[-10, -5, +5, +10].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => setBpm((v) => String(Math.max(20, Math.min(400, (parseInt(v) || 80) + delta))))}
                      className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Audio range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">音源ループ範囲（秒）</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={audioStart}
                onChange={(e) => setAudioStart(e.target.value)}
                placeholder="開始"
                min={0}
                step={0.1}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-gray-400">〜</span>
              <input
                type="number"
                value={audioEnd}
                onChange={(e) => setAudioEnd(e.target.value)}
                placeholder="終了"
                min={0}
                step={0.1}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="苦手な理由、改善ポイントなど..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {isEditing && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-500 flex items-center justify-between">
              <span>練習回数: <strong className="text-gray-700">{spot.practiceCount ?? 0}回</strong></span>
              {spot.lastPracticedAt && (
                <span>最終: {new Date(spot.lastPracticedAt).toLocaleDateString('ja-JP')}</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2">
          {onPractice && (
            <button
              onClick={onPractice}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors text-sm"
            >
              🎵 練習開始
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            保存
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="py-2.5 px-4 bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium hover:bg-red-100 transition-colors text-sm"
            >
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
