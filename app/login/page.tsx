'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to sign in')
      router.push('/onboarding')
      router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in') } finally { setBusy(false) }
  }

  return <main className="auth-page"><div className="auth-panel"><Link href="/" className="wordmark">Clue</Link><div className="auth-copy"><h1>Welcome back.</h1><p>Continue where you left off.</p></div><form onSubmit={submit} className="auth-form"><label>Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="auth-primary" disabled={busy}>{busy ? 'Signing in…' : 'Continue'}</button></form><button className="auth-provider" disabled>Continue with Google</button><button className="auth-provider" disabled>Continue with Apple</button><div className="auth-links"><span>Forgot password?</span><Link href="/signup">Create account</Link></div><p className="auth-note">Google and Apple sign-in will appear when their providers are configured.</p></div></main>
}
