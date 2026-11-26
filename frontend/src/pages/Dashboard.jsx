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
  AlertCircle,
  Activity,
  Compass,
  Clock
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
    <div className="p-6 sm:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#171717] tracking-tight">
              Executive Dashboard
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20 font-bold">
              Real-time
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-[#737373] mt-1 font-normal">
            DreamSpace Realty • Autonomous Conversational Sales Operations & Pipeline Intelligence
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] font-mono text-[11px] text-[#171717] font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#14532D] animate-pulse" />
            <span className="uppercase tracking-wider">Pipeline Synced</span>
          </div>
          <button
            onClick={() => loadDashboardData(true)}
            className="p-2 rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] text-[#737373] hover:text-[#171717] hover:border-[#14532D] transition-colors cursor-pointer shadow-sm"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFF1CC] border border-[#E5D8A8] text-[#854D0E] px-4 py-3 rounded-2xl text-xs flex items-center justify-between font-medium">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </span>
          <button onClick={() => loadDashboardData(true)} className="font-bold underline ml-2 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* 4 Spacious KPI Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Catalogued Homes"
          value={stats ? stats.total_properties : 30}
          subtitle="Verified Bengaluru portfolio"
          icon={Building2}
          badge="Ground Truth"
        />

        <StatsCard
          title="Qualified Leads"
          value={crmStats.leads}
          subtitle={crmStats.leads === 0 ? "Listening for inquiries" : "Extracted buyer profiles"}
          icon={Users}
          badge="CRM Active"
        />

        <StatsCard
          title="Scheduled Visits"
          value={crmStats.appointments}
          subtitle={crmStats.appointments === 0 ? "Awaiting first booking" : "Confirmed site passes"}
          icon={CalendarCheck}
          badge="Brochures Sent"
        />

        <StatsCard
          title="Voice Inquiries"
          value={crmStats.calls}
          subtitle={crmStats.calls === 0 ? "Ready to simulate" : "Conversational sessions"}
          icon={PhoneCall}
          badge="Gemini Multimodal"
        />
      </div>

      {/* Bento Grid: Hero Action Banner + Live Operations Matrix */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Hero Bento Banner (8 columns) */}
        <div className="col-span-12 lg:col-span-8 bento-card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#FFFCF7] to-[#F5F2E9]/70">
          <div className="max-w-xl relative z-10">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#14532D] font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>EstateVoice AI • Conversational Lead Qualification</span>
            </div>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-[#171717] tracking-tight leading-snug">
              Autonomous Real Estate Voice Agent for Bengaluru
            </h3>
            <p className="font-sans text-xs sm:text-sm text-[#737373] mt-2 leading-relaxed">
              Speaks English, Kannada, and Hindi. Extracts buyer requirements, conducts real-time FAISS semantic search across 30+ developments, books site visits, and instantly dispatches vector PDF brochures.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 relative z-10">
            <button
              onClick={() => setActiveTab('voice-agent')}
              className="btn-forest px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <PhoneCall className="w-4 h-4 text-[#E2F1E7]" />
              Launch Voice Simulator
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className="btn-secondary px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Building2 className="w-4 h-4 text-[#14532D]" />
              Explore 30 Properties
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className="btn-secondary px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <CalendarCheck className="w-4 h-4 text-[#14532D]" />
              View Site Passes
            </button>
          </div>
        </div>

        {/* Right Live Operational Matrix Bento (4 columns) */}
        <div className="col-span-12 lg:col-span-4 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-heading text-sm font-bold text-[#171717] tracking-tight">
                Operational Metrics
              </span>
              <span className="font-mono text-[10px] uppercase font-bold text-[#14532D] bg-[#E2F1E7] px-2 py-0.5 rounded-full border border-[#14532D]/20">
                SaaS CRM
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-[#D6CDBB]/40">
                <span className="font-sans text-[#737373] font-medium">Conversion Rate</span>
                <span className="font-mono text-sm font-bold text-[#171717]">
                  {crmStats.leads > 0 ? `${Math.round((crmStats.appointments / crmStats.leads) * 100)}%` : '0.0%'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b border-[#D6CDBB]/40">
                <span className="font-sans text-[#737373] font-medium">Average Property Price</span>
                <span className="font-mono text-sm font-bold text-[#171717]">
                  {stats ? formatINR(stats.avg_price) : '₹1.85 Cr'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b border-[#D6CDBB]/40">
                <span className="font-sans text-[#737373] font-medium">Micro-Market Zones</span>
                <span className="font-mono text-sm font-bold text-[#171717]">
                  {stats ? `${stats.locations_count} Core Corridors` : '5 Corridors'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-sans text-[#737373] font-medium">Ready-to-Move Ratio</span>
                <span className="font-mono text-sm font-bold text-[#14532D]">
                  {stats && stats.total_properties > 0 ? `${Math.round((stats.ready_to_move / stats.total_properties) * 100)}%` : '60%'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#D6CDBB]/40 flex items-center justify-between text-[11px] font-mono text-[#737373]">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#14532D]" />
              Response Latency: &lt; 1.2s
            </span>
            <span className="text-[#14532D] font-bold">FAISS Active</span>
          </div>
        </div>
      </div>

      {/* Bento Grid: Inventory Analytics (Micro-Markets & BHK Spread) */}
      <div className="grid grid-cols-12 gap-5">
        {/* Micro-Markets Bar Chart (8 columns) */}
        <div className="col-span-12 lg:col-span-8 bento-card p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="font-heading font-bold text-[#171717] text-base tracking-tight">
                Inventory Volume by Micro-Market
              </h4>
              <p className="font-sans text-xs text-[#737373] mt-0.5">
                Ground-truth property concentration across Whitefield, Sarjapur, Electronic City, and Hebbal
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#14532D] bg-[#E2F1E7] px-2.5 py-1 rounded-full border border-[#14532D]/20">
              Live SQLite Data
            </span>
          </div>

          <div className="h-64 w-full">
            {locationChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-[#737373] uppercase tracking-wider">
                No location records in database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE9DC" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#171717', fontFamily: 'Space Grotesk' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#737373', fontFamily: 'IBM Plex Mono' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val, name) => [val, name === 'properties' ? 'Units Listed' : name]}
                    contentStyle={{ backgroundColor: '#FFFCF7', borderRadius: '16px', border: '1px solid #D6CDBB', fontSize: '12px', fontFamily: 'Inter' }}
                  />
                  <Bar dataKey="properties" fill="#14532D" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* BHK Configuration Donut Chart (4 columns) */}
        <div className="col-span-12 lg:col-span-4 bento-card p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-heading font-bold text-[#171717] text-base tracking-tight">
                  BHK Configuration
                </h4>
                <p className="font-sans text-xs text-[#737373] mt-0.5">Distribution by apartment size</p>
              </div>
            </div>

            <div className="h-44 w-full flex items-center justify-center">
              {bhkChartData.length === 0 ? (
                <div className="font-mono text-xs text-[#737373] uppercase tracking-wider">No BHK records.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bhkChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={72}
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

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-[#D6CDBB]/40">
            {bhkChartData.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="font-sans text-[#737373] truncate">{item.name}:</span>
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
            <h3 className="font-heading text-lg sm:text-xl font-bold text-[#171717] tracking-tight">
              Featured Verified Developments
            </h3>
            <p className="font-sans text-xs text-[#737373]">
              Ground-truth inventory indexed in FAISS vector database
            </p>
          </div>
          <button
            onClick={() => setActiveTab('properties')}
            className="font-heading text-xs font-bold text-[#14532D] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Browse all 30 properties <ArrowUpRight className="w-3.5 h-3.5" />
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
