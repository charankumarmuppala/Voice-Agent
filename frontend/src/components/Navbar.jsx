import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function Navbar({ activeTabTitle, darkMode, setDarkMode }) {
  return (
    <header className="h-20 bg-[#FFFCF7] border-b border-[#D6CDBB] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-10 transition-colors">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">{activeTabTitle}</h1>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60 font-semibold mt-0.5">
            DreamSpace Realty <span className="text-[#D6CDBB]">•</span> Bangalore Real Estate
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-[#D6CDBB] bg-[#F5F2E9] text-[#171717] font-mono text-xs font-semibold hover:border-[#14532D] transition-all cursor-pointer shadow-none"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-[#FCD34D]" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#14532D]" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
