import React from 'react';

export default function Navbar({ activeTabTitle }) {
  return (
    <header className="h-20 bg-[#FFFCF7] border-b border-[#D6CDBB] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">{activeTabTitle}</h1>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60 font-semibold mt-0.5">
            DreamSpace Realty <span className="text-[#D6CDBB]">•</span> Bangalore Real Estate
          </p>
        </div>
      </div>
    </header>
  );
}
