'use client'
import './settings.css'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const sections=[
['Account','Profile, email, password and sessions',['Profile','Email & password','Active sessions','Sign out everywhere']],
['Appearance','Theme, density, type and motion',['Theme','Accent','Chat density','Font size','Animations']],
['Chat','Response style, history and composer',['Response style','Enter to send','Show timestamps','Conversation history','Markdown rendering']],
['Voice','Input, output and playback',['Voice mode','Voice selection','Accent','Speech speed','Background conversations','Start with voice']],
['Personalization','How Clue should work with you',['Custom instructions','Preferred tone','Expertise level','Language','Response characteristics']],
['Memory','Review and control what Clue remembers',['Memory on/off','Memory summary','Saved memories','Project memory','Clear memories']],
['AI Models','Default model and routing',['Default model','Automatic routing','Reasoning level','Fallback models','Temperature']],
['Tools','Web, code and connected capabilities',['Web search','Deep research','Code execution','Files','Image understanding','Tool permissions']],
['Integrations','Connected services and permissions',['GitHub','Google Drive','Calendar','Other apps','Manage permissions']],
['Notifications','Tasks, security and product updates',['Task reminders','Security alerts','Product updates','Email notifications']],
['Privacy','Data controls and Clue improvement',['Improve Clue','Temporary chats','Chat retention','Export data','Delete account']],
['Security','Sessions and authentication',['Password','Login sessions','Two-step verification','Recovery']],
['Accessibility','Motion, contrast, keyboard and type',['Reduced motion','High contrast','Keyboard navigation','Larger text','Screen reader support']],
['Storage','Files, artifacts and usage',['Files','Generated artifacts','Storage usage','Clear temporary files']],
['Subscription','Plan, limits and billing',['Current plan','Usage limits','Upgrade','Billing history']],
] as const

export default function SettingsPage(){
 const[active,setActive]=useState('Account');const[theme,setTheme]=useState('System');const[enabled,setEnabled]=useState<Record<string,boolean>>({Memory:true,'Web search':true,'Improve Clue':false,'Reduced motion':false})
 const section=sections.find(x=>x[0]===active)||sections[0]
 const toggle=(key:string)=>setEnabled(x=>({...x,[key]:!x[key]}))
 return <main className="settings-page"><header className="settings-header"><Link href="/" className="back-link"><ArrowLeft/><span>Clue</span></Link><h1>Settings</h1><div/></header><div className="settings-layout"><aside className="settings-nav">{sections.map(([title,desc])=><button key={title} className={`settings-nav-item ${active===title?'active':''}`} onClick={()=>setActive(title)}><span><strong>{title}</strong><small>{desc}</small></span><ChevronRight/></button>)}</aside><section className="settings-content"><div className="settings-intro"><p>{section[0]}</p><h2>{section[0]}.</h2><span>{section[1]}</span></div><div className="settings-group"><label>Controls</label>{section[2].map(item=><div className="settings-row" key={item}><span><strong>{item}</strong><small>{description(item)}</small></span>{['Theme','Accent','Chat density','Font size','Voice selection','Accent','Default model','Reasoning level','Language','Expertise level','Profile','Email & password','Active sessions','Current plan','Billing history'].includes(item)?<button onClick={()=>window.alert(`${item} settings are ready to configure.`)}>Manage</button>:<button className={`toggle ${enabled[item]?'on':''}`} aria-label={`Toggle ${item}`} onClick={()=>toggle(item)}><i/></button>}</div>)}</div>{active==='Appearance'&&<div className="settings-group"><label>Theme</label><div className="theme-options">{['Light','Dark','System'].map(x=><button className={theme===x?'chosen':''} onClick={()=>setTheme(x)} key={x}>{x}</button>)}</div></div>}{active==='Memory'&&<div className="settings-group"><label>Memory</label><div className="settings-row"><span><strong>Manage memory</strong><small>Review, edit and clear what Clue remembers.</small></span><Link href="/settings/memory">Open memory</Link></div></div>}<div className="settings-note">Clue keeps these controls grouped so you can quickly manage how your assistant looks, responds, remembers, searches and uses tools.</div></section></div></main>
}
function description(item:string){const map:Record<string,string>={'Memory on/off':'Let Clue remember useful information across chats.','Memory summary':'Review the high-level memory Clue has built from your conversations.','Saved memories':'View, edit or delete individual memories.','Project memory':'Keep context scoped to a project.','Web search':'Allow Clue to look up current information on the web.','Deep research':'Use multi-step web research with a documented report and sources.','Code execution':'Allow supported code and data tasks to run in a sandbox.','Custom instructions':'Tell Clue what to know about you and how to respond.','Response style':'Choose how concise, detailed or conversational Clue should be.','Temporary chats':'Start chats that do not use or create long-term memory.','Improve Clue':'Choose whether eligible conversations may help improve Clue.','Reduced motion':'Reduce animations throughout the interface.','Voice mode':'Enable live spoken conversations and turn-taking.','Background conversations':'Continue an active voice conversation while using other apps.','Automatic routing':'Let Clue choose an available model for the task.','Fallback models':'Retry with another configured model when a provider fails.','Tool permissions':'Control which tools Clue may use.','Export data':'Download your account and conversation data.','Delete account':'Permanently remove your Clue account and associated data.'};return map[item]||'Configure this part of your Clue experience.'}
