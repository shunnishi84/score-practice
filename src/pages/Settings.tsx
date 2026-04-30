import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import type { Settings as SettingsType } from '../types'

export default function Settings() {
  const navigate = useNavigate()
  const { settings, loadSettings, updateSettings } = useStore()

  useEffect(() => { loadSettings() }, [])

  const update = (partial: Partial<SettingsType>) =>
    updateSettings({ ...settings, ...partial })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-blue-600" aria-label="戻る">←</button>
          <h1 className="text-lg font-bold">設定</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">

          <div className="px-5 py-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">デフォルトBPM</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={30}
                max={300}
                value={settings.defaultBpm}
                onChange={(e) => update({ defaultBpm: Number(e.target.value) })}
                className="flex-1 accent-blue-600"
              />
              <span className="text-lg font-bold text-gray-800 w-12 text-right">{settings.defaultBpm}</span>
            </div>
          </div>

          <div className="px-5 py-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">メトロノーム音</label>
            <div className="flex gap-2">
              {(['click', 'beep', 'wood'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => update({ metronomeSound: s })}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    settings.metronomeSound === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {s === 'click' ? 'クリック' : s === 'beep' ? 'ビープ' : 'ウッドブロック'}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">テーマ</label>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ theme: t })}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    settings.theme === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {t === 'light' ? 'ライト' : t === 'dark' ? 'ダーク' : 'システム'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
