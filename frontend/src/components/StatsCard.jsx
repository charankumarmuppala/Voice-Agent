import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon, badge, bg = 'bg-white', accent = 'bg-[#FFDE59]' }) {
  return (
    <div className={`neo-card-interactive ${bg} p-5 flex flex-col justify-between group`}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111] font-bold">
            {title}
          </span>
          {badge && (
            <span className={`neo-badge ${accent} text-[#111111]`}>
              {badge}
            </span>
          )}
        </div>

        <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111] mt-3 tracking-tight">
          {value}
        </div>
      </div>

      {subtitle && (
        <div className="font-sans text-xs font-semibold text-[#111111]/80 mt-4 flex items-center justify-between pt-3 border-t-2 border-[#111111]">
          <span className="truncate">{subtitle}</span>
          {Icon && (
            <div className="w-7 h-7 rounded-sm bg-[#FFFDF5] border-2 border-[#111111] flex items-center justify-center flex-shrink-0 text-[#111111] shadow-[1.5px_1.5px_0px_#111111]">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
