import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Eye, EyeOff, Check, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const providers = [
  { id: 'openai', name: 'OpenAI', description: 'GPT models for content generation' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude for reasoning and analysis' },
  { id: 'meta', name: 'Meta Graph API', description: 'Facebook & Instagram integration' },
  { id: 'linkedin', name: 'LinkedIn API', description: 'LinkedIn posting and analytics' },
];

export default function SecureVault() {
  const [keys, setKeys] = useState({});
  const [showKey, setShowKey] = useState({});
  const [saving, setSaving] = useState({});
  const [savedKeys, setSavedKeys] = useState([]);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API}/api/vault/keys`, { headers: { Authorization: `Bearer ${token}` } });
      setSavedKeys(data.map(k => k.provider));
    } catch {}
  }

  async function handleSave(provider) {
    if (!keys[provider]) return;
    setSaving({ ...saving, [provider]: true });
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/vault/keys`, { provider, api_key: keys[provider] }, { headers: { Authorization: `Bearer ${token}` } });
      setSavedKeys([...savedKeys, provider]);
    } catch {}
    setSaving({ ...saving, [provider]: false });
  }

  return (
    <div className="space-y-6" data-testid="secure-vault-page">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Secure Vault</h1>
        <p className="text-text-secondary text-sm mt-1">Safely store and validate your platform credentials</p>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold">API Key Configuration</h2>
            <p className="text-text-muted text-xs">All credentials are encrypted at rest</p>
          </div>
        </div>

        <div className="space-y-4">
          {providers.map(provider => (
            <div key={provider.id} data-testid={`vault-provider-${provider.id}`} className="bg-black/20 border border-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{provider.name}</p>
                  <p className="text-text-muted text-xs">{provider.description}</p>
                </div>
                {savedKeys.includes(provider.id) && (
                  <span className="flex items-center gap-1 text-green-400 text-xs"><Check size={12} /> Connected</span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1">
                  <input
                    data-testid={`vault-input-${provider.id}`}
                    type={showKey[provider.id] ? 'text' : 'password'}
                    value={keys[provider.id] || ''}
                    onChange={e => setKeys({ ...keys, [provider.id]: e.target.value })}
                    placeholder={`Enter ${provider.name} key`}
                    className="w-full bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-500 rounded-md px-3 py-2 text-sm font-mono outline-none pr-10"
                  />
                  <button
                    onClick={() => setShowKey({ ...showKey, [provider.id]: !showKey[provider.id] })}
                    className="absolute right-3 top-2.5 text-text-muted hover:text-white"
                  >
                    {showKey[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  data-testid={`vault-save-${provider.id}`}
                  onClick={() => handleSave(provider.id)}
                  disabled={saving[provider.id] || !keys[provider.id]}
                  className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all font-medium rounded-md px-4 py-2 text-xs disabled:opacity-50"
                >
                  {saving[provider.id] ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
