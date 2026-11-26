import React from 'react';
import {
  LayoutDashboard,
  Mic,
  Building2,
  Users,
  CalendarCheck,
  History,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PhoneCall,
  Sun,
  Moon
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed, darkMode, setDarkMode }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'voice-agent', label: 'AI Voice Simulator', icon: Mic, badge: 'LIVE' },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'leads', label: 'Leads CRM', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
    { id: 'call-history', label: 'Call History', icon: History },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside
      className={`bg-[#FFFCF7] border-r border-[#D6CDBB] transition-all duration-300 flex flex-col justify-between select-none z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-20 flex items-center px-4 border-b border-[#D6CDBB] justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-[#14532D] flex items-center justify-center text-white flex-shrink-0 border border-[#14532D] shadow-sm">
              <Building2 className="w-5 h-5 text-[#E2F1E7]" />
            </div>
            {!collapsed && (
              <div className="leading-tight truncate">
                <div className="font-heading font-bold text-base text-[#171717] flex items-center gap-1.5 tracking-tight">
                  EstateVoice <span className="font-mono text-[9px] uppercase tracking-wider bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20 font-bold px-1.5 py-0.5 rounded-full">AI</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373] font-semibold mt-0.5">DreamSpace Realty</div>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-xl border border-[#D6CDBB] text-[#737373] hover:text-[#171717] hover:border-[#14532D] hover:bg-[#F5F2E9] transition-all cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#14532D] text-white font-semibold border border-[#14532D] shadow-[2px_2px_0px_#D6CDBB]'
                    : 'text-[#737373] hover:bg-[#F5F2E9] hover:text-[#171717] border border-transparent hover:border-[#D6CDBB]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-[#E2F1E7]' : 'text-[#737373]'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate flex-1 text-left font-sans font-medium">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-[#E2F1E7] text-[#14532D]' : 'bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Info & Theme Toggle */}
      <div className="p-3 border-t border-[#D6CDBB] space-y-2">
        {!collapsed ? (
          <>
            <div className="bg-[#F5F2E9] rounded-2xl p-3 border border-[#D6CDBB] text-xs">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#14532D] font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#14532D]" />
                  Gemini Sales AI
                </span>
                <span className="w-2 h-2 rounded-full bg-[#14532D] animate-pulse" />
              </div>
              <p className="font-sans text-[#737373] text-[11px] leading-relaxed">
                Autonomous voice agent & SQLite CRM connected.
              </p>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#D6CDBB] bg-[#F5F2E9] text-[#171717] font-mono text-xs font-semibold hover:border-[#14532D] transition-all cursor-pointer"
              title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              <span className="flex items-center gap-2">
                {darkMode ? <Sun className="w-3.5 h-3.5 text-[#FCD34D]" /> : <Moon className="w-3.5 h-3.5 text-[#14532D]" />}
                <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-[#737373]">{darkMode ? 'Dark' : 'Light'}</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 mx-auto rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB] flex items-center justify-center text-[#14532D] hover:border-[#14532D] transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-[#FCD34D]" /> : <Moon className="w-4 h-4 text-[#14532D]" />}
          </button>
        )}
      </div>
    </aside>
  );
}
