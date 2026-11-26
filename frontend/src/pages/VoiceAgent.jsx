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

export default function VoiceAgent({ onVisitBooked }) {
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
      text: "Namaskara! Welcome to DreamSpace Realty. May I know your name?",
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

  // Text-to-Speech using browser SpeechSynthesis with Feedback Prevention & Natural Female Voice
  function speakResponse(text, onEndCallback) {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }

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

    window.speechSynthesis.cancel();

    const targetLangCode = getLangCode(languageRef.current);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = targetLangCode;
    utterance.rate = 0.96; // Smooth, clear, natural speaking rate
    utterance.pitch = 1.05; // Warm, friendly female pitch

    const femaleVoice = selectFemaleVoice(targetLangCode, cleanedText);
    if (femaleVoice) {
      utterance.voice = femaleVoice;
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

    utterance.onend = cleanupAndResume;
    utterance.onerror = (e) => {
      console.warn('TTS utterance event:', e);
      cleanupAndResume();
    };

    window.speechSynthesis.speak(utterance);
  }

  // Submit buffered speech after adaptive silence window
  function submitBufferedSpeech() {
    clearSilenceTimers();
    if (isSubmittingRef.current || isSpeakingRef.current) return;

    const fullMessage = speechFragmentsRef.current.join(' ').replace(/\s+/g, ' ').trim();
    speechFragmentsRef.current = [];
    setLiveHeardText('');
    setSilenceCountdown(0);
    setSentenceStatus('Listening...');

    if (fullMessage) {
      isSubmittingRef.current = true;
      processUserMessage(fullMessage);
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

  // Process User Input (Voice STT or Typed Text)
  async function processUserMessage(text) {
    if (!text || !text.trim()) {
      isSubmittingRef.current = false;
      return;
    }
    const userText = text.trim();

    // Append user message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'user',
        text: userText,
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

      // Send to FastAPI Gemini endpoint with automatic language detection
      const res = await sendCallMessage(currentSid, userText);

      // Automatic Language Detection update:
      // If customer switched languages, update UI and speech engine to match!
      if (res.detected_language && res.detected_language !== languageRef.current) {
        setLanguage(res.detected_language);
        languageRef.current = res.detected_language;
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

  // Multilingual sample prompt chips covering English, Telugu, Kannada, Hindi
  const samplePrompts = [
    "Looking for a 3 BHK in Whitefield around 1.5 Cr",
    "నాకు వైట్‌ఫీల్డ్‌లో 3 BHK ఫ్లాట్ కావాలి (Whitefield 3 BHK)",
    "ನನಗೆ ಸರ್ಜಾಪುರದಲ್ಲಿ ವಿಲ್ಲಾ ಬೇಕು (Sarjapur Villa)",
    "इलेक्ट्रॉनिक सिटी में 2 BHK फ्लैट का बजट क्या है?",
    "Can I schedule a visit for Prestige Willow Park this Saturday?"
  ];

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Speech Support or Error Alert */}
      {(!speechSupported || speechError) && (
        <div className="bg-[#FFF1CC] border border-[#E5D8A8] text-[#171717] px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              {!speechSupported
                ? 'Web Speech API is not natively supported in this browser. Text input fallback is active below.'
                : speechError}
            </span>
          </div>
          <span className="font-semibold text-amber-800 uppercase tracking-wider">Text Fallback Active</span>
        </div>
      )}

      {/* Top Banner & Call Controls */}
      <div className="bento-card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
              isSpeaking
                ? 'bg-[#14532D] text-white ring-4 ring-[#E2F1E7] border-[#14532D]'
                : isListening
                ? 'bg-[#14532D] text-white ring-4 ring-[#FFF1CC] border-[#14532D]'
                : callActive
                ? 'bg-[#14532D] text-white border-[#14532D]'
                : 'bg-[#F5F2E9] border-[#D6CDBB] text-[#171717]'
            }`}
          >
            {isSpeaking ? (
              <Volume2 className="w-7 h-7 animate-pulse text-[#E2F1E7]" />
            ) : isListening ? (
              <Mic className="w-7 h-7 text-[#FFF1CC] animate-pulse" />
            ) : isMuted ? (
              <MicOff className="w-7 h-7 text-rose-500" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-heading font-bold text-[#171717] tracking-tight">EstateVoice AI Assistant</h2>
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isSpeaking
                    ? 'bg-[#E2F1E7] text-[#14532D] border-[#14532D]/20 animate-pulse'
                    : isListening
                    ? 'bg-[#FFF1CC] text-[#854D0E] border-[#E5D8A8]'
                    : callActive
                    ? 'bg-[#E2F1E7] text-[#14532D] border-[#14532D]/20'
                    : 'bg-[#F5F2E9] text-[#737373] border-[#D6CDBB]'
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
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-[#14532D] text-white border border-[#14532D]">
                  <Clock className="w-3 h-3 text-[#E2F1E7] animate-pulse" />
                  {formatDuration(callDuration)}
                </span>
              )}
            </div>
            <p className="text-xs text-[#737373] mt-1 font-sans">
              Multilingual Real Estate Voice Agent • English, Hindi, Kannada, Telugu, Tamil
            </p>
          </div>
        </div>

        {/* Controls: Waveform, Language, Mute, Call Start/End */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Animated Voice Waveform Indicator */}
          <div className="flex items-center gap-1 h-9 px-3 py-1 bg-[#F5F2E9] rounded-xl border border-[#D6CDBB] shadow-sm">
            <div className={`w-1 rounded-full transition-all ${isSpeaking ? 'bg-[#14532D] animate-wave-bar-1' : isListening ? 'bg-amber-600 animate-wave-bar-1' : 'bg-[#D6CDBB] h-2'}`} />
            <div className={`w-1 rounded-full transition-all ${isSpeaking ? 'bg-[#14532D] animate-wave-bar-2' : isListening ? 'bg-amber-600 animate-wave-bar-2' : 'bg-[#D6CDBB] h-3'}`} />
            <div className={`w-1 rounded-full transition-all ${isSpeaking ? 'bg-[#14532D] animate-wave-bar-3' : isListening ? 'bg-amber-600 animate-wave-bar-3' : 'bg-[#D6CDBB] h-5'}`} />
            <div className={`w-1 rounded-full transition-all ${isSpeaking ? 'bg-[#14532D] animate-wave-bar-4' : isListening ? 'bg-amber-600 animate-wave-bar-4' : 'bg-[#D6CDBB] h-3'}`} />
            <div className={`w-1 rounded-full transition-all ${isSpeaking ? 'bg-[#14532D] animate-wave-bar-5' : isListening ? 'bg-amber-600 animate-wave-bar-5' : 'bg-[#D6CDBB] h-2'}`} />
            <span className="font-mono text-[10px] uppercase font-bold text-[#737373] ml-1.5 hidden sm:inline">
              {isSpeaking ? 'AI Output' : isListening ? 'Mic Active' : 'Standby'}
            </span>
          </div>

          {/* Language Selector supporting 5 languages */}
          <div className="flex items-center gap-2 bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[#171717] shadow-sm">
            <Languages className="w-4 h-4 text-[#14532D]" />
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                languageRef.current = e.target.value;
              }}
              disabled={callActive}
              className="bg-transparent border-none focus:outline-none text-xs cursor-pointer font-mono font-medium disabled:opacity-60 text-[#171717]"
            >
              <option value="English">English (en-IN)</option>
              <option value="Hindi">हिन्दी (hi-IN)</option>
              <option value="Kannada">ಕನ್ನಡ (kn-IN)</option>
              <option value="Telugu">తెలుగు (te-IN)</option>
              <option value="Tamil">தமிழ் (ta-IN)</option>
            </select>
          </div>

          {/* Mute toggle with feedback prevention */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            disabled={!callActive}
            className={`p-2.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer shadow-sm ${
              !callActive
                ? 'border-[#D6CDBB]/50 text-[#737373]/40 bg-[#F5F2E9] cursor-not-allowed'
                : isMuted
                ? 'bg-[#FFF1CC] border-[#E5D8A8] text-[#854D0E]'
                : 'bg-[#F5F2E9] border-[#D6CDBB] text-[#171717] hover:border-[#14532D]'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#14532D]" />}
          </button>

          {/* Start / End Call */}
          {!callActive ? (
            <button
              onClick={handleStartCall}
              className="btn-forest px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer shadow-sm active:translate-y-0.5"
            >
              <Phone className="w-4 h-4 text-[#E2F1E7]" />
              Start Voice Call
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-bold transition-all flex items-center gap-2 border border-rose-700 cursor-pointer shadow-sm active:translate-y-0.5"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Transcript vs Customer Profile & Recommended Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Conversation Stream */}
        <div className="lg:col-span-2 bento-card flex flex-col h-[620px] overflow-hidden">
          {/* Transcript Header */}
          <div className="p-4 border-b border-[#D6CDBB] flex items-center justify-between bg-[#F5F2E9]">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSpeaking ? 'bg-[#14532D] animate-ping' : isListening ? 'bg-amber-500 animate-pulse' : 'bg-[#D6CDBB]'
                }`}
              />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#171717]">
                Live Conversation Stream
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#171717]/60">
              {callActive && (
                <>
                  <span className="text-[#14532D] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(callDuration)}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>Session: {sessionId || 'Inactive'}</span>
              <span>•</span>
              <span className="text-[#14532D] font-bold uppercase">{language}</span>
            </div>
          </div>

          {/* Transcript Message Scroll */}
          <div ref={transcriptContainerRef} className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-mono bg-[#E2F1E7] text-[#14532D] font-semibold border border-[#D6CDBB]">
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
                    <div className="w-8 h-8 rounded-2xl bg-[#14532D] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold border border-[#14532D]">
                      <Sparkles className="w-4 h-4 text-[#E2F1E7]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                      isAgent
                        ? 'bg-[#F5F2E9] text-[#171717] border border-[#D6CDBB] rounded-tl-sm'
                        : 'bg-[#14532D] text-white rounded-tr-sm border border-[#14532D]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className={`font-mono font-bold text-[10px] uppercase tracking-wider ${isAgent ? 'text-[#14532D]' : 'text-[#E2F1E7]'}`}>
                        {isAgent ? 'EstateVoice Sales AI' : 'Buyer'}
                      </span>
                      <span className={`text-[10px] font-mono ${isAgent ? 'text-[#171717]/50' : 'text-white/60'}`}>
                        {msg.time}
                      </span>
                    </div>
                    <p className="font-sans text-xs leading-relaxed">{msg.text}</p>
                  </div>

                  {!isAgent && (
                    <div className="w-8 h-8 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB] text-[#171717] flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      <User className="w-4 h-4 text-[#14532D]" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live speech accumulation feedback with adaptive silence indicator */}
            {liveHeardText && (
              <div className="p-3.5 rounded-2xl bg-[#FFF1CC] border border-[#E5D8A8] text-xs font-mono text-[#854D0E] space-y-2 animate-pulse">
                <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider flex-wrap gap-2">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#14532D] animate-ping" />
                    {sentenceStatus}
                  </span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                      isSentenceCompleteState
                        ? 'bg-[#14532D] text-white'
                        : 'bg-[#854D0E] text-white'
                    }`}
                  >
                    {isSentenceCompleteState ? `Quick Submit: ${silenceCountdown}s` : `Waiting: ${silenceCountdown}s`}
                  </span>
                </div>
                <p className="text-xs text-[#171717] font-sans italic bg-white/70 p-2.5 rounded-xl border border-[#E5D8A8]/60">
                  "{liveHeardText}"
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#171717]/60">
                    {isSentenceCompleteState
                      ? '✓ Complete thought detected — submitting in ~1s'
                      : '... Incomplete thought — pausing up to 5s for more words'}
                  </span>
                  <button
                    onClick={submitBufferedSpeech}
                    className="px-3 py-1 rounded-xl bg-[#14532D] text-white text-[10px] font-mono font-bold hover:bg-[#14532D]/90 transition-colors"
                  >
                    Send Now
                  </button>
                </div>
              </div>
            )}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#171717]/60 italic">
                <span className="w-2 h-2 rounded-full bg-[#14532D] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#14532D] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#14532D] animate-bounce [animation-delay:0.4s]" />
                Gemini is consulting Bangalore property portfolio...
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Quick Multilingual Prompts */}
          <div className="px-4 py-2.5 border-t border-[#D6CDBB] bg-[#F5F2E9]/60 overflow-x-auto flex gap-2 no-scrollbar">
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(prompt)}
                className="text-[11px] font-mono bg-[#FFFCF7] border border-[#D6CDBB] text-[#171717] hover:bg-[#E2F1E7] hover:border-[#14532D] px-3 py-1 rounded-xl flex-shrink-0 whitespace-nowrap transition-colors"
              >
                "{prompt}"
              </button>
            ))}
          </div>

          {/* Text Fallback Form */}
          <form
            onSubmit={handleSendForm}
            className="p-3 border-t border-[#D6CDBB] flex items-center gap-2 bg-[#FFFCF7]"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak via mic (waits for 5s silence) or type in English, Telugu, Kannada, Hindi, Tamil..."
              className="flex-1 px-4 py-2.5 text-xs bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] focus:outline-none focus:border-[#14532D]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="p-2.5 rounded-2xl bg-[#14532D] text-white hover:bg-[#14532D]/90 disabled:opacity-50 transition-colors shadow-none border border-[#14532D] flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Customer Profile & Real-time Recommended Properties */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#171717] flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#14532D]" />
                Gemini Buyer Profile
              </h4>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#E2F1E7] text-[#14532D] px-2.5 py-0.5 rounded-full border border-[#D6CDBB]">
                Score: {profile.lead_score || 75}/100
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Caller Name</span>
                <span className="font-bold text-[#171717]">
                  {profile.customer_name || 'Prospective Buyer'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Language</span>
                <span className="font-bold text-[#14532D] font-mono uppercase">
                  {language}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Location</span>
                <span className="font-bold text-[#14532D]">
                  {profile.location || 'Not Specified'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Configuration</span>
                <span className="font-bold text-[#171717]">
                  {profile.bhk ? `${profile.bhk} BHK` : 'Flexible'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Budget</span>
                <span className="font-bold text-[#171717]">
                  {profile.budget || 'In Discussion'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Timeline</span>
                <span className="font-bold text-[#171717]">
                  {profile.timeline || 'Exploring'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Visit Interest</span>
                <span
                  className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    profile.visit_interest === 'Requested' || profile.visit_interest === 'Interested'
                      ? 'bg-[#E2F1E7] text-[#14532D] border-[#D6CDBB]'
                      : 'bg-[#F5F2E9] text-[#171717]/70 border-[#D6CDBB]'
                  }`}
                >
                  {profile.visit_slot ? `${profile.visit_slot}` : profile.visit_interest || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Sentiment</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#14532D] bg-[#E2F1E7] px-2 py-0.5 rounded-full border border-[#D6CDBB]">
                  {profile.sentiment || 'Positive'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Stage</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#171717] bg-[#F5F2E9] px-2 py-0.5 rounded-full border border-[#D6CDBB]">
                  {profile.conv_state || 'GREET'}
                </span>
              </div>
              {profile.customer_phone && (
                <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Phone</span>
                  <span className="font-mono text-xs font-bold text-[#171717]">
                    {profile.customer_phone} {profile.phone_confirmed ? '✓' : ''}
                  </span>
                </div>
              )}
              {profile.customer_email && (
                <div className="flex items-center justify-between py-1.5 border-b border-[#D6CDBB]/40">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Email</span>
                  <span className="font-mono text-xs font-bold text-[#171717] truncate max-w-[60%]">
                    {profile.customer_email} {profile.email_confirmed ? '✓' : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#171717]/60">Intent</span>
                <span className="font-bold text-[#14532D] text-right max-w-[60%] truncate font-mono text-xs">
                  {profile.intent || 'Bangalore Inquiry'}
                </span>
              </div>
              {bookingId && (
                <div className="mt-3 p-3 rounded-2xl bg-[#E2F1E7] border border-[#14532D]/30 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#14532D] flex-shrink-0" />
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14532D]">Booking Confirmed</div>
                      <div className="text-[10px] text-[#14532D] font-mono font-bold">{bookingId}</div>
                    </div>
                  </div>
                  {profile.email_confirmed && (
                    <div className="text-[10px] font-mono text-[#14532D]/80 flex items-center gap-1.5 pl-6">
                      <Mail className="w-3 h-3 text-[#14532D]" />
                      <span>Brochure & Visit Pass dispatched</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recommended Properties matching extraction */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#171717] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#14532D]" />
                Recommended Matches ({recommended.length})
              </h4>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#E2F1E7] text-[#14532D] px-2 py-0.5 rounded-full border border-[#D6CDBB]">
                Live RAG Inventory
              </span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {recommended.length === 0 ? (
                <div className="p-4 text-center rounded-2xl bg-[#F5F2E9]/60 border border-[#D6CDBB]/60 text-xs font-mono text-[#171717]/60 italic">
                  No properties matched yet. Mention your preferred location, budget, or BHK configuration.
                </div>
              ) : (
                recommended.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3 rounded-2xl border border-[#D6CDBB] hover:border-[#14532D] bg-[#F5F2E9]/60 hover:bg-[#F5F2E9] transition-all flex gap-3 items-center group cursor-pointer"
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
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-[#D6CDBB] group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-[#14532D] truncate font-heading">{prop.name}</div>
                      <div className="text-[10px] font-mono text-[#171717]/60">
                        {prop.location} • {prop.bhk} BHK • {prop.property_type}
                      </div>
                      <div className="text-xs font-heading font-bold text-[#171717] mt-1">
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
