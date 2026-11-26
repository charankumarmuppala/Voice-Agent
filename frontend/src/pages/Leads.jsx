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

export default function Leads({ onScheduleVisit, darkMode }) {
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
    if (s === 'Positive') return <Smile className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFDE59]" />;
    if (s === 'Neutral') return <Meh className="w-3.5 h-3.5 text-[#111111] dark:text-[#B4A7FF]" />;
    return <Frown className="w-3.5 h-3.5 text-rose-600 dark:text-[#FF8A80]" />;
  }

  function getTemperatureBadge(temp) {
    if (temp === 'Hot') {
      return (
        <span className="neo-badge bg-[#FFDE59] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] inline-flex items-center gap-1 font-black">
          <Flame className="w-3 h-3 text-[#111111]" />
          Hot
        </span>
      );
    }
    if (temp === 'Warm') {
      return (
        <span className="neo-badge bg-[#B4A7FF] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] inline-flex items-center gap-1 font-black">
          <Sun className="w-3 h-3 text-[#111111]" />
          Warm
        </span>
      );
    }
    return (
      <span className="neo-badge bg-[#B8F4B8] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] inline-flex items-center gap-1 font-black">
        <Snowflake className="w-3 h-3 text-[#111111]" />
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
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#111111] dark:text-[#F5F5F5] tracking-tight">
              Customer Leads & Pipeline
            </h2>
            <span className="neo-badge bg-[#FFDE59] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] font-black">
              CRM Tables
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-[#111111]/70 dark:text-[#B3B3B3] mt-1 font-medium">
            Track inquiries, extracted budget, AI qualification scores, and buyer sentiment from voice sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLeads}
            className="neo-btn neo-btn-white dark:bg-[#1E1E1E] dark:text-[#F5F5F5] dark:border-[#E5E5E5] p-2.5"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4 text-[#111111] dark:text-[#F5F5F5]" />
          </button>
        </div>
      </div>

      {error && (
        <div className="neo-card bg-[#FF8A80]/20 dark:bg-[#FF8A80]/30 border-2 border-[#111111] dark:border-[#E5E5E5] text-[#111111] dark:text-[#F5F5F5] px-4 py-3 text-xs font-mono font-bold">
          {error}
        </div>
      )}

      {/* Bento Grid: 4 Quick Summary KPI Cards with Hot/Warm/Cold Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neo-card p-5 bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] transition-colors">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#111111] dark:text-[#B3B3B3] font-bold">
            <span>Total Leads</span>
            <Users className="w-4 h-4 text-[#111111] dark:text-[#FFDE59]" />
          </div>
          <div className="font-heading text-3xl font-black text-[#111111] dark:text-[#F5F5F5] mt-2">
            {leads.length}
          </div>
          <div className="text-[11px] font-sans text-[#111111]/70 dark:text-[#A3A3A3] font-semibold mt-2">
            Captured across all channels
          </div>
        </div>

        <div className="neo-card p-5 bg-[#FFDE59] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5]">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#111111] font-black">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#111111]" />
              Hot Leads
            </span>
            <span className="neo-badge bg-white text-[#111111] border-2 border-[#111111] text-[10px] font-black">
              High Intent
            </span>
          </div>
          <div className="font-heading text-3xl font-black text-[#111111] mt-2">
            {hotCount}
          </div>
          <div className="text-[11px] font-sans text-[#111111]/90 font-bold mt-2">
            Score ≥ 80 or visit booked
          </div>
        </div>

        <div className="neo-card p-5 bg-[#B4A7FF] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5]">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#111111] font-black">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-[#111111]" />
              Warm Leads
            </span>
            <span className="neo-badge bg-white text-[#111111] border-2 border-[#111111] text-[10px] font-black">
              Engaged
            </span>
          </div>
          <div className="font-heading text-3xl font-black text-[#111111] mt-2">
            {warmCount}
          </div>
          <div className="text-[11px] font-sans text-[#111111]/90 font-bold mt-2">
            Score 60 to 79
          </div>
        </div>

        <div className="neo-card p-5 bg-[#B8F4B8] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5]">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#111111] font-black">
            <span className="flex items-center gap-1.5">
              <Snowflake className="w-3.5 h-3.5 text-[#111111]" />
              Cold Leads
            </span>
            <span className="neo-badge bg-white text-[#111111] border-2 border-[#111111] text-[10px] font-black">
              Nurturing
            </span>
          </div>
          <div className="font-heading text-3xl font-black text-[#111111] mt-2">
            {coldCount}
          </div>
          <div className="text-[11px] font-sans text-[#111111]/90 font-bold mt-2">
            Score &lt; 60
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="neo-card p-4 flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] transition-colors">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#111111] dark:text-[#FFDE59] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by customer name, phone number, or locality..."
            className="neo-input w-full pl-10 pr-4 py-2 text-xs font-medium text-[#111111] dark:text-[#F5F5F5] dark:bg-[#181818] dark:border-[#E5E5E5] dark:placeholder-[#A3A3A3]"
          />
        </div>

        {/* Temperature Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['All', 'Hot', 'Warm', 'Cold'].map((t) => (
            <button
              key={t}
              onClick={() => setTempFilter(t)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm border-2 border-[#111111] dark:border-[#E5E5E5] transition-all cursor-pointer ${
                tempFilter === t
                  ? 'bg-[#FFDE59] text-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5]'
                  : 'bg-white dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] hover:bg-[#FFFDF5] dark:hover:bg-[#252525] shadow-[1px_1px_0px_#111111] dark:shadow-[1px_1px_0px_#E5E5E5]'
              }`}
            >
              {t === 'All' ? 'All Leads' : `${t} Leads`}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#111111] dark:text-[#FFDE59] flex-shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="neo-input px-3 py-2 text-xs font-mono font-bold text-[#111111] dark:text-[#F5F5F5] bg-white dark:bg-[#181818] dark:border-[#E5E5E5]"
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
        <div className="text-center py-16 text-[#111111] dark:text-[#B3B3B3] text-xs font-mono font-bold">
          Loading leads from SQLite database...
        </div>
      )}

      {!loading && leads.length === 0 && (
        <div className="neo-card p-12 text-center bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5]">
          <Users className="w-10 h-10 text-[#111111]/40 dark:text-[#B3B3B3]/40 mx-auto mb-3" />
          <p className="text-[#111111] dark:text-[#F5F5F5] text-base font-heading font-extrabold">No leads recorded yet.</p>
          <p className="text-[#111111]/70 dark:text-[#B3B3B3] text-xs mt-1 font-sans font-medium">
            Inquiries and callers from AI voice sessions will appear here automatically with verified details.
          </p>
        </div>
      )}

      {/* Leads Table */}
      {!loading && filtered.length > 0 && (
        <div className="neo-card overflow-hidden bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FFDE59] border-b-2 border-[#111111] dark:border-[#E5E5E5] text-[#111111] font-mono text-[11px] uppercase tracking-wider font-extrabold">
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
              <tbody className="divide-y-2 divide-[#111111]/15 dark:divide-[#E5E5E5]/15">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#FFFDF5] dark:hover:bg-[#252525] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-heading font-black text-[#111111] dark:text-[#F5F5F5] text-sm">{lead.name}</div>
                      <div className="text-[11px] font-mono text-[#111111]/70 dark:text-[#B3B3B3] font-bold flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#111111] dark:text-[#FFDE59]" /> {lead.phone}
                        </span>
                        <span>•</span>
                        <span>{lead.id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#111111] dark:text-[#F5F5F5] flex items-center gap-1 font-sans">
                        <MapPin className="w-3 h-3 text-[#111111] dark:text-[#FFDE59]" />
                        {lead.location}
                      </div>
                      <div className="font-mono font-bold text-[11px] text-[#111111]/70 dark:text-[#B3B3B3] mt-0.5">{lead.bhk}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-[#111111] dark:text-[#F5F5F5]">
                      {lead.budget ? formatINR(lead.budget) : 'Open Budget'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-extrabold text-xs text-[#111111] dark:text-[#F5F5F5] w-6 text-right">
                          {lead.score}
                        </div>
                        <div className="w-16 h-2.5 bg-white dark:bg-[#181818] rounded-sm overflow-hidden border-2 border-[#111111] dark:border-[#E5E5E5]">
                          <div
                            className={`h-full ${
                              lead.score >= 80 ? 'bg-[#B8F4B8]' : lead.score >= 60 ? 'bg-[#FFDE59]' : 'bg-[#FF8A80]'
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
                      <span className="neo-badge bg-[#FFFDF5] dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] border-2 border-[#111111] dark:border-[#E5E5E5] inline-flex items-center gap-1 font-bold">
                        {getSentimentIcon(lead.sentiment)}
                        {lead.sentiment}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`neo-badge border-2 border-[#111111] dark:border-[#E5E5E5] font-black ${
                          lead.status === 'Visit Scheduled'
                            ? 'bg-[#B8F4B8] text-[#111111]'
                            : lead.status === 'Qualified'
                            ? 'bg-[#FFDE59] text-[#111111]'
                            : 'bg-white dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5]'
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
                        className="neo-btn neo-btn-yellow px-3 py-1.5 text-xs font-bold gap-1.5"
                      >
                        <Calendar className="w-3 h-3 text-[#111111]" />
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
