import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Terminal, X, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AgentTerminal({ isPanel, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  async function fetchLogs() {
    try {
      const { data } = await axios.get(`${API}/api/agent-logs`);
      setLogs(data);
    } catch {}
    setLoading(false);
  }

  const containerClass = isPanel
    ? 'h-64 bg-black border-t border-white/10'
    : 'space-y-6';

  if (!isPanel) {
    return (
      <div className="space-y-6" data-testid="agent-terminal-page">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Agentic Log Terminal</h1>
          <p className="text-text-secondary text-sm mt-1">Real-time system activity and AI decision-making logs</p>
        </div>
        <TerminalWindow logs={logs} loading={loading} bottomRef={bottomRef} />
      </div>
    );
  }

  return (
    <div className={containerClass} data-testid="agent-terminal-panel">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/80">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-green-400" />
          <span className="text-xs font-mono text-text-secondary">agent_terminal</span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-white"><X size={14} /></button>
      </div>
      <div className="h-52 overflow-y-auto p-4 font-mono text-xs">
        {logs.map((log, i) => (
          <LogLine key={log.id || i} log={log} />
        ))}
        <div ref={bottomRef}></div>
      </div>
    </div>
  );
}

function TerminalWindow({ logs, loading, bottomRef }) {
  return (
    <div data-testid="terminal-window" className="bg-black border border-white/10 rounded-lg shadow-inner overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
        <span className="ml-2 text-xs font-mono text-text-muted">autopost_agent_v1.0</span>
      </div>
      <div className="h-96 overflow-y-auto p-4 font-mono text-xs space-y-1">
        {loading ? (
          <div className="flex items-center gap-2 text-text-muted">
            <Loader2 size={12} className="animate-spin" /> Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <p className="text-text-muted">No agent activity yet. Start a pipeline to see logs.</p>
        ) : (
          logs.map((log, i) => <LogLine key={log.id || i} log={log} />)
        )}
        <div ref={bottomRef}></div>
        <span className="terminal-cursor text-green-400">_</span>
      </div>
    </div>
  );
}

function LogLine({ log }) {
  const typeColors = {
    pipeline_start: 'text-sky-400',
    stage_complete: 'text-green-400',
    pipeline_complete: 'text-violet-400',
    pipeline_error: 'text-red-400',
    ghost_reply: 'text-yellow-400',
  };

  const color = typeColors[log.type] || 'text-text-secondary';
  const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';

  return (
    <div className="flex gap-2 hover:bg-white/[0.02] px-1 rounded">
      <span className="text-text-muted shrink-0">[{time}]</span>
      <span className={`shrink-0 ${color}`}>[{log.type}]</span>
      <span className="text-green-400">{log.message}</span>
    </div>
  );
}
