import { NextRequest } from 'next/server'
import { env } from '@/lib/env'

/**
 * Vercel sends Cron requests with the Authorization header
 *   Authorization: Bearer <CRON_SECRET>
 * (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs)
 *
 * In dev / without CRON_SECRET we allow unauthenticated calls so the routes
 * are inspectable locally.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  if (!env.CRON_SECRET) return process.env.NODE_ENV !== 'production'
  const header = request.headers.get('authorization')
  return header === `Bearer ${env.CRON_SECRET}`
}
