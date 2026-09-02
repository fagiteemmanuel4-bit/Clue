'use client'

import { FormEvent, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

type FieldErrors = {
  name?: string
  email?: string
  password?: string
}

const initialErrors: FieldErrors = {}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>(initialErrors)

  const title = useMemo(
    () => (mode === 'signin' ? 'Welcome back.' : 'Create your Clue account.'),
    [mode],
  )

  function switchMode(nextMode: 'signin' | 'signup') {
    setMode(nextMode)
    setErrors(initialErrors)
  }

  function inferFieldError(message: string): FieldErrors {
    const lower = message.toLowerCase()
    if (lower.includes('email')) return { email: message }
    if (lower.includes('password')) return { password: message }
    if (lower.includes('name')) return { name: message }
    return mode === 'signup' ? { email: message } : { password: message }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErrors(initialErrors)

    const nextErrors: FieldErrors = {}
    if (mode === 'signup' && !name.trim()) nextErrors.name = 'Name is required.'
    if (!email.trim()) nextErrors.email = 'Email is required.'
    if (!password) nextErrors.password = 'Password is required.'

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setBusy(true)

    try {
      const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/signup'
      const body = mode === 'signin' ? { email, password } : { displayName: name, email, password }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = data?.error || 'Unable to continue. Please try again.'
        throw new Error(message)
      }
      router.replace('/')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to continue.'
      setErrors(inferFieldError(message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel" aria-labelledby="clue-wordmark">
        <div className="brand-content">
          <div id="clue-wordmark" className="wordmark" aria-label="Clue">
            {'CLUE'.split('').map((letter, index) => (
              <span
                className="brand-letter"
                style={{ '--i': index } as React.CSSProperties}
                key={`${letter}-${index}`}
                aria-hidden="true"
              >
                {letter}
              </span>
            ))}
          </div>
          <p className="tagline">Think clearly. Create freely.</p>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <header className="auth-header">
            <button className="back-button" type="button" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
          </header>

          <div className="auth-copy">
            <p className="eyebrow">CLUE</p>
            <h1>{title}</h1>
            <p className="lead">
              {mode === 'signin'
                ? 'Sign in to continue your conversations and generated files.'
                : 'A simple account keeps your conversations and generated files with you.'}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={mode === 'signin' ? 'active' : ''}
              onClick={() => switchMode('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => switchMode('signup')}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} noValidate>
            {mode === 'signup' && (
              <div className={`field ${errors.name ? 'error' : ''}`}>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors((current) => ({ ...current, name: undefined }))
                  }}
                  placeholder=" "
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  required
                />
                <label htmlFor="name">Name</label>
                {errors.name && <p className="error-text" id="name-error">{errors.name}</p>}
              </div>
            )}

            <div className={`field ${errors.email ? 'error' : ''}`}>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((current) => ({ ...current, email: undefined }))
                }}
                placeholder=" "
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                required
              />
              <label htmlFor="email">Email</label>
              {errors.email && <p className="error-text" id="email-error">{errors.email}</p>}
            </div>

            <div className={`field ${errors.password ? 'error' : ''}`}>
              <input
                id="password"
                name="password"
                type={show ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={8}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((current) => ({ ...current, password: undefined }))
                }}
                placeholder=" "
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                required
              />
              <label htmlFor="password">Password</label>
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
              {errors.password && <p className="error-text" id="password-error">{errors.password}</p>}
            </div>

            <button className="auth-submit" disabled={busy} type="submit" aria-busy={busy}>
              {busy ? (
                <span className="waiting-dot" aria-label="Signing in" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Continue' : 'Create account'}</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="fine">
            By continuing, you agree to Clue&apos;s Terms and Privacy Policy.
          </p>
        </div>
      </section>

      <style jsx>{`
        * { box-sizing: border-box; }

        .auth-layout {
          display: grid;
          grid-template-columns: 6fr 4fr;
          min-height: 100vh;
          min-height: 100dvh;
          background: #fff;
          color: #000;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .auth-brand-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px;
          background: #000;
          color: #fff;
          overflow: hidden;
        }

        .brand-content { max-width: 900px; }

        .wordmark {
          display: flex;
          align-items: baseline;
          font-size: clamp(72px, 10vw, 168px);
          line-height: .82;
          font-weight: 650;
          letter-spacing: -.09em;
        }

        .brand-letter {
          display: inline-block;
          opacity: 0;
          transform: translateY(12px);
          animation: letterUp 400ms ease forwards;
          animation-delay: calc(var(--i) * 40ms);
        }

        .tagline {
          margin: 30px 0 0;
          font-size: 15px;
          line-height: 1.5;
          letter-spacing: -.01em;
          color: #aaa;
        }

        .auth-form-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 48px;
          background: #fff;
          color: #000;
        }

        .auth-form-wrap { width: min(100%, 430px); margin: 0 auto; }

        .auth-header { height: 38px; margin-bottom: 48px; }

        .back-button {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 4px;
          background: transparent;
          color: #555;
          cursor: pointer;
        }

        .back-button:hover { background: #f3f3f3; }
        .back-button:focus-visible { outline: 2px solid #000; outline-offset: 3px; }

        .auth-copy h1 {
          margin: 0;
          max-width: 460px;
          font-size: clamp(32px, 4vw, 46px);
          line-height: 1.04;
          font-weight: 500;
          letter-spacing: -.055em;
        }

        .eyebrow {
          margin: 0 0 14px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .16em;
          color: #999;
        }

        .lead {
          max-width: 390px;
          margin: 16px 0 34px;
          color: #777;
          font-size: 13px;
          line-height: 1.65;
        }

        .auth-tabs {
          display: flex;
          gap: 22px;
          margin-bottom: 40px;
          border-bottom: 1px solid #e5e5e5;
        }

        .auth-tabs button {
          position: relative;
          border: 0;
          padding: 0 0 12px;
          background: transparent;
          color: #999;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
        }

        .auth-tabs button.active { color: #000; }
        .auth-tabs button.active::after {
          content: '';
          position: absolute;
          right: 0;
          bottom: -1px;
          left: 0;
          height: 1.5px;
          background: #000;
        }

        .auth-tabs button:focus-visible {
          outline: 2px solid #000;
          outline-offset: 5px;
        }

        form { display: grid; gap: 34px; }

        .field {
          position: relative;
          min-height: 48px;
        }

        .field input {
          width: 100%;
          height: 48px;
          border: none;
          border-bottom: 1px solid #ccc;
          border-radius: 0;
          padding: 10px 36px 8px 0;
          font: inherit;
          font-size: 1rem;
          background: transparent;
          color: #000;
          outline: none;
          transition: border-color 200ms ease;
        }

        .field input:focus { border-bottom: 1.5px solid #000; }

        .field label {
          position: absolute;
          top: 10px;
          left: 0;
          font-size: 1rem;
          color: #999;
          pointer-events: none;
          transition: all 180ms ease;
        }

        .field input:focus + label,
        .field input:not(:placeholder-shown) + label {
          top: -14px;
          font-size: .75rem;
          color: #666;
        }

        .field input:focus-visible {
          outline: 2px solid #000;
          outline-offset: 4px;
        }

        .field.error input { border-bottom-color: #d33; }
        .field.error input:focus { border-bottom-color: #d33; }
        .field.error label { color: #d33; }

        .error-text {
          margin: 4px 0 0;
          font-size: .75rem;
          line-height: 1.4;
          color: #d33;
        }

        .password-toggle {
          position: absolute;
          right: 0;
          bottom: 10px;
          display: grid;
          place-items: center;
          padding: 4px;
          border: 0;
          background: transparent;
          color: #777;
          cursor: pointer;
        }

        .password-toggle:focus-visible {
          outline: 2px solid #000;
          outline-offset: 3px;
        }

        .auth-submit {
          width: 100%;
          min-height: 48px;
          margin-top: 4px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          border-radius: 4px;
          background: #000;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: transform 100ms ease, opacity 150ms ease;
        }

        .auth-submit:active { transform: scale(.97); }
        .auth-submit:disabled { opacity: .4; cursor: not-allowed; }
        .auth-submit:focus-visible { outline: 2px solid #000; outline-offset: 4px; }

        .waiting-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
          background: #888;
          animation: breathe 1.4s ease-in-out infinite;
        }

        .fine {
          margin: 34px 0 0;
          color: #999;
          font-size: 10px;
          line-height: 1.6;
        }

        @keyframes breathe {
          0%, 100% { opacity: .3; transform: scale(.85); }
          50% { opacity: 1; transform: scale(1); }
        }

        @keyframes letterUp {
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .auth-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .auth-brand-panel {
            min-height: 0;
            justify-content: center;
            padding: 32px 28px;
          }

          .wordmark { font-size: clamp(48px, 16vw, 84px); }
          .tagline { margin-top: 14px; font-size: 13px; }

          .auth-form-panel { padding: 44px 28px 48px; }
          .auth-header { margin-bottom: 36px; }
        }

        @media (max-width: 420px) {
          .auth-brand-panel { padding: 28px 22px; }
          .auth-form-panel { padding: 36px 22px 42px; }
          .auth-copy h1 { font-size: 32px; }
          .auth-tabs { margin-bottom: 34px; }
        }

        @media (prefers-color-scheme: dark) {
          .auth-layout { background: #000; color: #fff; }
          .auth-brand-panel { background: #fff; color: #000; }
          .tagline { color: #666; }
          .auth-form-panel { background: #000; color: #fff; }
          .back-button { color: #aaa; }
          .back-button:hover { background: #171717; }
          .back-button:focus-visible,
          .auth-tabs button:focus-visible,
          .field input:focus-visible,
          .password-toggle:focus-visible { outline-color: #fff; }
          .eyebrow { color: #666; }
          .lead { color: #999; }
          .auth-tabs { border-bottom-color: #333; }
          .auth-tabs button { color: #777; }
          .auth-tabs button.active { color: #fff; }
          .auth-tabs button.active::after { background: #fff; }
          .field input { color: #fff; border-bottom-color: #444; }
          .field input:focus { border-bottom-color: #fff; }
          .field label { color: #777; }
          .field input:focus + label,
          .field input:not(:placeholder-shown) + label { color: #aaa; }
          .password-toggle { color: #aaa; }
          .auth-submit { background: #fff; color: #000; }
          .waiting-dot { background: #888; }
          .fine { color: #666; }
        }

        @media (prefers-reduced-motion: reduce) {
          .brand-letter { opacity: 1; transform: none; animation: none; }
          .waiting-dot { animation: none; opacity: 1; transform: none; }
          .auth-submit { transition: none; }
          .field input { transition: none; }
        }
      `}</style>
    </main>
  )
}
