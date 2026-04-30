import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, BookOpen, PenTool, Image, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const stageIcons = [Search, BookOpen, PenTool, Image, CheckCircle];
const stageNames = ['Source Discovery', 'Topic Enrichment', 'Copywriting', 'Creative Generation', 'Platform Approval'];

export default function ContentPipeline() {
  const [pipelines, setPipelines] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipelines();
    const interval = setInterval(fetchPipelines, 4000);
    return () => clearInterval(interval);
  }, []);

  async function fetchPipelines() {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API}/api/pipelines`, { headers: { Authorization: `Bearer ${token}` } });
      setPipelines(data);
    } catch {}
    setLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="content-pipeline-page">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Content Pipeline</h1>
        <p className="text-text-secondary text-sm mt-1">Track your content through the autonomous creation workflow</p>
      </div>

      {pipelines.length === 0 ? (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
          <Search className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No pipelines yet. Go to Command Center to start one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map(pipeline => (
            <PipelineCard
              key={pipeline.pipeline_id}
              pipeline={pipeline}
              expanded={expanded === pipeline.pipeline_id}
              onToggle={() => setExpanded(expanded === pipeline.pipeline_id ? null : pipeline.pipeline_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineCard({ pipeline, expanded, onToggle }) {
  const stages = pipeline.stages || {};

  return (
    <div data-testid={`pipeline-card-${pipeline.pipeline_id}`} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-semibold">{pipeline.niche}</h3>
            <p className="text-text-muted text-xs font-mono mt-0.5">
              {pipeline.status === 'running' ? 'Processing...' : pipeline.status === 'complete' ? 'Complete' : 'Error'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-mono ${
              pipeline.status === 'complete' ? 'bg-green-400/10 text-green-400' :
              pipeline.status === 'running' ? 'bg-sky-400/10 text-sky-400' :
              'bg-red-400/10 text-red-400'
            }`}>
              {pipeline.status}
            </span>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(i => {
            const stage = stages[String(i)] || {};
            const Icon = stageIcons[i - 1];
            const isComplete = stage.status === 'complete';
            const isRunning = stage.status === 'running';

            return (
              <React.Fragment key={i}>
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs ${
                  isComplete ? 'bg-green-400/10 text-green-400' :
                  isRunning ? 'bg-sky-400/10 text-sky-400' :
                  'bg-white/[0.03] text-text-muted'
                }`}>
                  {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
                  <span className="hidden md:inline">{stageNames[i - 1]}</span>
                </div>
                {i < 5 && <div className={`w-4 h-px ${isComplete ? 'bg-green-400' : 'bg-white/10'}`}></div>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* View Reasoning */}
      <button
        data-testid={`pipeline-view-reasoning-${pipeline.pipeline_id}`}
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-1 py-2.5 border-t border-white/10 text-text-secondary hover:text-white hover:bg-white/[0.03] transition-all text-xs"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span>{expanded ? 'Hide' : 'View'} Reasoning</span>
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-5 space-y-3 bg-black/20">
          {[1, 2, 3, 4, 5].map(i => {
            const stage = stages[String(i)] || {};
            if (!stage.result) return null;
            return (
              <div key={i} className="space-y-1">
                <p className="text-xs font-mono text-accent-secondary">{stageNames[i - 1]}</p>
                <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono bg-black/30 p-3 rounded-md overflow-auto max-h-40">
                  {stage.result}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
