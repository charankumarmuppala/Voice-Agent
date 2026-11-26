import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon, badge, color, bg = 'bg-white', accent = 'bg-[#FFDE59]' }) {
  // If color was passed as prop (e.g. from Dashboard), use it for badge accent
  const badgeColor = color || accent;

  return (
    <div className={`neo-card-interactive bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] p-5 flex flex-col justify-between group transition-colors`}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111] dark:text-[#B3B3B3] font-bold">
            {title}
          </span>
          {badge && (
            <span className={`neo-badge ${badgeColor} text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] font-black`}>
              {badge}
            </span>
          )}
        </div>

        <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111] dark:text-[#F5F5F5] mt-3 tracking-tight">
          {value}
        </div>
      </div>

      {subtitle && (
        <div className="font-sans text-xs font-semibold text-[#111111]/80 dark:text-[#A3A3A3] mt-4 flex items-center justify-between pt-3 border-t-2 border-[#111111] dark:border-[#E5E5E5]">
          <span className="truncate">{subtitle}</span>
          {Icon && (
            <div className="w-7 h-7 rounded-sm bg-[#FFFDF5] dark:bg-[#181818] border-2 border-[#111111] dark:border-[#E5E5E5] flex items-center justify-center flex-shrink-0 text-[#111111] dark:text-[#FFDE59] shadow-[1.5px_1.5px_0px_#111111] dark:shadow-[1.5px_1.5px_0px_#E5E5E5]">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
