import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/platforms/credentials
 * Retrieve all connected platform credentials for the user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('platform_credentials')
      .select('id, platform_id, platform_name, access_token, created_at, status')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) throw error

    // Don't expose full tokens in response
    const safeData = data.map((cred) => ({
      id: cred.id,
      platform_id: cred.platform_id,
      platform_name: cred.platform_name,
      token_preview: `${cred.access_token?.slice(0, 10)}...`,
      created_at: cred.created_at,
      status: cred.status,
    }))

    return NextResponse.json(safeData)
  } catch (error) {
    console.error('[v0] Get credentials error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch credentials' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/platforms/credentials
 * Add new platform credential
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform_id, platform_name, access_token, refresh_token } = body

    if (!platform_id || !platform_name || !access_token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('platform_credentials')
      .insert([
        {
          user_id: user.id,
          platform_id,
          platform_name,
          access_token,
          refresh_token: refresh_token || null,
          is_active: true,
          status: 'connected',
        },
      ])
      .select('id, platform_id, platform_name, created_at')
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Add credential error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add credential' },
      { status: 500 }
    )
  }
}
