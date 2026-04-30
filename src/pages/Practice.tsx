import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useStore } from '../store'
import Metronome from '../components/Metronome'
import AudioLooper from '../components/AudioLooper'
import type { PracticeLog } from '../types'
import * as db from '../db'

export default function Practice() {
  const { id: pieceId, spotId } = useParams<{ id: string; spotId: string }>()
  const navigate = useNavigate()
  const { pieces, spots, updateSpot, addLog } = useStore()

  const piece = pieces.find((p) => p.id === pieceId)
  const spot = spots.find((s) => s.id === spotId)

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (piece?.audioBlobId) {
      db.getBlob(piece.audioBlobId).then((b) => setAudioBlob(b ?? null))
    }
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [piece?.audioBlobId])

  const handleComplete = async () => {
    if (!spot || !spotId) return
    const now = new Date().toISOString()
    const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const log: PracticeLog = {
      id: uuidv4(),
      spotId,
      practicedAt: now,
      durationSec,
      bpm: spot.bpm,
      note: note.trim() || undefined,
    }
    await addLog(log)
    await updateSpot({
      ...spot,
      practiceCount: spot.practiceCount + 1,
      lastPracticedAt: now,
      updatedAt: now,
      memo: note.trim() ? `${spot.memo ?? ''}\n[${new Date().toLocaleDateString('ja-JP')}] ${note.trim()}`.trim() : spot.memo,
    })
    setDone(true)
  }

  const handleUpdateAudioRange = async (start: number, end: number) => {
    if (!spot) return
    await updateSpot({
      ...spot,
      audioRange: { startSec: start, endSec: end },
      updatedAt: new Date().toISOString(),
    })
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  if (!spot || !piece) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        データが見つかりません
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-blue-600" aria-label="戻る">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">{spot.measureLabel}</h1>
            <p className="text-xs text-blue-200 truncate">{piece.title}</p>
          </div>
          <div className="text-sm font-mono">{formatTime(elapsed)}</div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Spot info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg text-yellow-500">{'★'.repeat(spot.difficulty)}{'☆'.repeat(5 - spot.difficulty)}</span>
            {spot.bpm && <span className="text-sm text-gray-500">♩={spot.bpm}</span>}
          </div>
          {spot.memo && <p className="text-sm text-gray-600 whitespace-pre-wrap">{spot.memo}</p>}
          <p className="text-xs text-gray-400 mt-2">練習回数: {spot.practiceCount}回</p>
        </div>

        {/* Metronome */}
        <Metronome defaultBpm={spot.bpm ?? 80} />

        {/* Audio looper */}
        {audioBlob && (
          <AudioLooper
            audioBlob={audioBlob}
            startSec={spot.audioRange?.startSec}
            endSec={spot.audioRange?.endSec}
            onRangeChange={handleUpdateAudioRange}
          />
        )}

        {/* Note */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">練習メモ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="今日の気づき、改善点など..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>

        {/* Complete button */}
        {done ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-green-700 font-semibold mb-1">練習完了！</p>
            <p className="text-sm text-green-600">練習回数: {spot.practiceCount + 1}回</p>
            <button
              onClick={() => navigate(`/pieces/${pieceId}/score`)}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium"
            >
              楽譜に戻る
            </button>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-base hover:bg-green-700 transition-colors shadow-sm"
          >
            ✓ 練習完了
          </button>
        )}
      </main>
    </div>
  )
}
