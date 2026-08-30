'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter(); const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false)
  async function submit(e:FormEvent){e.preventDefault();setError('');setBusy(true);try{const res=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:name,email,password})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Unable to create account');router.push('/onboarding');router.refresh()}catch(err){setError(err instanceof Error?err.message:'Unable to create account')}finally{setBusy(false)}}
  return <main className="auth-page"><div className="auth-panel"><Link href="/" className="wordmark">Clue</Link><div className="auth-copy"><h1>Start with Clue.</h1><p>A quiet workspace for whatever comes next.</p></div><form onSubmit={submit} className="auth-form"><label>Name<input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label><label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="auth-primary" disabled={busy}>{busy?'Creating account…':'Create account'}</button></form><div className="auth-links"><span>Already have an account?</span><Link href="/login">Sign in</Link></div></div></main>
}
