import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Languages,
  Sparkles,
  User,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Volume2,
  VolumeX,
  AlertCircle,
  Clock,
  Calendar,
  Radio,
  Mail
} from 'lucide-react';
import {
  startCall,
  sendCallMessage,
  sendCallAudio,
  synthesizeSpeech,
  endCall,
  fetchProperties,
  formatINR
} from '../services/api';

// Adaptive silence detection thresholds
// Complete sentence: ~1 second (1000 - 1200ms)
// Incomplete sentence: up to 5-6 seconds (5200ms)
const COMPLETE_SILENCE_TIMEOUT_MS = 1100;
const INCOMPLETE_SILENCE_TIMEOUT_MS = 5200;

// Trailing connector words indicating an incomplete sentence across supported languages
const INCOMPLETE_TRAILING_WORDS = new Set([
  // English prepositions, conjunctions, auxiliary verbs, articles
  'for', 'in', 'around', 'at', 'with', 'and', 'or', 'to', 'of', 'under', 'near',
  'about', 'is', 'am', 'are', 'my', 'the', 'a', 'an', 'that', 'which', 'because',
  'so', 'but', 'if', 'when', 'where', 'like', 'than', 'into', 'by', 'as',
  // Hindi (Romanized & Devanagari)
  'mein', 'me', 'par', 'ka', 'ki', 'ke', 'aur', 'ya', 'lekin', 'jo', 'ko', 'se', 'hai', 'hote', 'chahiye',
  'में', 'पर', 'का', 'की', 'के', 'और', 'या', 'लेकिन', 'जो', 'को', 'से', 'है', 'चाहिए',
  // Telugu (Romanized & Telugu script)
  'lo', 'nunchi', 'mariyu', 'leka', 'daggara', 'kuda', 'kani', 'gurinchi', 'kosam', 'kavale',
  'కోసం', 'లో', 'నుంచి', 'మరియు', 'లేదా', 'దగ్గర', 'కూడా', 'కానీ', 'గురించి', 'కావాలి',
  // Kannada (Romanized & Kannada script)
  'alli', 'inda', 'mattu', 'athava', 'hatthira', 'bagge', 'adare', 'beku',
  'ನಲ್ಲಿ', 'ಇಂದ', 'ಮತ್ತು', 'ಅಥವಾ', 'ಹತ್ತಿರ', 'ಬಗ್ಗೆ', 'ಆದರೆ', 'ಬೇಕು',
  // Tamil (Romanized & Tamil script)
  'il', 'la', 'mattum', 'alladhu', 'kithe', 'patri', 'vendum',
  'இல்', 'மற்றும்', 'அல்லது', 'பற்றி', 'வேண்டும்'
]);

// Incomplete phrase suffixes (e.g. "I am looking for...", "want to...")
const INCOMPLETE_PHRASES = [
  'looking for', 'looking to', 'want to', 'planning to', 'can you', 'could you',
  'what about', 'how much', 'i need', 'i want', 'i am looking', 'budget is',
  'location is', 'my budget', 'my name is', 'dekh raha', 'dekh rahi',
  'chustunnanu', 'chustunnam', 'noduttiddene', 'parkkiren'
];

// Short complete acknowledgments and standalone answers
const SHORT_COMPLETE_RESPONSES = new Set([
  'yes', 'no', 'yeah', 'yep', 'nope', 'sure', 'okay', 'ok', 'fine', 'done',
  'thanks', 'thank you', 'bye', 'goodbye', 'alvida', 'namaste', 'namaskara',
  'haan', 'nahi', 'nahin', 'theek hai', 'avunu', 'kaadu', 'sare', 'haudu', 'illa',
  'aamaam', 'illai', 'seri', 'selavu', 'hello', 'hi', 'hey'
]);

function isSentenceComplete(text) {
  if (!text || !text.trim()) return false;
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Terminal punctuation strongly indicates sentence completion
  if (/[.!?।]$/.test(clean)) return true;

  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const lastWord = words[words.length - 1].replace(/[.,!?;:()]/g, '');

  // 2. Trailing incomplete words (e.g., "I am looking for...", "budget around...")
  if (INCOMPLETE_TRAILING_WORDS.has(lastWord)) return false;

  // 3. Trailing incomplete phrases
  for (const phrase of INCOMPLETE_PHRASES) {
    if (lower.endsWith(phrase)) return false;
  }

  // 4. Standalone complete short acknowledgments / responses
  if (SHORT_COMPLETE_RESPONSES.has(lower) || (words.length <= 2 && words.every((w) => SHORT_COMPLETE_RESPONSES.has(w)))) {
    return true;
  }

  // 5. Complete real estate requirements (e.g., "3 BHK", "1.5 Cr", "Saturday 10 AM", 10-digit phone)
  const hasBHK = /\b\d\s*bhk\b|\bvilla\b|\bplot\b|\bapartment\b|\bflat\b/.test(lower);
  const hasBudget = /\b\d+(\.\d+)?\s*(cr|crore|crores|lakh|lakhs|k|lac|lacs)\b/.test(lower);
  const hasDateOrTime = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|this weekend|next week|morning|evening|afternoon|\d{1,2}(:\d{2})?\s*(am|pm))\b/.test(lower);
  const hasPhone = /\b\d{10}\b/.test(clean);

  if (hasBHK || hasBudget || hasDateOrTime || hasPhone) {
    return true;
  }

  // 6. Natural sentence structure: >= 3 words without trailing prepositions
  if (words.length >= 3) {
    return true;
  }

  return false;
}

function cleanSpeechText(text) {
  if (!text) return '';
  return text
    .replace(/[*#_`~]/g, '') // remove markdown symbols
    .replace(/https?:\/\/\S+/g, '') // remove urls
    .replace(/\s+/g, ' ')
    .trim();
}

export default function VoiceAgent({ onVisitBooked, darkMode }) {
  const [callActive, setCallActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [language, setLanguage] = useState('English');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Live accumulated speech fragment & silence indicator
  const [liveHeardText, setLiveHeardText] = useState('');
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  const [sentenceStatus, setSentenceStatus] = useState('Listening...');
  const [isSentenceCompleteState, setIsSentenceCompleteState] = useState(false);

  // Web Speech API Support flags
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState(null);

  // Live Messages Transcript
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'agent',
      text: "Namaskara! Welcome to DreamSpace Properties. May I know your name?",
      time: 'Ready'
    }
  ]);

  // Detected customer profile from Gemini
  const [profile, setProfile] = useState({
    customer_name: 'Prospective Buyer',
    customer_phone: null,
    conv_state: 'GREET',
    location: null,
    bhk: null,
    budget: null,
    timeline: null,
    visit_interest: 'Unknown',
    visit_slot: null,
    booking_ready: false,
    call_ended: false,
    sentiment: 'Positive',
    lead_score: 75,
    intent: 'Bangalore Real Estate Inquiry',
    language: 'English'
  });

  const [bookingId, setBookingId] = useState(null);
  const [recommended, setRecommended] = useState([]);

  // Refs for continuous accumulation, silence detection & audio feedback prevention
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const callActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const sessionIdRef = useRef(null);
  const languageRef = useRef(language);
  const transcriptContainerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);

  // Speech accumulation buffer and silence timer refs
  const speechFragmentsRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const currentAudioRef = useRef(null);

  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Active call duration timer
  useEffect(() => {
    let interval = null;
    if (callActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callActive]);

  function formatDuration(sec) {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted && recognitionRef.current) {
      clearSilenceTimers();
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    } else if (!isMuted && callActive && !isSpeakingRef.current) {
      startListening();
    }
  }, [isMuted, callActive]);

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Check speech recognition support and voice loading on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }

    // Ensure voices are loaded in Chrome/Edge
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    loadDefaultRecommendations();

    return () => {
      clearSilenceTimers();
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function loadDefaultRecommendations() {
    try {
      const data = await fetchProperties({ page_size: 3 });
      setRecommended(data.properties || []);
    } catch (e) {
      console.error('Error fetching initial recommendations:', e);
    }
  }

  function clearSilenceTimers() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSilenceCountdown(0);
  }

  // Language mapping to BCP-47 codes
  function getLangCode(lang) {
    const lower = (lang || '').toLowerCase();
    if (lower.includes('telugu')) return 'te-IN';
    if (lower.includes('kannada')) return 'kn-IN';
    if (lower.includes('hindi')) return 'hi-IN';
    if (lower.includes('tamil')) return 'ta-IN';
    return 'en-IN';
  }

  // Professional Native Female Voice Selection
  function selectFemaleVoice(targetLangCode, text = '') {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Direct script-based detection for 100% pronunciation fidelity
    let effectiveCode = targetLangCode;
    if (/[\u0C00-\u0C7F]/.test(text)) effectiveCode = 'te-IN'; // Telugu
    else if (/[\u0C80-\u0CFF]/.test(text)) effectiveCode = 'kn-IN'; // Kannada
    else if (/[\u0900-\u097F]/.test(text)) effectiveCode = 'hi-IN'; // Hindi
    else if (/[\u0B80-\u0BFF]/.test(text)) effectiveCode = 'ta-IN'; // Tamil

    const langPrefix = effectiveCode.split('-')[0].toLowerCase();
    const nativeVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));

    if (nativeVoices.length === 0) {
      // NEVER use an English voice to pronounce Hindi, Telugu, Kannada or Tamil text!
      return null;
    }

    const femaleKeywords = [
      'swara', 'shruti', 'sapna', 'pallavi', 'neerja', 'heera', 'kalpana', 'ananya',
      'veena', 'female', 'woman', 'girl', 'natural', 'zira', 'susan', 'hazel', 'google हिन्दी'
    ];
    const maleKeywords = ['male', 'ravi', 'david', 'george', 'mark', 'guy', 'pradeep', 'madhav'];

    // 1. Look for explicitly female voice in the native language
    const femaleMatch = nativeVoices.find((v) => {
      const nameLower = v.name.toLowerCase();
      const isFem = femaleKeywords.some((k) => nameLower.includes(k));
      const isMale = maleKeywords.some((k) => nameLower.includes(k));
      return isFem && !isMale;
    });
    if (femaleMatch) return femaleMatch;

    // 2. Pick any non-male voice in the native language
    const nonMaleMatch = nativeVoices.find((v) => {
      const nameLower = v.name.toLowerCase();
      return !maleKeywords.some((k) => nameLower.includes(k));
    });
    if (nonMaleMatch) return nonMaleMatch;

    // 3. Fallback to native language voice (never cross into English)
    return nativeVoices[0];
  }

  // Text-to-Speech using ElevenLabs API first with seamless browser SpeechSynthesis fallback
  async function speakResponse(text, onEndCallback) {
    const cleanedText = cleanSpeechText(text);
    if (!cleanedText) {
      if (onEndCallback) onEndCallback();
      return;
    }

    clearSilenceTimers();

    // STRICT FEEDBACK PREVENTION: Immediately lock speaking ref and stop microphone before audio starts
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      } catch (e) {}
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const cleanupAndResume = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);

      if (onEndCallback) {
        onEndCallback();
        return;
      }
      // Resume listening after 400ms echo suppression buffer so room reverb dies out
      if (callActiveRef.current && !isMutedRef.current) {
        setTimeout(() => {
          if (callActiveRef.current && !isMutedRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }, 400);
      }
    };

    // 1. Try ElevenLabs Neural TTS
    try {
      const audioBlob = await synthesizeSpeech(cleanedText, languageRef.current);
      if (!callActiveRef.current && !onEndCallback) {
        cleanupAndResume();
        return;
      }
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
        cleanupAndResume();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
        fallbackBrowserTTS();
      };

      await audio.play();
      return;
    } catch (err) {
      console.warn('ElevenLabs TTS unavailable, falling back to browser TTS:', err);
    }

    // 2. Fallback to browser Web Speech Synthesis
    function fallbackBrowserTTS() {
      if (!('speechSynthesis' in window)) {
        cleanupAndResume();
        return;
      }
      const targetLangCode = getLangCode(languageRef.current);
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = targetLangCode;
      utterance.rate = 0.96;
      utterance.pitch = 1.05;

      const femaleVoice = selectFemaleVoice(targetLangCode, cleanedText);
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onend = cleanupAndResume;
      utterance.onerror = (e) => {
        console.warn('TTS utterance event:', e);
        cleanupAndResume();
      };

      window.speechSynthesis.speak(utterance);
    }

    fallbackBrowserTTS();
  }

  // Submit buffered speech after adaptive silence window
  function submitBufferedSpeech() {
    clearSilenceTimers();
    if (isSubmittingRef.current || isSpeakingRef.current) return;

    const fullMessage = speechFragmentsRef.current.join(' ').replace(/\s+/g, ' ').trim();
    speechFragmentsRef.current = [];
    setLiveHeardText('');
    setSilenceCountdown(0);
    setSentenceStatus('Processing speech...');

    let audioBlob = null;
    if (audioChunksRef.current && audioChunksRef.current.length > 0) {
      try {
        audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      } catch (e) {
        audioBlob = null;
      }
      audioChunksRef.current = [];
    }

    if (fullMessage || (audioBlob && audioBlob.size > 2000)) {
      isSubmittingRef.current = true;
      processUserMessage(fullMessage, audioBlob);
    }
  }

  // Initialize and start continuous Speech-to-Text with adaptive silence detection
  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || isMutedRef.current || !callActiveRef.current || isSpeakingRef.current) return;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = getLangCode(languageRef.current);
      recognition.continuous = true; // Continuous listening across multiple phrases
      recognition.interimResults = true; // Capture real-time fragments

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        isSubmittingRef.current = false;
      };

      recognition.onresult = (event) => {
        // Prevent microphone feedback if agent is currently speaking
        if (isSpeakingRef.current) return;

        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sessionFinal += ' ' + trans;
          } else {
            sessionInterim += ' ' + trans;
          }
        }

        const newFragment = (sessionFinal + ' ' + sessionInterim).trim();
        if (newFragment) {
          // Accumulate speech fragments
          if (sessionFinal.trim()) {
            speechFragmentsRef.current.push(sessionFinal.trim());
          }

          const combinedAll = [
            ...speechFragmentsRef.current,
            sessionInterim.trim()
          ].filter(Boolean).join(' ').trim();

          setLiveHeardText(combinedAll);

          // Reset existing silence timer on every new speech fragment
          clearSilenceTimers();

          // Adaptive silence detection:
          // Complete sentence -> ~1 second (1100ms)
          // Incomplete sentence -> up to 5-6 seconds (5200ms)
          const complete = isSentenceComplete(combinedAll);
          setIsSentenceCompleteState(complete);
          const timeoutMs = complete ? COMPLETE_SILENCE_TIMEOUT_MS : INCOMPLETE_SILENCE_TIMEOUT_MS;
          const totalSeconds = Math.max(1, Math.round(timeoutMs / 1000));
          setSilenceCountdown(totalSeconds);
          setSentenceStatus(
            complete
              ? 'Complete sentence • Sending in ~1s'
              : 'Incomplete sentence • Waiting up to 5s'
          );

          let remaining = totalSeconds;
          countdownIntervalRef.current = setInterval(() => {
            remaining -= 1;
            if (remaining >= 0) {
              setSilenceCountdown(remaining);
            }
          }, 1000);

          silenceTimerRef.current = setTimeout(() => {
            submitBufferedSpeech();
          }, timeoutMs);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setIsListening(false);
          setSpeechError('Microphone access denied. You can continue speaking via text fallback below.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // If call is still active, not muted, and agent is not speaking, keep listening
        if (callActiveRef.current && !isMutedRef.current && !isSpeakingRef.current) {
          setTimeout(() => {
            if (callActiveRef.current && !isMutedRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 200);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start error:', err);
      setIsListening(false);
    }
  }

  // Start Call Session
  async function handleStartCall() {
    try {
      clearSilenceTimers();
      speechFragmentsRef.current = [];
      setLiveHeardText('');
      setSentenceStatus('Listening...');
      setIsSentenceCompleteState(false);
      setIsTyping(true);

      const res = await startCall({
        language,
        customer_name: profile.customer_name || 'Prospective Buyer'
      });

      setSessionId(res.session_id);
      sessionIdRef.current = res.session_id;
      setCallActive(true);
      callActiveRef.current = true;

      if (res.initial_profile) {
        setProfile(res.initial_profile);
      }

      setMessages([
        {
          id: Date.now(),
          sender: 'agent',
          text: res.greeting,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // Speak greeting with native female voice and start microphone listening
      speakResponse(res.greeting);
    } catch (err) {
      console.error('Failed to start call:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'system',
          text: 'Unable to connect to AI voice backend. Text fallback active.',
          time: 'Error'
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  // End Call Session
  async function handleEndCall() {
    clearSilenceTimers();
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    speechFragmentsRef.current = [];
    setLiveHeardText('');
    setSentenceStatus('Call ended');
    setIsSentenceCompleteState(false);
    callActiveRef.current = false;
    setCallActive(false);

    // Stop TTS and STT immediately
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      } catch (e) {}
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (sessionIdRef.current) {
      try {
        const endRes = await endCall(sessionIdRef.current);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: 'system',
            text: `Call ended (${endRes.duration_seconds}s). Summary: ${endRes.summary} [Outcome: ${endRes.outcome}]`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        if (endRes.final_profile) {
          setProfile(endRes.final_profile);
        }
      } catch (err) {
        console.error('Error ending call:', err);
      }
    }
  }

  // Process User Input (Voice STT, Audio recording, or Typed Text)
  async function processUserMessage(text, audioBlob = null) {
    if (!text && !audioBlob) {
      isSubmittingRef.current = false;
      return;
    }
    const initialText = text ? text.trim() : '🎤 [Processing voice audio...]';
    const userMsgId = Date.now();

    // Append user message
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: initialText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    setIsTyping(true);

    try {
      let currentSid = sessionIdRef.current;
      if (!currentSid) {
        const startRes = await startCall({ language });
        currentSid = startRes.session_id;
        setSessionId(currentSid);
        sessionIdRef.current = currentSid;
        setCallActive(true);
        callActiveRef.current = true;
      }

      // If audioBlob is present and sizeable (>2KB), send to backend Multilingual Audio STT endpoint
      let res;
      if (audioBlob && audioBlob.size > 2000) {
        try {
          res = await sendCallAudio(currentSid, audioBlob);
          if (res.transcript) {
            // Update the user message with verbatim transcript from Faster-Whisper / Gemini
            setMessages((prev) =>
              prev.map((m) => (m.id === userMsgId ? { ...m, text: res.transcript } : m))
            );
          }
        } catch (audioErr) {
          console.warn('Audio endpoint fallback to text endpoint:', audioErr);
          if (text) {
            res = await sendCallMessage(currentSid, text.trim());
          } else {
            throw audioErr;
          }
        }
      } else {
        res = await sendCallMessage(currentSid, text.trim());
      }

      // Dynamic Multilingual Conversation Switching:
      // If customer switched languages during conversation (e.g. English -> Telugu / Hindi / Kannada / Tamil),
      // adapt immediately without restarting the conversation and preserving all extracted data!
      if (res.detected_language && res.detected_language !== languageRef.current) {
        setLanguage(res.detected_language);
        languageRef.current = res.detected_language;
        if (recognitionRef.current) {
          try {
            recognitionRef.current.lang = getLangCode(res.detected_language);
          } catch (e) {}
        }
      }

      // Append Gemini response in native script
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: res.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // Update customer profile with extracted facts
      if (res.extracted_profile) {
        setProfile((prev) => ({ ...prev, ...res.extracted_profile }));
      }

      // Show booking confirmation in transcript ONLY ONCE if newly saved
      if (res.appointment_id && !bookingId) {
        setBookingId(res.appointment_id);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            sender: 'system',
            text: `✅ Appointment booked in background! Booking ID: ${res.appointment_id}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }

      // Update recommended properties from DB
      if (res.recommended_properties && res.recommended_properties.length > 0) {
        setRecommended(res.recommended_properties);
      }

      // Speak response with native female voice
      if (res.call_ended) {
        speakResponse(res.reply, () => {
          handleEndCall();
        });
      } else {
        speakResponse(res.reply);
      }
    } catch (err) {
      console.error('Error processing message:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: "I'm having a brief connection delay with our Bangalore server. Could you repeat your preferred location and budget?",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
      isSubmittingRef.current = false;
    }
  }

  function handleSendForm(e) {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const txt = inputText.trim();
    setInputText('');
    clearSilenceTimers();
    speechFragmentsRef.current = [];
    setLiveHeardText('');
    processUserMessage(txt);
  }

  // Multilingual sample prompt chips covering English, Telugu, Hindi, Kannada, Tamil and dynamic switching
  const samplePrompts = [
    "Looking for a 3 BHK in Whitefield around 1.5 Cr",
    "నాకు వైట్‌ఫీల్డ్‌లో 3 BHK ఫ్లాట్ కావాలి (Whitefield 3 BHK kavali)",
    "मुझे व्हाइटफील्ड में 3 BHK फ्लैट चाहिए (Whitefield me 3 BHK chahiye)",
    "ನನಗೆ ಸರ್ಜಾಪುರದಲ್ಲಿ 2 BHK ಮನೆ ಬೇಕು (Sarjapur 2 BHK mane beku)",
    "எனக்கு ஒயிட்பீல்டில் 3 BHK வீடு வேண்டும் (Whitefield 3 BHK veedu vendum)",
    "Can we speak in Telugu? / English lo matladandi",
    "Saturday 11 AM ki visit schedule cheddama?"
  ];

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Speech Support or Error Alert */}
      {(!speechSupported || speechError) && (
        <div className="neo-card bg-[#FF8A80]/20 dark:bg-[#FF8A80]/10 border-2 border-[#111111] dark:border-[#E5E5E5] text-[#111111] dark:text-[#F5F5F5] px-4 py-3 rounded-sm flex items-center justify-between text-xs font-mono font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#111111] dark:text-[#FF8A80] flex-shrink-0" />
            <span>
              {!speechSupported
                ? 'Web Speech API is not natively supported in this browser. Text input fallback is active below.'
                : speechError}
            </span>
          </div>
          <span className="neo-badge bg-[#FF8A80] text-[#111111] dark:border-[#E5E5E5]">Text Fallback Active</span>
        </div>
      )}

      {/* Top Banner & Call Controls */}
      <div className="neo-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5]">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div
            className={`w-14 h-14 rounded-sm flex items-center justify-center transition-all duration-300 border-2 border-[#111111] dark:border-[#E5E5E5] shadow-[3px_3px_0px_#111111] dark:shadow-[3px_3px_0px_#E5E5E5] ${
              isSpeaking
                ? 'bg-[#FFDE59] text-[#111111]'
                : isListening
                ? 'bg-[#B4A7FF] text-[#111111]'
                : callActive
                ? 'bg-[#B8F4B8] text-[#111111]'
                : 'bg-[#FFFDF5] dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5]'
            }`}
          >
            {isSpeaking ? (
              <Volume2 className="w-7 h-7 animate-pulse text-[#111111]" />
            ) : isListening ? (
              <Mic className="w-7 h-7 text-[#111111] animate-pulse" />
            ) : isMuted ? (
              <MicOff className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            ) : (
              <Mic className="w-7 h-7 text-[#111111] dark:text-[#F5F5F5]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-heading font-black text-[#111111] dark:text-[#F5F5F5] tracking-tight">EstateVoice AI Assistant</h2>
              <span
                className={`neo-badge ${
                  isSpeaking
                    ? 'bg-[#FFDE59] text-[#111111] animate-pulse dark:border-[#E5E5E5]'
                    : isListening
                    ? 'bg-[#B4A7FF] text-[#111111] dark:border-[#E5E5E5]'
                    : callActive
                    ? 'bg-[#B8F4B8] text-[#111111] dark:border-[#E5E5E5]'
                    : 'bg-white dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] dark:border dark:border-[#E5E5E5]'
                }`}
              >
                {isSpeaking
                  ? 'FEMALE AI SPEAKING'
                  : isListening
                  ? 'LISTENING (PAUSE 5S TO SUBMIT)'
                  : callActive
                  ? 'CALL ACTIVE'
                  : 'READY TO CONNECT'}
              </span>
              {callActive && (
                <span className="neo-badge bg-[#111111] dark:bg-[#181818] text-[#FFDE59] dark:border dark:border-[#E5E5E5] inline-flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#FFDE59] animate-pulse" />
                  {formatDuration(callDuration)}
                </span>
              )}
            </div>
            <p className="text-xs text-[#111111]/70 dark:text-[#B3B3B3] mt-1 font-sans font-medium">
              Multilingual Real Estate Voice Agent • English, Hindi, Kannada, Telugu, Tamil
            </p>
          </div>
        </div>

        {/* Controls: Waveform, Language, Mute, Call Start/End */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Animated Voice Waveform Indicator */}
          <div className="flex items-center gap-1 h-9 px-3 py-1 bg-white dark:bg-[#181818] rounded-sm border-2 border-[#111111] dark:border-[#E5E5E5] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5]">
            <div className={`w-1.5 rounded-none transition-all ${isSpeaking ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-1' : isListening ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-1' : 'bg-[#111111]/30 dark:bg-[#F5F5F5]/30 h-2'}`} />
            <div className={`w-1.5 rounded-none transition-all ${isSpeaking ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-2' : isListening ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-2' : 'bg-[#111111]/30 dark:bg-[#F5F5F5]/30 h-3'}`} />
            <div className={`w-1.5 rounded-none transition-all ${isSpeaking ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-3' : isListening ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-3' : 'bg-[#111111]/30 dark:bg-[#F5F5F5]/30 h-5'}`} />
            <div className={`w-1.5 rounded-none transition-all ${isSpeaking ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-4' : isListening ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-4' : 'bg-[#111111]/30 dark:bg-[#F5F5F5]/30 h-3'}`} />
            <div className={`w-1.5 rounded-none transition-all ${isSpeaking ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-5' : isListening ? 'bg-[#111111] dark:bg-[#FFDE59] animate-wave-bar-5' : 'bg-[#111111]/30 dark:bg-[#F5F5F5]/30 h-2'}`} />
            <span className="font-mono text-[10px] uppercase font-bold text-[#111111] dark:text-[#F5F5F5] ml-1.5 hidden sm:inline">
              {isSpeaking ? 'AI Output' : isListening ? 'Mic Active' : 'Standby'}
            </span>
          </div>

          {/* Dynamic Auto-Detect Language Badge & Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#181818] border-2 border-[#111111] dark:border-[#E5E5E5] rounded-sm px-2.5 py-1.5 text-xs font-mono font-bold text-[#111111] dark:text-[#F5F5F5] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5]">
            <Languages className="w-4 h-4 text-[#111111] dark:text-[#FFDE59]" />
            <span className="text-[10px] text-[#111111]/70 dark:text-[#B3B3B3] uppercase font-bold">Auto:</span>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                languageRef.current = e.target.value;
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.lang = getLangCode(e.target.value);
                  } catch (err) {}
                }
              }}
              className="bg-transparent border-none focus:outline-none text-xs cursor-pointer font-mono font-bold text-[#111111] dark:text-[#F5F5F5]"
              title="Automatic language detection active. You may also select a starting language."
            >
              <option value="English" className="dark:bg-[#181818] dark:text-[#F5F5F5]">English (en-IN)</option>
              <option value="Hindi" className="dark:bg-[#181818] dark:text-[#F5F5F5]">हिन्दी (Hindi - hi-IN)</option>
              <option value="Telugu" className="dark:bg-[#181818] dark:text-[#F5F5F5]">తెలుగు (Telugu - te-IN)</option>
              <option value="Kannada" className="dark:bg-[#181818] dark:text-[#F5F5F5]">ಕನ್ನಡ (Kannada - kn-IN)</option>
              <option value="Tamil" className="dark:bg-[#181818] dark:text-[#F5F5F5]">தமிழ் (Tamil - ta-IN)</option>
            </select>
          </div>

          {/* Mute toggle with feedback prevention */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            disabled={!callActive}
            className={`neo-btn p-2.5 rounded-sm dark:border-[#E5E5E5] ${
              !callActive
                ? 'opacity-40 cursor-not-allowed bg-white dark:bg-[#181818] dark:text-[#B3B3B3]'
                : isMuted
                ? 'bg-[#FF8A80] text-[#111111]'
                : 'neo-btn-white dark:bg-[#181818] dark:text-[#F5F5F5]'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-[#111111]" /> : <Mic className="w-4 h-4 text-[#111111] dark:text-[#F5F5F5]" />}
          </button>

          {/* Start / End Call */}
          {!callActive ? (
            <button
              onClick={handleStartCall}
              className="neo-btn neo-btn-yellow dark:border-[#E5E5E5] px-5 py-2.5 text-xs font-bold gap-2"
            >
              <Phone className="w-4 h-4 text-[#111111]" />
              Start Voice Call
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="neo-btn bg-[#FF8A80] hover:bg-rose-400 text-[#111111] dark:border-[#E5E5E5] px-5 py-2.5 text-xs font-bold gap-2"
            >
              <PhoneOff className="w-4 h-4 text-[#111111]" />
              End Call
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Transcript vs Customer Profile & Recommended Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Conversation Stream */}
        <div className="lg:col-span-2 neo-card flex flex-col h-[620px] overflow-hidden bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5]">
          {/* Transcript Header */}
          <div className="p-4 border-b-2 border-[#111111] dark:border-[#E5E5E5] flex items-center justify-between bg-[#FFDE59]">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full border border-[#111111] ${
                  isSpeaking ? 'bg-[#111111] animate-ping' : isListening ? 'bg-[#111111] animate-pulse' : 'bg-[#111111]/40'
                }`}
              />
              <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#111111]">
                Live Conversation Stream
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#111111] font-bold">
              {callActive && (
                <>
                  <span className="text-[#111111] font-black flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#111111]" />
                    {formatDuration(callDuration)}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>Session: {sessionId || 'Inactive'}</span>
              <span>•</span>
              <span className="neo-badge bg-white text-[#111111] text-[9px] px-1.5 py-0.5">{language}</span>
            </div>
          </div>

          {/* Transcript Message Scroll */}
          <div ref={transcriptContainerRef} className="flex-1 p-5 overflow-y-auto space-y-4 bg-white dark:bg-[#1E1E1E]">
            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="neo-badge bg-[#FFFDF5] dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] dark:border dark:border-[#E5E5E5] inline-block">
                      {msg.text} • {msg.time}
                    </span>
                  </div>
                );
              }

              const isAgent = msg.sender === 'agent';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isAgent ? 'justify-start' : 'justify-end'}`}
                >
                  {isAgent && (
                    <div className="w-8 h-8 rounded-sm bg-[#FFDE59] text-[#111111] flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 border-[#111111] dark:border-[#E5E5E5] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5]">
                      <Sparkles className="w-4 h-4 text-[#111111]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-sm p-4 text-xs leading-relaxed border-2 border-[#111111] dark:border-[#E5E5E5] ${
                      isAgent
                        ? 'bg-[#FFFDF5] dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5]'
                        : 'bg-[#FFDE59] text-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="font-mono font-black text-[10px] uppercase tracking-wider text-[#111111] dark:text-[#FFDE59]">
                        {isAgent ? 'EstateVoice Sales AI' : 'Buyer'}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[#111111]/70 dark:text-[#B3B3B3]">
                        {msg.time}
                      </span>
                    </div>
                    <p className="font-sans text-xs leading-relaxed font-medium">{msg.text}</p>
                  </div>

                  {!isAgent && (
                    <div className="w-8 h-8 rounded-sm bg-[#B4A7FF] border-2 border-[#111111] dark:border-[#E5E5E5] text-[#111111] flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5]">
                      <User className="w-4 h-4 text-[#111111]" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live speech accumulation feedback with adaptive silence indicator */}
            {liveHeardText && (
              <div className="p-3.5 rounded-sm bg-[#FFFDF5] dark:bg-[#181818] border-2 border-[#111111] dark:border-[#E5E5E5] text-xs font-mono text-[#111111] dark:text-[#F5F5F5] space-y-2 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5] animate-pulse">
                <div className="flex items-center justify-between font-black text-[11px] uppercase tracking-wider flex-wrap gap-2">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFDE59] animate-ping" />
                    {sentenceStatus}
                  </span>
                  <span
                    className={`neo-badge ${
                      isSentenceCompleteState
                        ? 'bg-[#B8F4B8] text-[#111111] dark:border-[#E5E5E5]'
                        : 'bg-[#FFDE59] text-[#111111] dark:border-[#E5E5E5]'
                    }`}
                  >
                    {isSentenceCompleteState ? `Quick Submit: ${silenceCountdown}s` : `Waiting: ${silenceCountdown}s`}
                  </span>
                </div>
                <p className="text-xs text-[#111111] dark:text-[#F5F5F5] font-sans font-medium italic bg-white dark:bg-[#121212] p-2.5 rounded-sm border-2 border-[#111111] dark:border-[#E5E5E5]">
                  "{liveHeardText}"
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                  <span className="text-[#111111]/70 dark:text-[#B3B3B3]">
                    {isSentenceCompleteState
                      ? '✓ Complete thought detected — submitting in ~1s'
                      : '... Incomplete thought — pausing up to 5s for more words'}
                  </span>
                  <button
                    onClick={submitBufferedSpeech}
                    className="neo-btn neo-btn-yellow dark:border-[#E5E5E5] px-3 py-1 text-[10px] font-mono font-bold"
                  >
                    Send Now
                  </button>
                </div>
              </div>
            )}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#111111] dark:text-[#F5F5F5] italic">
                <span className="w-2 h-2 rounded-full bg-[#111111] dark:bg-[#FFDE59] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#111111] dark:bg-[#FFDE59] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#111111] dark:bg-[#FFDE59] animate-bounce [animation-delay:0.4s]" />
                Gemini is consulting Bangalore property portfolio...
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Quick Multilingual Prompts */}
          <div className="px-4 py-2.5 border-t-2 border-[#111111] dark:border-[#E5E5E5] bg-[#FFFDF5] dark:bg-[#181818] overflow-x-auto flex gap-2 no-scrollbar">
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(prompt)}
                className="neo-btn neo-btn-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:text-[#F5F5F5] hover:dark:bg-[#252525] text-[11px] font-mono font-bold px-3 py-1 flex-shrink-0 whitespace-nowrap"
              >
                "{prompt}"
              </button>
            ))}
          </div>

          {/* Text Fallback Form */}
          <form
            onSubmit={handleSendForm}
            className="p-3 border-t-2 border-[#111111] dark:border-[#E5E5E5] flex items-center gap-2 bg-white dark:bg-[#1E1E1E]"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak via mic (waits for 5s silence) or type in English, Telugu, Kannada, Hindi, Tamil..."
              className="neo-input flex-1 px-4 py-2.5 text-xs text-[#111111] dark:text-[#F5F5F5] dark:bg-[#181818] dark:border-[#E5E5E5] dark:placeholder-[#A3A3A3] font-medium"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="neo-btn neo-btn-yellow dark:border-[#E5E5E5] p-2.5 rounded-sm disabled:opacity-40"
            >
              <Send className="w-4 h-4 text-[#111111]" />
            </button>
          </form>
        </div>

        {/* Right Column: Customer Profile & Real-time Recommended Properties */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="neo-card p-5 bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-mono font-black uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5] flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#111111] dark:text-[#FFDE59]" />
                Gemini Buyer Profile
              </h4>
              <span className="neo-badge bg-[#FFDE59] text-[#111111] dark:border-[#E5E5E5]">
                Score: {profile.lead_score || 75}/100
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Caller Name</span>
                <span className="font-extrabold text-[#111111] dark:text-[#F5F5F5]">
                  {profile.customer_name || 'Prospective Buyer'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Language</span>
                <span className="font-black text-[#111111] dark:text-[#F5F5F5] font-mono uppercase">
                  {language}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Location</span>
                <span className="font-extrabold text-[#111111] dark:text-[#F5F5F5]">
                  {profile.location || 'Not Specified'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Configuration</span>
                <span className="font-extrabold text-[#111111] dark:text-[#F5F5F5]">
                  {profile.bhk ? `${profile.bhk} BHK` : 'Flexible'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Budget</span>
                <span className="font-extrabold text-[#111111] dark:text-[#F5F5F5]">
                  {profile.budget || 'In Discussion'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Timeline</span>
                <span className="font-extrabold text-[#111111] dark:text-[#F5F5F5]">
                  {profile.timeline || 'Exploring'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Visit Interest</span>
                <span
                  className={`neo-badge ${
                    profile.visit_interest === 'Requested' || profile.visit_interest === 'Interested'
                      ? 'bg-[#B8F4B8] text-[#111111] dark:border-[#E5E5E5]'
                      : 'bg-white dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] dark:border dark:border-[#E5E5E5]'
                  }`}
                >
                  {profile.visit_slot ? `${profile.visit_slot}` : profile.visit_interest || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Sentiment</span>
                <span className="neo-badge bg-[#B8F4B8] text-[#111111] dark:border-[#E5E5E5]">
                  {profile.sentiment || 'Positive'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Stage</span>
                <span className="neo-badge bg-[#FFFDF5] dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] dark:border dark:border-[#E5E5E5]">
                  {profile.conv_state || 'GREET'}
                </span>
              </div>
              {profile.customer_phone && (
                <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Phone</span>
                  <span className="font-mono text-xs font-black text-[#111111] dark:text-[#F5F5F5]">
                    {profile.customer_phone} {profile.phone_confirmed ? '✓' : ''}
                  </span>
                </div>
              )}
              {profile.customer_email && (
                <div className="flex items-center justify-between py-1.5 border-b-2 border-[#111111]/15 dark:border-[#E5E5E5]/20">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Email</span>
                  <span className="font-mono text-xs font-black text-[#111111] dark:text-[#F5F5F5] truncate max-w-[60%]">
                    {profile.customer_email} {profile.email_confirmed ? '✓' : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#111111]/70 dark:text-[#B3B3B3] font-bold">Intent</span>
                <span className="font-black text-[#111111] dark:text-[#F5F5F5] text-right max-w-[60%] truncate font-mono text-xs">
                  {profile.intent || 'Bangalore Inquiry'}
                </span>
              </div>
              {bookingId && (
                <div className="mt-3 p-3 rounded-sm bg-[#B8F4B8] border-2 border-[#111111] dark:border-[#E5E5E5] space-y-1 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#111111] flex-shrink-0" />
                    <div>
                      <div className="text-[10px] font-mono font-black uppercase tracking-wider text-[#111111]">Booking Confirmed</div>
                      <div className="text-[10px] text-[#111111] font-mono font-black">{bookingId}</div>
                    </div>
                  </div>
                  {profile.email_confirmed && (
                    <div className="text-[10px] font-mono font-bold text-[#111111] flex items-center gap-1.5 pl-6">
                      <Mail className="w-3 h-3 text-[#111111]" />
                      <span>Brochure & Visit Pass dispatched</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recommended Properties matching extraction */}
          <div className="neo-card p-5 bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-mono font-black uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#111111] dark:text-[#FFDE59]" />
                Recommended Matches ({recommended.length})
              </h4>
              <span className="neo-badge bg-[#B4A7FF] text-[#111111] dark:border-[#E5E5E5]">
                Live RAG Inventory
              </span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {recommended.length === 0 ? (
                <div className="p-4 text-center rounded-sm bg-[#FFFDF5] dark:bg-[#181818] border-2 border-dashed border-[#111111]/30 dark:border-[#E5E5E5]/30 text-xs font-mono text-[#111111]/70 dark:text-[#B3B3B3] italic font-bold">
                  No properties matched yet. Mention your preferred location, budget, or BHK configuration.
                </div>
              ) : (
                recommended.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3 rounded-sm border-2 border-[#111111] dark:border-[#E5E5E5] bg-[#FFFDF5] dark:bg-[#181818] hover:bg-white dark:hover:bg-[#252525] transition-all flex gap-3 items-center group cursor-pointer shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5] active:translate-x-[1px] active:translate-y-[1px]"
                    onClick={() => {
                      if (callActive) {
                        processUserMessage(`Tell me more about ${prop.name} and can we visit?`);
                      } else if (onVisitBooked) {
                        onVisitBooked(prop);
                      }
                    }}
                  >
                    <img
                      src={prop.image_url}
                      alt={prop.name}
                      className="w-16 h-16 rounded-sm object-cover flex-shrink-0 border-2 border-[#111111] dark:border-[#E5E5E5] group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-extrabold text-[#111111] dark:text-[#F5F5F5] truncate font-heading">{prop.name}</div>
                      <div className="text-[10px] font-mono font-bold text-[#111111]/70 dark:text-[#B3B3B3]">
                        {prop.location} • {prop.bhk} BHK • {prop.property_type}
                      </div>
                      <div className="text-xs font-heading font-black text-[#111111] dark:text-[#FFDE59] mt-1">
                        {formatINR(prop.price)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
