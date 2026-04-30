import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCampaigns, createCampaign } from '@/lib/db/queries'

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

    const campaigns = await getCampaigns()
    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('[v0] Get campaigns error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

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
    const { name, description, niche, target_platforms } = body

    if (!name || !niche) {
      return NextResponse.json(
        { error: 'Missing required fields: name, niche' },
        { status: 400 }
      )
    }

    const campaign = await createCampaign({
      user_id: user.id,
      name,
      description: description || null,
      niche,
      status: 'active',
      auto_publish: false,
      target_platforms: target_platforms || [],
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('[v0] Create campaign error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
