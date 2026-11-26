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
  RefreshCw
} from 'lucide-react';
import { fetchCalls, fetchCallDetails } from '../services/api';

export default function CallHistory() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#171717] tracking-tight">
            Call History & Voice Sessions
          </h2>
          <p className="text-xs sm:text-sm text-[#171717]/60 mt-1 font-sans">
            Review recorded Gemini conversations, customer preferences, and site visit outcomes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-2xl bg-[#E2F1E7] text-[#14532D] border border-[#D6CDBB]">
            {calls.length} Calls
          </span>
          <button
            onClick={loadCallHistory}
            className="p-2.5 rounded-2xl border border-[#D6CDBB] bg-[#FFFCF7] text-[#171717] hover:bg-[#F5F2E9] transition-colors"
            title="Refresh call records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Call List */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-[#14532D] animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-[#171717]/60">Loading call records from database...</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-[#FFFCF7] rounded-3xl p-12 border border-[#D6CDBB] text-center shadow-none">
          <PhoneCall className="w-10 h-10 text-[#171717]/30 mx-auto mb-3" />
          <h3 className="text-sm font-heading font-bold text-[#171717]">No Call Sessions Recorded Yet</h3>
          <p className="text-xs text-[#171717]/60 mt-1 max-w-md mx-auto font-sans">
            Conversations conducted via the AI Voice Assistant will appear here with full transcripts, lead profiles, and duration logs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {calls.map((call) => (
            <div
              key={call.session_id}
              className="bg-[#FFFCF7] rounded-3xl p-5 border border-[#D6CDBB] shadow-none hover:border-[#14532D]/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-[#E2F1E7] border border-[#D6CDBB] flex items-center justify-center text-[#14532D] flex-shrink-0">
                  <PhoneCall className="w-5 h-5 text-[#14532D]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-bold text-[#171717] text-sm">{call.customer_name}</h3>
                    <span className="text-[11px] font-mono text-[#171717]/50">• {call.customer_phone}</span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#E2F1E7] text-[#14532D] px-2.5 py-0.5 rounded-full border border-[#D6CDBB]">
                      {call.outcome || 'Completed'}
                    </span>
                    <span className="text-[10px] text-[#171717]/40 font-mono">
                      {call.session_id}
                    </span>
                  </div>

                  <p className="text-xs text-[#171717]/80 mt-1.5 leading-relaxed font-sans">
                    {call.summary || 'Voice sales conversation with Gemini assistant.'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-[#171717]/60 mt-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#14532D]" />
                      Duration: {formatDuration(call.duration_seconds)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Languages className="w-3 h-3 text-[#14532D]" />
                      {call.language}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#14532D]" />
                      {formatDateTime(call.started_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#D6CDBB]/40">
                <button
                  onClick={() => handleOpenTranscript(call)}
                  className="px-4 py-2 rounded-2xl bg-[#F5F2E9] hover:bg-[#E2F1E7] border border-[#D6CDBB] hover:border-[#14532D] text-[#14532D] text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                >
                  View Transcript
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transcript Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 bg-[#171717]/50 flex items-center justify-center p-4">
          <div className="bg-[#FFFCF7] rounded-3xl max-w-2xl w-full p-6 shadow-none relative border border-[#D6CDBB] max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedCall(null)}
              className="absolute top-4 right-4 text-[#171717]/40 hover:text-[#171717] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 pb-3 border-b border-[#D6CDBB] pr-8">
              <span className="text-[10px] font-mono text-[#171717]/50 font-bold">{selectedCall.session_id}</span>
              <h3 className="text-base font-heading font-bold text-[#171717] mt-0.5">
                Call with {selectedCall.customer_name}
              </h3>
              <div className="text-xs font-mono text-[#171717]/60 mt-0.5">
                Outcome: <span className="font-bold text-[#14532D]">{selectedCall.outcome}</span> • {selectedCall.language}
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              {detailLoading ? (
                <div className="py-12 text-center text-xs font-mono text-[#171717]/50">Loading transcript...</div>
              ) : selectedCall.messages && selectedCall.messages.length > 0 ? (
                selectedCall.messages.map((m, idx) => {
                  const isAgent = m.role === 'model' || m.role === 'agent';
                  return (
                    <div
                      key={idx}
                      className={`flex gap-2.5 text-xs ${isAgent ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAgent && (
                        <div className="w-7 h-7 rounded-2xl bg-[#14532D] text-white flex items-center justify-center flex-shrink-0 text-[10px] font-mono font-bold border border-[#14532D]">
                          AI
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 leading-relaxed ${
                          isAgent
                            ? 'bg-[#F5F2E9] text-[#171717] border border-[#D6CDBB] rounded-tl-sm'
                            : 'bg-[#14532D] text-white rounded-tr-sm border border-[#14532D]'
                        }`}
                      >
                        <div className={`text-[10px] font-mono font-bold uppercase tracking-wider mb-1 ${isAgent ? 'text-[#14532D]' : 'text-[#E2F1E7]'}`}>
                          {isAgent ? 'EstateVoice Sales AI' : selectedCall.customer_name}
                        </div>
                        <p className="font-sans text-xs leading-relaxed">{m.content}</p>
                      </div>
                      {!isAgent && (
                        <div className="w-7 h-7 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB] text-[#171717] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                          <User className="w-3.5 h-3.5 text-[#14532D]" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB] text-center text-xs font-mono text-[#171717]/70">
                  {selectedCall.summary || 'Summary recorded.'}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#D6CDBB] flex justify-end">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB] text-[#171717] text-xs font-mono font-bold hover:bg-[#D6CDBB]/30 transition-colors"
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
