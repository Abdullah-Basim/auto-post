import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import CommandCenter from '../components/dashboard/CommandCenter';
import ContentPipeline from '../components/dashboard/ContentPipeline';
import PlatformManager from '../components/dashboard/PlatformManager';
import GhostReply from '../components/dashboard/GhostReply';
import SecureVault from '../components/dashboard/SecureVault';
import AgentTerminal from '../components/dashboard/AgentTerminal';

export default function Dashboard() {
  const [terminalOpen, setTerminalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-app flex" data-testid="dashboard-layout">
      <Sidebar onTerminalToggle={() => setTerminalOpen(!terminalOpen)} />
      <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-6 min-h-screen">
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/pipeline" element={<ContentPipeline />} />
          <Route path="/platforms" element={<PlatformManager />} />
          <Route path="/ghost-reply" element={<GhostReply />} />
          <Route path="/vault" element={<SecureVault />} />
          <Route path="/logs" element={<AgentTerminal />} />
        </Routes>
      </main>
      {terminalOpen && (
        <div className="fixed bottom-0 left-16 lg:left-64 right-0 z-50">
          <AgentTerminal isPanel onClose={() => setTerminalOpen(false)} />
        </div>
      )}
    </div>
  );
}
