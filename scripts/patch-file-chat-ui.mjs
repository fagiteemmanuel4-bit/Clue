import fs from 'node:fs'

const path = 'app/page.tsx'
let s = fs.readFileSync(path, 'utf8')
const original = s

if (!s.includes('downloadUrl?: string')) {
  const old = "type Message={id:string;role:Role;content:string;attachment?:{name:string;type:string;size?:number}}"
  const next = "type Message={id:string;role:Role;content:string;attachment?:{name:string;type:string;size?:number;downloadUrl?:string}}"
  if (!s.includes(old)) throw new Error('Message type anchor not found')
  s = s.replace(old, next)
}

if (!s.includes('function FileCard(')) {
  const anchor = "function QuestionCard({raw,onAnswer}:{raw:string;onAnswer:(v:string)=>void})"
  const component = `function FileCard({attachment}:{attachment:NonNullable<Message['attachment']>}){if(!attachment.downloadUrl)return <small className="attachment"><File/>{attachment.name}</small>;return <div className="file-card"><div className="file-card-icon"><File/></div><div className="file-card-info"><strong>{attachment.name}</strong><small>{attachment.type.includes('pdf')?'PDF document':attachment.type.includes('spreadsheet')?'Excel spreadsheet':attachment.type.includes('presentation')?'PowerPoint presentation':attachment.type.includes('wordprocessing')?'Word document':'File'} · {attachment.size?attachment.size<1024?attachment.size+' B':Math.round(attachment.size/1024)+' KB':'Ready'}</small></div><a className="file-card-download" href={attachment.downloadUrl} download={attachment.name} aria-label={\`Download \${attachment.name}\`}><Download/></a></div>}\n`
  if (!s.includes(anchor)) throw new Error('QuestionCard anchor not found')
  s = s.replace(anchor, component + anchor)
}

const oldFetch = /const response=await fetch\('\/api\/chat',[\s\S]*?if\(user\)await fetch\(`\/api\/conversations\/\$\{c\.id\}\/messages`,\{method:'POST',headers:\{'Content-Type':'application\/json'\},body:JSON\.stringify\(\{role:'assistant',contentText:full,contentType:'text'\}\)\}\)\}/
if (!s.includes("const response=await fetch('/api/chat'")) throw new Error('Chat fetch anchor not found')
if (!s.includes("content-type')||''")) {
  const replacement = `const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next.map(({role,content})=>({role,content})),model:activeTool==='Code'?'free':undefined,userContext:profile,guestRemaining:!user?Math.max(0,guestLimit-guest.count):undefined}),signal:controller.signal});if(!response.ok){const d=await response.json().catch(()=>null);throw Error(d?.error||\`AI request failed (\${response.status})\`)}let full='';let generatedAttachment:Message['attachment'];const contentType=response.headers.get('content-type')||'';if(contentType.includes('application/json')){const d=await response.json();if(d?.type==='file'&&d.file?.bytes){const raw=atob(d.file.bytes);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const blobUrl=URL.createObjectURL(new Blob([bytes],{type:String(d.file.type||'application/octet-stream')}));generatedAttachment={name:String(d.file.name||'clue-file'),type:String(d.file.type||'application/octet-stream'),size:Number(d.file.size||bytes.byteLength),downloadUrl:blobUrl};full=String(d.text||'File created successfully.')}else{throw Error(d?.error||'Clue returned an invalid file response.')}updateConversation(c.id,{messages:[...next,{id:assistantId,role:'assistant',content:full,attachment:generatedAttachment}]})}else{if(!response.body)throw Error('Clue returned an empty response.');const reader=response.body.getReader(),decoder=new TextDecoder();let started=false;while(true){const{done,value}=await reader.read();if(done)break;const chunk=decoder.decode(value,{stream:true});if(chunk&&!started){started=true;setAiStatus('Writing')}full+=chunk;updateConversation(c.id,{messages:[...next,{id:assistantId,role:'assistant',content:full}]})}full+=decoder.decode();}if(!full.trim())throw Error('The AI returned an empty response.');if(!user){const ng={count:guest.count+1,resetAt:guest.resetAt||Date.now()+guestWindow};setGuest(ng);try{localStorage.setItem(guestKey,JSON.stringify(ng))}catch{}if(ng.count>=guestLimit)setShowContinue(true)}if(user)await fetch(\`/api/conversations/\${c.id}/messages\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'assistant',contentText:full,contentType:'text'})})}`
  s = s.replace(oldFetch, replacement)
  if (s === original) throw new Error('Chat fetch replacement did not match')
}

const oldAttachment = `{m.attachment&&<small className="attachment"><File/>{m.attachment.name}</small>}`
if (s.includes(oldAttachment)) s = s.replace(oldAttachment, `{m.attachment&&<FileCard attachment={m.attachment}/>} `)

if (s === original) throw new Error('No UI changes were required; refusing to create a no-op commit')
fs.writeFileSync(path, s)
console.log('patched app/page.tsx')
