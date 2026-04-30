import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportToFile, importFromFile } from '../lib/exporter'
import { useStore } from '../store'

export default function ExportImport() {
  const navigate = useNavigate()
  const { loadPieces, loadAllSpots, loadLogs } = useStore()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    setMessage(null)
    try {
      await exportToFile()
      setMessage({ type: 'success', text: 'エクスポートが完了しました' })
    } catch (e) {
      console.error(e)
      setMessage({ type: 'error', text: 'エクスポートに失敗しました' })
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (file: File) => {
    if (!confirm('データをインポートします。既存のデータに追加されます。続けますか？')) return
    setImporting(true)
    setMessage(null)
    try {
      await importFromFile(file)
      await Promise.all([loadPieces(), loadLogs()])
      await loadAllSpots()
      setMessage({ type: 'success', text: 'インポートが完了しました' })
    } catch (e) {
      console.error(e)
      setMessage({ type: 'error', text: 'インポートに失敗しました。正しい .scprac ファイルか確認してください' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-blue-600" aria-label="戻る">←</button>
          <h1 className="text-lg font-bold">エクスポート / インポート</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">エクスポート</h2>
            <p className="text-sm text-gray-500 mb-4">
              すべての曲・苦手箇所・練習ログ・PDF・音源を1つのファイル（.scprac）にまとめてダウンロードします。
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {exporting ? 'エクスポート中...' : '📦 全データをエクスポート'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">インポート</h2>
            <p className="text-sm text-gray-500 mb-4">
              .scprac ファイルからデータをインポートします。既存データに追加されます。
            </p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) handleImport(file)
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl px-4 py-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <p className="text-sm text-gray-500">
                {importing ? 'インポート中...' : 'クリックまたはドラッグ＆ドロップで .scprac ファイルを選択'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".scprac"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImport(file)
              }}
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-xs text-gray-500 space-y-1">
          <p>• .scprac ファイルはZIP形式で、PDF・音源・JSONメタデータが含まれます</p>
          <p>• データはブラウザのIndexedDBに保存されています（サーバー不要）</p>
          <p>• インポート後は既存データに追加されます（重複IDはスキップされます）</p>
        </div>
      </main>
    </div>
  )
}
