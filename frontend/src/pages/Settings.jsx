import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Languages,
  Bot,
  Sliders,
  Server,
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function Settings() {
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [agentTone, setAgentTone] = useState('Consultative & Professional');
  const [speechSpeed, setSpeechSpeed] = useState('1.0x (Natural)');
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#171717] tracking-tight">System Settings</h2>
        <p className="text-xs sm:text-sm text-[#171717]/60 mt-1 font-sans">
          Configure language preferences, agent persona, and backend service connectors.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Language Preferences */}
        <div className="bg-[#FFFCF7] rounded-3xl p-6 border border-[#D6CDBB] shadow-none space-y-4">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-[#14532D]" />
            <h3 className="font-heading font-bold text-[#171717] text-sm">Language & Dialect</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#171717]/70 mb-1.5">
                Primary Agent Language
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] font-mono text-xs focus:outline-none focus:border-[#14532D]"
              >
                <option value="English">English (Indian Accent - en-IN)</option>
                <option value="Hindi">हिन्दी (Hindi - hi-IN)</option>
                <option value="Kannada">ಕನ್ನಡ (Kannada - kn-IN)</option>
                <option value="Telugu">తెలుగు (Telugu - te-IN)</option>
                <option value="Tamil">தமிழ் (Tamil - ta-IN)</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#171717]/70 mb-1.5">
                Speech Rate
              </label>
              <select
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] font-mono text-xs focus:outline-none focus:border-[#14532D]"
              >
                <option value="0.9x">0.9x (Deliberate & Clear)</option>
                <option value="1.0x (Natural)">1.0x (Natural Pace)</option>
                <option value="1.15x">1.15x (Brisk Professional)</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Agent Persona */}
        <div className="bg-[#FFFCF7] rounded-3xl p-6 border border-[#D6CDBB] shadow-none space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#14532D]" />
            <h3 className="font-heading font-bold text-[#171717] text-sm">Agent Conversation Preferences</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#171717]/70 mb-1.5">
                Sales Persona & Tone
              </label>
              <select
                value={agentTone}
                onChange={(e) => setAgentTone(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] font-mono text-xs focus:outline-none focus:border-[#14532D]"
              >
                <option value="Consultative & Professional">Consultative & Professional (Recommended for Luxury)</option>
                <option value="Warm & Friendly">Warm & Welcoming (First-Time Home Buyers)</option>
                <option value="High-Energy Direct">High-Energy & Direct (Fast Closing)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB]">
              <div>
                <div className="font-heading font-bold text-[#171717]">Auto-Suggest Physical Site Visits</div>
                <div className="text-[#171717]/60 text-[11px] mt-0.5 font-sans">
                  Trigger tour scheduling whenever a caller expresses budget and BHK interest.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoSchedule}
                onChange={(e) => setAutoSchedule(e.target.checked)}
                className="w-4 h-4 accent-[#14532D] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Backend & Architecture Status */}
        <div className="bg-[#FFFCF7] rounded-3xl p-6 border border-[#D6CDBB] shadow-none space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#14532D]" />
            <h3 className="font-heading font-bold text-[#171717] text-sm">Backend & Architecture Status</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB] flex items-center justify-between">
              <div>
                <span className="font-heading font-bold text-[#171717]">FastAPI & SQLite Inventory DB</span>
                <p className="text-[#171717]/60 text-[11px] font-sans">30 verified Bangalore properties active</p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14532D] bg-[#E2F1E7] border border-[#D6CDBB] px-2.5 py-1 rounded-full">
                Active (Phase 1)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB] flex items-center justify-between">
              <div>
                <span className="font-heading font-bold text-[#171717]">Google Gemini API (Sales Assistant)</span>
                <p className="text-[#171717]/60 text-[11px] font-sans">Active via google-genai SDK (English, Kannada, Hindi)</p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14532D] bg-[#E2F1E7] border border-[#D6CDBB] px-2.5 py-1 rounded-full">
                Active (Phase 2)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB] flex items-center justify-between">
              <div>
                <span className="font-heading font-bold text-[#171717]">Web Speech API & Browser Speech Synthesis</span>
                <p className="text-[#171717]/60 text-[11px] font-sans">Speech-to-Text & Text-to-Speech with feedback suppression</p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14532D] bg-[#E2F1E7] border border-[#D6CDBB] px-2.5 py-1 rounded-full">
                Active (Phase 2)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB] flex items-center justify-between">
              <div>
                <span className="font-heading font-bold text-[#171717]">SentenceTransformers & FAISS Hybrid RAG</span>
                <p className="text-[#171717]/60 text-[11px] font-sans">Semantic search & strict property filtering</p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14532D] bg-[#E2F1E7] border border-[#D6CDBB] px-2.5 py-1 rounded-full">
                Active (Phase 3)
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-xs font-mono font-bold text-[#14532D] flex items-center gap-1.5 bg-[#E2F1E7] border border-[#D6CDBB] px-3 py-1.5 rounded-2xl">
              <CheckCircle2 className="w-4 h-4 text-[#14532D]" />
              Preferences saved successfully!
            </span>
          )}
          <button
            type="submit"
            className="ml-auto px-6 py-2.5 rounded-2xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-heading font-bold transition-colors shadow-none border border-[#14532D]"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
