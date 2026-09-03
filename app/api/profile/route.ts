import { z } from 'zod'
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/db'
import { memories, userProfiles } from '@/db/schema'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'
const profileSchema = z.object({
  name: z.string().max(120).optional(), profession: z.string().max(160).optional(), uses: z.array(z.string().max(80)).max(30).optional(), communicationStyle: z.string().max(80).optional(), experienceLevel: z.string().max(80).optional(), technologies: z.string().max(1000).optional(), goals: z.string().max(4000).optional(), explicitMemory: z.string().max(6000).optional(), memoryEnabled: z.boolean().optional(),
})

export async function GET(){
  const user=await requireUser()
  const profile=await db.query.userProfiles.findFirst({where:eq(userProfiles.userId,user.id)})
  const items=profile?.memoryEnabled===false?[]:await db.select().from(memories).where(eq(memories.userId,user.id)).orderBy(desc(memories.updatedAt)).limit(50)
  return Response.json({profile:profile||null,memories:items})
}

export async function PUT(request:Request){
  const user=await requireUser()
  const parsed=profileSchema.safeParse(await request.json().catch(()=>null))
  if(!parsed.success)return Response.json({error:'Invalid profile.'},{status:400})
  const data={...parsed.data,updatedAt:new Date()}
  const existing=await db.query.userProfiles.findFirst({where:eq(userProfiles.userId,user.id)})
  if(existing) await db.update(userProfiles).set(data).where(eq(userProfiles.userId,user.id))
  else await db.insert(userProfiles).values({userId:user.id,...data})

  const content=parsed.data.explicitMemory?.trim()
  if(content&&parsed.data.memoryEnabled!==false){
    await db.insert(memories).values({userId:user.id,content,contentHash:sql`md5(${content})`,source:'onboarding',importance:1}).onConflictDoUpdate({target:[memories.userId,memories.contentHash],set:{updatedAt:new Date(),importance:1}})
  }
  return Response.json({ok:true})
}
