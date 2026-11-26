import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  Calendar,
  X,
  RefreshCw,
  Flame,
  Sun,
  Snowflake,
  Sparkles
} from 'lucide-react';
import { formatINR, fetchLeads } from '../services/api';

export default function Leads({ onScheduleVisit }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [tempFilter, setTempFilter] = useState('All');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads();
      const mapped = data.map((l) => {
        const score = l.lead_score || 75;
        const isScheduled = l.status === 'Visit Scheduled';
        let temp = 'Warm';
        if (score >= 80 || isScheduled) temp = 'Hot';
        else if (score < 60) temp = 'Cold';

        return {
          id: l.lead_id,
          name: l.name,
          phone: l.phone,
          email: l.email || '',
          location: l.preferred_location || 'Bangalore',
          bhk: l.preferred_bhk ? `${l.preferred_bhk} BHK` : 'Flexible',
          budget: l.budget_max || l.budget_min || 0,
          score: score,
          sentiment: l.sentiment || 'Positive',
          status: l.status || 'New',
          temperature: temp,
          source: 'Voice Agent Call',
          date: l.created_at ? l.created_at.split('T')[0] : ''
        };
      });
      setLeads(mapped);
    } catch (e) {
      setError('Could not load leads from database.');
    } finally {
      setLoading(false);
    }
  }

  const hotCount = leads.filter((l) => l.temperature === 'Hot').length;
  const warmCount = leads.filter((l) => l.temperature === 'Warm').length;
  const coldCount = leads.filter((l) => l.temperature === 'Cold').length;

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || l.status === filterStatus;
    const matchTemp = tempFilter === 'All' || l.temperature === tempFilter;
    return matchSearch && matchStatus && matchTemp;
  });

  function getSentimentIcon(s) {
    if (s === 'Positive') return <Smile className="w-3.5 h-3.5 text-[#14532D]" />;
    if (s === 'Neutral') return <Meh className="w-3.5 h-3.5 text-[#854D0E]" />;
    return <Frown className="w-3.5 h-3.5 text-rose-700" />;
  }

  function getTemperatureBadge(temp) {
    if (temp === 'Hot') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20">
          <Flame className="w-3 h-3 text-[#14532D]" />
          Hot
        </span>
      );
    }
    if (temp === 'Warm') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider bg-[#FFF1CC] text-[#854D0E] border border-[#E5D8A8]">
          <Sun className="w-3 h-3 text-[#854D0E]" />
          Warm
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider bg-[#F5F2E9] text-[#737373] border border-[#D6CDBB]">
        <Snowflake className="w-3 h-3 text-[#737373]" />
        Cold
      </span>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#171717] tracking-tight">
              Customer Leads & Pipeline
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20 font-bold">
              CRM Tables
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-[#737373] mt-1 font-normal">
            Track inquiries, extracted budget, AI qualification scores, and buyer sentiment from voice sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLeads}
            className="p-2 rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] text-[#737373] hover:text-[#171717] hover:border-[#14532D] transition-colors cursor-pointer shadow-sm"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFF1CC] border border-[#E5D8A8] text-[#854D0E] px-4 py-3 rounded-2xl text-xs font-mono">
          {error}
        </div>
      )}

      {/* Bento Grid: 4 Quick Summary KPI Cards with Hot/Warm/Cold Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card p-5">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#737373]">
            <span>Total Leads</span>
            <Users className="w-4 h-4 text-[#14532D]" />
          </div>
          <div className="font-heading text-3xl font-bold text-[#171717] mt-2">
            {leads.length}
          </div>
          <div className="text-[11px] font-sans text-[#737373] mt-2">
            Captured across all channels
          </div>
        </div>

        <div className="bento-card p-5 border-l-4 border-l-[#14532D]">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#14532D] font-bold">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#14532D]" />
              Hot Leads
            </span>
            <span className="bg-[#E2F1E7] text-[#14532D] px-2 py-0.5 rounded-full text-[10px]">
              High Intent
            </span>
          </div>
          <div className="font-heading text-3xl font-bold text-[#14532D] mt-2">
            {hotCount}
          </div>
          <div className="text-[11px] font-sans text-[#737373] mt-2">
            Score ≥ 80 or visit booked
          </div>
        </div>

        <div className="bento-card p-5 border-l-4 border-l-[#854D0E]">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#854D0E] font-bold">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-[#854D0E]" />
              Warm Leads
            </span>
            <span className="bg-[#FFF1CC] text-[#854D0E] px-2 py-0.5 rounded-full text-[10px]">
              Engaged
            </span>
          </div>
          <div className="font-heading text-3xl font-bold text-[#854D0E] mt-2">
            {warmCount}
          </div>
          <div className="text-[11px] font-sans text-[#737373] mt-2">
            Score 60 to 79
          </div>
        </div>

        <div className="bento-card p-5 border-l-4 border-l-[#737373]">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#737373] font-bold">
            <span className="flex items-center gap-1.5">
              <Snowflake className="w-3.5 h-3.5 text-[#737373]" />
              Cold Leads
            </span>
            <span className="bg-[#F5F2E9] text-[#737373] px-2 py-0.5 rounded-full text-[10px]">
              Nurturing
            </span>
          </div>
          <div className="font-heading text-3xl font-bold text-[#737373] mt-2">
            {coldCount}
          </div>
          <div className="text-[11px] font-sans text-[#737373] mt-2">
            Score &lt; 60
          </div>
        </div>
      </div>

      {/* Filter and Search Bento Bar */}
      <div className="bento-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by customer name, phone number, or locality..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl text-[#171717] focus:outline-none focus:border-[#14532D]"
          />
        </div>

        {/* Temperature Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['All', 'Hot', 'Warm', 'Cold'].map((t) => (
            <button
              key={t}
              onClick={() => setTempFilter(t)}
              className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all cursor-pointer font-bold ${
                tempFilter === t
                  ? 'bg-[#14532D] text-white border border-[#14532D] shadow-sm'
                  : 'bg-[#F5F2E9] text-[#737373] border border-[#D6CDBB] hover:text-[#171717]'
              }`}
            >
              {t === 'All' ? 'All Leads' : `${t} Leads`}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#737373] flex-shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs font-mono bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl text-[#171717] focus:outline-none focus:border-[#14532D]"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Visit Scheduled">Visit Scheduled</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-[#737373] text-xs font-mono">
          Loading leads from SQLite database...
        </div>
      )}

      {!loading && leads.length === 0 && (
        <div className="bento-card p-12 text-center">
          <Users className="w-10 h-10 text-[#737373]/40 mx-auto mb-3" />
          <p className="text-[#171717] text-base font-heading font-bold">No leads recorded yet.</p>
          <p className="text-[#737373] text-xs mt-1 font-sans">
            Inquiries and callers from AI voice sessions will appear here automatically with verified details.
          </p>
        </div>
      )}

      {/* Leads Table */}
      {!loading && filtered.length > 0 && (
        <div className="bento-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F2E9] border-b border-[#D6CDBB] text-[#737373] font-mono text-[10px] uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Lead ID & Customer</th>
                  <th className="py-3.5 px-4">Preferences</th>
                  <th className="py-3.5 px-4">Budget</th>
                  <th className="py-3.5 px-4">AI Score</th>
                  <th className="py-3.5 px-4">Temperature</th>
                  <th className="py-3.5 px-4">Sentiment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6CDBB]/40">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#F5F2E9]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-heading font-bold text-[#171717] text-sm">{lead.name}</div>
                      <div className="text-[11px] font-mono text-[#737373] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#14532D]" /> {lead.phone}
                        </span>
                        <span>•</span>
                        <span>{lead.id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#14532D] flex items-center gap-1 font-sans">
                        <MapPin className="w-3 h-3 text-[#14532D]" />
                        {lead.location}
                      </div>
                      <div className="font-mono text-[11px] text-[#737373] mt-0.5">{lead.bhk}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#171717]">
                      {lead.budget ? formatINR(lead.budget) : 'Open Budget'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-bold text-xs text-[#171717] w-6 text-right">
                          {lead.score}
                        </div>
                        <div className="w-16 h-2 bg-[#F5F2E9] rounded-full overflow-hidden border border-[#D6CDBB]">
                          <div
                            className={`h-full rounded-full ${
                              lead.score >= 80 ? 'bg-[#14532D]' : lead.score >= 60 ? 'bg-[#D97706]' : 'bg-[#737373]'
                            }`}
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getTemperatureBadge(lead.temperature)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-sans text-[#171717]">
                        {getSentimentIcon(lead.sentiment)}
                        {lead.sentiment}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          lead.status === 'Visit Scheduled'
                            ? 'bg-[#E2F1E7] text-[#14532D] border-[#14532D]/20'
                            : lead.status === 'Qualified'
                            ? 'bg-[#FFF1CC] text-[#854D0E] border-[#E5D8A8]'
                            : 'bg-[#F5F2E9] text-[#737373] border-[#D6CDBB]'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() =>
                          onScheduleVisit ? onScheduleVisit({ name: lead.name, location: lead.location }) : null
                        }
                        className="btn-forest px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Calendar className="w-3 h-3 text-[#E2F1E7]" />
                        Book Visit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
