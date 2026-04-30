import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * WebSocket Initialization Endpoint
 * Validates user authentication and returns WebSocket connection details
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create agent state
    const { data: agentState } = await supabase
      .from('agent_state')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json(
      {
        userId: user.id,
        email: user.email,
        agentState: agentState || {
          current_status: 'idle',
          current_action: null,
          stage_progress: 0,
          total_stages: 5,
        },
        wsUrl: process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_APP_URL,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] WebSocket init error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
