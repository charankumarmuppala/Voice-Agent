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
  RefreshCw
} from 'lucide-react';
import { formatINR, fetchLeads } from '../services/api';

export default function Leads({ onScheduleVisit }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads();
      const mapped = data.map((l) => ({
        id: l.lead_id,
        name: l.name,
        phone: l.phone,
        email: l.email || '',
        location: l.preferred_location || 'Bangalore',
        bhk: l.preferred_bhk ? `${l.preferred_bhk} BHK` : 'Flexible',
        budget: l.budget_max || l.budget_min || 0,
        score: l.lead_score || 75,
        sentiment: l.sentiment || 'Positive',
        status: l.status || 'New',
        source: 'Voice Agent Call',
        date: l.created_at ? l.created_at.split('T')[0] : ''
      }));
      setLeads(mapped);
    } catch (e) {
      setError('Could not load leads from database.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function getSentimentIcon(s) {
    if (s === 'Positive') return <Smile className="w-3.5 h-3.5 text-[#14532D]" />;
    if (s === 'Neutral') return <Meh className="w-3.5 h-3.5 text-amber-700" />;
    return <Frown className="w-3.5 h-3.5 text-rose-700" />;
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#171717] tracking-tight">
            Customer Leads
          </h2>
          <p className="text-xs sm:text-sm text-[#171717]/60 mt-1 font-sans">
            Track inquiries, extracted budget, AI lead scores, and buyer sentiment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-2xl bg-[#E2F1E7] text-[#14532D] border border-[#D6CDBB]">
            {leads.length} Leads
          </span>
          <button
            onClick={loadLeads}
            className="p-2.5 rounded-2xl border border-[#D6CDBB] bg-[#FFFCF7] text-[#171717] hover:bg-[#F5F2E9] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFF1CC] border border-[#E5D8A8] text-[#171717] px-4 py-3 rounded-2xl text-xs font-mono">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFCF7] p-4 rounded-3xl border border-[#D6CDBB] shadow-none flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#171717]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by customer name, phone, or location..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] focus:outline-none focus:border-[#14532D]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#171717]/50" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs font-mono bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] focus:outline-none focus:border-[#14532D]"
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
        <div className="text-center py-12 text-[#171717]/50 text-xs font-mono">Loading leads from database...</div>
      )}

      {!loading && leads.length === 0 && (
        <div className="bg-[#FFFCF7] rounded-3xl p-10 border border-[#D6CDBB] shadow-none text-center">
          <Users className="w-10 h-10 text-[#171717]/30 mx-auto mb-3" />
          <p className="text-[#171717] text-sm font-heading font-bold">No leads recorded yet.</p>
          <p className="text-[#171717]/60 text-xs mt-1 font-sans">
            Inquiries and callers from AI voice sessions will appear here automatically.
          </p>
        </div>
      )}

      {/* Leads Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-[#FFFCF7] rounded-3xl border border-[#D6CDBB] shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F2E9] border-b border-[#D6CDBB] text-[#171717]/70 font-mono text-[10px] uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Lead ID & Customer</th>
                  <th className="py-3.5 px-4">Preferences</th>
                  <th className="py-3.5 px-4">Budget</th>
                  <th className="py-3.5 px-4">AI Score</th>
                  <th className="py-3.5 px-4">Sentiment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6CDBB]/40">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#F5F2E9]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-heading font-bold text-[#171717]">{lead.name}</div>
                      <div className="text-[11px] font-mono text-[#171717]/50 flex items-center gap-2 mt-0.5">
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
                      <div className="text-[#171717]/60 text-[11px] mt-0.5 font-mono">{lead.bhk}</div>
                    </td>
                    <td className="py-3.5 px-4 font-heading font-bold text-[#171717]">
                      {lead.budget ? formatINR(lead.budget) : 'TBD'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-[#E2F1E7] border border-[#D6CDBB]/50 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#14532D] h-full rounded-full"
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[#171717] text-[11px]">{lead.score}/100</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#E2F1E7] text-[#14532D] border border-[#D6CDBB]">
                        {getSentimentIcon(lead.sentiment)}
                        {lead.sentiment}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          lead.status === 'Visit Scheduled'
                            ? 'bg-[#E2F1E7] text-[#14532D] border-[#D6CDBB]'
                            : lead.status === 'Qualified'
                            ? 'bg-[#E2F1E7] text-[#14532D] border-[#D6CDBB]'
                            : 'bg-[#FFF1CC] text-[#854D0E] border-[#E5D8A8]'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onScheduleVisit && onScheduleVisit(lead)}
                        className="px-3 py-1.5 rounded-2xl bg-[#F5F2E9] hover:bg-[#E2F1E7] border border-[#D6CDBB] hover:border-[#14532D] text-[#14532D] font-mono font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3 text-[#14532D]" />
                        Visit
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
