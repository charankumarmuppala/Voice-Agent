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
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">System Settings</h2>
          <span className="neo-badge bg-[#FFDE59] text-[#111111]">
            Configuration
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#111111]/70 mt-1 font-medium font-sans">
          Configure language preferences, agent persona, and backend service connectors.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance & Interface Theme */}
        <div className="neo-card p-6 space-y-4 bg-white">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-[#111111]" />
            <h3 className="font-heading font-extrabold text-[#111111] text-sm">Appearance & Interface Theme</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <button
              type="button"
              onClick={() => setDarkMode && setDarkMode(false)}
              className={`p-4 rounded-sm border-2 border-[#111111] flex items-center gap-3 transition-all text-left cursor-pointer ${
                !darkMode
                  ? 'bg-[#FFDE59] shadow-[3px_3px_0px_#111111] text-[#111111] font-bold'
                  : 'bg-white shadow-[2px_2px_0px_#111111] text-[#111111] hover:bg-[#FFFDF5]'
              }`}
            >
              <Sun className="w-5 h-5 flex-shrink-0 text-[#111111]" />
              <div>
                <div className="font-heading font-black text-sm text-[#111111]">Light Mode</div>
                <div className="text-[11px] font-sans font-medium text-[#111111]/80">Neo-Brutalism High-Contrast UI</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode && setDarkMode(true)}
              className={`p-4 rounded-sm border-2 border-[#111111] flex items-center gap-3 transition-all text-left cursor-pointer ${
                darkMode
                  ? 'bg-[#B4A7FF] shadow-[3px_3px_0px_#111111] text-[#111111] font-bold'
                  : 'bg-white shadow-[2px_2px_0px_#111111] text-[#111111] hover:bg-[#FFFDF5]'
              }`}
            >
              <Moon className="w-5 h-5 flex-shrink-0 text-[#111111]" />
              <div>
                <div className="font-heading font-black text-sm text-[#111111]">Dark Mode</div>
                <div className="text-[11px] font-sans font-medium text-[#111111]/80">Deep Obsidian & Yellow Dark theme</div>
              </div>
            </button>
          </div>
        </div>

        {/* Language Preferences */}
        <div className="neo-card p-6 space-y-4 bg-white">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-[#111111]" />
            <h3 className="font-heading font-extrabold text-[#111111] text-sm">Language & Dialect</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-mono text-[10px] uppercase font-bold tracking-wider text-[#111111] mb-1.5">
                Primary Agent Language
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="neo-input w-full px-3 py-2.5 bg-white text-[#111111] font-mono text-xs font-bold"
              >
                <option value="English">English (Indian Accent - en-IN)</option>
                <option value="Hindi">हिन्दी (Hindi - hi-IN)</option>
                <option value="Kannada">ಕನ್ನಡ (Kannada - kn-IN)</option>
                <option value="Telugu">తెలుగు (Telugu - te-IN)</option>
                <option value="Tamil">தமிழ் (Tamil - ta-IN)</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase font-bold tracking-wider text-[#111111] mb-1.5">
                Speech Rate
              </label>
              <select
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(e.target.value)}
                className="neo-input w-full px-3 py-2.5 bg-white text-[#111111] font-mono text-xs font-bold"
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
        <div className="neo-card p-6 space-y-4 bg-white">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#111111]" />
            <h3 className="font-heading font-extrabold text-[#111111] text-sm">Agent Sales Persona</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-mono text-[10px] uppercase font-bold tracking-wider text-[#111111] mb-1.5">
                Consultative Tone
              </label>
              <select
                value={agentTone}
                onChange={(e) => setAgentTone(e.target.value)}
                className="neo-input w-full px-3 py-2.5 bg-white text-[#111111] font-mono text-xs font-bold"
              >
                <option value="Consultative & Professional">Consultative & Professional (DreamSpace Standard)</option>
                <option value="Friendly & Welcoming">Friendly & Welcoming</option>
                <option value="High-Urgency Closing">High-Urgency Closing</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-sm bg-[#FFFDF5] border-2 border-[#111111]">
              <div>
                <span className="font-heading font-black text-[#111111]">Auto-Reserve Site Visits</span>
                <p className="text-[#111111]/70 text-[11px] font-sans font-medium">
                  Automatically save walkthrough slots in database upon customer confirmation
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoSchedule}
                onChange={(e) => setAutoSchedule(e.target.checked)}
                className="w-4 h-4 accent-[#FFDE59] rounded-sm cursor-pointer border-2 border-[#111111]"
              />
            </div>
          </div>
        </div>

        {/* AI & Infrastructure Connections */}
        <div className="neo-card p-6 space-y-4 bg-white">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#111111]" />
            <h3 className="font-heading font-extrabold text-[#111111] text-sm">AI Pipeline & RAG Connectors</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-sm bg-[#FFFDF5] border-2 border-[#111111] flex items-center justify-between">
              <div>
                <span className="font-heading font-black text-[#111111]">Google Gemini API (Sales Assistant)</span>
                <p className="text-[#111111]/70 text-[11px] font-sans font-medium">Active via google-genai SDK (English, Kannada, Hindi)</p>
              </div>
              <span className="neo-badge bg-[#B8F4B8] text-[#111111]">
                Active
              </span>
            </div>

            <div className="p-3.5 rounded-sm bg-[#FFFDF5] border-2 border-[#111111] flex items-center justify-between">
              <div>
                <span className="font-heading font-black text-[#111111]">Web Speech API & Browser Speech Synthesis</span>
                <p className="text-[#111111]/70 text-[11px] font-sans font-medium">Speech-to-Text & Text-to-Speech with feedback suppression</p>
              </div>
              <span className="neo-badge bg-[#B8F4B8] text-[#111111]">
                Active
              </span>
            </div>

            <div className="p-3.5 rounded-sm bg-[#FFFDF5] border-2 border-[#111111] flex items-center justify-between">
              <div>
                <span className="font-heading font-black text-[#111111]">SentenceTransformers & FAISS Hybrid RAG</span>
                <p className="text-[#111111]/70 text-[11px] font-sans font-medium">Semantic search & strict property filtering</p>
              </div>
              <span className="neo-badge bg-[#B8F4B8] text-[#111111]">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="neo-badge bg-[#B8F4B8] text-[#111111] px-3 py-1.5 flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#111111]" />
              Preferences saved successfully!
            </span>
          )}
          <button
            type="submit"
            className="neo-btn neo-btn-yellow ml-auto px-6 py-2.5 text-xs font-bold"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
