import React from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, LayoutDashboard, GitBranch, Globe, MessageCircle, Shield, Terminal } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Command Center' },
  { to: '/pipeline', icon: GitBranch, label: 'Content Pipeline' },
  { to: '/platforms', icon: Globe, label: 'Platforms' },
  { to: '/ghost-reply', icon: MessageCircle, label: 'Ghost Reply' },
  { to: '/vault', icon: Shield, label: 'Secure Vault' },
  { to: '/logs', icon: Terminal, label: 'Agent Logs' },
];

export default function Sidebar({ onTerminalToggle }) {

  return (
    <aside data-testid="sidebar-navigation" className="fixed left-0 top-0 h-screen w-16 lg:w-64 bg-white/[0.03] backdrop-blur-xl border-r border-white/10 flex flex-col z-40">
      <div className="p-3 lg:p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-accent-primary" />
          </div>
          <span className="hidden lg:block font-heading font-bold text-sm tracking-tight">Autopost</span>
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group ${
                isActive
                  ? 'bg-white/[0.08] border-l-2 border-accent-primary text-white'
                  : 'text-text-secondary hover:bg-white/[0.05] hover:text-white border-l-2 border-transparent'
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            <span className="hidden lg:block text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          data-testid="terminal-toggle-button"
          onClick={onTerminalToggle}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-text-secondary hover:bg-white/[0.05] hover:text-white transition-all w-full text-left"
        >
          <Terminal size={18} />
          <span className="hidden lg:block text-xs">Toggle Terminal</span>
        </button>
      </div>
    </aside>
  );
}
