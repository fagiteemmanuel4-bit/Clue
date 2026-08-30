'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Copy, Eye, FileText, Folder, Menu, Mic, Paperclip, Plus, RotateCcw, Search, Send, Settings, Sparkles, Square, X, Globe, Code2, Image as ImageIcon, Trash2 } from 'lucide-react'

type Role = 'user' | 'assistant'
type Message = { id: string; role: Role; content: string; attachment?: { name: string; type: string } }
type Conversation = { id: string; title: string; messages: Message[]; archived?: boolean; incognito?: boolean; updatedAt: number }

const tools = [{ label: 'Web', icon: Globe }, { label: 'Code', icon: Code2 }, { label: 'Image', icon: ImageIcon }]
const key = 'clue.conversations.v1'

function makeConversation(incognito = false): Conversation { return { id: crypto.randomUUID(), title: 'New conversation', messages: [], incognito, updatedAt: Date.now() } }

export default function Home() {
  const [open, setOpen] = useState(false), [incognito, setIncognito] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([]), [activeId, setActiveId] = useState('')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [toolsOpen, setToolsOpen] = useState(false), [activeTool, setActiveTool] = useState('')
  const [listening, setListening] = useState(false), [search, setSearch] = useState(''), [attachment, setAttachment] = useState<{ name: string; type: string } | undefined>()
  const mediaRef = useRef<MediaRecorder | null>(null), chunksRef = useRef<Blob[]>([]), abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(saved)) setConversations(saved) } catch { /* empty state */ } }, [])
  useEffect(() => { const saved = conversations.filter(c => !c.incognito); localStorage.setItem(key, JSON.stringify(saved)) }, [conversations])
  useEffect(() => { messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' }) }, [activeId, conversations])

  const active = conversations.find(c => c.id === activeId)
  const messages = active?.messages || []
  const greeting = useMemo(() => { const h = new Date().getHours(); if (h < 5) return ['Still up,', 'night owl.']; if (h < 12) return ['Good', 'morning.']; if (h < 17) return ['Good', 'afternoon.']; if (h < 21) return ['Good', 'evening.']; return ['Winding down', 'for the night?'] }, [])
  const visible = conversations.filter(c => !c.archived && c.title.toLowerCase().includes(search.toLowerCase()))

  function updateConversation(id: string, patch: Partial<Conversation>) { setConversations(prev => prev.map(c => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)) }
  function startNew() { const c = makeConversation(incognito); setConversations(prev => [c, ...prev]); setActiveId(c.id); setMessage(''); setAttachment(undefined); setOpen(false) }
  function choose(id: string) { setActiveId(id); setIncognito(Boolean(conversations.find(c => c.id === id)?.incognito)); setOpen(false) }

  async function submit() {
    const text = message.trim(); if (!text || busy) return
    let convo = active
    if (!convo || (convo.incognito !== incognito)) { convo = makeConversation(incognito); setConversations(prev => [convo!, ...prev]); setActiveId(convo.id) }
    const user: Message = { id: crypto.randomUUID(), role: 'user', content: text, attachment }
    const next = [...convo.messages, user]
    updateConversation(convo.id, { messages: next, title: convo.messages.length ? convo.title : text.slice(0, 48) })
    setMessage(''); setAttachment(undefined); setToolsOpen(false); setBusy(true); abortRef.current = new AbortController()
    const assistantId = crypto.randomUUID()
    updateConversation(convo.id, { messages: [...next, { id: assistantId, role: 'assistant', content: '' }] })
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), model: activeTool === 'Code' ? 'free' : undefined }), signal: abortRef.current.signal })
      if (!response.ok || !response.body) throw new Error('request failed')
      const reader = response.body.getReader(), decoder = new TextDecoder(); let full = ''
      while (true) { const { done, value } = await reader.read(); if (done) break; full += decoder.decode(value, { stream: true }); updateConversation(convo.id, { messages: [...next, { id: assistantId, role: 'assistant', content: full }] }) }
      if (!full) throw new Error('empty response')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      updateConversation(convo.id, { messages: [...next, { id: assistantId, role: 'assistant', content: 'Clue could not connect right now. Try again.' }] })
    } finally { setBusy(false); abortRef.current = null }
  }

  function cancel() { abortRef.current?.abort(); setBusy(false) }
  function regenerate(index: number) { const user = messages.slice(0, index).reverse().find(m => m.role === 'user'); if (!user || busy) return; updateConversation(activeId, { messages: messages.slice(0, index) }); setMessage(user.content) }
  function editMessage(index: number) { if (messages[index]?.role !== 'user' || busy) return; setMessage(messages[index].content); updateConversation(activeId, { messages: messages.slice(0, index) }) }
  async function copy(text: string) { await navigator.clipboard?.writeText(text) }

  async function toggleVoice() {
    if (listening && mediaRef.current) { mediaRef.current.stop(); setListening(false); return }
    if (!navigator.mediaDevices?.getUserMedia) return
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const recorder = new MediaRecorder(stream); chunksRef.current = []; recorder.ondataavailable = e => chunksRef.current.push(e.data); recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); setMessage('Voice note recorded — review before sending.'); }; mediaRef.current = recorder; recorder.start(); setListening(true) } catch { setListening(false) }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (file) setAttachment({ name: file.name, type: file.type || 'file' }); e.currentTarget.value = '' }

  return <main className={incognito ? 'app incognito' : 'app'}><div className="glow"/><div className={`overlay ${open ? 'visible' : ''}`} onClick={() => setOpen(false)}/>
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-hidden={!open}><div className="brand"><div className="mark">C</div><span>Clue</span></div><div className="side-inner"><nav>
      <button className="nav primary" onClick={startNew}><Plus/> New chat</button><button className="nav"><Folder/> Projects</button><button className="nav"><FileText/> Files</button><button className="nav" onClick={() => setConversations(prev => prev.map(c => c.id === activeId ? { ...c, archived: true } : c))}><Archive/> Archive</button>
      <div className="search-box"><Search/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats" aria-label="Search conversations"/></div>
    </nav><div className="history">{visible.map(c => <button className={`history-item ${c.id === activeId ? 'active' : ''}`} key={c.id} onClick={() => choose(c.id)}>{c.title}</button>)}</div></div>
      <footer><div className="plan"><span><i/> Free plan</span></div><button className="upgrade"><Sparkles/> Upgrade to Pro</button><button className="nav"><Settings/> Settings</button></footer>
    </aside>
    <header><button className={`circle menu ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X/> : <Menu/>}</button><button className={`incognito ${incognito ? 'on' : ''}`} onClick={() => { setIncognito(v => !v); if (!incognito) { const c = makeConversation(true); setConversations(prev => [c, ...prev]); setActiveId(c.id) } }}><Eye/><i/>{incognito ? 'Incognito · On' : 'Incognito'}</button></header>
    <section className={`conversation ${messages.length ? 'has-messages' : ''}`} ref={messagesRef}>{messages.length === 0 ? <div className="hero">{active && active.title !== 'New conversation' && <p className="context">{active.title}</p>}<h1><span>{greeting[0]} </span><em>{greeting[1]}</em></h1><p>Ask anything, or start with what&apos;s already on your mind.</p></div> : <div className="messages">{messages.map((m, i) => <article className={`message ${m.role}`} key={m.id}><div className="bubble">{m.attachment && <small className="attachment"><Paperclip/> {m.attachment.name}</small>}<div className="content">{m.content || (busy ? ' ' : 'No response.')}</div>{m.role === 'assistant' && m.content && <div className="message-actions"><button onClick={() => copy(m.content)} aria-label="Copy"><Copy/></button><button onClick={() => regenerate(i)} aria-label="Regenerate"><RotateCcw/></button></div>}{m.role === 'user' && <button className="edit" onClick={() => editMessage(i)} aria-label="Edit">Edit</button>}</div></article>)}{busy && <div className="typing"><span/><span/><span/></div>}</div>}</section>
    <section className="composer-wrap">{toolsOpen && <div className="tool-menu" role="menu">{tools.map(({label, icon: Icon}) => <button key={label} onClick={() => { setActiveTool(label); setToolsOpen(false) }}><Icon/>{label}</button>)}<label><Paperclip/> Attach<input hidden type="file" accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,audio/*,video/*" onChange={onFile}/></label></div>}
      {attachment && <div className="attachment-pill"><Paperclip/> {attachment.name}<button onClick={() => setAttachment(undefined)} aria-label="Remove attachment"><X/></button></div>}
      <div className="composer"><button className={`circle tool ${toolsOpen ? 'selected' : ''}`} onClick={() => setToolsOpen(!toolsOpen)} aria-label="Tools"><Plus/></button><textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }} placeholder={activeTool ? `Ask Clue with ${activeTool}...` : 'Message...'} rows={1}/><button className={`circle mic ${listening ? 'listening' : ''}`} onClick={toggleVoice} aria-label="Voice note"><Mic/></button>{busy ? <button className="circle send ready" onClick={cancel} aria-label="Stop"><Square/></button> : <button className={`circle send ${message.trim() ? 'ready' : ''}`} onClick={submit} aria-label="Send"><Send/></button>}</div>
      <p className="hint">{incognito ? 'This conversation won’t be saved to history.' : busy ? 'Clue is thinking…' : 'Private by default.'}</p></section>
  </main>
}
