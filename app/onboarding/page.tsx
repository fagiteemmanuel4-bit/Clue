'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const steps=[
 {q:"What's your name?",key:'name',kind:'text',placeholder:'Your name'},
 {q:'What do you do?',key:'role',options:['Student','Developer','Designer','Founder','Business owner','Researcher','Creator','Professional','Other']},
 {q:'What are you hoping to use Clue for?',key:'uses',options:['Learning','Coding','Research','Business','Writing','Planning','Creativity','Productivity','Personal assistance','Building products','Other'],multi:true},
 {q:'How should Clue communicate with you?',key:'style',options:['Concise','Balanced','Detailed','Deep reasoning','Step-by-step']},
 {q:"What's your experience level?",key:'level',options:['Beginner','Intermediate','Advanced','Expert']},
 {q:'What technologies do you use?',key:'tech',kind:'text',placeholder:'e.g. React, Python, SQL'},
 {q:'What are your goals?',key:'goals',kind:'text',placeholder:'A sentence is enough.'},
 {q:'What should Clue remember about you?',key:'memory',kind:'text',placeholder:'Optional'},
]

export default function Onboarding(){const router=useRouter();const [step,setStep]=useState(0);const [value,setValue]=useState<string|string[]>('');const [answers,setAnswers]=useState<Record<string,string|string[]>>({});const [saving,setSaving]=useState(false);const current=steps[step]
 useEffect(()=>{fetch('/api/auth/me').then(r=>r.json()).then(d=>{if(!d.user)router.replace('/login')})},[router])
 useEffect(()=>{const saved=answers[current.key];setValue(saved??(current.multi?[]:''))},[step])
 function choose(v:string){if(current.multi){const a=Array.isArray(value)?value:[];setValue(a.includes(v)?a.filter(x=>x!==v):[...a,v])}else setValue(v)}
 async function next(){const nextAnswers={...answers,[current.key]:value};setAnswers(nextAnswers);if(step<steps.length-1){setStep(s=>s+1);return}setSaving(true);localStorage.setItem('clue.onboarding.v1',JSON.stringify(nextAnswers));router.push('/?welcome=1');router.refresh()}
 return <main className="onboarding"><div className="onboarding-top"><span>Clue</span><span>{String(step+1).padStart(2,'0')} / {String(steps.length).padStart(2,'0')}</span></div><div className="onboarding-card"><p className="eyebrow">A little context</p><h1>{current.q}</h1>{current.kind==='text'?<input autoFocus value={typeof value==='string'?value:''} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();next()}}} placeholder={current.placeholder}/>:<div className="choice-grid">{current.options?.map(o=><button type="button" key={o} className={(Array.isArray(value)?value.includes(o):value===o)?'chosen':''} onClick={()=>choose(o)}>{o}</button>)}</div>}<div className="onboarding-actions"><button className="back" disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>Back</button><button className="next" disabled={saving || (Array.isArray(value)?value.length===0:!value.trim()) && current.key!=='memory'} onClick={next}>{saving?'Finishing…':step===steps.length-1?'Finish':'Next'}</button></div><p className="privacy">Your answers stay under your control. The memory question is optional.</p></div></main>}
