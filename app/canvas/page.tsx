'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Download, Play, Plus, Save, Sparkles, X } from 'lucide-react'
import './canvas.css'

type Language = 'javascript' | 'typescript' | 'python' | 'json' | 'html' | 'css' | 'sql' | 'markdown'

const templates: Record<Language, string> = {
  javascript: `function greet(name) {\n  return \`Hello, ${'${name}'}!\`;\n}\n\nconsole.log(greet('Clue'));`,
  typescript: `type User = { name: string; active: boolean }\n\nconst user: User = { name: 'Clue', active: true }\nconsole.log(user)`,
  python: `def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nprint(greet("Clue"))`,
  json: `{"name":"Clue","active":true,"features":["AI","Canvas"]}`,
  html: `<main>\n  <h1>Hello, Clue</h1>\n  <p>Edit this canvas and preview HTML.</p>\n</main>`,
  css: `.card {\n  display: grid;\n  gap: 12px;\n  border-radius: 16px;\n}`, 
  sql: `SELECT name, COUNT(*) AS total\nFROM users\nGROUP BY name\nORDER BY total DESC;`,
  markdown: `# Clue Canvas\n\nWrite ideas, notes, code, or documentation here.\n\n- Fast editing\n- Language aware\n- Exportable`,
}

function escapeHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function highlight(code: string, language: Language) {
  const escaped = escapeHtml(code)
  if (language === 'json') return escaped.replace(/(&quot;[^&]*?&quot;)(\s*:)?/g, '<span class="tok-string">$1</span>$2').replace(/\b(true|false|null)\b/g, '<span class="tok-keyword">$1</span>').replace(/\b\d+(?:\.\d+)?\b/g, '<span class="tok-number">$&</span>')
  if (language === 'html') return escaped.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="tok-keyword">$2</span>').replace(/([\w-]+)=(&quot;.*?&quot;)/g, '<span class="tok-property">$1</span>=$2')
  if (language === 'css') return escaped.replace(/([\w-]+)(?=\s*:)/g, '<span class="tok-property">$1</span>').replace(/(\.[\w-]+|#[\w-]+)/g, '<span class="tok-keyword">$1</span>')
  if (language === 'sql') return escaped.replace(/\b(SELECT|FROM|WHERE|GROUP|BY|ORDER|LIMIT|AS|JOIN|ON|COUNT|DESC|ASC)\b/gi, '<span class="tok-keyword">$1</span>').replace(/('[^']*')/g, '<span class="tok-string">$1</span>')
  if (language === 'markdown') return escaped.replace(/^(#{1,6}.*)$/gm, '<span class="tok-heading">$1</span>').replace(/^(\s*[-*]\s.*)$/gm, '<span class="tok-comment">$1</span>')
  return escaped.replace(/(\/\/.*)$/gm, '<span class="tok-comment">$1</span>').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '<span class="tok-string">$&</span>').replace(/\b(const|let|var|function|return|if|else|for|while|class|new|import|from|export|def|print|in|True|False|None|type|interface)\b/g, '<span class="tok-keyword">$1</span>').replace(/\b\d+(?:\.\d+)?\b/g, '<span class="tok-number">$&</span>')
}

export default function CanvasPage() {
  const [language, setLanguage] = useState<Language>('typescript')
  const [code, setCode] = useState(templates.typescript)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)
  const highlighted = useMemo(() => highlight(code, language), [code, language])
  const changeLanguage = (next: Language) => { setLanguage(next); setCode(templates[next]); setSaved(false) }
  const copy = async () => { await navigator.clipboard?.writeText(code); setSaved(true); setTimeout(() => setSaved(false), 1200) }
  const download = () => { const blob = new Blob([code], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `clue-canvas.${language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : language === 'python' ? 'py' : language}`; a.click(); URL.revokeObjectURL(url) }
  return <main className="canvas-page">
    <header className="canvas-header"><div><Link href="/" className="canvas-back"><ArrowLeft/>Back to Clue</Link><div className="canvas-title"><Sparkles/><div><strong>Canvas</strong><span>Language-aware workspace</span></div></div></div><div className="canvas-actions"><button onClick={copy}><Copy/>{saved ? 'Copied' : 'Copy'}</button><button onClick={download}><Download/>Export</button><button className="primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1200) }}><Save/>Save</button></div></header>
    <section className="canvas-toolbar"><div className="language-tabs">{(Object.keys(templates) as Language[]).map(l => <button key={l} className={language === l ? 'active' : ''} onClick={() => changeLanguage(l)}>{l}</button>)}</div><button className="preview-toggle" onClick={() => setPreview(v => !v)}>{preview ? <X/> : <Play/>}{preview ? 'Close preview' : 'Preview'}</button></section>
    <section className={`canvas-grid ${preview ? 'with-preview' : ''}`}><div className="editor-shell"><div className="editor-gutter">{code.split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}</div><div className="editor-area"><pre aria-hidden dangerouslySetInnerHTML={{ __html: highlighted + '\n' }} /><textarea spellCheck={false} value={code} onChange={e => { setCode(e.target.value); setSaved(false) }} aria-label="Canvas editor" /></div></div>{preview && <div className="preview-shell"><div className="preview-head"><span>Preview</span><button onClick={() => setPreview(false)}><X/></button></div>{language === 'html' ? <iframe title="HTML preview" sandbox="allow-scripts" srcDoc={code}/> : <div className="preview-placeholder"><Sparkles/><strong>Live workspace preview</strong><p>Preview is optimized for HTML. Other languages stay safely in the editor for execution through Clue's tool runtime.</p></div>}</div>}</section>
  </main>
}
