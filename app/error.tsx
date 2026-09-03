'use client'

import { useEffect } from 'react'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the production UI calm while still surfacing the failure to diagnostics.
    console.error('[Clue UI] route error')
  }, [])

  return (
    <main className="page-shell" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', textAlign: 'center' }}>
      <section style={{ maxWidth: 520 }}>
        <p className="eyebrow">Clue</p>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(38px, 7vw, 58px)', fontWeight: 400, margin: '8px 0' }}>Something went wrong.</h1>
        <p style={{ color: 'var(--soft)', lineHeight: 1.6, margin: '0 auto 24px' }}>The workspace hit an unexpected error. Your conversation is still safe. Try the page again.</p>
        <button onClick={() => reset()} style={{ border: 0, borderRadius: 12, padding: '11px 16px', background: 'var(--text)', color: 'var(--bg)', cursor: 'pointer', fontWeight: 600 }}>Try again</button>
      </section>
    </main>
  )
}
