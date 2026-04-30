'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReasoningModal } from './reasoning-modal'
import { createClient } from '@/lib/supabase/client'
import type { ContentPiece } from '@/types'

const PIPELINE_STAGES = [
  { id: 'source_discovery', name: 'Source Discovery', description: 'Trending topics' },
  { id: 'topic_enrichment', name: 'Topic Enrichment', description: 'Detailed insights' },
  { id: 'copywriting', name: 'Copywriting', description: 'Compelling copy' },
  { id: 'creative_generation', name: 'Creative Generation', description: 'Visual assets' },
  { id: 'platform_approval', name: 'Platform Approval', description: 'Final review' },
]

interface ContentPipelineProps {
  fullView?: boolean
  userId?: string
  campaigns?: any[]
}

export function ContentPipeline({ fullView = false, userId, campaigns }: ContentPipelineProps) {
  const [contentPieces, setContentPieces] = useState<ContentPiece[]>([])
  const [selectedPiece, setSelectedPiece] = useState<ContentPiece | null>(null)
  const [isReasoningOpen, setIsReasoningOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchContentPieces = async () => {
      if (!userId) return
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('content_pieces')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setContentPieces(data || [])
      } catch (error) {
        console.error('[v0] Error fetching content pieces:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchContentPieces()
  }, [userId, supabase])
  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur">
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">Content Pipeline</h3>
            <p className="text-sm text-muted-foreground">5-stage content generation workflow</p>
          </div>

          {fullView ? (
            <div className="space-y-4">
              {/* Pipeline Stages */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-foreground mb-4">Pipeline Stages</h4>
                <div className="space-y-4">
                  {PIPELINE_STAGES.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="relative p-4 rounded-lg border border-border bg-card/50 hover:bg-card/70 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-xs font-bold text-background">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{stage.name}</p>
                              <p className="text-sm text-muted-foreground">{stage.description}</p>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                          Ready
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Content Pieces */}
              {contentPieces.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4">Generated Content</h4>
                  <div className="space-y-3">
                    {contentPieces.map((piece) => (
                      <div
                        key={piece.id}
                        className="p-4 rounded-lg border border-border bg-card/30 hover:bg-card/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedPiece(piece)
                          setIsReasoningOpen(true)
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{piece.stage.replace(/_/g, ' ')}</Badge>
                              <Badge variant="secondary">{piece.status}</Badge>
                            </div>
                            <p className="font-medium text-foreground">
                              {piece.source_topics?.[0] || 'Untitled Content'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(piece.created_at).toLocaleDateString()}
                            </p>
                            <div className="w-16 bg-muted rounded-full h-1.5 mt-1">
                              <div
                                className="h-full bg-accent rounded-full"
                                style={{ width: `${piece.quality_score * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-border hover:bg-card"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPiece(piece)
                            setIsReasoningOpen(true)
                          }}
                        >
                          View Reasoning
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading content pieces...</p>
                </div>
              )}

              {!loading && contentPieces.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No content generated yet. Start by entering a niche in the Quick Start panel.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {PIPELINE_STAGES.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-2 flex-shrink-0">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent bg-opacity-20 border border-border">
                    <div className="w-12 h-12 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-accent">{index + 1}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{stage.name}</p>
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                  </div>
                  {index < PIPELINE_STAGES.length - 1 && (
                    <div className="w-4 h-0.5 bg-gradient-to-r from-primary to-accent mx-1" />
                  )}
                </div>
              ))}
            </div>
          )}

          {!fullView && (
            <Button variant="outline" className="w-full border-border hover:bg-card">
              View Full Pipeline
            </Button>
          )}
        </div>
      </Card>

      {/* Reasoning Modal */}
      <ReasoningModal
        contentPiece={selectedPiece}
        isOpen={isReasoningOpen}
        onClose={() => setIsReasoningOpen(false)}
      />
    </>
  )
}
