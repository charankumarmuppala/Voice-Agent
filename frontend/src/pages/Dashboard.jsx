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

const COLORS = ['#FFDE59', '#B4A7FF', '#B8F4B8', '#FF8A80', '#A6E1FA', '#FFC0CB'];

export default function Dashboard({ setActiveTab, darkMode }) {
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
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#111111] dark:text-[#F5F5F5] tracking-tight">
              Executive Dashboard
            </h2>
            <span className="neo-badge bg-[#FFDE59] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] font-black">
              Real-time
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-[#111111]/70 dark:text-[#B3B3B3] mt-1 font-medium">
            DreamSpace Properties • Autonomous Conversational Sales Operations & Pipeline Intelligence
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="neo-card bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[3px_3px_0px_#E5E5E5] px-3 py-1.5 flex items-center gap-2 font-mono text-[11px] text-[#111111] dark:text-[#F5F5F5] font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B8F4B8] border border-[#111111] dark:border-[#E5E5E5] animate-pulse" />
            <span className="uppercase tracking-wider">Pipeline Synced</span>
          </div>
          <button
            onClick={() => loadDashboardData(true)}
            className="neo-btn neo-btn-white dark:bg-[#1E1E1E] dark:text-[#F5F5F5] dark:border-[#E5E5E5] p-2.5"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4 text-[#111111] dark:text-[#F5F5F5]" />
          </button>
        </div>
      </div>

      {error && (
        <div className="neo-card bg-[#FF8A80]/20 dark:bg-[#FF8A80]/30 border-2 border-[#111111] dark:border-[#E5E5E5] text-[#111111] dark:text-[#F5F5F5] px-4 py-3 text-xs flex items-center justify-between font-bold">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#111111] dark:text-[#F5F5F5]" />
            {error}
          </span>
          <button onClick={() => loadDashboardData(true)} className="underline ml-2 cursor-pointer uppercase tracking-wider font-mono">
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
          color="bg-[#FFDE59]"
        />

        <StatsCard
          title="Qualified Leads"
          value={crmStats.leads}
          subtitle={crmStats.leads === 0 ? "Listening for inquiries" : "Extracted buyer profiles"}
          icon={Users}
          badge="CRM Active"
          color="bg-[#B4A7FF]"
        />

        <StatsCard
          title="Scheduled Visits"
          value={crmStats.appointments}
          subtitle={crmStats.appointments === 0 ? "Awaiting first booking" : "Confirmed site passes"}
          icon={CalendarCheck}
          badge="Brochures Sent"
          color="bg-[#B8F4B8]"
        />

        <StatsCard
          title="Voice Inquiries"
          value={crmStats.calls}
          subtitle={crmStats.calls === 0 ? "Ready to simulate" : "Conversational sessions"}
          icon={PhoneCall}
          badge="Gemini Multimodal"
          color="bg-[#FFFDF5] dark:bg-[#181818]"
        />
      </div>

      {/* Bento Grid: Hero Action Banner + Live Operations Matrix */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Hero Bento Banner (8 columns) */}
        <div className="col-span-12 lg:col-span-8 neo-card p-6 sm:p-8 flex flex-col justify-between relative bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] transition-colors">
          <div className="max-w-xl relative z-10">
            <div className="neo-badge bg-[#FFDE59] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] inline-flex items-center gap-1.5 mb-3 font-black">
              <Sparkles className="w-3.5 h-3.5 text-[#111111]" />
              <span>EstateVoice AI • Conversational Lead Qualification</span>
            </div>
            <h3 className="font-heading text-xl sm:text-2xl font-black text-[#111111] dark:text-[#F5F5F5] tracking-tight leading-snug">
              Autonomous Real Estate Voice Agent for Bengaluru
            </h3>
            <p className="font-sans text-xs sm:text-sm text-[#111111]/80 dark:text-[#B3B3B3] mt-2 leading-relaxed font-medium">
              Speaks English, Kannada, and Hindi. Extracts buyer requirements, conducts real-time FAISS semantic search across 30+ developments, books site visits, and instantly dispatches vector PDF brochures.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 relative z-10">
            <button
              onClick={() => setActiveTab('voice-agent')}
              className="neo-btn neo-btn-yellow px-5 py-2.5 text-xs font-bold gap-2"
            >
              <PhoneCall className="w-4 h-4 text-[#111111]" />
              Launch Voice Simulator
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className="neo-btn neo-btn-white dark:bg-[#181818] dark:text-[#F5F5F5] dark:border-[#E5E5E5] px-5 py-2.5 text-xs font-bold gap-2"
            >
              <Building2 className="w-4 h-4 text-[#111111] dark:text-[#FFDE59]" />
              Explore 30 Properties
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className="neo-btn neo-btn-purple px-5 py-2.5 text-xs font-bold gap-2"
            >
              <CalendarCheck className="w-4 h-4 text-[#111111]" />
              View Site Passes
            </button>
          </div>
        </div>

        {/* Right Live Operational Matrix Bento (4 columns) */}
        <div className="col-span-12 lg:col-span-4 neo-card p-6 flex flex-col justify-between bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-heading text-sm font-extrabold text-[#111111] dark:text-[#F5F5F5] tracking-tight">
                Operational Metrics
              </span>
              <span className="neo-badge bg-[#B4A7FF] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] font-black">
                SaaS CRM
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs pb-3 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/15">
                <span className="font-sans text-[#111111]/70 dark:text-[#B3B3B3] font-semibold">Conversion Rate</span>
                <span className="font-mono text-sm font-extrabold text-[#111111] dark:text-[#F5F5F5]">
                  {crmStats.leads > 0 ? `${Math.round((crmStats.appointments / crmStats.leads) * 100)}%` : '0.0%'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/15">
                <span className="font-sans text-[#111111]/70 dark:text-[#B3B3B3] font-semibold">Average Property Price</span>
                <span className="font-mono text-sm font-extrabold text-[#111111] dark:text-[#F5F5F5]">
                  {stats ? formatINR(stats.avg_price) : '₹1.85 Cr'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/15">
                <span className="font-sans text-[#111111]/70 dark:text-[#B3B3B3] font-semibold">Micro-Market Zones</span>
                <span className="font-mono text-sm font-extrabold text-[#111111] dark:text-[#F5F5F5]">
                  {stats ? `${stats.locations_count} Core Corridors` : '5 Corridors'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-sans text-[#111111]/70 dark:text-[#B3B3B3] font-semibold">Ready-to-Move Ratio</span>
                <span className="font-mono text-sm font-extrabold text-[#111111] dark:text-[#FFDE59]">
                  {stats && stats.total_properties > 0 ? `${Math.round((stats.ready_to_move / stats.total_properties) * 100)}%` : '60%'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t-2 border-[#111111] dark:border-[#E5E5E5] flex items-center justify-between text-[11px] font-mono text-[#111111] dark:text-[#F5F5F5] font-bold">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFDE59]" />
              Response Latency: &lt; 1.2s
            </span>
            <span className="neo-badge bg-[#B8F4B8] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] px-1.5 py-0.5 font-black">FAISS Active</span>
          </div>
        </div>
      </div>

      {/* Bento Grid: Inventory Analytics (Micro-Markets & BHK Spread) */}
      <div className="grid grid-cols-12 gap-5">
        {/* Micro-Markets Bar Chart (8 columns) */}
        <div className="col-span-12 lg:col-span-8 neo-card p-6 sm:p-7 bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] transition-colors">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="font-heading font-extrabold text-[#111111] dark:text-[#F5F5F5] text-base tracking-tight">
                Inventory Volume by Micro-Market
              </h4>
              <p className="font-sans text-xs text-[#111111]/70 dark:text-[#B3B3B3] mt-0.5 font-medium">
                Ground-truth property concentration across Whitefield, Sarjapur, Electronic City, and Hebbal
              </p>
            </div>
            <span className="neo-badge bg-[#FFDE59] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] font-black">
              Live SQLite Data
            </span>
          </div>

          <div className="h-64 w-full">
            {locationChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-[#111111]/60 dark:text-[#A3A3A3] uppercase tracking-wider font-bold">
                No location records in database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#E5E5E5' : '#111111'} strokeOpacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: darkMode ? '#F5F5F5' : '#111111', fontFamily: 'Space Grotesk', fontWeight: 600 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: darkMode ? '#B3B3B3' : '#111111', fontFamily: 'IBM Plex Mono', fontWeight: 600 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val, name) => [val, name === 'properties' ? 'Units Listed' : name]}
                    contentStyle={{
                      backgroundColor: darkMode ? '#1E1E1E' : '#FFFFFF',
                      borderRadius: '6px',
                      border: darkMode ? '2px solid #E5E5E5' : '2px solid #111111',
                      boxShadow: darkMode ? '3px 3px 0px #E5E5E5' : '3px 3px 0px #111111',
                      fontSize: '12px',
                      fontFamily: 'Inter',
                      fontWeight: 600,
                      color: darkMode ? '#F5F5F5' : '#111111'
                    }}
                  />
                  <Bar dataKey="properties" fill="#FFDE59" stroke={darkMode ? '#E5E5E5' : '#111111'} strokeWidth={2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* BHK Configuration Donut Chart (4 columns) */}
        <div className="col-span-12 lg:col-span-4 neo-card p-6 sm:p-7 flex flex-col justify-between bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-heading font-extrabold text-[#111111] dark:text-[#F5F5F5] text-base tracking-tight">
                  BHK Configuration
                </h4>
                <p className="font-sans text-xs text-[#111111]/70 dark:text-[#B3B3B3] mt-0.5 font-medium">Distribution by apartment size</p>
              </div>
            </div>

            <div className="h-44 w-full flex items-center justify-center">
              {bhkChartData.length === 0 ? (
                <div className="font-mono text-xs text-[#111111]/60 dark:text-[#A3A3A3] uppercase tracking-wider font-bold">No BHK records.</div>
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
                      stroke={darkMode ? '#1E1E1E' : '#111111'}
                      strokeWidth={2}
                    >
                      {bhkChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} Units`, 'Count']}
                      contentStyle={{
                        backgroundColor: darkMode ? '#1E1E1E' : '#FFFFFF',
                        borderRadius: '6px',
                        border: darkMode ? '2px solid #E5E5E5' : '2px solid #111111',
                        boxShadow: darkMode ? '3px 3px 0px #E5E5E5' : '3px 3px 0px #111111',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: darkMode ? '#F5F5F5' : '#111111'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t-2 border-[#111111] dark:border-[#E5E5E5]">
            {bhkChartData.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-sm border border-[#111111] dark:border-[#E5E5E5] flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="font-sans text-[#111111]/80 dark:text-[#B3B3B3] font-medium truncate">{item.name}:</span>
                <span className="font-mono font-extrabold text-[#111111] dark:text-[#F5F5F5] ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Properties Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-extrabold text-[#111111] dark:text-[#F5F5F5] tracking-tight">
              Featured Verified Developments
            </h3>
            <p className="font-sans text-xs text-[#111111]/70 dark:text-[#B3B3B3] font-medium">
              Ground-truth inventory indexed in FAISS vector database
            </p>
          </div>
          <button
            onClick={() => setActiveTab('properties')}
            className="neo-btn neo-btn-yellow px-3 py-1.5 text-xs font-bold gap-1"
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
