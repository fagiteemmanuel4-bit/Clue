import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <main className="page-shell"><header className="page-header"><Link href="/projects" className="back-link"><ArrowLeft size={17}/> Projects</Link><span>{id === 'workspace' ? 'Workspace' : 'Project'}</span><span /></header><section className="page-content"><div className="page-intro"><p className="eyebrow">Project</p><h1>{id === 'workspace' ? 'Workspace.' : id}</h1><p>Conversations, files and artifacts for this project.</p></div><div className="empty-state">Nothing here yet.</div></section></main>
}
