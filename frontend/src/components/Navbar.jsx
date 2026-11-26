import React, { useEffect, useState } from 'react';
import { MapPin, Server, Activity, PhoneCall, Globe2 } from 'lucide-react';
import { fetchHealth } from '../services/api';

export default function Navbar({ activeTabTitle }) {
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', service: '' });

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkStatus() {
    const data = await fetchHealth();
    setBackendHealth(data);
  }

  const isHealthy = backendHealth.status === 'healthy';

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

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Location badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] font-mono text-[11px] uppercase tracking-wider text-[#171717] font-semibold">
          <MapPin className="w-3.5 h-3.5 text-[#14532D]" />
          <span>Bangalore, KA</span>
        </div>

        {/* Backend status indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-[11px] uppercase tracking-wider font-bold border ${
            isHealthy
              ? 'bg-[#E2F1E7] border-[#14532D]/20 text-[#14532D]'
              : 'bg-[#FFF1CC] border-[#E5D8A8] text-[#854D0E]'
          }`}
          title={`Backend status: ${backendHealth.status || 'offline'} (FastAPI)`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isHealthy ? 'bg-[#14532D]' : 'bg-[#D97706]'
            }`}
          />
          <span className="hidden md:inline">SYSTEM:</span>
          <span>{isHealthy ? 'ONLINE' : 'BOOTING'}</span>
        </div>

        {/* Agent ready badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14532D] text-white font-mono text-[11px] uppercase tracking-wider font-bold border border-[#14532D]">
          <PhoneCall className="w-3.5 h-3.5 text-[#E2F1E7]" />
          <span>ESTATEVOICE READY</span>
        </div>
      </div>
    </header>
  );
}
