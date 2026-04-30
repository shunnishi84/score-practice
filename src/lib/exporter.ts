import JSZip from 'jszip'
import { exportAllData, importAllData } from '../db'

export async function exportToFile(): Promise<void> {
  const data = await exportAllData()
  const zip = new JSZip()

  const manifest = {
    pieces: data.pieces,
    spots: data.spots,
    practiceLogs: data.practiceLogs,
    settings: data.settings,
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  for (const entry of data.blobEntries) {
    const arr = await entry.data.arrayBuffer()
    const isPdf = entry.data.type === 'application/pdf'
    const folder = isPdf ? 'pdfs' : 'audio'
    const ext = isPdf ? 'pdf' : entry.data.type.split('/')[1] ?? 'bin'
    zip.file(`${folder}/${entry.id}.${ext}`, arr)
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `score-practice-${new Date().toISOString().slice(0, 10)}.scprac`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFromFile(file: File): Promise<void> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('manifest.json が見つかりません')

  const manifest = JSON.parse(await manifestFile.async('string'))

  const blobEntries: { id: string; data: Blob }[] = []

  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (path === 'manifest.json' || (zipEntry as JSZip.JSZipObject).dir) continue
    const arr = await (zipEntry as JSZip.JSZipObject).async('arraybuffer')
    const name = path.split('/').pop() ?? ''
    const id = name.split('.')[0]
    const ext = name.split('.').pop() ?? ''
    const type = path.startsWith('pdfs/') ? 'application/pdf' : `audio/${ext}`
    blobEntries.push({ id, data: new Blob([arr], { type }) })
  }

  await importAllData({ ...manifest, blobEntries })
}
