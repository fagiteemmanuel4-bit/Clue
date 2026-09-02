'use client'

import { useEffect } from 'react'

const KEY = 'clue.canvas.draft.v1'

export default function CanvasAutosave() {
  useEffect(() => {
    if (window.location.pathname !== '/canvas') return
    let cancelled = false
    let cleanup: (() => void) | undefined
    let timer: number | undefined
    let attempts = 0
    const attach = () => {
      if (cancelled) return
      const editor = document.querySelector('textarea[aria-label="Canvas editor"]') as HTMLTextAreaElement | null
      if (!editor) { if (++attempts < 30) window.setTimeout(attach, 200); return }
      try {
        const raw = localStorage.getItem(KEY)
        if (raw) {
          const draft = JSON.parse(raw) as { code?: string }
          if (typeof draft.code === 'string' && draft.code) {
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
            setter?.call(editor, draft.code)
            editor.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }
      } catch {}
      const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ code: editor.value, savedAt: Date.now() })) } catch {} }
      editor.addEventListener('input', save)
      timer = window.setInterval(save, 1500)
      cleanup = () => { editor.removeEventListener('input', save); if (timer) window.clearInterval(timer) }
    }
    attach()
    return () => { cancelled = true; cleanup?.(); if (timer) window.clearInterval(timer) }
  }, [])
  return null
}
