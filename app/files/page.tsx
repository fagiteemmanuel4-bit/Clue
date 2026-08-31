import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
export default function FilesPage(){return <main className="page-shell"><header className="page-header"><Link href="/" className="back-link"><ArrowLeft size={17}/> Clue</Link><span>Files</span><span/></header><section className="page-content"><div className="page-intro"><p className="eyebrow">Library</p><h1>Files.</h1><p>Your uploaded documents and media, ready to use in conversations.</p></div><div className="empty-state"><FileText size={22}/><span>No files yet.</span></div></section></main>}
