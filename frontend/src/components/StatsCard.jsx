import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon, badge, trend }) {
  return (
    <div className="bento-card p-6 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#737373] font-semibold">
            {title}
          </span>
          {badge && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20 font-bold">
              {badge}
            </span>
          )}
        </div>

        <div className="font-heading text-3xl sm:text-4xl font-bold text-[#171717] mt-3 tracking-tight flex items-baseline gap-2">
          <span>{value}</span>
          {trend && (
            <span className="font-mono text-xs font-semibold text-[#14532D] bg-[#E2F1E7] px-1.5 py-0.5 rounded-md">
              {trend}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <div className="font-sans text-xs text-[#737373] mt-4 flex items-center justify-between pt-3 border-t border-[#D6CDBB]/50">
          <span className="truncate">{subtitle}</span>
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-[#F5F2E9] border border-[#D6CDBB] flex items-center justify-center flex-shrink-0 text-[#14532D] group-hover:border-[#14532D] transition-colors">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
