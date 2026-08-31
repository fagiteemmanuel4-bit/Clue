'use client'

import Link from 'next/link'
import { ArrowLeft, FolderPlus, Search } from 'lucide-react'
import { useState } from 'react'

export default function ProjectsPage() {
  const [query, setQuery] = useState('')
  const projects = [{ id: 'workspace', name: 'Workspace', description: 'Your first Clue project.' }]
  const filtered = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
  return <main className="page-shell"><header className="page-header"><Link href="/" className="back-link"><ArrowLeft size={17}/> Clue</Link><span>Projects</span><button className="icon-button" aria-label="New project"><FolderPlus size={18}/></button></header><section className="page-content"><div className="page-intro"><p className="eyebrow">Workspace</p><h1>Projects.</h1><p>Keep related chats, files and work together.</p></div><div className="page-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects"/></div><div className="project-grid">{filtered.map(p=><Link href={`/projects/${p.id}`} className="project-card" key={p.id}><span>{p.name}</span><small>{p.description}</small></Link>)}</div></section></main>
}
