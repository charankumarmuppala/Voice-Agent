import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import VoiceAgent from './pages/VoiceAgent';
import Properties from './pages/Properties';
import Leads from './pages/Leads';
import Appointments from './pages/Appointments';
import CallHistory from './pages/CallHistory';
import Settings from './pages/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedPropertyForVisit, setSelectedPropertyForVisit] = useState(null);

  // Dark Mode State with persistence
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('estatevoice_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('estatevoice_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('estatevoice_theme', 'light');
      }
    } catch (e) {
      console.warn('Theme storage error:', e);
    }
  }, [darkMode]);

  function handleScheduleVisitFromCard(prop) {
    setSelectedPropertyForVisit(prop);
    setActiveTab('appointments');
  }

  const titles = {
    dashboard: 'Executive Dashboard',
    'voice-agent': 'AI Voice Assistant Simulator',
    properties: 'Property Portfolio',
    leads: 'Customer Leads CRM',
    appointments: 'Scheduled Property Visits',
    'call-history': 'Call History & Transcripts',
    settings: 'Settings & Configuration'
  };

  return (
    <div className={`flex h-screen bg-neo-grid bg-[#FFFDF5] text-[#111111] font-sans overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Collapsible Neo-Brutalist Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          activeTabTitle={titles[activeTab] || 'EstateVoice AI'}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'voice-agent' && (
            <VoiceAgent />
          )}
          {activeTab === 'properties' && (
            <Properties onScheduleVisit={handleScheduleVisitFromCard} />
          )}
          {activeTab === 'leads' && (
            <Leads onScheduleVisit={handleScheduleVisitFromCard} />
          )}
          {activeTab === 'appointments' && (
            <Appointments initialProperty={selectedPropertyForVisit} />
          )}
          {activeTab === 'call-history' && <CallHistory />}
          {activeTab === 'settings' && <Settings darkMode={darkMode} setDarkMode={setDarkMode} />}
        </main>
      </div>
    </div>
  );
}
