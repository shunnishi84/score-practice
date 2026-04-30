import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  defaultBpm?: number
}

export default function Metronome({ defaultBpm = 80 }: Props) {
  const [bpm, setBpm] = useState(defaultBpm)
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const [beatsPerBar, setBeatsPerBar] = useState(4)
  const [flash, setFlash] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const nextBeatTimeRef = useRef(0)
  const beatCountRef = useRef(0)
  const schedulerRef = useRef<number | null>(null)
  const bpmRef = useRef(bpm)
  const beatsPerBarRef = useRef(beatsPerBar)

  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { beatsPerBarRef.current = beatsPerBar }, [beatsPerBar])

  const playClick = useCallback((time: number, isAccent: boolean) => {
    const ctx = audioCtxRef.current!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = isAccent ? 1200 : 900
    gain.gain.setValueAtTime(isAccent ? 0.6 : 0.3, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
    osc.start(time)
    osc.stop(time + 0.06)
  }, [])

  const schedule = useCallback(() => {
    const ctx = audioCtxRef.current!
    const lookAhead = 0.1
    const scheduleAhead = 0.05

    while (nextBeatTimeRef.current < ctx.currentTime + lookAhead) {
      const isAccent = beatCountRef.current % beatsPerBarRef.current === 0
      playClick(nextBeatTimeRef.current, isAccent)
      const displayBeat = beatCountRef.current % beatsPerBarRef.current
      const scheduledTime = nextBeatTimeRef.current - ctx.currentTime
      setTimeout(() => {
        setBeat(displayBeat)
        setFlash(true)
        setTimeout(() => setFlash(false), 80)
      }, Math.max(0, scheduledTime * 1000))
      nextBeatTimeRef.current += 60 / bpmRef.current
      beatCountRef.current++
    }

    schedulerRef.current = window.setTimeout(schedule, scheduleAhead * 1000)
  }, [playClick])

  const start = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()
    nextBeatTimeRef.current = ctx.currentTime + 0.05
    beatCountRef.current = 0
    setRunning(true)
    schedule()
  }, [schedule])

  const stop = useCallback(() => {
    if (schedulerRef.current) clearTimeout(schedulerRef.current)
    setRunning(false)
    setBeat(0)
  }, [])

  useEffect(() => () => stop(), [stop])

  const TIME_SIGS = [2, 3, 4, 6] as const

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">メトロノーム</h3>
        <div className="flex gap-1">
          {TIME_SIGS.map((n) => (
            <button
              key={n}
              onClick={() => setBeatsPerBar(n)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                beatsPerBar === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {n}/4
            </button>
          ))}
        </div>
      </div>

      {/* Beat indicator */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: beatsPerBar }).map((_, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-full transition-all duration-75 ${
              running && beat === i
                ? flash
                  ? i === 0 ? 'bg-red-500 scale-125' : 'bg-blue-500 scale-110'
                  : i === 0 ? 'bg-red-400' : 'bg-blue-400'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* BPM control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">BPM</span>
          <span className="text-2xl font-bold text-gray-800 w-16 text-center">{bpm}</span>
        </div>
        <input
          type="range"
          min={30}
          max={300}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between gap-1">
          {[-10, -5, +5, +10].map((d) => (
            <button
              key={d}
              onClick={() => setBpm((v) => Math.max(30, Math.min(300, v + d)))}
              className="flex-1 text-xs py-1.5 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      </div>

      {/* Start/Stop */}
      <button
        onClick={running ? stop : start}
        className={`w-full py-3 rounded-xl font-medium text-white transition-colors ${
          running ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {running ? '■ 停止' : '▶ 開始'}
      </button>
    </div>
  )
}
