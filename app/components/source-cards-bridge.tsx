'use client'
import { useEffect } from 'react'
function favicon(url: string) { try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` } catch { return '' } }
export default function SourceCardsBridge() {
  useEffect(() => {
    const seen = new WeakSet<HTMLElement>()
    const enhance = () => document.querySelectorAll<HTMLElement>('p,div,li').forEach(node => {
      if (seen.has(node) || !node.textContent?.includes('[[CLUE_SOURCES]]')) return
      const text = node.textContent
      const block = text.match(/\[\[CLUE_SOURCES\]\]([\s\S]*?)\[\[\/CLUE_SOURCES\]\]/)?.[1] || ''
      const sources = [...block.matchAll(/- \[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map(m => ({ title: m[1], url: m[2] })).slice(0, 8)
      if (!sources.length) return
      seen.add(node); node.innerHTML = ''
      const wrap = document.createElement('div'); wrap.className = 'clue-source-cards'
      sources.forEach(source => {
        const a = document.createElement('a'); a.className = 'clue-source-card'; a.href = source.url; a.target = '_blank'; a.rel = 'noreferrer noopener'
        const img = document.createElement('img'); img.src = favicon(source.url); img.alt = ''; img.width = 20; img.height = 20
        const copy = document.createElement('span'); const title = document.createElement('strong'); title.textContent = source.title; const host = document.createElement('small')
        try { host.textContent = new URL(source.url).hostname.replace(/^www\./, '') } catch { host.textContent = 'Source' }
        copy.append(title, host); a.append(img, copy); wrap.append(a)
      })
      node.append(wrap)
    })
    enhance(); const observer = new MutationObserver(enhance); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect()
  }, [])
  return null
}
