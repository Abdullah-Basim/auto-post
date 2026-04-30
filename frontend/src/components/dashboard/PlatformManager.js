import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Globe, Wifi, WifiOff, Monitor, Smartphone } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const platformIcons = {
  facebook: '# FB',
  instagram: '# IG',
  x: '# X',
  linkedin: '# LI',
  tiktok: '# TT',
};

export default function PlatformManager() {
  const [platforms, setPlatforms] = useState([]);
  const [previewMode, setPreviewMode] = useState('desktop');

  useEffect(() => {
    fetchPlatforms();
  }, []);

  async function fetchPlatforms() {
    try {
      const { data } = await axios.get(`${API}/api/platforms`);
      setPlatforms(data);
    } catch {}
  }

  return (
    <div className="space-y-6" data-testid="platform-manager-page">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Multi-Platform Manager</h1>
        <p className="text-text-secondary text-sm mt-1">Manage your presence across all connected platforms</p>
      </div>

      {/* Platform Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map(platform => (
          <div
            key={platform.slug}
            data-testid={`platform-tile-${platform.slug}`}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-bold text-accent-secondary">{platformIcons[platform.slug]}</span>
                <h3 className="font-heading font-semibold text-sm">{platform.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                {platform.health === 'healthy' ? (
                  <Wifi size={14} className="text-green-400" />
                ) : platform.health === 'degraded' ? (
                  <Wifi size={14} className="text-yellow-400" />
                ) : (
                  <WifiOff size={14} className="text-red-400" />
                )}
                <span className={`text-xs font-mono ${
                  platform.health === 'healthy' ? 'text-green-400' :
                  platform.health === 'degraded' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {platform.health}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MetricBadge label="Likes" value={platform.last_post_metrics?.likes || 0} />
              <MetricBadge label="Comments" value={platform.last_post_metrics?.comments || 0} />
              <MetricBadge label="Shares" value={platform.last_post_metrics?.shares || 0} />
            </div>
          </div>
        ))}
      </div>

      {/* Post Previewer */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent-primary" />
            <h2 className="font-heading font-semibold">Unified Post Previewer</h2>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.05] rounded-md p-0.5">
            <button
              data-testid="preview-mode-desktop"
              onClick={() => setPreviewMode('desktop')}
              className={`px-3 py-1.5 rounded text-xs transition-all ${previewMode === 'desktop' ? 'bg-accent-primary text-white' : 'text-text-secondary hover:text-white'}`}
            >
              <Monitor size={14} className="inline mr-1" /> Desktop
            </button>
            <button
              data-testid="preview-mode-mobile"
              onClick={() => setPreviewMode('mobile')}
              className={`px-3 py-1.5 rounded text-xs transition-all ${previewMode === 'mobile' ? 'bg-accent-primary text-white' : 'text-text-secondary hover:text-white'}`}
            >
              <Smartphone size={14} className="inline mr-1" /> Mobile
            </button>
          </div>
        </div>
        <div className={`bg-black/40 border border-white/10 rounded-lg p-6 mx-auto ${previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20"></div>
              <div>
                <p className="text-sm font-medium">@autopost_official</p>
                <p className="text-text-muted text-xs">2 min ago</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              The future of social media management is here. Our AI agent just created, optimized, and scheduled 15 posts across 5 platforms in under 3 minutes. #AI #SocialMedia #Automation
            </p>
            <div className="w-full h-40 rounded-lg bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
              <span className="text-text-muted text-xs">Generated Creative</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBadge({ label, value }) {
  return (
    <div className="text-center bg-black/20 rounded-md p-2">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-heading font-bold mt-0.5">{value.toLocaleString()}</p>
    </div>
  );
}
