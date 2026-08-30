import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().email().max(320)
export const uuidSchema = z.string().uuid()

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export function parseJson<T extends z.ZodTypeAny>(schema: T, value: unknown) {
  const result = schema.safeParse(value)
  if (!result.success) return { ok: false as const, response: Response.json({ error: 'Invalid request', details: result.error.flatten() }, { status: 400 }) }
  return { ok: true as const, data: result.data as z.infer<T> }
}
