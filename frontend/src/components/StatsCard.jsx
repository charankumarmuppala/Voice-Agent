import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon, badge }) {
  return (
    <div className="bg-[#FFFCF7] p-6 rounded-3xl border border-[#D6CDBB] shadow-none flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60 font-semibold">{title}</span>
          {badge && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20 font-bold">
              {badge}
            </span>
          )}
        </div>
        <div className="font-heading text-4xl sm:text-5xl font-bold text-[#171717] mt-3 tracking-tight">
          {value}
        </div>
      </div>

      {subtitle && (
        <div className="font-sans text-xs text-[#171717]/60 mt-3 flex items-center justify-between pt-2 border-t border-[#D6CDBB]/40">
          <span>{subtitle}</span>
          {Icon && <Icon className="w-4 h-4 text-[#14532D]/60 flex-shrink-0" />}
        </div>
      )}
    </div>
  );
}
