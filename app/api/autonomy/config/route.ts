import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAutonomyConfig, updateAutonomyConfig } from '@/lib/services/autonomous-replies'

/**
 * GET /api/autonomy/config
 * Retrieve autonomy configuration for the user
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

    const config = await getAutonomyConfig(user.id)
    return NextResponse.json(config, { status: 200 })
  } catch (error) {
    console.error('[v0] Get config error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/autonomy/config
 * Update autonomy configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await request.json()
    const updated = await updateAutonomyConfig(user.id, config)

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('[v0] Update config error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update config' },
      { status: 500 }
    )
  }
}
