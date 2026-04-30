import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  audioBlob: Blob
  startSec?: number
  endSec?: number
  onRangeChange?: (start: number, end: number) => void
}

export default function AudioLooper({ audioBlob, startSec, endSec, onRangeChange }: Props) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [loopStart, setLoopStart] = useState(startSec ?? 0)
  const [loopEnd, setLoopEnd] = useState(endSec ?? 0)
  const [speed, setSpeed] = useState(1)
  const [loading, setLoading] = useState(true)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef(0)
  const startOffsetRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const loopStartRef = useRef(loopStart)
  const loopEndRef = useRef(loopEnd)
  const speedRef = useRef(speed)

  useEffect(() => { loopStartRef.current = loopStart }, [loopStart])
  useEffect(() => { loopEndRef.current = loopEnd }, [loopEnd])
  useEffect(() => { speedRef.current = speed }, [speed])

  useEffect(() => {
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    setLoading(true)
    audioBlob.arrayBuffer().then((ab) => ctx.decodeAudioData(ab)).then((buf) => {
      setBuffer(buf)
      const end = endSec ?? buf.duration
      setLoopEnd(end)
      loopEndRef.current = end
      setLoading(false)
    })
    return () => { ctx.close(); if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [audioBlob])

  const getElapsed = useCallback(() => {
    if (!audioCtxRef.current) return 0
    return (audioCtxRef.current.currentTime - startTimeRef.current) * speedRef.current + startOffsetRef.current
  }, [])

  const tick = useCallback(() => {
    const elapsed = getElapsed()
    const end = loopEndRef.current
    if (elapsed >= end) {
      // loop
      stopSource()
      startAt(loopStartRef.current)
      return
    }
    setCurrentTime(elapsed)
    rafRef.current = requestAnimationFrame(tick)
  }, [getElapsed])

  const stopSource = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch (_) {}
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  const startAt = useCallback((offset: number) => {
    const ctx = audioCtxRef.current!
    const buf = buffer!
    if (ctx.state === 'suspended') ctx.resume()
    stopSource()
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = speedRef.current
    src.connect(ctx.destination)
    src.start(0, offset)
    sourceRef.current = src
    startTimeRef.current = ctx.currentTime
    startOffsetRef.current = offset
    setPlaying(true)
    setCurrentTime(offset)
    rafRef.current = requestAnimationFrame(tick)
  }, [buffer, tick])

  const togglePlay = () => {
    if (playing) {
      stopSource()
      setPlaying(false)
    } else {
      startAt(loopStart)
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    const ms = Math.floor((sec % 1) * 10)
    return `${m}:${String(s).padStart(2, '0')}.${ms}`
  }

  const duration = buffer?.duration ?? 1

  const handleSaveRange = () => {
    onRangeChange?.(loopStart, loopEnd)
  }

  if (loading) return <div className="text-sm text-gray-400 py-4 text-center">音源を読み込み中...</div>

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">区間ループ再生</h3>

      {/* Seek bar */}
      <div className="space-y-1">
        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            const pos = ratio * duration
            startAt(pos)
          }}
        >
          {/* Loop range highlight */}
          <div
            className="absolute top-0 bottom-0 bg-blue-100"
            style={{ left: `${(loopStart / duration) * 100}%`, width: `${((loopEnd - loopStart) / duration) * 100}%` }}
          />
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-600"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Loop range controls */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">ループ開始</label>
          <div className="flex gap-1">
            <input
              type="number"
              value={loopStart.toFixed(1)}
              step={0.1}
              min={0}
              max={duration}
              onChange={(e) => setLoopStart(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={() => setLoopStart(currentTime)}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              title="現在位置をセット"
            >
              ◀
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ループ終了</label>
          <div className="flex gap-1">
            <input
              type="number"
              value={loopEnd.toFixed(1)}
              step={0.1}
              min={0}
              max={duration}
              onChange={(e) => setLoopEnd(parseFloat(e.target.value) || duration)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={() => setLoopEnd(currentTime)}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              title="現在位置をセット"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* Speed */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 whitespace-nowrap">速度</span>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <span className="text-sm font-medium text-gray-700 w-10 text-right">{speed.toFixed(2)}×</span>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={togglePlay}
          className={`flex-1 py-2.5 rounded-xl font-medium text-white transition-colors text-sm ${
            playing ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {playing ? '■ 停止' : '▶ ループ再生'}
        </button>
        {onRangeChange && (
          <button
            onClick={handleSaveRange}
            className="py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm"
          >
            保存
          </button>
        )}
      </div>
    </div>
  )
}
