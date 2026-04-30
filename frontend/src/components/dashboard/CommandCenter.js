import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Brain, Sparkles, ArrowRight, Activity } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function CommandCenter() {
  const [brainStatus, setBrainStatus] = useState({ status: 'idle', message: 'Awaiting instructions', niche: '' });
  const [niche, setNiche] = useState('');
  const [launching, setLaunching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBrainStatus();
    const interval = setInterval(fetchBrainStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchBrainStatus() {
    try {
      const { data } = await axios.get(`${API}/api/brain/status`);
      setBrainStatus(data);
    } catch {}
  }

  async function handleLaunch(e) {
    e.preventDefault();
    if (!niche.trim()) return;
    setLaunching(true);
    try {
      await axios.post(`${API}/api/pipeline/start`, { niche });
      setNiche('');
      fetchBrainStatus();
      setTimeout(() => navigate('/pipeline'), 500);
    } catch {}
    setLaunching(false);
  }

  return (
    <div className="space-y-6" data-testid="command-center">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Command Center</h1>
          <p className="text-text-secondary text-sm mt-1">Monitor and control your AI social media agent</p>
        </div>
      </div>

      {/* Brain Status Widget */}
      <div data-testid="brain-status-widget" className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-accent-primary/20 to-transparent"></div>
        <div className="relative flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${brainStatus.status === 'active' ? 'bg-accent-primary/20 animate-pulse-glow' : 'bg-white/[0.05]'}`}>
            <Brain className={`w-7 h-7 ${brainStatus.status === 'active' ? 'text-accent-primary' : 'text-text-muted'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${brainStatus.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-text-muted'}`}></div>
              <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                {brainStatus.status === 'active' ? 'Processing' : 'Idle'}
              </span>
            </div>
            <p className="text-lg font-heading font-semibold mt-1">{brainStatus.message}</p>
            {brainStatus.niche && <p className="text-text-secondary text-sm mt-0.5">Niche: {brainStatus.niche}</p>}
          </div>
          <Activity className="w-5 h-5 text-text-muted" />
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent-secondary" />
          <h2 className="font-heading font-semibold">Quick Start</h2>
        </div>
        <p className="text-text-secondary text-sm mb-4">Enter a niche or topic to trigger the full content creation pipeline</p>
        <form onSubmit={handleLaunch} className="flex gap-3">
          <input
            data-testid="quick-start-input"
            type="text"
            value={niche}
            onChange={e => setNiche(e.target.value)}
            placeholder="e.g., AI SaaS News, Fitness Tips, Web3 Updates..."
            className="flex-1 bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-500 rounded-md px-4 py-2.5 text-sm outline-none"
          />
          <button
            data-testid="quick-start-launch-button"
            type="submit"
            disabled={launching || !niche.trim()}
            className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all font-medium rounded-md px-5 py-2.5 text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {launching ? 'Launching...' : 'Launch'}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Pipelines Today" value="3" change="+2" />
        <StatCard label="Posts Scheduled" value="12" change="+5" />
        <StatCard label="Auto-Replies Sent" value="47" change="+18" />
      </div>
    </div>
  );
}

function StatCard({ label, value, change }) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all duration-300">
      <p className="text-text-secondary text-xs uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-2 mt-2">
        <span className="text-2xl font-heading font-bold">{value}</span>
        <span className="text-green-400 text-xs mb-1">{change}</span>
      </div>
    </div>
  );
}
