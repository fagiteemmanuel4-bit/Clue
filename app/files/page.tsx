'use client'

import Link from 'next/link'
import { ArrowLeft, Download, FileText, Search, FileSpreadsheet, Presentation, FileArchive } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

 type StoredFile={id:string;name:string;mimeType:string;size:number;createdAt:string;metadata?:Record<string,unknown>}

function iconFor(mime:string){if(mime.includes('spreadsheet')||mime.includes('excel'))return FileSpreadsheet;if(mime.includes('presentation')||mime.includes('powerpoint'))return Presentation;if(mime.includes('zip'))return FileArchive;return FileText}
function sizeLabel(size:number){if(size<1024)return `${size} B`;if(size<1024*1024)return `${Math.round(size/1024)} KB`;return `${(size/(1024*1024)).toFixed(1)} MB`}

export default function FilesPage(){
 const [files,setFiles]=useState<StoredFile[]>([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let cancelled=false;fetch('/api/files',{cache:'no-store'}).then(async r=>{const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||'Unable to load files');if(!cancelled)setFiles(Array.isArray(d?.files)?d.files:[])}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'Unable to load files')}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[])
 const filtered=useMemo(()=>files.filter(f=>f.name.toLowerCase().includes(query.toLowerCase())),[files,query])
 return <main className="page-shell"><header className="page-header"><Link href="/" className="back-link"><ArrowLeft size={17}/> Clue</Link><span>Files</span><span/></header><section className="page-content"><div className="page-intro"><p className="eyebrow">Library</p><h1>Files.</h1><p>Generated files created by Clue, stored securely in your workspace.</p></div>{files.length>0&&<div className="page-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search files…" aria-label="Search files"/></div>}{loading?<div className="empty-state">Loading your files…</div>:error?<div className="empty-state">{error}</div>:!filtered.length?<div className="empty-state"><FileText size={22}/><span>{query?'No files match your search.':'No generated files yet.'}</span></div>:<div className="archive-list">{filtered.map(file=>{const Icon=iconFor(file.mimeType);return <article className="archive-row" key={file.id}><Icon size={18}/><span><strong>{file.name}</strong><br/><small>{file.mimeType} · {sizeLabel(file.size)} · {new Date(file.createdAt).toLocaleString()}</small></span><a href={`/api/files/${encodeURIComponent(file.id)}`} className="file-card-download" aria-label={`Download ${file.name}`}><Download size={17}/></a></article>})}</div>}</section></main>
}
