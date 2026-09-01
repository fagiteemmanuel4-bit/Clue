'use client'

import { useEffect, useState } from 'react'
import { Download, File, X } from 'lucide-react'

type WorkspaceFile = { id:string; name:string; mimeType:string; size:number; createdAt:string }

export default function FileWorkspaceDock() {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (window.location.pathname !== '/') return
    setVisible(true)
    fetch('/api/files').then(async r => r.ok ? (await r.json()).files : []).then(rows => Array.isArray(rows) && setFiles(rows)).catch(() => {})
    const onFocus = () => fetch('/api/files').then(async r => r.ok ? (await r.json()).files : []).then(rows => Array.isArray(rows) && setFiles(rows)).catch(() => {})
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
  if (!visible || !files.length) return null
  return <>
    <button className="file-workspace-dock" onClick={() => setOpen(true)} aria-label={`Open ${files.length} generated files`}><File/><span>{files.length}</span></button>
    {open && <div className="file-workspace-backdrop" onClick={() => setOpen(false)}><section className="file-workspace-sheet" onClick={e => e.stopPropagation()}><header><div><strong>Generated files</strong><small>{files.length} saved in your Clue workspace</small></div><button onClick={() => setOpen(false)} aria-label="Close"><X/></button></header><div className="file-workspace-list">{files.map(file => <div className="file-workspace-row" key={file.id}><div className="file-workspace-icon"><File/></div><div className="file-workspace-info"><strong>{file.name}</strong><small>{file.mimeType.includes('spreadsheet') ? 'Excel spreadsheet' : file.mimeType.includes('wordprocessing') ? 'Word document' : file.mimeType.includes('presentation') ? 'PowerPoint' : file.mimeType.includes('pdf') ? 'PDF' : 'File'} · {Math.max(1, Math.round(file.size / 1024))} KB</small></div><a href={`/api/files/${file.id}`} download={file.name} onClick={e => e.stopPropagation()} aria-label={`Download ${file.name}`}><Download/></a></div>)}</div></section></div>}
  </>
}
