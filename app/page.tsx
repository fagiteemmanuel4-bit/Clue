'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Copy, FileText, Folder, Menu, Mic, Paperclip, Plus, RotateCcw, Search, Send, Settings, Square, X, Globe, Code2, Image as ImageIcon, LogOut } from 'lucide-react'
import Link from 'next/link'

type Role = 'user' | 'assistant'
type Message = { id: string; role: Role; content: string; attachment?: { name: string; type: string } }
type Conversation = { id: string; title: string; messages: Message[]; archived?: boolean; updatedAt: number }
type User = { id: string; email: string; displayName: string | null }

const tools = [
  { label: 'Web', icon: Globe },
  { label: 'Code', icon: Code2 },
  { label: 'Image', icon: ImageIcon },
]
const guestKey = 'clue.guest.v1'
const guestLimit = 5

function makeConversation(): Conversation {
  return { id: crypto.randomUUID(), title: 'New conversation', messages: [], updatedAt: Date.now() }
}

export default function Home() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [activeTool, setActiveTool] = useState('')
  const [search, setSearch] = useState('')
  const [attachment, setAttachment] = useState<Message['attachment']>()
  const [listening, setListening] = useState(false)
  const [guestCount, setGuestCount] = useState(0)
  const [showContinue, setShowContinue] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => { if (d.user) setUser(d.user) }).catch(() => {})
    try { setGuestCount(Number(localStorage.getItem(guestKey) || 0)) } catch {}
  }, [])

  useEffect(() => {
    if (!user) return
    fetch('/api/conversations').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.conversations) setConversations(d.conversations.map((c: Record<string, unknown>) => ({ ...c, messages: [], updatedAt: new Date(String(c.updatedAt)).getTime() })))
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) {
      try { localStorage.setItem('clue.conversations.v1', JSON.stringify(conversations)) } catch {}
    }
  }, [conversations, user])

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
  }, [activeId, conversations])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [message])

  const active = conversations.find((c) => c.id === activeId)
  const messages = active?.messages || []
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 5) return ['Still up,', 'night owl.']
    if (h < 12) return ['Good', 'morning.']
    if (h < 17) return ['Good', 'afternoon.']
    if (h < 21) return ['Good', 'evening.']
    return ['Winding down', 'for the night?']
  }, [])
  const visible = conversations.filter((c) => !c.archived && c.title.toLowerCase().includes(search.toLowerCase()))

  function updateConversation(id: string, patch: Partial<Conversation>) {
    setConversations((items) => items.map((c) => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c))
  }

  async function createConversation() {
    if (user) {
      try {
        const r = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const d = await r.json()
        if (r.ok && d.conversation) {
          const c = { ...d.conversation, messages: [], updatedAt: Date.now() }
          setConversations((items) => [c, ...items])
          setActiveId(c.id)
          return c as Conversation
        }
      } catch {}
    }
    const c = makeConversation()
    setConversations((items) => [c, ...items])
    setActiveId(c.id)
    return c
  }

  async function submit() {
    const text = message.trim()
    if (!text || busy) return
    if (!user && guestCount >= guestLimit) { setShowContinue(true); return }
    let convo = active
    if (!convo) convo = await createConversation()
    if (!convo) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, attachment }
    const next = [...convo.messages, userMsg]
    updateConversation(convo.id, { messages: next, title: convo.messages.length ? convo.title : text.slice(0, 48) })
    setMessage(''); setAttachment(undefined); setToolsOpen(false); setBusy(true)
    const assistantId = crypto.randomUUID()
    updateConversation(convo.id, { messages: [...next, { id: assistantId, role: 'assistant', content: '' }] })
    if (!user) {
      const count = guestCount + 1
      setGuestCount(count)
      try { localStorage.setItem(guestKey, String(count)) } catch {}
      if (count >= guestLimit) setShowContinue(true)
    }

    const controller = new AbortController()
    abortRef.current = controller
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), model: activeTool === 'Code' ? 'free' : undefined }),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null)
        throw new Error(detail?.error || `AI request failed (${response.status})`)
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        updateConversation(convo.id, { messages: [...next, { id: assistantId, role: 'assistant', content: full }] })
      }
      full += decoder.decode()
      if (!full.trim()) throw new Error('The AI returned an empty response.')
      if (user) {
        await Promise.all([
          fetch(`/api/conversations/${convo.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'user', contentText: text, contentType: 'text' }) }),
          fetch(`/api/conversations/${convo.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'assistant', contentText: full, contentType: 'text' }) }),
        ])
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      updateConversation(convo.id, { messages: [...next, { id: assistantId, role: 'assistant', content: error instanceof Error ? error.message : 'Clue could not connect right now. Try again.' }] })
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function cancel() { abortRef.current?.abort(); setBusy(false) }
  function editMessage(index: number) {
    if (messages[index]?.role !== 'user' || busy) return
    setMessage(messages[index].content)
    updateConversation(activeId, { messages: messages.slice(0, index) })
  }
  function regenerate(index: number) {
    const previous = messages.slice(0, index).reverse().find((m) => m.role === 'user')
    if (!previous || busy) return
    updateConversation(activeId, { messages: messages.slice(0, index) })
    setMessage(previous.content)
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); location.reload() }

  async function toggleVoice() {
    if (listening && mediaRef.current) { mediaRef.current.stop(); setListening(false); return }
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); setMessage('Voice note recorded — review before sending.') }
      mediaRef.current = recorder
      recorder.start()
      setListening(true)
    } catch { setListening(false) }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setAttachment({ name: file.name, type: file.type || 'file' })
    e.currentTarget.value = ''
  }

  return (
    <main className="app">
      <div className="glow" />
      <div className={`overlay ${open ? 'visible' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="brand"><span>Clue</span></div>
        <div className="side-inner">
          <nav>
            <button className="nav primary" onClick={() => { setMessage(''); createConversation(); setOpen(false) }}><Plus /> New chat</button>
            <Link className="nav" href="/projects" onClick={() => setOpen(false)}><Folder /> Projects</Link>
            <Link className="nav" href="/files" onClick={() => setOpen(false)}><FileText /> Files</Link>
            <button className="nav" onClick={() => activeId && setConversations((items) => items.map((c) => c.id === activeId ? { ...c, archived: true } : c))}><Archive /> Archive</button>
            <div className="search-box"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" aria-label="Search conversations" /></div>
          </nav>
          <div className="history">{visible.map((c) => <button className={`history-item ${c.id === activeId ? 'active' : ''}`} key={c.id} onClick={() => { setActiveId(c.id); setOpen(false) }}>{c.title}</button>)}</div>
        </div>
        <footer>
          {user ? <><div className="plan"><span>{user.displayName || user.email}</span></div><button className="nav" onClick={logout}><LogOut /> Sign out</button></> : <Link href="/login" className="upgrade">Sign in to Clue</Link>}
          <Link className="nav" href="/settings"><Settings /> Settings</Link>
        </footer>
      </aside>

      <header>
        {(user || messages.length > 0) && <button className="circle menu" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>}
        {!user && messages.length === 0 ? <Link className="login-link" href="/login">Log in</Link> : user && <span className="user-pill">{user.displayName || user.email.split('@')[0]}</span>}
      </header>

      <section className={`conversation ${messages.length ? 'has-messages' : ''}`} ref={messagesRef}>
        {messages.length === 0 ? <div className="hero"><h1><span>{greeting[0]} </span><em>{greeting[1]}</em></h1><p>Ask anything, or start with what&apos;s already on your mind.</p></div> : <div className="messages">{messages.map((m, i) => <article className={`message ${m.role}`} key={m.id}><div className="bubble">{m.attachment && <small className="attachment"><Paperclip /> {m.attachment.name}</small>}<div className="content">{m.content || (busy ? ' ' : 'No response.')}</div>{m.role === 'assistant' && m.content && <div className="message-actions"><button onClick={() => navigator.clipboard?.writeText(m.content)} aria-label="Copy"><Copy /></button><button onClick={() => regenerate(i)} aria-label="Regenerate"><RotateCcw /></button></div>}{m.role === 'user' && <button className="edit" onClick={() => editMessage(i)}>Edit</button>}</div></article>)}{busy && <div className="typing"><span /><span /><span /></div>}</div>}
      </section>

      <section className="composer-wrap">
        {toolsOpen && <div className="tool-menu" role="menu">{tools.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActiveTool(label); setToolsOpen(false) }}><Icon />{label}</button>)}<label><Paperclip /> Attach<input hidden type="file" accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.json,audio/*,video/*" onChange={onFile} /></label></div>}
        {attachment && <div className="attachment-pill"><Paperclip /> {attachment.name}<button onClick={() => setAttachment(undefined)} aria-label="Remove attachment"><X /></button></div>}
        <div className="composer">
          <button className={`circle tool ${toolsOpen ? 'selected' : ''}`} onClick={() => setToolsOpen(!toolsOpen)} aria-label="Attachments and tools"><Plus /></button>
          <textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }} placeholder={activeTool ? `Ask Clue with ${activeTool}...` : 'Message...'} rows={1} />
          <button className={`circle mic ${listening ? 'listening' : ''}`} onClick={toggleVoice} aria-label="Voice note"><Mic /></button>
          {busy ? <button className="circle send ready" onClick={cancel} aria-label="Stop"><Square /></button> : <button className={`circle send ${message.trim() ? 'ready' : ''}`} onClick={submit} aria-label="Send"><Send /></button>}
        </div>
        <p className="hint">{!user ? `${Math.max(0, guestLimit - guestCount)} guest messages left · ` : ''}Private by default.</p>
      </section>

      {showContinue && <div className="conversion"><div className="conversion-sheet"><button className="sheet-close" onClick={() => setShowContinue(false)} aria-label="Close"><X /></button><h2>Continue with Clue</h2><p>Keep your conversation by signing in or creating an account.</p><Link href="/login" className="auth-primary">Continue with email</Link><button className="auth-provider" disabled>Continue with Google</button><button className="auth-provider" disabled>Continue with Apple</button></div></div>}
    </main>
  )
}
