import React from 'react';
import { Sun, Moon, MapPin, Sparkles } from 'lucide-react';

export default function Navbar({ activeTabTitle, darkMode, setDarkMode }) {
  return (
    <header className="h-20 bg-[#FFFDF5] border-b-2 border-[#111111] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-10 select-none">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-black text-[#111111] tracking-tight uppercase">
            {activeTabTitle}
          </h1>
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#111111] font-bold mt-0.5 flex items-center gap-2">
            <span className="bg-[#FFDE59] px-2 py-0.5 border border-[#111111] rounded-sm text-[10px]">
              DreamSpace Realty
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#111111]">
              <MapPin className="w-3 h-3 text-[#111111]" />
              Bengaluru, KA
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="neo-btn bg-white px-3.5 py-1.5 text-xs text-[#111111] flex items-center gap-2"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-[#FFDE59]" />
              <span className="hidden sm:inline font-mono">LIGHT</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#111111]" />
              <span className="hidden sm:inline font-mono">DARK</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
