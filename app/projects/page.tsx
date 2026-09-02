'use client'

import Link from 'next/link'
import { ArrowLeft, FolderPlus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type Project = { id: string; name: string; description: string; createdAt: number }
const KEY = 'clue.guest.projects.v1'
const starter: Project = { id: 'workspace', name: 'Workspace', description: 'Your first Clue project.', createdAt: 0 }

export default function ProjectsPage() {
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([starter])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]')
      if (Array.isArray(saved)) setProjects([starter, ...saved.filter((p: Project) => p?.id !== starter.id)])
    } catch {}
  }, [])

  const create = () => {
    const clean = name.trim()
    if (!clean) return
    const project: Project = { id: `${clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}-${Date.now()}`, name: clean, description: description.trim() || 'A new Clue project.', createdAt: Date.now() }
    const next = [...projects.filter(p => p.id !== starter.id), project]
    setProjects([starter, ...next.filter(p => p.id !== starter.id)])
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
    setName(''); setDescription(''); setCreating(false)
  }

  const filtered = projects.filter(p => `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()))
  return <main className="page-shell"><header className="page-header"><Link href="/" className="back-link"><ArrowLeft size={17}/> Clue</Link><span>Projects</span><button className="icon-button" aria-label="New project" onClick={() => setCreating(true)}><FolderPlus size={18}/></button></header><section className="page-content"><div className="page-intro"><p className="eyebrow">Workspace</p><h1>Projects.</h1><p>Create separate spaces for code, research, chats and files — even before you sign in.</p></div><div className="page-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects"/></div><div className="project-grid">{filtered.map(p=><Link href={`/projects/${p.id}`} className="project-card" key={p.id}><span>{p.name}</span><small>{p.description}</small></Link>)}</div>{creating && <div className="workspace-modal-backdrop" onClick={() => setCreating(false)}><div className="workspace-modal" onClick={e => e.stopPropagation()}><div className="workspace-modal-head"><div><strong>New project</strong><span>Keep related work together.</span></div><button onClick={() => setCreating(false)} aria-label="Close"><X size={17}/></button></div><label className="project-form-label">Name<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Python learning" /></label><label className="project-form-label">Description<input value={description} onChange={e=>setDescription(e.target.value)} placeholder="What is this project for?" /></label><div className="analysis-actions"><button onClick={() => setCreating(false)}>Cancel</button><button className="primary" onClick={create} disabled={!name.trim()}>Create project</button></div></div></div>}</section></main>
}
