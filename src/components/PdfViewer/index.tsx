import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import type { Spot } from '../../types'
import { DIFFICULTY_COLORS, DIFFICULTY_BORDER_COLORS } from '../../types'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface DragState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  active: boolean
}

interface Props {
  pdfBlob: Blob
  page: number
  totalPages: number
  spots: Spot[]
  selectedSpotId: string | null
  zoom: number
  onPageChange: (page: number) => void
  onZoomChange: (zoom: number) => void
  onSpotClick: (spotId: string) => void
  onRectDrawn: (rect: { x: number; y: number; width: number; height: number }) => void
}

export default function PdfViewer({
  pdfBlob,
  page,
  totalPages,
  spots,
  selectedSpotId,
  zoom,
  onPageChange,
  onZoomChange,
  onSpotClick,
  onRectDrawn,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [drag, setDrag] = useState<DragState>({ startX: 0, startY: 0, currentX: 0, currentY: 0, active: false })
  const [rendering, setRendering] = useState(false)

  // Load PDF
  useEffect(() => {
    let cancelled = false
    const url = URL.createObjectURL(pdfBlob)
    pdfjsLib.getDocument(url).promise.then((doc) => {
      if (!cancelled) pdfRef.current = doc
    })
    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
  }, [pdfBlob])

  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas) return

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }

    setRendering(true)
    try {
      const pdfPage: PDFPageProxy = await pdf.getPage(page)
      const viewport = pdfPage.getViewport({ scale: zoom })
      canvas.width = viewport.width
      canvas.height = viewport.height
      setCanvasSize({ width: viewport.width, height: viewport.height })

      const ctx = canvas.getContext('2d')!
      const task = pdfPage.render({ canvasContext: ctx, viewport, canvas })
      renderTaskRef.current = task
      await task.promise
    } catch (e: unknown) {
      if ((e as { name?: string }).name !== 'RenderingCancelledException') console.error(e)
    } finally {
      setRendering(false)
    }
  }, [page, zoom])

  useEffect(() => {
    const pdf = pdfRef.current
    if (pdf) {
      renderPage()
      return
    }
    const interval = setInterval(() => {
      if (pdfRef.current) { clearInterval(interval); renderPage() }
    }, 100)
    return () => clearInterval(interval)
  }, [renderPage])

  // Normalize coordinates relative to canvas
  const toRelative = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const pos = toRelative(e.clientX, e.clientY)
    setDrag({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y, active: true })
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.active) return
    const pos = toRelative(e.clientX, e.clientY)
    setDrag((d) => ({ ...d, currentX: pos.x, currentY: pos.y }))
  }

  const onMouseUp = (e: React.MouseEvent) => {
    if (!drag.active) return
    const pos = toRelative(e.clientX, e.clientY)
    const dx = pos.x - drag.startX
    const dy = pos.y - drag.startY
    const minSize = 0.02
    if (Math.abs(dx) > minSize && Math.abs(dy) > minSize) {
      onRectDrawn({
        x: Math.min(drag.startX, pos.x),
        y: Math.min(drag.startY, pos.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      })
    }
    setDrag((d) => ({ ...d, active: false }))
    e.stopPropagation()
  }

  // Touch support
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    const pos = toRelative(t.clientX, t.clientY)
    touchStartRef.current = pos
    setDrag({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y, active: true })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.active || e.touches.length !== 1) return
    const t = e.touches[0]
    const pos = toRelative(t.clientX, t.clientY)
    setDrag((d) => ({ ...d, currentX: pos.x, currentY: pos.y }))
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!drag.active) return
    const t = e.changedTouches[0]
    const pos = toRelative(t.clientX, t.clientY)
    const dx = pos.x - drag.startX
    const dy = pos.y - drag.startY
    const minSize = 0.03
    if (Math.abs(dx) > minSize && Math.abs(dy) > minSize) {
      onRectDrawn({
        x: Math.min(drag.startX, pos.x),
        y: Math.min(drag.startY, pos.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      })
    }
    setDrag((d) => ({ ...d, active: false }))
  }

  const pageSpots = spots.filter((s) => s.pdfPage === page)

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            aria-label="前のページ"
          >
            ‹
          </button>
          <span className="text-sm text-gray-600 min-w-[5rem] text-center">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            aria-label="次のページ"
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100"
            aria-label="縮小"
          >
            −
          </button>
          <span className="text-sm text-gray-600 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100"
            aria-label="拡大"
          >
            ＋
          </button>
        </div>
        <div className="text-xs text-gray-400 hidden sm:block">ドラッグで苦手箇所を追加</div>
      </div>

      {/* Canvas + overlay */}
      <div ref={containerRef} className="overflow-auto rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
        <div className="relative inline-block" style={{ cursor: 'crosshair' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => setDrag((d) => ({ ...d, active: false }))}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className={rendering ? 'opacity-60' : ''}
          />

          {/* SVG overlay for spots */}
          <svg
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none"
            width={canvasSize.width}
            height={canvasSize.height}
            viewBox={`0 0 1 1`}
            preserveAspectRatio="none"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {pageSpots.map((spot) => (
              <g
                key={spot.id}
                className="pointer-events-auto cursor-pointer"
                onClick={() => onSpotClick(spot.id)}
              >
                <rect
                  x={spot.rect.x}
                  y={spot.rect.y}
                  width={spot.rect.width}
                  height={spot.rect.height}
                  fill={DIFFICULTY_COLORS[spot.difficulty]}
                  stroke={DIFFICULTY_BORDER_COLORS[spot.difficulty]}
                  strokeWidth={selectedSpotId === spot.id ? 0.005 : 0.003}
                  strokeDasharray={selectedSpotId === spot.id ? undefined : '0.01 0.005'}
                  rx={0.005}
                />
                <text
                  x={spot.rect.x + 0.005}
                  y={spot.rect.y + 0.025}
                  fontSize={0.025}
                  fill="rgba(0,0,0,0.7)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {spot.measureLabel}
                </text>
              </g>
            ))}

            {/* Drag preview */}
            {drag.active && (
              <rect
                x={Math.min(drag.startX, drag.currentX)}
                y={Math.min(drag.startY, drag.currentY)}
                width={Math.abs(drag.currentX - drag.startX)}
                height={Math.abs(drag.currentY - drag.startY)}
                fill="rgba(59,130,246,0.2)"
                stroke="rgba(59,130,246,0.8)"
                strokeWidth={0.003}
                strokeDasharray="0.01 0.005"
                rx={0.003}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}
