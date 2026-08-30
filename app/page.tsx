'use client'

import { useMemo, useState } from 'react'
import { Archive, Eye, FileText, Folder, Menu, Mic, Paperclip, Plus, Send, Settings, Sparkles, X, Globe, Code2, Image as ImageIcon } from 'lucide-react'

const history = [
  ['Today', ['Weekend trip itinerary ideas', 'Fixing the auth redirect bug', 'Naming ideas for the sidebar']],
  ['Previous 7 days', ['Recipe: brown butter cookies', 'Landing page copy review', 'Explain vector databases simply', 'Interview prep — systems design']],
] as const

const quickTools = [
  { label: 'Web', icon: Globe },
  { label: 'Code', icon: Code2 },
  { label: 'Image', icon: ImageIcon },
]

export default function Home() {
  const [open, setOpen] = useState(false)
  const [incognito, setIncognito] = useState(false)
  const [message, setMessage] = useState('')
  const [listening, setListening] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [activeTool, setActiveTool] = useState('')
  const [sent, setSent] = useState(false)
  const [activeChat, setActiveChat] = useState('')
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 5) return ['Still up,', 'night owl.']
    if (hour < 12) return ['Good', 'morning.']
    if (hour < 17) return ['Good', 'afternoon.']
    if (hour < 21) return ['Good', 'evening.']
    return ['Winding down', 'for the night?']
  }, [])

  function submit() {
    if (!message.trim()) return
    setSent(true)
    setMessage('')
    setToolsOpen(false)
    setTimeout(() => setSent(false), 1800)
  }

  function selectTool(label: string) {
    setActiveTool(label)
    setToolsOpen(false)
  }

  return <main className={incognito ? 'app incognito' : 'app'}>
    <div className="glow" />
    <div className={`overlay ${open ? 'visible' : ''}`} onClick={() => setOpen(false)} />

    <aside className={`sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="brand"><div className="mark">C</div><span>Clue</span></div>
      <div className="side-inner">
        <nav>
          <button className="nav primary" onClick={() => { setActiveChat(''); setMessage(''); setOpen(false) }}><Plus /> New chat</button>
          <button className="nav"><Folder /> Projects</button>
          <button className="nav"><FileText /> Files</button>
          <button className="nav"><Archive /> Archived</button>
        </nav>
        <div className="history">
          {history.map(([label, items]) => <section key={label}>
            <p className="label">{label}</p>
            {items.map(item => <button className={`history-item ${activeChat === item ? 'active' : ''}`} key={item} onClick={() => { setActiveChat(item); setOpen(false) }}>{item}</button>)}
          </section>)}
        </div>
      </div>
      <footer>
        <div className="plan"><span><i /> Free plan</span></div>
        <button className="upgrade"><Sparkles /> Upgrade to Pro</button>
        <button className="nav"><Settings /> Settings</button>
      </footer>
    </aside>

    <header>
      <button className={`circle menu ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? <X /> : <Menu />}</button>
      <button className={`incognito ${incognito ? 'on' : ''}`} onClick={() => setIncognito(!incognito)}><Eye /><i />{incognito ? 'Incognito · On' : 'Incognito'}</button>
    </header>

    <section className="hero">
      {activeChat ? <p className="context">{activeChat}</p> : null}
      <h1><span>{greeting[0]} </span><em>{greeting[1]}</em></h1>
      <p>Ask anything, or start with what&apos;s already on your mind.</p>
    </section>

    <section className="composer-wrap">
      {toolsOpen && <div className="tool-menu" role="menu">
        {quickTools.map(({ label, icon: Icon }) => <button key={label} onClick={() => selectTool(label)}><Icon />{label}</button>)}
        <button><Paperclip /> Attach files</button>
      </div>}
      <div className="composer">
        <button className={`circle tool ${toolsOpen ? 'selected' : ''}`} onClick={() => setToolsOpen(!toolsOpen)} aria-label="Open tools"><Plus /></button>
        <textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }} placeholder={activeTool ? `Ask Clue with ${activeTool}...` : 'Message...'} rows={1} aria-label="Message Clue" />
        <button className={`circle mic ${listening ? 'listening' : ''}`} onClick={() => setListening(!listening)} aria-label={listening ? 'Stop voice input' : 'Voice input'}><Mic /></button>
        <button className={`circle send ${message.trim() ? 'ready' : ''}`} onClick={submit} aria-label="Send"><Send /></button>
      </div>
      <p className="hint">{incognito ? 'This conversation won’t be saved to history.' : sent ? 'Sent. Clue is thinking…' : 'Responses may be reviewed to improve quality.'}</p>
    </section>
  </main>
}
