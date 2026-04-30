import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Piece, Spot, PracticeLog, Settings } from '../types'

interface ScorePracticeDB extends DBSchema {
  pieces: {
    key: string
    value: Piece
    indexes: { 'by-updatedAt': string }
  }
  spots: {
    key: string
    value: Spot
    indexes: { 'by-pieceId': string; 'by-updatedAt': string }
  }
  practiceLogs: {
    key: string
    value: PracticeLog
    indexes: { 'by-spotId': string; 'by-practicedAt': string }
  }
  blobs: {
    key: string
    value: { id: string; data: Blob }
  }
  settings: {
    key: string
    value: Settings & { id: string }
  }
}

let dbPromise: Promise<IDBPDatabase<ScorePracticeDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ScorePracticeDB>('score-practice', 1, {
      upgrade(db) {
        const pieces = db.createObjectStore('pieces', { keyPath: 'id' })
        pieces.createIndex('by-updatedAt', 'updatedAt')

        const spots = db.createObjectStore('spots', { keyPath: 'id' })
        spots.createIndex('by-pieceId', 'pieceId')
        spots.createIndex('by-updatedAt', 'updatedAt')

        const logs = db.createObjectStore('practiceLogs', { keyPath: 'id' })
        logs.createIndex('by-spotId', 'spotId')
        logs.createIndex('by-practicedAt', 'practicedAt')

        db.createObjectStore('blobs', { keyPath: 'id' })
        db.createObjectStore('settings', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

// Pieces
export async function getAllPieces(): Promise<Piece[]> {
  const db = await getDB()
  return db.getAll('pieces')
}

export async function getPiece(id: string): Promise<Piece | undefined> {
  const db = await getDB()
  return db.get('pieces', id)
}

export async function putPiece(piece: Piece): Promise<void> {
  const db = await getDB()
  await db.put('pieces', piece)
}

export async function deletePiece(id: string): Promise<void> {
  const db = await getDB()
  const spots = await getSpotsByPiece(id)
  const tx = db.transaction(['pieces', 'spots', 'practiceLogs', 'blobs'], 'readwrite')
  await tx.objectStore('pieces').delete(id)
  for (const spot of spots) {
    await tx.objectStore('spots').delete(spot.id)
    const logs = await tx.objectStore('practiceLogs').index('by-spotId').getAll(spot.id)
    for (const log of logs) {
      await tx.objectStore('practiceLogs').delete(log.id)
    }
  }
  const piece = await db.get('pieces', id)
  if (piece?.pdfBlobId) await tx.objectStore('blobs').delete(piece.pdfBlobId)
  if (piece?.audioBlobId) await tx.objectStore('blobs').delete(piece.audioBlobId)
  await tx.done
}

// Spots
export async function getSpotsByPiece(pieceId: string): Promise<Spot[]> {
  const db = await getDB()
  return db.getAllFromIndex('spots', 'by-pieceId', pieceId)
}

export async function getSpot(id: string): Promise<Spot | undefined> {
  const db = await getDB()
  return db.get('spots', id)
}

export async function putSpot(spot: Spot): Promise<void> {
  const db = await getDB()
  await db.put('spots', spot)
}

export async function deleteSpot(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['spots', 'practiceLogs'], 'readwrite')
  await tx.objectStore('spots').delete(id)
  const logs = await tx.objectStore('practiceLogs').index('by-spotId').getAll(id)
  for (const log of logs) {
    await tx.objectStore('practiceLogs').delete(log.id)
  }
  await tx.done
}

// PracticeLogs
export async function getLogsBySpot(spotId: string): Promise<PracticeLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('practiceLogs', 'by-spotId', spotId)
}

export async function getAllLogs(): Promise<PracticeLog[]> {
  const db = await getDB()
  return db.getAll('practiceLogs')
}

export async function putLog(log: PracticeLog): Promise<void> {
  const db = await getDB()
  await db.put('practiceLogs', log)
}

// Blobs
export async function putBlob(id: string, data: Blob): Promise<void> {
  const db = await getDB()
  await db.put('blobs', { id, data })
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const db = await getDB()
  const entry = await db.get('blobs', id)
  return entry?.data
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('blobs', id)
}

// Settings
const SETTINGS_KEY = 'main'
const DEFAULT_SETTINGS: Settings = {
  metronomeSound: 'click',
  defaultBpm: 80,
  theme: 'system',
}

export async function getSettings(): Promise<Settings> {
  const db = await getDB()
  const entry = await db.get('settings', SETTINGS_KEY)
  return entry ? { metronomeSound: entry.metronomeSound, defaultBpm: entry.defaultBpm, theme: entry.theme } : DEFAULT_SETTINGS
}

export async function putSettings(settings: Settings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { id: SETTINGS_KEY, ...settings })
}

// Export/Import helpers
export async function exportAllData() {
  const db = await getDB()
  const [pieces, spots, practiceLogs, settings] = await Promise.all([
    db.getAll('pieces'),
    db.getAll('spots'),
    db.getAll('practiceLogs'),
    db.get('settings', SETTINGS_KEY),
  ])
  const blobEntries: { id: string; data: Blob }[] = []
  for (const piece of pieces) {
    const pdf = await db.get('blobs', piece.pdfBlobId)
    if (pdf) blobEntries.push(pdf)
    if (piece.audioBlobId) {
      const audio = await db.get('blobs', piece.audioBlobId)
      if (audio) blobEntries.push(audio)
    }
  }
  return { pieces, spots, practiceLogs, settings, blobEntries }
}

export async function importAllData(data: Awaited<ReturnType<typeof exportAllData>>) {
  const db = await getDB()
  const tx = db.transaction(['pieces', 'spots', 'practiceLogs', 'blobs', 'settings'], 'readwrite')
  for (const piece of data.pieces) await tx.objectStore('pieces').put(piece)
  for (const spot of data.spots) await tx.objectStore('spots').put(spot)
  for (const log of data.practiceLogs) await tx.objectStore('practiceLogs').put(log)
  for (const blob of data.blobEntries) await tx.objectStore('blobs').put(blob)
  if (data.settings) await tx.objectStore('settings').put(data.settings)
  await tx.done
}
