import { create } from 'zustand'
import type { Piece, Spot, PracticeLog, Settings } from '../types'
import * as db from '../db'

interface AppState {
  pieces: Piece[]
  spots: Spot[]
  practiceLogs: PracticeLog[]
  settings: Settings
  loaded: boolean

  loadPieces: () => Promise<void>
  loadSpots: (pieceId: string) => Promise<void>
  loadAllSpots: () => Promise<void>
  loadLogs: () => Promise<void>
  loadSettings: () => Promise<void>

  addPiece: (piece: Piece) => Promise<void>
  updatePiece: (piece: Piece) => Promise<void>
  removePiece: (id: string) => Promise<void>

  addSpot: (spot: Spot) => Promise<void>
  updateSpot: (spot: Spot) => Promise<void>
  removeSpot: (id: string) => Promise<void>

  addLog: (log: PracticeLog) => Promise<void>
  updateSettings: (settings: Settings) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  pieces: [],
  spots: [],
  practiceLogs: [],
  settings: { metronomeSound: 'click', defaultBpm: 80, theme: 'system' },
  loaded: false,

  loadPieces: async () => {
    const pieces = await db.getAllPieces()
    set({ pieces, loaded: true })
  },

  loadSpots: async (pieceId) => {
    const spots = await db.getSpotsByPiece(pieceId)
    set((s) => ({
      spots: [...s.spots.filter((sp) => sp.pieceId !== pieceId), ...spots],
    }))
  },

  loadAllSpots: async () => {
    const allSpots: Spot[] = []
    for (const piece of get().pieces) {
      const spots = await db.getSpotsByPiece(piece.id)
      allSpots.push(...spots)
    }
    set({ spots: allSpots })
  },

  loadLogs: async () => {
    const practiceLogs = await db.getAllLogs()
    set({ practiceLogs })
  },

  loadSettings: async () => {
    const settings = await db.getSettings()
    set({ settings })
  },

  addPiece: async (piece) => {
    await db.putPiece(piece)
    set((s) => ({ pieces: [...s.pieces, piece] }))
  },

  updatePiece: async (piece) => {
    await db.putPiece(piece)
    set((s) => ({ pieces: s.pieces.map((p) => (p.id === piece.id ? piece : p)) }))
  },

  removePiece: async (id) => {
    await db.deletePiece(id)
    set((s) => ({
      pieces: s.pieces.filter((p) => p.id !== id),
      spots: s.spots.filter((sp) => sp.pieceId !== id),
    }))
  },

  addSpot: async (spot) => {
    await db.putSpot(spot)
    set((s) => ({ spots: [...s.spots, spot] }))
  },

  updateSpot: async (spot) => {
    await db.putSpot(spot)
    set((s) => ({ spots: s.spots.map((sp) => (sp.id === spot.id ? spot : sp)) }))
  },

  removeSpot: async (id) => {
    await db.deleteSpot(id)
    set((s) => ({ spots: s.spots.filter((sp) => sp.id !== id) }))
  },

  addLog: async (log) => {
    await db.putLog(log)
    set((s) => ({ practiceLogs: [...s.practiceLogs, log] }))
  },

  updateSettings: async (settings) => {
    await db.putSettings(settings)
    set({ settings })
  },
}))
