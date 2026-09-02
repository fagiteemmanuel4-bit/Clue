'use client'
import { useEffect, useState } from 'react'
import { Check, Mic, Square, X } from 'lucide-react'

type Recognition = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null }
type RecognitionCtor = new () => Recognition
function cleanTranscript(value: string) { return value.replace(/\s+/g, ' ').replace(/\b(um+|uh+|erm|hmm)\b[,.]?/gi, '').replace(/\s+([,.!?])/g, '$1').trim() }
export default function VoiceConfirmation() {
  const [recording, setRecording] = useState(false), [text, setText] = useState(''), [error, setError] = useState(''), [supported, setSupported] = useState(true), [open, setOpen] = useState(false)
  useEffect(() => { setSupported(Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) }, [])
  const start = () => {
    const Ctor = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as RecognitionCtor | undefined
    if (!Ctor) { setSupported(false); return }
    const recognition = new Ctor(); recognition.continuous = true; recognition.interimResults = true; recognition.lang = navigator.language || 'en-US'
    let finalText = ''
    recognition.onresult = (event: any) => { let interim = ''; for (let i = event.resultIndex; i < event.results.length; i++) { const chunk = event.results[i][0].transcript; event.results[i].isFinal ? finalText += `${chunk} ` : interim += chunk }; setText(cleanTranscript(`${finalText} ${interim}`)) }
    recognition.onerror = (event: any) => { setError(event.error === 'not-allowed' ? 'Microphone permission was denied.' : `Voice input failed: ${event.error || 'unknown error'}`); setRecording(false) }
    recognition.onend = () => setRecording(false)
    setError(''); setText(''); setOpen(true); setRecording(true); recognition.start(); (window as any).__clueVoiceRecognition = recognition
  }
  const stop = () => { try { (window as any).__clueVoiceRecognition?.stop() } catch {} setRecording(false) }
  const cancel = () => { stop(); setOpen(false); setText(''); setError('') }
  const confirm = () => { const value = cleanTranscript(text); if (!value) return; const areas = [...document.querySelectorAll<HTMLTextAreaElement>('textarea')].filter(a => a.offsetParent !== null && !a.getAttribute('aria-label')?.toLowerCase().includes('canvas') && !a.getAttribute('aria-label')?.toLowerCase().includes('terminal')); const target = areas[areas.length - 1]; if (target) { const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set; setter?.call(target, value); target.dispatchEvent(new Event('input', { bubbles: true })); target.focus() }; setOpen(false); setText('') }
  if (!supported) return null
  return <><button className="clue-voice-float" onClick={recording ? stop : start} aria-label={recording ? 'Stop voice recording' : 'Voice input'}>{recording ? <Square/> : <Mic/>}</button>{open && <div className="voice-modal-backdrop"><section className="voice-modal"><div className="voice-modal-head"><strong>{recording ? 'Listening…' : 'Review voice message'}</strong><button onClick={cancel}><X/></button></div><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Your cleaned transcript will appear here…"/><div className="voice-status">{recording ? 'Speak naturally. Tap stop when finished.' : 'Review and edit before sending.'}{error && <span>{error}</span>}</div><div className="voice-actions"><button onClick={cancel}>Cancel</button>{recording ? <button className="primary" onClick={stop}><Square/>Stop</button> : <button className="primary" disabled={!text.trim()} onClick={confirm}><Check/>Use in chat</button>}</div></section></div>}</>
}
