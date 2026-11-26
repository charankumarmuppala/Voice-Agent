import React, { useEffect, useState } from 'react';
import {
  Building2,
  TrendingUp,
  MapPin,
  CalendarCheck,
  Users,
  PhoneCall,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import StatsCard from '../components/StatsCard';
import PropertyCard from '../components/PropertyCard';
import {
  fetchPropertyStats,
  fetchProperties,
  fetchAppointments,
  fetchLeads,
  fetchCalls,
  formatINR
} from '../services/api';

const COLORS = ['#14532D', '#10B981', '#059669', '#34D399', '#6ee7b7', '#047857'];

export default function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [recentProperties, setRecentProperties] = useState([]);
  const [crmStats, setCrmStats] = useState({ leads: 0, appointments: 0, calls: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh stats when window receives focus and periodically every 8s
    const handleFocus = () => loadDashboardData(false);
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(() => loadDashboardData(false), 8000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  async function loadDashboardData(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const [statsData, propsData, apptsData, leadsData, callsData] = await Promise.all([
        fetchPropertyStats(),
        fetchProperties({ page_size: 4 }),
        fetchAppointments().catch(() => []),
        fetchLeads().catch(() => []),
        fetchCalls().catch(() => [])
      ]);
      setStats(statsData);
      setRecentProperties(propsData.properties || []);
      setCrmStats({
        appointments: Array.isArray(apptsData) ? apptsData.length : 0,
        leads: Array.isArray(leadsData) ? leadsData.length : 0,
        calls: Array.isArray(callsData) ? callsData.length : 0
      });
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (showLoading) setError('Unable to fetch live database records. Ensure backend is running.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  // Location data prepared for BarChart
  const locationChartData = (stats?.location_distribution || []).map((loc) => ({
    name: loc.location,
    properties: loc.count,
    avgPrice: Math.round(loc.avg_price / 100000), // In Lakhs
  }));

  // BHK data for PieChart
  const bhkChartData = (stats?.bhk_distribution || []).map((b) => ({
    name: `${b.bhk} BHK`,
    value: b.count,
  }));

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header matching reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#171717] tracking-tight">
            Executive Dashboard
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#171717]/60 mt-1">
            DreamSpace Realty • Multilingual AI Sales Operations & Real-Time Pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20 font-bold flex items-center gap-1.5 shadow-none">
            <span className="w-2 h-2 rounded-full bg-[#14532D] animate-pulse" />
            LIVE PIPELINE SYNC
          </span>
          <button
            onClick={() => loadDashboardData(true)}
            className="p-2.5 rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] text-[#171717]/60 hover:text-[#171717] hover:bg-[#F5F2E9] transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFF1CC] border border-[#E5D8A8] text-[#854D0E] px-4 py-3 rounded-2xl text-xs flex items-center justify-between font-medium">
          <span>{error}</span>
          <button onClick={() => loadDashboardData(true)} className="font-bold underline ml-2">Retry</button>
        </div>
      )}

      {/* 4 Spacious KPI Cards in a row matching reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Properties Catalogued"
          value={stats ? stats.total_properties : 30}
          subtitle="Active Bangalore inventory"
          icon={Building2}
          badge="Verified"
        />

        <StatsCard
          title="Total Leads"
          value={crmStats.leads}
          subtitle={crmStats.leads === 0 ? "No leads recorded yet" : "Extracted buyer prospects"}
          icon={Users}
          badge="SQLite CRM"
        />

        <StatsCard
          title="Scheduled Visits"
          value={crmStats.appointments}
          subtitle={crmStats.appointments === 0 ? "No visits scheduled yet" : "Confirmed site walkthroughs"}
          icon={CalendarCheck}
          badge="Site Visits"
        />

        <StatsCard
          title="Voice Inquiries"
          value={crmStats.calls}
          subtitle={crmStats.calls === 0 ? "No calls completed yet" : "Total voice calls logged"}
          icon={PhoneCall}
          badge="Gemini AI"
        />
      </div>

      {/* Pastel Yellow Highlight Card matching reference image */}
      <div className="bg-[#FFF1CC] border border-[#E5D8A8] rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[#854D0E] font-bold mb-1">
            ESTATEVOICE AI • LIVE OPERATION
          </div>
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">
            Turning conversations into verified property walkthroughs
          </h3>
          <p className="font-sans text-xs sm:text-sm text-[#171717]/75 mt-1.5 leading-relaxed">
            Multilingual real estate voice assistant for Bangalore. Recommends verified properties, qualifies prospective buyers, and books visits directly to SQLite.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('voice-agent')}
              className="px-5 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#1e7842] text-white font-heading text-xs font-bold transition-all flex items-center gap-2 border border-[#14532D] cursor-pointer shadow-none"
            >
              <PhoneCall className="w-4 h-4 text-[#E2F1E7]" />
              Start Voice Conversation
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className="px-5 py-2.5 rounded-xl bg-[#FFFCF7] hover:bg-[#F5F2E9] text-[#171717] font-heading text-xs font-bold transition-all border border-[#D6CDBB] flex items-center gap-2 cursor-pointer shadow-none"
            >
              <Building2 className="w-4 h-4 text-[#14532D]" />
              Browse 30 Properties
            </button>
          </div>
        </div>

        <div className="lg:border-l lg:border-[#E5D8A8] lg:pl-8 space-y-3 min-w-[220px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-sans text-[#171717]/70 font-medium">Conversion Rate</span>
            <span className="font-heading text-base font-bold text-[#171717]">
              {crmStats.leads > 0 ? `${Math.round((crmStats.appointments / crmStats.leads) * 100)}%` : '0.0%'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-sans text-[#171717]/70 font-medium">Avg Property Value</span>
            <span className="font-heading text-base font-bold text-[#171717]">
              {stats ? formatINR(stats.avg_price) : '₹1.85 Cr'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-sans text-[#171717]/70 font-medium">Active Micro-Markets</span>
            <span className="font-heading text-base font-bold text-[#171717]">
              {stats ? `${stats.locations_count} Zones` : '5 Zones'}
            </span>
          </div>
        </div>
      </div>

      {/* Inventory Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Locations Bar Chart */}
        <div className="lg:col-span-2 bg-[#FFFCF7] p-6 sm:p-7 rounded-3xl border border-[#D6CDBB] shadow-none">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-heading font-bold text-[#171717] text-base tracking-tight">Inventory by Micro-Market</h4>
              <p className="font-sans text-xs text-[#171717]/60 mt-0.5">Bangalore property distribution and volume</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#14532D] bg-[#E2F1E7] px-2.5 py-1 rounded-full border border-[#14532D]/20">
              Live DB Stats
            </span>
          </div>

          <div className="h-64 w-full">
            {locationChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-[#171717]/40 uppercase tracking-wider">
                No location records in database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE9DC" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#171717', fontFamily: 'Space Grotesk' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#171717', fontFamily: 'IBM Plex Mono' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val, name) => [val, name === 'properties' ? 'Properties' : name]}
                    contentStyle={{ backgroundColor: '#FFFCF7', borderRadius: '16px', border: '1px solid #D6CDBB', fontSize: '12px', fontFamily: 'Inter' }}
                  />
                  <Bar dataKey="properties" fill="#14532D" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* BHK Distribution Donut Chart */}
        <div className="bg-[#FFFCF7] p-6 sm:p-7 rounded-3xl border border-[#D6CDBB] shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-heading font-bold text-[#171717] text-base tracking-tight">BHK Configuration</h4>
                <p className="font-sans text-xs text-[#171717]/60 mt-0.5">Inventory spread by room configuration</p>
              </div>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              {bhkChartData.length === 0 ? (
                <div className="font-mono text-xs text-[#171717]/40 uppercase tracking-wider">No BHK records.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bhkChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {bhkChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} Units`, 'Count']}
                      contentStyle={{ backgroundColor: '#FFFCF7', borderRadius: '16px', border: '1px solid #D6CDBB', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-[#D6CDBB]/50">
            {bhkChartData.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="font-sans text-[#171717]/70 truncate">{item.name}:</span>
                <span className="font-mono font-bold text-[#171717] ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Properties Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-[#171717] tracking-tight">Verified Bangalore Properties</h3>
            <p className="font-sans text-xs text-[#171717]/60">Direct ground truth from SQLite database</p>
          </div>
          <button
            onClick={() => setActiveTab('properties')}
            className="font-heading text-xs font-bold text-[#14532D] hover:underline flex items-center gap-1 cursor-pointer"
          >
            View all 30 properties <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {recentProperties.map((prop) => (
            <PropertyCard
              key={prop.id}
              property={prop}
              onScheduleVisit={() => setActiveTab('appointments')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
