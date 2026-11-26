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
    { id: 'voice-agent', label: 'AI Voice Agent', icon: Mic, badge: 'LIVE' },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'leads', label: 'Leads CRM', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
    { id: 'call-history', label: 'Call History', icon: History },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside
      className={`bg-[#FFFDF5] dark:bg-[#181818] border-r-2 border-[#111111] dark:border-[#E5E5E5] transition-all duration-200 flex flex-col justify-between select-none z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-20 flex items-center px-4 border-b-2 border-[#111111] dark:border-[#E5E5E5] justify-between bg-[#FFFDF5] dark:bg-[#181818] transition-colors">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-md bg-[#FFDE59] flex items-center justify-center text-[#111111] flex-shrink-0 border-2 border-[#111111] dark:border-[#E5E5E5] shadow-neo-sm dark:shadow-[2px_2px_0px_#E5E5E5]">
              <Building2 className="w-5 h-5 text-[#111111]" />
            </div>
            {!collapsed && (
              <div className="leading-tight truncate">
                <div className="font-heading font-black text-lg text-[#111111] dark:text-[#F5F5F5] flex items-center gap-1.5 tracking-tight">
                  EstateVoice <span className="font-mono text-[9px] uppercase tracking-wider bg-[#B4A7FF] text-[#111111] border border-[#111111] dark:border-[#E5E5E5] font-black px-1.5 py-0.2 rounded-sm shadow-[1px_1px_0px_#111111] dark:shadow-[1px_1px_0px_#E5E5E5]">AI</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#111111] dark:text-[#B3B3B3] font-bold mt-0.5">
                  Autonomous Broker
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="neo-btn bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:text-[#F5F5F5] p-1 text-[#111111]"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4 text-[#111111] dark:text-[#F5F5F5]" /> : <ChevronLeft className="w-4 h-4 text-[#111111] dark:text-[#F5F5F5]" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-[#FFDE59] text-[#111111] font-black border-2 border-[#111111] dark:border-[#E5E5E5] shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#E5E5E5] translate-x-[-1px] translate-y-[-1px]'
                    : 'text-[#111111] dark:text-[#F5F5F5] font-bold hover:bg-[#B4A7FF] hover:text-[#111111] dark:hover:bg-[#B4A7FF] dark:hover:text-[#111111] hover:border-2 hover:border-[#111111] dark:hover:border-[#E5E5E5] hover:shadow-[2px_2px_0px_#111111] dark:hover:shadow-[2px_2px_0px_#E5E5E5] border-2 border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-[#111111]' : 'text-[#111111] dark:text-[#F5F5F5] group-hover:text-[#111111]'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate flex-1 text-left font-heading font-bold text-xs uppercase tracking-tight">
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-black border border-[#111111] dark:border-[#E5E5E5] bg-[#B8F4B8] text-[#111111] shadow-[1px_1px_0px_#111111] dark:shadow-[1px_1px_0px_#E5E5E5]"
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Info */}
      <div className="p-3 border-t-2 border-[#111111] dark:border-[#E5E5E5] space-y-2 bg-[#FFFDF5] dark:bg-[#181818] transition-colors">
        {!collapsed ? (
          <>
            <div className="bg-[#B8F4B8] rounded-md p-3 border-2 border-[#111111] dark:border-[#E5E5E5] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5] text-xs">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#111111] font-black mb-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#111111]" />
                  Gemini Sales AI
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#111111] animate-pulse" />
              </div>
              <p className="font-sans text-[#111111] text-[11px] font-semibold leading-relaxed">
                Autonomous voice agent & SQLite CRM connected.
              </p>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="neo-btn bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:text-[#F5F5F5] w-full py-1.5 px-3 flex items-center justify-between text-xs font-mono font-bold text-[#111111]"
              title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              <span className="flex items-center gap-2">
                {darkMode ? <Sun className="w-3.5 h-3.5 text-[#FFDE59]" /> : <Moon className="w-3.5 h-3.5 text-[#111111]" />}
                <span className="text-[#111111] dark:text-[#F5F5F5]">{darkMode ? 'LIGHT' : 'DARK'}</span>
              </span>
              <span className="text-[10px] uppercase font-black text-[#111111] dark:text-[#FFDE59]">{darkMode ? 'ON' : 'OFF'}</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="neo-btn bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:text-[#F5F5F5] w-10 h-10 mx-auto flex items-center justify-center text-[#111111]"
            title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-[#FFDE59]" /> : <Moon className="w-4 h-4 text-[#111111]" />}
          </button>
        )}
      </div>
    </aside>
  );
}
