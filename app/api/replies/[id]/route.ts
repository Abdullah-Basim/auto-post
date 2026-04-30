import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateReply } from '@/lib/db/queries'

/**
 * PATCH /api/replies/[id]
 * Update a reply (approve, post, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    const updates = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    const reply = await updateReply(id, updates)
    return NextResponse.json(reply)
  } catch (error) {
    console.error('[v0] Update reply error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reply' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/replies/[id]
 * Delete a reply
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const { error } = await supabase
      .from('replies')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Delete reply error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete reply' },
      { status: 500 }
    )
  }
}
