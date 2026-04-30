'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlatformPublisher } from './platform-publisher'
import type { ContentPiece } from '@/types'

interface ReasoningModalProps {
  contentPiece: ContentPiece | null
  isOpen: boolean
  onClose: () => void
}

const PIPELINE_STAGES = [
  { id: 'sourceDiscovery', name: 'Source Discovery', color: 'from-blue-500 to-blue-600' },
  { id: 'enrichment', name: 'Topic Enrichment', color: 'from-purple-500 to-purple-600' },
  { id: 'copywriting', name: 'Copywriting', color: 'from-pink-500 to-pink-600' },
  { id: 'creative', name: 'Creative Generation', color: 'from-green-500 to-green-600' },
]

export function ReasoningModal({ contentPiece, isOpen, onClose }: ReasoningModalProps) {
  const [selectedStage, setSelectedStage] = useState('sourceDiscovery')
  const [isPublisherOpen, setIsPublisherOpen] = useState(false)

  if (!contentPiece) return null

  const reasoning = contentPiece.reasoning as any

  const renderStageContent = (stageId: string) => {
    const stage = reasoning?.[stageId]
    if (!stage) return <div className="text-muted-foreground">No data available</div>

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Description</p>
          <p className="text-sm text-muted-foreground">{stage.description}</p>
        </div>

        {stage.topics && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Discovered Topics ({stage.topicCount})</p>
            <div className="space-y-3">
              {stage.topics.map((topic: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-card/50 border border-border">
                  <div className="font-medium text-foreground">{topic.title || topic}</div>
                  {topic.why_trending && (
                    <p className="text-xs text-muted-foreground mt-1">{topic.why_trending}</p>
                  )}
                  {topic.relevance && (
                    <p className="text-xs text-muted-foreground mt-1">{topic.relevance}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {stage.insights && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Key Insights</p>
            <div className="p-3 rounded-lg bg-card/50 border border-border">
              <code className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {typeof stage.insights === 'string' 
                  ? stage.insights 
                  : JSON.stringify(stage.insights, null, 2)}
              </code>
            </div>
          </div>
        )}

        {stage.data && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Generated Data</p>
            <div className="p-3 rounded-lg bg-card/50 border border-border">
              <code className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {JSON.stringify(stage.data, null, 2)}
              </code>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Content Generation Reasoning</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pipeline Progress */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Pipeline Stages</p>
            <div className="flex gap-2 flex-wrap">
              {PIPELINE_STAGES.map((stage) => (
                <motion.div
                  key={stage.id}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedStage(stage.id)}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    selectedStage === stage.id
                      ? `bg-gradient-to-r ${stage.color} text-white`
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span className="text-xs font-medium">{stage.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stage Content */}
          <motion.div
            key={selectedStage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 rounded-lg bg-gradient-to-br from-card to-card/50 border border-border"
          >
            {renderStageContent(selectedStage)}
          </motion.div>

          {/* Quality Score */}
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Overall Quality Score</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-muted rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(contentPiece.quality_score || 0) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
                  />
                </div>
                <span className="text-sm font-bold text-accent">
                  {((contentPiece.quality_score || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Source Insights */}
          {contentPiece.source_insights && contentPiece.source_insights.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Source Insights</p>
              <div className="space-y-2">
                {contentPiece.source_insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Topics */}
          {contentPiece.source_topics && contentPiece.source_topics.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Content Topics</p>
              <div className="flex flex-wrap gap-2">
                {contentPiece.source_topics.map((topic, idx) => (
                  <Badge key={idx} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Publish Button */}
        <div className="mt-6 pt-6 border-t border-border">
          <Button
            onClick={() => setIsPublisherOpen(true)}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            📤 Publish to Platforms
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Platform Publisher Modal */}
    <PlatformPublisher
      contentPiece={contentPiece}
      isOpen={isPublisherOpen}
      onClose={() => setIsPublisherOpen(false)}
      onSuccess={() => {
        setIsPublisherOpen(false)
        onClose()
      }}
    />
  )
}
