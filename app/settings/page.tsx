'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronRight, LogOut, Moon, Shield, SlidersHorizontal, UserRound, Volume2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type User={id:string;email:string;displayName:string|null}

const rows=[
  {key:'Account',label:'Account',description:'Name, email and password',icon:UserRound},
  {key:'Appearance',label:'Appearance',description:'Theme and visual preferences',icon:Moon},
  {key:'Chat',label:'Chat',description:'Response style and conversation behavior',icon:SlidersHorizontal},
  {key:'Voice',label:'Voice',description:'Voice input and playback',icon:Volume2},
  {key:'Memory',label:'Memory',description:'What Clue remembers about you',icon:Sparkles},
  {key:'Privacy',label:'Privacy & security',description:'Data, sessions and account safety',icon:Shield},
]

export default function SettingsPage(){
  const router=useRouter()
  const [user,setUser]=useState<User|null>(null)
  const [theme,setTheme]=useState('System')
  const [style,setStyle]=useState('Balanced')
  const [memory,setMemory]=useState(true)
  const [busy,setBusy]=useState(false)
  const [open,setOpen]=useState('Account')

  useEffect(()=>{fetch('/api/auth/me').then(r=>r.json()).then(d=>{if(d.user)setUser(d.user)}).catch(()=>{})},[])

  async function logout(){
    if(busy)return
    setBusy(true)
    try{await fetch('/api/auth/logout',{method:'POST'});router.replace('/login');router.refresh()}finally{setBusy(false)}
  }

  return <main className="clue-settings">
    <header className="settings-top">
      <Link href="/" aria-label="Back to Clue" className="back"><ArrowLeft size={20}/></Link>
      <div><strong>Settings</strong><span>Clue</span></div>
      <div className="top-spacer"/>
    </header>

    <section className="settings-shell">
      <div className="settings-title">
        <div className="settings-mark">C</div>
        <div><h1>Settings</h1><p>Simple controls for your Clue experience.</p></div>
      </div>

      <div className="settings-list">
        {rows.map(({key,label,description,icon:Icon})=><section className={`setting-card ${open===key?'expanded':''}`} key={key}>
          <button className="setting-head" onClick={()=>setOpen(open===key?'':key)} aria-expanded={open===key}>
            <span className="setting-icon"><Icon size={18}/></span>
            <span className="setting-copy"><strong>{label}</strong><small>{description}</small></span>
            <ChevronRight className="chevron" size={18}/>
          </button>
          {open===key&&<div className="setting-body">
            {key==='Account'&&<><div className="profile-line"><span>Name</span><strong>{user?.displayName||'Your name'}</strong></div><div className="profile-line"><span>Email</span><strong>{user?.email||'Not signed in'}</strong></div></>}
            {key==='Appearance'&&<><label className="control-label">Theme</label><div className="choice-row">{['Light','Dark','System'].map(v=><button key={v} className={theme===v?'chosen':''} onClick={()=>setTheme(v)}>{v}</button>)}</div></>}
            {key==='Chat'&&<><label className="control-label">Response style</label><div className="choice-row">{['Concise','Balanced','Detailed'].map(v=><button key={v} className={style===v?'chosen':''} onClick={()=>setStyle(v)}>{v}</button>)}</div></>}
            {key==='Voice'&&<div className="setting-note">Voice dictation is available directly beside the send button in the Clue composer.</div>}
            {key==='Memory'&&<div className="toggle-line"><span><strong>Memory</strong><small>Let Clue remember useful details across chats.</small></span><button className={`toggle ${memory?'on':''}`} onClick={()=>setMemory(v=>!v)} aria-label="Toggle memory"><i/></button></div>}
            {key==='Privacy'&&<div className="setting-note">Your conversations and generated files are tied to your account. You can sign out at any time.</div>}
          </div>}
        </section>)}
      </div>

      {user&&<button className="logout" onClick={logout} disabled={busy}><LogOut size={18}/>{busy?'Signing out…':'Log out'}</button>}
      {!user&&<Link href="/login" className="login-cta">Sign in to Clue</Link>}
      <p className="settings-foot">Clue · calm, capable AI.</p>
    </section>

    <style jsx>{`*{box-sizing:border-box}.clue-settings{min-height:100dvh;background:#f7f7f5;color:#171719;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.settings-top{height:72px;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;padding:0 18px;border-bottom:1px solid #e7e7e2;background:rgba(247,247,245,.9);backdrop-filter:blur(18px);position:sticky;top:0;z-index:2}.settings-top>div:nth-child(2){display:flex;flex-direction:column;align-items:center;line-height:1.1}.settings-top strong{font-size:14px}.settings-top span{font-size:10px;color:#999}.back{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#444;text-decoration:none}.back:hover{background:#ecece8}.settings-shell{width:min(680px,calc(100% - 32px));margin:0 auto;padding:42px 0 56px}.settings-title{display:flex;align-items:center;gap:16px;margin-bottom:28px}.settings-mark{width:48px;height:48px;border-radius:15px;background:#171719;color:#fff;display:grid;place-items:center;font-family:Georgia,serif;font-size:22px;font-style:italic}.settings-title h1{font-family:Georgia,"Times New Roman",serif;font-weight:400;letter-spacing:-.04em;font-size:34px;margin:0}.settings-title p{margin:4px 0 0;color:#85858b;font-size:13px}.settings-list{display:grid;gap:10px}.setting-card{background:#fff;border:1px solid #e2e2dd;border-radius:18px;overflow:hidden;box-shadow:0 3px 16px rgba(0,0,0,.025)}.setting-head{width:100%;border:0;background:transparent;display:flex;align-items:center;gap:13px;padding:16px;cursor:pointer;text-align:left;color:#171719}.setting-icon{width:38px;height:38px;border-radius:12px;background:#f3f3ef;display:grid;place-items:center;flex:none;color:#5f5f65}.setting-copy{flex:1;display:flex;flex-direction:column;gap:3px}.setting-copy strong{font-size:14px}.setting-copy small{font-size:12px;color:#8b8b91}.chevron{color:#aaa;transition:transform .2s}.expanded .chevron{transform:rotate(90deg)}.setting-body{padding:0 16px 16px 67px;display:grid;gap:12px}.profile-line,.toggle-line{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px solid #efefe9}.profile-line span,.control-label{font-size:12px;color:#8b8b91}.profile-line strong{font-size:13px;font-weight:550}.control-label{display:block;margin-top:4px}.choice-row{display:flex;gap:7px;flex-wrap:wrap}.choice-row button{border:1px solid #dddcd7;background:#fafaf7;border-radius:10px;padding:9px 12px;font-size:12px;color:#555;cursor:pointer}.choice-row button.chosen{background:#171719;border-color:#171719;color:#fff}.setting-note{font-size:12px;line-height:1.6;color:#777}.toggle-line span{display:flex;flex-direction:column;gap:3px}.toggle-line strong{font-size:13px}.toggle-line small{font-size:11px;color:#8b8b91}.toggle{width:42px;height:25px;border:0;border-radius:99px;background:#d9d9d4;padding:3px;cursor:pointer}.toggle i{display:block;width:19px;height:19px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.18)}.toggle.on{background:#171719}.toggle.on i{transform:translateX(17px)}.logout,.login-cta{width:100%;height:50px;margin-top:18px;border-radius:15px;display:flex;align-items:center;justify-content:center;gap:9px;text-decoration:none;font-size:13px;font-weight:650}.logout{border:1px solid #e3cbc8;background:#fff;color:#a23f35;cursor:pointer}.logout:hover{background:#fff7f5}.logout:disabled{opacity:.6}.login-cta{background:#171719;color:#fff}.settings-foot{text-align:center;color:#aaa;font-size:11px;margin:24px 0 0}@media(max-width:520px){.settings-shell{width:min(100% - 24px,680px);padding-top:28px}.settings-title h1{font-size:30px}.setting-body{padding-left:16px}.settings-top{height:64px}}`}</style>
  </main>
}
