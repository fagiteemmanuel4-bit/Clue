const fs = require('node:fs')
const path = require('node:path')

const file = path.join(process.cwd(), 'app', 'page.tsx')
let source = fs.readFileSync(file, 'utf8')
const from = "if('share'in navigator)await navigator.share({title:c.title,text:'Clue conversation',url});else{await navigator.clipboard?.writeText(url);notify('Share link copied')}"
const to = "if(typeof navigator.share==='function')await navigator.share({title:c.title,text:'Clue conversation',url});else{await navigator.clipboard?.writeText(url);notify('Share link copied')}"
if (source.includes(from)) {
  source = source.replace(from, to)
  fs.writeFileSync(file, source)
}
