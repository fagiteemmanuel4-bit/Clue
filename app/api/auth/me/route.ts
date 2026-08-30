import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ user: null }, { status: 200 })
  return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName, preferredAccent: user.preferredAccent, themePreference: user.themePreference } })
}
