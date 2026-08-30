'use client'

import { useMemo, useRef, useState } from 'react'
import { Archive, Eye, FileText, Folder, Menu, Mic, Paperclip, Plus, Send, Settings, Sparkles, X, Globe, Code2, Image as ImageIcon } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }
const history = [['Today', ['Weekend trip itinerary ideas', 'Fixing the auth redirect bug', 'Naming ideas for the sidebar']], ['Previous 7 days', ['Recipe: brown butter cookies', 'Landing page copy review', 'Explain vector databases simply', 'Interview prep — systems design']]] as const
const quickTools = [{ label: 'Web', icon: Globe }, { label: 'Code', icon: Code2 }, { label: 'Image', icon: ImageIcon }]

export default function Home() {
  const [open, setOpen] = useState(false), [incognito, setIncognito] = useState(false), [message, setMessage] = useState('')
  const [listening, setListening] = useState(false), [toolsOpen, setToolsOpen] = useState(false), [activeTool, setActiveTool] = useState('')
  const [activeChat, setActiveChat] = useState(''), [messages, setMessages] = useState<Message[]>([]), [busy, setBusy] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null), chunksRef = useRef<Blob[]>([])
  const greeting = useMemo(() => { const h = new Date().getHours(); if (h < 5) return ['Still up,', 'night owl.']; if (h < 12) return ['Good', 'morning.']; if (h < 17) return ['Good', 'afternoon.']; if (h < 21) return ['Good', 'evening.']; return ['Winding down', 'for the night?'] }, [])

  async function submit() {
    const text = message.trim(); if (!text || busy) return
    const next = [...messages, { role: 'user' as const, content: text }]; setMessages(next); setMessage(''); setToolsOpen(false); setBusy(true)
    try { const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) }); const data = await r.json(); setMessages([...next, { role: 'assistant', content: data.message || 'Clue is thinking.' }]) }
    catch { setMessages([...next, { role: 'assistant', content: 'Clue could not connect right now. Please try again.' }]) }
    finally { setBusy(false) }
  }

  async function toggleVoice() {
    if (listening && mediaRef.current) { mediaRef.current.stop(); setListening(false); return }
    if (!navigator.mediaDevices?.getUserMedia) return
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const recorder = new MediaRecorder(stream); chunksRef.current = []; recorder.ondataavailable = e => chunksRef.current.push(e.data); recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); setMessage('Voice note recorded. Add transcription processing to send it to Clue.') }; mediaRef.current = recorder; recorder.start(); setListening(true) } catch { setListening(false) }
  }

  const startNew = () => { setActiveChat(''); setMessages([]); setMessage(''); setOpen(false) }
  return <main className={incognito ? 'app incognito' : 'app'}><div className="glow"/><div className={`overlay ${open ? 'visible' : ''}`} onClick={() => setOpen(false)}/>
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-hidden={!open}><div className="brand"><div className="mark">C</div><span>Clue</span></div><div className="side-inner"><nav>
      <button className="nav primary" onClick={startNew}><Plus/> New chat</button><button className="nav"><Folder/> Projects</button><button className="nav"><FileText/> Files</button><button className="nav"><Archive/> Archived</button>
    </nav><div className="history">{history.map(([label, items]) => <section key={label}><p className="label">{label}</p>{items.map(item => <button className={`history-item ${activeChat === item ? 'active' : ''}`} key={item} onClick={() => { setActiveChat(item); setOpen(false) }}>{item}</button>)}</section>)}</div></div>
      <footer><div className="plan"><span><i/> Free plan</span></div><button className="upgrade"><Sparkles/> Upgrade to Pro</button><button className="nav"><Settings/> Settings</button></footer>
    </aside>
    <header><button className={`circle menu ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X/> : <Menu/>}</button><button className={`incognito ${incognito ? 'on' : ''}`} onClick={() => setIncognito(!incognito)}><Eye/><i/>{incognito ? 'Incognito · On' : 'Incognito'}</button></header>
    <section className={`conversation ${messages.length ? 'has-messages' : ''}`}>{messages.length === 0 ? <div className="hero">{activeChat && <p className="context">{activeChat}</p>}<h1><span>{greeting[0]} </span><em>{greeting[1]}</em></h1><p>Ask anything, or start with what&apos;s already on your mind.</p></div> : <div className="messages">{messages.map((m, i) => <article className={`message ${m.role}`} key={`${m.role}-${i}`}><div>{m.content}</div></article>)}{busy && <div className="typing"><span/><span/><span/></div>}</div>}</section>
    <section className="composer-wrap">{toolsOpen && <div className="tool-menu" role="menu">{quickTools.map(({label, icon: Icon}) => <button key={label} onClick={() => { setActiveTool(label); setToolsOpen(false) }}><Icon/>{label}</button>)}<button><Paperclip/> Attach files</button></div>}
      <div className="composer"><button className={`circle tool ${toolsOpen ? 'selected' : ''}`} onClick={() => setToolsOpen(!toolsOpen)} aria-label="Tools"><Plus/></button><textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }} placeholder={activeTool ? `Ask Clue with ${activeTool}...` : 'Message...'} rows={1}/><button className={`circle mic ${listening ? 'listening' : ''}`} onClick={toggleVoice} aria-label="Voice note"><Mic/></button><button className={`circle send ${message.trim() && !busy ? 'ready' : ''}`} onClick={submit} aria-label="Send"><Send/></button></div>
      <p className="hint">{incognito ? 'This conversation won’t be saved to history.' : busy ? 'Clue is thinking…' : 'Responses may be reviewed to improve quality.'}</p></section>
  </main>
}
