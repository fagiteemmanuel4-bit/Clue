'use client'

import Link from 'next/link'
import { ArrowLeft, Archive, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

type Item={id:string;title:string}
export default function ArchivePage(){const [items,setItems]=useState<Item[]>([]);useEffect(()=>{try{const all=JSON.parse(localStorage.getItem('clue.conversations.v1')||'[]');setItems(all.filter((x:Item & {archived?:boolean})=>x.archived))}catch{}},[]);return <main className="page-shell"><header className="page-header"><Link href="/" className="back-link"><ArrowLeft size={17}/> Clue</Link><span>Archive</span><span/></header><section className="page-content"><div className="page-intro"><p className="eyebrow">Conversations</p><h1>Archive.</h1><p>Quietly stored conversations you are not using right now.</p></div>{items.length?<div className="archive-list">{items.map(x=><div className="archive-row" key={x.id}><Archive size={17}/><span>{x.title}</span><button aria-label={`Restore ${x.title}`} onClick={()=>setItems(v=>v.filter(i=>i.id!==x.id))}><RotateCcw size={16}/></button></div>)}</div>:<div className="empty-state">Your archive is empty.</div>}</section></main>}
