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
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';

export default function Settings({ darkMode, setDarkMode }) {
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
    <div className="p-6 sm:p-8 space-y-7 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#171717] tracking-tight">System Settings</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20 font-bold">
            Configuration
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#737373] mt-1 font-normal">
          Configure language preferences, agent persona, and backend service connectors.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance & Interface Theme */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-[#14532D]" />
            <h3 className="font-heading font-bold text-[#171717] text-sm">Appearance & Interface Theme</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <button
              type="button"
              onClick={() => setDarkMode && setDarkMode(false)}
              className={`p-4 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                !darkMode
                  ? 'bg-[#E2F1E7] border-[#14532D] text-[#14532D] font-bold shadow-sm'
                  : 'bg-[#F5F2E9] border-[#D6CDBB] text-[#737373] hover:border-[#14532D]'
              }`}
            >
              <Sun className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-heading font-bold text-sm">Light Mode</div>
                <div className="text-[11px] font-sans opacity-80">Warm Minimalism + Subtle Neo-Brutalism</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode && setDarkMode(true)}
              className={`p-4 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                darkMode
                  ? 'bg-[#14532D] border-[#14532D] text-white font-bold shadow-sm'
                  : 'bg-[#F5F2E9] border-[#D6CDBB] text-[#737373] hover:border-[#14532D]'
              }`}
            >
              <Moon className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-heading font-bold text-sm">Dark Mode</div>
                <div className="text-[11px] font-sans opacity-80">Deep Obsidian & Emerald Dark theme</div>
              </div>
            </button>
          </div>
        </div>

        {/* Language Preferences */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-[#14532D]" />
            <h3 className="font-heading font-bold text-[#171717] text-sm">Language & Dialect</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#737373] mb-1.5">
                Primary Agent Language
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl text-[#171717] font-mono text-xs focus:outline-none focus:border-[#14532D]"
              >
                <option value="English">English (Indian Accent - en-IN)</option>
                <option value="Hindi">हिन्दी (Hindi - hi-IN)</option>
                <option value="Kannada">ಕನ್ನಡ (Kannada - kn-IN)</option>
                <option value="Telugu">తెలుగు (Telugu - te-IN)</option>
                <option value="Tamil">தமிழ் (Tamil - ta-IN)</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#737373] mb-1.5">
                Speech Rate
              </label>
              <select
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl text-[#171717] font-mono text-xs focus:outline-none focus:border-[#14532D]"
              >
                <option value="0.9x">0.9x (Relaxed)</option>
                <option value="1.0x (Natural)">1.0x (Natural - Recommended)</option>
                <option value="1.1x">1.1x (Brisk)</option>
                <option value="1.2x">1.2x (Fast)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conversational AI Sales Persona */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#14532D]" />
            <h3 className="font-heading font-bold text-[#171717] text-sm">Agent Sales Persona</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#737373] mb-1.5">
                Consultative Tone
              </label>
              <select
                value={agentTone}
                onChange={(e) => setAgentTone(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl text-[#171717] font-mono text-xs focus:outline-none focus:border-[#14532D]"
              >
                <option value="Consultative & Professional">Consultative & Professional (DreamSpace Standard)</option>
                <option value="Friendly & Welcoming">Friendly & Welcoming</option>
                <option value="High-Urgency Closing">High-Urgency Closing</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F5F2E9] border border-[#D6CDBB]">
              <div>
                <span className="font-heading font-bold text-[#171717]">Auto-Reserve Site Visits</span>
                <p className="text-[#737373] text-[11px] font-sans">
                  Automatically save walkthrough slots in database upon customer confirmation
                </p>
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

        {/* AI & Infrastructure Connections */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#14532D]" />
            <h3 className="font-heading font-bold text-[#171717] text-sm">AI Pipeline & RAG Connectors</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F5F2E9] border border-[#D6CDBB] flex items-center justify-between">
              <div>
                <span className="font-heading font-bold text-[#171717]">Google Gemini API (Sales Assistant)</span>
                <p className="text-[#737373] text-[11px] font-sans">Active via google-genai SDK (English, Kannada, Hindi)</p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14532D] bg-[#E2F1E7] border border-[#14532D]/20 px-2.5 py-1 rounded-full">
                Active
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F2E9] border border-[#D6CDBB] flex items-center justify-between">
              <div>
                <span className="font-heading font-bold text-[#171717]">Web Speech API & Browser Speech Synthesis</span>
                <p className="text-[#737373] text-[11px] font-sans">Speech-to-Text & Text-to-Speech with feedback suppression</p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14532D] bg-[#E2F1E7] border border-[#14532D]/20 px-2.5 py-1 rounded-full">
                Active
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F2E9] border border-[#D6CDBB] flex items-center justify-between">
              <div>
                <span className="font-heading font-bold text-[#171717]">SentenceTransformers & FAISS Hybrid RAG</span>
                <p className="text-[#737373] text-[11px] font-sans">Semantic search & strict property filtering</p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14532D] bg-[#E2F1E7] border border-[#14532D]/20 px-2.5 py-1 rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-xs font-mono font-bold text-[#14532D] flex items-center gap-1.5 bg-[#E2F1E7] border border-[#14532D]/20 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-[#14532D]" />
              Preferences saved successfully!
            </span>
          )}
          <button
            type="submit"
            className="btn-forest ml-auto px-6 py-2.5 text-xs font-bold transition-all shadow-sm active:translate-y-0.5 cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
