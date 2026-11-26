import React, { useState, useEffect } from 'react';
import {
  History,
  PhoneCall,
  Clock,
  User,
  Calendar,
  Languages,
  Sparkles,
  Smile,
  Meh,
  CheckCircle2,
  ChevronRight,
  X,
  RefreshCw,
  Search,
  MessageSquare
} from 'lucide-react';
import { fetchCalls, fetchCallDetails } from '../services/api';

export default function CallHistory() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCallHistory();
  }, []);

  async function loadCallHistory() {
    setLoading(true);
    try {
      const data = await fetchCalls();
      setCalls(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load call history:', err);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenTranscript(call) {
    setDetailLoading(true);
    try {
      const details = await fetchCallDetails(call.session_id);
      setSelectedCall(details);
    } catch (err) {
      setSelectedCall(call);
    } finally {
      setDetailLoading(false);
    }
  }

  function formatDuration(sec) {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  }

  const filteredCalls = calls.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.customer_name || '').toLowerCase().includes(q) ||
      (c.customer_phone || '').includes(q) ||
      (c.session_id || '').toLowerCase().includes(q) ||
      (c.outcome || '').toLowerCase().includes(q)
    );
  });

  const avgDuration =
    calls.length > 0
      ? Math.round(calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / calls.length)
      : 0;

  const visitsBooked = calls.filter((c) => (c.outcome || '').includes('Visit')).length;

  return (
    <div className="p-6 sm:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              Call History & Voice Sessions
            </h2>
            <span className="neo-badge bg-[#FFDE59] text-[#111111]">
              Full Transcripts
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-[#111111]/70 mt-1 font-medium">
            Audit recorded Gemini conversational sessions, buyer requirements, and automated booking outcomes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="neo-badge bg-[#B8F4B8] text-[#111111] px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider">
            {calls.length} Sessions Logged
          </span>
          <button
            onClick={loadCallHistory}
            className="neo-btn neo-btn-white p-2.5"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4 text-[#111111]" />
          </button>
        </div>
      </div>

      {/* Bento Grid: 3 Quick Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="neo-card p-5 bg-white">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#111111] font-bold">
            <span>Total Calls</span>
            <PhoneCall className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="font-heading text-3xl font-black text-[#111111] mt-2">
            {calls.length}
          </div>
          <div className="text-[11px] font-sans text-[#111111]/70 font-semibold mt-2">
            Completed conversational sessions
          </div>
        </div>

        <div className="neo-card p-5 bg-[#B4A7FF]">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#111111] font-bold">
            <span>Avg Call Duration</span>
            <Clock className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="font-heading text-3xl font-black text-[#111111] mt-2">
            {formatDuration(avgDuration)}
          </div>
          <div className="text-[11px] font-sans text-[#111111]/80 font-bold mt-2">
            Average customer talk time
          </div>
        </div>

        <div className="neo-card p-5 bg-[#FFDE59]">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#111111] font-bold">
            <span>Visits Scheduled</span>
            <CheckCircle2 className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="font-heading text-3xl font-black text-[#111111] mt-2">
            {visitsBooked}
          </div>
          <div className="text-[11px] font-sans text-[#111111]/80 font-bold mt-2">
            Calls resulting in confirmed walkthroughs
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="neo-card p-4 flex items-center gap-3 bg-white">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#111111] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search call logs by customer name, phone number, session ID, or outcome..."
            className="neo-input w-full pl-10 pr-4 py-2 text-xs font-medium text-[#111111]"
          />
        </div>
      </div>

      {/* Call List */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-[#111111] animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono font-bold text-[#111111]">Loading call records from database...</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="neo-card p-12 text-center bg-white">
          <PhoneCall className="w-10 h-10 text-[#111111]/40 mx-auto mb-3" />
          <h3 className="text-base font-heading font-extrabold text-[#111111]">No Call Sessions Recorded Yet</h3>
          <p className="text-xs text-[#111111]/70 mt-1 max-w-md mx-auto font-sans font-medium">
            Conversations conducted via the AI Voice Assistant will appear here with full transcripts, lead profiles, and duration logs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCalls.map((call) => (
            <div
              key={call.session_id}
              className="neo-card-interactive p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-sm bg-[#FFDE59] border-2 border-[#111111] flex items-center justify-center text-[#111111] flex-shrink-0 shadow-[2px_2px_0px_#111111]">
                  <PhoneCall className="w-5 h-5 text-[#111111]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-extrabold text-[#111111] text-base">{call.customer_name}</h3>
                    <span className="text-[11px] font-mono font-bold text-[#111111]/70">• {call.customer_phone || 'Phone Unprovided'}</span>
                    <span className="neo-badge bg-[#B8F4B8] text-[#111111]">
                      {call.outcome || 'Completed'}
                    </span>
                    <span className="text-[10px] text-[#111111]/60 font-mono font-bold">
                      {call.session_id}
                    </span>
                  </div>

                  <p className="text-xs text-[#111111] mt-1.5 leading-relaxed font-sans font-medium">
                    {call.summary || 'Voice sales conversation with Gemini assistant.'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] font-mono font-bold text-[#111111]/80 mt-2.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#111111]" />
                      Duration: {formatDuration(call.duration_seconds)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Languages className="w-3.5 h-3.5 text-[#111111]" />
                      {call.language}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#111111]" />
                      {formatDateTime(call.started_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t-2 md:border-t-0 pt-3 md:pt-0 border-[#111111]/15">
                <button
                  onClick={() => handleOpenTranscript(call)}
                  className="neo-btn neo-btn-yellow px-4 py-2 text-xs gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#111111]" />
                  View Transcript
                  <ChevronRight className="w-3.5 h-3.5 text-[#111111]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transcript Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neo-card bg-white rounded-md max-w-2xl w-full p-6 shadow-[8px_8px_0px_#111111] relative border-3 border-[#111111] max-h-[85vh] flex flex-col animate-fade-in">
            <button
              onClick={() => setSelectedCall(null)}
              className="absolute top-4 right-4 text-[#111111] hover:opacity-70 p-1 cursor-pointer"
            >
              <X className="w-5 h-5 text-[#111111]" />
            </button>

            <div className="border-b-2 border-[#111111] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-lg text-[#111111]">
                  Session Transcript: {selectedCall.customer_name}
                </h3>
                <span className="neo-badge bg-[#FFDE59] text-[#111111]">
                  {selectedCall.session_id}
                </span>
              </div>
              <p className="font-sans text-xs text-[#111111]/70 mt-1 font-medium">
                Language: {selectedCall.language} • Duration: {formatDuration(selectedCall.duration_seconds)}
              </p>
            </div>

            {/* Transcript Messages Container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {detailLoading ? (
                <div className="py-12 text-center text-xs font-mono font-bold text-[#111111]">
                  Fetching messages...
                </div>
              ) : !selectedCall.messages || selectedCall.messages.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono font-bold text-[#111111]">
                  No message history recorded for this session.
                </div>
              ) : (
                selectedCall.messages.map((m, idx) => {
                  const isAgent = m.role === 'model' || m.sender === 'agent';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                    >
                      <span className="font-mono text-[10px] text-[#111111]/80 mb-1 uppercase font-bold">
                        {isAgent ? 'EstateVoice AI' : selectedCall.customer_name}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-sm p-3.5 text-xs leading-relaxed border-2 border-[#111111] font-medium ${
                          isAgent
                            ? 'bg-[#FFFDF5] text-[#111111] shadow-[2px_2px_0px_#111111]'
                            : 'bg-[#FFDE59] text-[#111111] shadow-[2px_2px_0px_#111111]'
                        }`}
                      >
                        {m.content || m.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t-2 border-[#111111] mt-4 flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] font-bold text-[#111111]">
                Outcome: <strong className="neo-badge bg-[#B8F4B8] text-[#111111] ml-1">{selectedCall.outcome || 'Completed'}</strong>
              </span>
              <button
                onClick={() => setSelectedCall(null)}
                className="neo-btn neo-btn-white px-4 py-1.5 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
