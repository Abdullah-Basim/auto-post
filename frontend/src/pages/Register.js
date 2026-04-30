import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center animate-pulse-glow">
              <Zap className="w-5 h-5 text-accent-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">Autopost</h1>
          </div>
          <p className="text-text-secondary text-sm">Create your command center</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-heading font-semibold">Create Account</h2>
          {error && <div data-testid="register-error" className="text-red-400 text-sm bg-red-400/10 p-3 rounded-md">{error}</div>}
          <div>
            <label className="text-text-secondary text-sm block mb-1">Name</label>
            <input data-testid="register-name-input" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-500 rounded-md px-3 py-2 text-sm outline-none" placeholder="Your name" required />
          </div>
          <div>
            <label className="text-text-secondary text-sm block mb-1">Email</label>
            <input data-testid="register-email-input" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-500 rounded-md px-3 py-2 text-sm outline-none" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="text-text-secondary text-sm block mb-1">Password</label>
            <div className="relative">
              <input data-testid="register-password-input" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-500 rounded-md px-3 py-2 text-sm outline-none pr-10" placeholder="Min 6 characters" required minLength={6} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-text-muted hover:text-white">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button data-testid="register-submit-button" type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all font-medium rounded-md py-2.5 text-sm disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
          <p className="text-text-secondary text-sm text-center">
            Already have an account? <Link to="/login" className="text-accent-primary hover:text-accent-primary-hover">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
