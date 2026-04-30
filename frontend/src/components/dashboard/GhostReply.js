import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, ThumbsUp, HelpCircle, AlertTriangle, ToggleLeft, ToggleRight, Send, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const sentimentConfig = {
  positive: { icon: ThumbsUp, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Positive' },
  negative: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Negative' },
  question: { icon: HelpCircle, color: 'text-sky-400', bg: 'bg-sky-400/10', label: 'Question' },
};

export default function GhostReply() {
  const [comments, setComments] = useState([]);
  const [autonomous, setAutonomous] = useState(false);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, []);

  async function fetchComments() {
    try {
      const { data } = await axios.get(`${API}/api/comments`);
      setComments(data);
    } catch {}
    setLoading(false);
  }

  async function handleReply(commentId) {
    try {
      await axios.post(`${API}/api/comments/${commentId}/reply`);
      setComments(comments.map(c => c.id === commentId ? { ...c, replied: true } : c));
    } catch {}
  }

  const filtered = filter === 'all' ? comments : comments.filter(c => c.sentiment === filter);

  return (
    <div className="space-y-6" data-testid="ghost-reply-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Ghost Reply Engine</h1>
          <p className="text-text-secondary text-sm mt-1">Intelligent automation for audience interactions</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-secondary text-sm">Autonomous Mode</span>
          <button
            data-testid="autonomous-mode-toggle"
            onClick={() => setAutonomous(!autonomous)}
            className="transition-all"
          >
            {autonomous ? (
              <ToggleRight size={28} className="text-green-400" />
            ) : (
              <ToggleLeft size={28} className="text-text-muted" />
            )}
          </button>
        </div>
      </div>

      {autonomous && (
        <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <p className="text-green-400 text-sm">Autonomous mode active. AI will respond to all comments without approval.</p>
        </div>
      )}

      {/* Sentiment Filter */}
      <div className="flex items-center gap-2">
        {['all', 'positive', 'negative', 'question'].map(f => (
          <button
            key={f}
            data-testid={`filter-${f}`}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === f
                ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                : 'bg-white/[0.03] text-text-secondary border border-white/10 hover:bg-white/[0.05]'
            }`}
          >
            {f === 'all' ? 'All' : sentimentConfig[f]?.label}
          </button>
        ))}
      </div>

      {/* Comments */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-accent-primary animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(comment => {
            const config = sentimentConfig[comment.sentiment] || sentimentConfig.question;
            const Icon = config.icon;
            return (
              <div
                key={comment.id}
                data-testid={`comment-card-${comment.id}`}
                className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-accent-secondary">@{comment.author}</span>
                      <span className="text-text-muted text-xs">on {comment.platform}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.bg} ${config.color}`}>
                        <Icon size={10} /> {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary mb-3">"{comment.text}"</p>
                    <div className="bg-black/30 border border-white/5 rounded-md p-3">
                      <p className="text-xs text-text-muted mb-1">AI Suggested Reply:</p>
                      <p className="text-sm text-text-secondary">{comment.suggested_reply}</p>
                    </div>
                  </div>
                  <button
                    data-testid={`reply-button-${comment.id}`}
                    onClick={() => handleReply(comment.id)}
                    disabled={comment.replied}
                    className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      comment.replied
                        ? 'bg-green-400/10 text-green-400 cursor-default'
                        : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                    }`}
                  >
                    {comment.replied ? <><MessageCircle size={12} /> Sent</> : <><Send size={12} /> Send</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
