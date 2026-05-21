/**
 * Centralized env access with friendly error messages.
 *
 * Required vars fail fast at import time on the server.
 * Optional vars return undefined and callers should handle absence.
 */

import { z } from 'zod'

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  CREDENTIAL_ENCRYPTION_KEY: z.string().min(1).optional(),

  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().url().optional(),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().url().optional(),

  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  X_REDIRECT_URI: z.string().url().optional(),

  CRON_SECRET: z.string().optional(),
})

type ServerEnv = z.infer<typeof serverEnvSchema>

let cached: ServerEnv | null = null

function load(): ServerEnv {
  if (cached) return cached
  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  cached = parsed.data
  return cached
}

export const env = new Proxy({} as ServerEnv, {
  get(_, key: string) {
    return load()[key as keyof ServerEnv]
  },
})

export function hasLinkedInOAuth() {
  const e = load()
  return (
    !!e.LINKEDIN_CLIENT_ID &&
    e.LINKEDIN_CLIENT_ID !== 'placeholder' &&
    !!e.LINKEDIN_CLIENT_SECRET &&
    e.LINKEDIN_CLIENT_SECRET !== 'placeholder'
  )
}

export function hasMetaOAuth() {
  const e = load()
  return !!e.META_APP_ID && e.META_APP_ID !== 'placeholder' && !!e.META_APP_SECRET
}

export function hasXOAuth() {
  const e = load()
  return !!e.X_CLIENT_ID && e.X_CLIENT_ID !== 'placeholder' && !!e.X_CLIENT_SECRET
}

export function hasAnthropic() {
  return !!load().ANTHROPIC_API_KEY
}
