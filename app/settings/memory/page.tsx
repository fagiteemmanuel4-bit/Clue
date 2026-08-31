'use client'
import '../settings.css'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
export default function MemorySettings(){const[enabled,setEnabled]=useState(true);return <main className="settings-page"><header className="settings-header"><Link href="/settings" className="back-link"><ArrowLeft/> Settings</Link><h1>Memory</h1><div/></header><section className="settings-content memory-page"><div className="settings-intro"><p>Personalization</p><h2>Clue remembers what matters.</h2><span>You stay in control. Memory is separate from conversation history and can be cleared at any time.</span></div><div className="settings-group"><div className="settings-row"><span><strong>Memory</strong><small>Use saved preferences and useful facts when responding.</small></span><button className={`toggle ${enabled?'on':''}`} aria-pressed={enabled} onClick={()=>setEnabled(!enabled)}><i/></button></div></div><div className="empty-memory"><strong>No saved memories yet.</strong><span>When Clue learns something worth remembering, it will appear here.</span></div></section></main>}
