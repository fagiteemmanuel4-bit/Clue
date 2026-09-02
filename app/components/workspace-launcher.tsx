'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Code2, FileSearch, Loader2, X } from 'lucide-react'

type Analysis = { file: { name: string; kind: string; size: number; summary: string; rows?: number; columns?: number; sheets?: string[]; stats?: Record<string, { count: number; missing: number; min?: number; max?: number; mean?: number }> }; context: string }

function setComposer(text: string) {
  const textarea = document.querySelector('textarea[aria-label="Message Clue"], textarea') as HTMLTextAreaElement | null
  if (!textarea) return false
  const current = textarea.value.trim()
  const next = current ? `${current}\n\n${text}` : text
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(textarea, next)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
  return true
}

export default function WorkspaceLauncher() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Analysis | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hidden = typeof window !== 'undefined' && window.location.pathname === '/canvas'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'u') { e.preventDefault(); inputRef.current?.click() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function analyze(file: File) {
    setBusy(true); setError(''); setResult(null); setOpen(true)
    try {
      const form = new FormData(); form.append('file', file, file.name)
      const response = await fetch('/api/files/analyze', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Could not analyze the file.')
      setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not analyze the file.') }
    finally { setBusy(false) }
  }

  if (hidden) return null
  return <>
    <div className="workspace-launcher" aria-label="Workspace tools">
      <button onClick={() => inputRef.current?.click()} title="Upload and analyze a file"><FileSearch/><span>Analyze</span></button>
      <Link href="/canvas" title="Open Canvas"><Code2/><span>Canvas</span></Link>
      <input ref={inputRef} hidden type="file" accept=".pdf,.txt,.csv,.docx,.xlsx,.xls,.json,.md,.xml,.html,.js,.ts,.tsx,.jsx,.py,.java,.go,.rs,.css,image/*" onChange={e => { const f = e.target.files?.[0]; if (f) analyze(f); e.currentTarget.value = '' }} />
    </div>
    {open && <div className="workspace-modal-backdrop" onClick={() => !busy && setOpen(false)}><div className="workspace-modal" onClick={e => e.stopPropagation()}>
      <div className="workspace-modal-head"><div><strong>File analysis</strong><span>{busy ? 'Parsing and profiling your file…' : result?.file.name || 'Upload a file to begin'}</span></div><button onClick={() => setOpen(false)} disabled={busy}><X/></button></div>
      {busy ? <div className="workspace-loading"><Loader2 className="spin"/><strong>Analyzing your file</strong><p>Extracting content, detecting structure, and calculating useful statistics.</p></div> : error ? <div className="workspace-error"><strong>Analysis failed</strong><p>{error}</p><button onClick={() => inputRef.current?.click()}>Try another file</button></div> : result ? <div className="workspace-result"><div className="analysis-summary"><BarChart3/><div><strong>{result.file.summary}</strong><small>{result.file.kind} · {(result.file.size / 1024).toFixed(0)} KB{result.file.rows !== undefined ? ` · ${result.file.rows} rows` : ''}{result.file.columns !== undefined ? ` · ${result.file.columns} columns` : ''}</small></div></div>{result.file.sheets?.length ? <div className="analysis-chips">{result.file.sheets.map(s => <span key={s}>{s}</span>)}</div> : null}{result.file.stats && <div className="analysis-table"><div className="analysis-row analysis-head"><span>Column</span><span>Missing</span><span>Average</span></div>{Object.entries(result.file.stats).slice(0, 10).map(([name, s]) => <div className="analysis-row" key={name}><span>{name}</span><span>{s.missing}</span><span>{s.mean === undefined ? '—' : s.mean.toFixed(2)}</span></div>)}</div>}<div className="analysis-actions"><button onClick={() => { const context = `I uploaded ${result.file.name}. ${result.file.summary}\n\nFile analysis context:\n${result.context.slice(0, 9000)}\n\nPlease use this analysis to answer my next request.`; if (setComposer(context)) { setOpen(false) } }}>Use in chat</button><button onClick={() => setOpen(false)}>Done</button></div></div> : <div className="workspace-empty"><FileSearch/><p>Supports PDF, Word, Excel, CSV, JSON, text/code and images.</p><button onClick={() => inputRef.current?.click()}>Choose file</button></div>}
    </div></div>}
  </>
}
