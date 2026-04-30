import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useStore } from '../store'
import type { Instrument, Piece } from '../types'
import { INSTRUMENT_LABELS } from '../types'
import * as db from '../db'

const INSTRUMENTS: Instrument[] = ['piano', 'guitar', 'melody', 'other']

export default function PieceEdit() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { pieces, addPiece, updatePiece, removePiece } = useStore()

  const [title, setTitle] = useState('')
  const [composer, setComposer] = useState('')
  const [instrument, setInstrument] = useState<Instrument>('piano')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [pdfName, setPdfName] = useState('')
  const [audioName, setAudioName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const pdfInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isNew && id) {
      const piece = pieces.find((p) => p.id === id)
      if (piece) {
        setTitle(piece.title)
        setComposer(piece.composer ?? '')
        setInstrument(piece.instrument)
        setPdfName('（登録済み）')
      }
    }
  }, [id, pieces])

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') {
      setPdfFile(file)
      setPdfName(file.name)
    }
  }

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('audio/')) {
      setAudioFile(file)
      setAudioName(file.name)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('曲名を入力してください'); return }
    if (isNew && !pdfFile) { setError('PDFファイルを選択してください'); return }

    setSaving(true)
    setError('')
    try {
      const now = new Date().toISOString()
      if (isNew) {
        const pdfBlobId = uuidv4()
        await db.putBlob(pdfBlobId, pdfFile!)

        let audioBlobId: string | undefined
        if (audioFile) {
          audioBlobId = uuidv4()
          await db.putBlob(audioBlobId, audioFile)
        }

        const piece: Piece = {
          id: uuidv4(),
          title: title.trim(),
          composer: composer.trim() || undefined,
          instrument,
          pdfBlobId,
          audioBlobId,
          createdAt: now,
          updatedAt: now,
        }
        await addPiece(piece)
        navigate(`/pieces/${piece.id}/score`)
      } else {
        const existing = pieces.find((p) => p.id === id)!
        let pdfBlobId = existing.pdfBlobId
        let audioBlobId = existing.audioBlobId

        if (pdfFile) {
          await db.deleteBlob(pdfBlobId)
          pdfBlobId = uuidv4()
          await db.putBlob(pdfBlobId, pdfFile)
        }
        if (audioFile) {
          if (audioBlobId) await db.deleteBlob(audioBlobId)
          audioBlobId = uuidv4()
          await db.putBlob(audioBlobId, audioFile)
        }

        await updatePiece({
          ...existing,
          title: title.trim(),
          composer: composer.trim() || undefined,
          instrument,
          pdfBlobId,
          audioBlobId,
          updatedAt: now,
        })
        navigate(-1)
      }
    } catch (e) {
      console.error(e)
      setError('保存中にエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || isNew) return
    if (!confirm('この曲とすべての苦手箇所を削除しますか？')) return
    await removePiece(id)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-blue-600 transition-colors" aria-label="戻る">
            ←
          </button>
          <h1 className="text-lg font-bold">{isNew ? '新しい曲を追加' : '曲を編集'}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">曲名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：月光ソナタ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">作曲者</label>
            <input
              type="text"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder="例：ベートーヴェン"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">楽器</label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((inst) => (
                <button
                  key={inst}
                  type="button"
                  onClick={() => setInstrument(inst)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    instrument === inst
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {INSTRUMENT_LABELS[inst]}
                </button>
              ))}
            </div>
          </div>

          {/* PDF upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              楽譜PDF <span className="text-red-500">{isNew ? '*' : ''}</span>
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handlePdfDrop}
              onClick={() => pdfInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <p className="text-sm text-gray-500">
                {pdfName || 'クリックまたはドラッグ＆ドロップでPDFを選択'}
              </p>
              <p className="text-xs text-gray-400 mt-1">対応形式: PDF</p>
            </div>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) { setPdfFile(file); setPdfName(file.name) }
              }}
            />
          </div>

          {/* Audio upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">音源ファイル（任意）</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleAudioDrop}
              onClick={() => audioInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <p className="text-sm text-gray-500">
                {audioName || 'クリックまたはドラッグ＆ドロップで音源を選択'}
              </p>
              <p className="text-xs text-gray-400 mt-1">対応形式: MP3 / WAV / M4A</p>
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) { setAudioFile(file); setAudioName(file.name) }
              }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          {!isNew && (
            <button
              onClick={handleDelete}
              className="py-3 px-6 bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium hover:bg-red-100 transition-colors"
            >
              削除
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
