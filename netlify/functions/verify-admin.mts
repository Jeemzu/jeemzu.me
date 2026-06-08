import { getUser } from '@netlify/identity'
import type { Context } from '@netlify/functions'

export default async (_req: Request, _context: Context) => {
  const user = await getUser()

  if (!user) {
    return Response.json({ isAdmin: false }, { status: 401 })
  }

  const roles: string[] = user.app_metadata?.roles ?? []
  const isAdmin = roles.includes('admin')

  return Response.json({ isAdmin })
}
