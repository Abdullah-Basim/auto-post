import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { env, hasLinkedInOAuth } from '@/lib/env'
import { encryptSecret } from '@/lib/crypto'

interface LinkedInTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
  scope?: string
  token_type?: string
}

interface LinkedInUserInfo {
  sub: string
  name?: string
  email?: string
}

export async function GET(request: NextRequest) {
  if (!hasLinkedInOAuth()) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=linkedin_not_configured`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/auth/login`)
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?error=linkedin_${encodeURIComponent(error)}`
    )
  }
  if (!code || !state) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=linkedin_missing_code`)
  }

  const jar = await cookies()
  const expectedState = jar.get('li_oauth_state')?.value
  jar.delete('li_oauth_state')
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=linkedin_state_mismatch`)
  }

  // Exchange code for token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.LINKEDIN_CLIENT_ID!,
      client_secret: env.LINKEDIN_CLIENT_SECRET!,
      redirect_uri:
        env.LINKEDIN_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`,
    }),
  })

  if (!tokenRes.ok) {
    const detail = await tokenRes.text()
    console.error('[linkedin] token exchange failed:', tokenRes.status, detail)
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=linkedin_token_exchange`)
  }

  const token = (await tokenRes.json()) as LinkedInTokenResponse

  // Fetch user info to get account handle
  const infoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  const info = infoRes.ok ? ((await infoRes.json()) as LinkedInUserInfo) : null

  // Look up the linkedin platform id
  const { data: platform } = await supabase
    .from('platforms')
    .select('id')
    .eq('name', 'linkedin')
    .single()

  if (!platform) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=linkedin_platform_missing`)
  }

  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()
  const handle = info?.email ?? info?.name ?? info?.sub ?? 'linkedin_account'

  const { error: upsertError } = await supabase.from('platform_credentials').upsert(
    {
      user_id: user.id,
      platform_id: platform.id,
      account_handle: handle,
      access_token: encryptSecret(token.access_token),
      refresh_token: token.refresh_token ? encryptSecret(token.refresh_token) : null,
      token_expires_at: expiresAt,
      is_active: true,
      health_status: 'healthy',
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform_id,account_handle' }
  )

  if (upsertError) {
    console.error('[linkedin] failed to save credential:', upsertError)
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=linkedin_save_failed`)
  }

  return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?connected=linkedin`)
}
