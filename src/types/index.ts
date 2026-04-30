export type Instrument = 'piano' | 'guitar' | 'melody' | 'other'

export interface Piece {
  id: string
  title: string
  composer?: string
  instrument: Instrument
  pdfBlobId: string
  audioBlobId?: string
  createdAt: string
  updatedAt: string
}

export interface Spot {
  id: string
  pieceId: string
  measureLabel: string
  pdfPage: number
  rect: {
    x: number
    y: number
    width: number
    height: number
  }
  difficulty: 1 | 2 | 3 | 4 | 5
  bpm?: number
  audioRange?: {
    startSec: number
    endSec: number
  }
  memo?: string
  practiceCount: number
  lastPracticedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PracticeLog {
  id: string
  spotId: string
  practicedAt: string
  durationSec?: number
  bpm?: number
  note?: string
}

export interface Settings {
  metronomeSound: 'click' | 'beep' | 'wood'
  defaultBpm: number
  theme: 'light' | 'dark' | 'system'
}

export const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'rgba(250, 204, 21, 0.4)',
  2: 'rgba(251, 146, 60, 0.4)',
  3: 'rgba(239, 68, 68, 0.4)',
  4: 'rgba(220, 38, 38, 0.5)',
  5: 'rgba(185, 28, 28, 0.6)',
}

export const DIFFICULTY_BORDER_COLORS: Record<number, string> = {
  1: 'rgba(234, 179, 8, 0.9)',
  2: 'rgba(234, 88, 12, 0.9)',
  3: 'rgba(220, 38, 38, 0.9)',
  4: 'rgba(185, 28, 28, 0.9)',
  5: 'rgba(153, 27, 27, 0.9)',
}

export const INSTRUMENT_LABELS: Record<Instrument, string> = {
  piano: 'ピアノ',
  guitar: 'ギター',
  melody: '単旋律',
  other: 'その他',
}

export const INSTRUMENT_ICONS: Record<Instrument, string> = {
  piano: '🎹',
  guitar: '🎸',
  melody: '🎵',
  other: '🎼',
}
