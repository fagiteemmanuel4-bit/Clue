'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'

type Conversation={id:string;title:string;messages:Array<{id:string;role:string;content:string}>}

export default function StarredPage(){
 const [items,setItems]=useState<Array<{conversation:Conversation;message:Conversation['messages'][number]}>>([])
 useEffect(()=>{try{const raw=localStorage.getItem('clue.conversations.v1');const starred=JSON.parse(localStorage.getItem('clue.starred.v1')||'[]');const conversations=JSON.parse(raw||'[]');const found:Array<{conversation:Conversation;message:Conversation['messages'][number]}>=[];for(const c of conversations){for(const m of c.messages||[]){if(starred.includes(m.id))found.push({conversation:c,message:m})}}setItems(found)}catch{setItems([])}},[])
 return <main className="page-shell"><header className="page-header"><Link className="back-link" href="/"><ArrowLeft/>Back</Link><strong>Starred messages</strong><span/></header><section className="page-content"><div className="page-intro"><p className="eyebrow">SAVED FOR LATER</p><h1>Starred</h1><p>Keep the Clue responses you want to find again.</p></div>{!items.length?<div className="empty-state"><Star/>No starred messages yet.</div>:<div className="archive-list">{items.map(({conversation,message})=><article className="archive-row" key={message.id}><Star fill="currentColor" size={17}/><span><strong>{conversation.title}</strong><br/>{message.content}</span></article>)}</div>}</section></main>
}
