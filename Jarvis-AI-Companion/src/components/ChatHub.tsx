import React, { useState, useEffect, useRef } from "react";
import { Message } from "../types";
import { 
  Send, Volume2, VolumeX, Sparkles, HelpCircle, RefreshCw, 
  Cpu, User, Mic, MicOff, Info, Radio, Zap 
} from "lucide-react";

interface VoiceProfile {
  id: string;
  label: string;
  nameSubstrings: string[];
  langCode: string;
  pitch: number;
  rate: number;
  icon: string;
  description: string;
}

const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "british-butler",
    label: "UK Butler",
    nameSubstrings: ["UK Male", "British Male", "Daniel", "Oliver", "en-GB"],
    langCode: "en-GB",
    pitch: 0.92,
    rate: 1.05,
    icon: "🎩",
    description: "Classic sophisticated Jarvis British tone"
  },
  {
    id: "prime-ai",
    label: "Prime US AI",
    nameSubstrings: ["Google US English", "David", "Nathan", "Microsoft David", "en-US"],
    langCode: "en-US",
    pitch: 1.05,
    rate: 1.1,
    icon: "⚡",
    description: "Modern, rapid-response high-efficiency agent"
  },
  {
    id: "holographic-female",
    label: "Holographic Female",
    nameSubstrings: ["Hazel", "Google UK English Female", "Samantha", "Fiona", "Zira", "en-GB", "en-US"],
    langCode: "en",
    pitch: 1.18,
    rate: 1.03,
    icon: "🔮",
    description: "Calm, analytical feminine intelligence"
  },
  {
    id: "cybernetic-overlord",
    label: "Cybernetic Deep",
    nameSubstrings: ["Google US English", "David", "Daniel", "en-US", "en-GB"],
    langCode: "en",
    pitch: 0.65,
    rate: 0.9,
    icon: "🪐",
    description: "Resonant, synthetic mainframe frequency"
  },
  {
    id: "executive-narrator",
    label: "Executive Accent",
    nameSubstrings: ["Karen", "Microsoft Catherine", "Australia", "en-AU", "en-IE"],
    langCode: "en-AU",
    pitch: 1.0,
    rate: 1.0,
    icon: "💼",
    description: "International sleek corporate feedback"
  }
];

interface ChatHubProps {
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  isThinking: boolean;
  onClearHistory: () => void;
}

export function ChatHub({ messages, onSendMessage, isThinking, onClearHistory }: ChatHubProps) {
  const [inputText, setInputText] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true); // Default enabled for cinematic experience
  const [voiceRate, setVoiceRate] = useState(1.05);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    () => localStorage.getItem("jarvis_voice_profile_id") || "british-butler"
  );
  const [, setVoicesLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Jarvis Diagnostic Boot State Matrix
  const [isBooting, setIsBooting] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Ref container to shield callbacks from stale SpeechRecognition closure
  const triggerBootupRef = useRef<(() => void) | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Speech Recognition API setup
  useEffect(() => {
    const SpeechRecognitionClass = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        // Active Wake-Phrase Vocal Detection Block
        const streamText = (final + " " + interim).toLowerCase();
        if (
          streamText.includes("jarvis boot up") || 
          streamText.includes("jarvis bootup") || 
          streamText.includes("boot up jarvis") ||
          streamText.includes("jarvis boot-up")
        ) {
          if (triggerBootupRef.current) {
            triggerBootupRef.current();
          }
          return;
        }

        if (final) {
          setInputText((prev) => {
            const fLower = final.toLowerCase();
            if (
              fLower.includes("jarvis boot up") || 
              fLower.includes("jarvis bootup") || 
              fLower.includes("boot up jarvis") ||
              fLower.includes("jarvis boot-up")
            ) {
              return prev;
            }
            return prev ? prev + " " + final : final;
          });
        }
        setInterimTranscript(interim);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
        if (event.error === "not-allowed") {
          setSpeechError("Microphone access blocked in Iframe. Please enable permissions or click the 'Open in New Tab' icon at the top right.");
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = rec;
    } else {
      console.warn("Web SpeechRecognition API not supported in this browser environment.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Voice Output hook: Speak the last assistant message if voice is toggled on
  useEffect(() => {
    if (isVoiceEnabled && messages.length > 0 && !isBooting) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        speakText(lastMsg.content);
      }
    }
  }, [messages, isVoiceEnabled]);

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Cancel any ongoing speech

    // Strip basic markdown formatting for cleaner speech synthesis
    const cleanText = text
      .replace(/[\*\_#\`\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Find active profile configurations
    const activeProfile = VOICE_PROFILES.find(p => p.id === selectedProfileId) || VOICE_PROFILES[0];
    
    const voices = window.speechSynthesis.getVoices();
    let preferredVoice: SpeechSynthesisVoice | undefined = undefined;

    // Search sequential name substrings prioritized by profile preferences
    for (const sub of activeProfile.nameSubstrings) {
      preferredVoice = voices.find(
        (v) => 
          v.name.toLowerCase().includes(sub.toLowerCase()) && 
          (!activeProfile.langCode || v.lang.toLowerCase().startsWith(activeProfile.langCode.toLowerCase()))
      );
      if (preferredVoice) break;
    }

    if (!preferredVoice && activeProfile.langCode) {
      preferredVoice = voices.find(v => v.lang.toLowerCase().startsWith(activeProfile.langCode.toLowerCase()));
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Apply dynamic pitch and compound scale speed rate
    utterance.rate = voiceRate * (activeProfile.rate || 1.0);
    utterance.pitch = activeProfile.pitch;

    // Hands-free Intercom callback loop (reactivates microphone once voice finishes)
    utterance.onend = () => {
      if (isHandsFree && recognitionRef.current && !isListening) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Autoplay mic error:", e);
          }
        }, 750);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Spectacular Cinematic Diagnostic System Boot Sequence
  const triggerBootup = () => {
    if (isBooting) return;
    setIsBooting(true);
    setBootStep(0);
    setBootLogs([]);
    setInputText("");
    setInterimTranscript("");

    // Halt current mic stream temporarily during voice response to prevent self-loopback
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Interactive synthesizer chord beep for ultra-high tech reaction
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const playSynthBeep = (freq: number, start: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);
          gainNode.gain.setValueAtTime(0.08, start);
          gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + duration);
        };
        playSynthBeep(440.00, ctx.currentTime, 0.2); // A4
        playSynthBeep(554.37, ctx.currentTime + 0.12, 0.2); // C#5
        playSynthBeep(659.25, ctx.currentTime + 0.24, 0.25); // E5
        playSynthBeep(880.00, ctx.currentTime + 0.36, 0.5); // A5
      }
    } catch {}

    speakText("Jarvis cognitive online. Triggering diagnostic mainframe initialization protocol. Standby, Sir.");

    const steps = [
      "Configuring biometric encryption matrices...",
      "Aligning Local Database Schema definitions...",
      "Resolving Google OAuth token stream credentials...",
      "Linking Shrabanti clinical constraint indicators...",
      "Validating vehicle diagnostic telemetry values...",
      "Syncing live Gmail & Calendar data packages...",
      "DIAGNOSTICS COMPLETE: Jarvis Mind Engine fully operational."
    ];

    steps.forEach((line, index) => {
      setTimeout(() => {
        setBootLogs(prev => [...prev, `[${new Date().toLocaleTimeString([], { hour12: false })}] ${line}`]);
        setBootStep(index + 1);
        if (index === steps.length - 1) {
          setTimeout(() => {
            setIsBooting(false);
          }, 1200);
        }
      }, (index + 1) * 350);
    });
  };

  // Sync ref callback on every render to ensure clean access
  triggerBootupRef.current = triggerBootup;

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isThinking) return;

    // Support typed equivalent trigger matching
    const normalizedText = text.toLowerCase();
    if (
      normalizedText === "jarvis boot up" || 
      normalizedText === "jarvis bootup" || 
      normalizedText === "boot up" ||
      normalizedText === "boot up jarvis"
    ) {
      triggerBootup();
      return;
    }

    onSendMessage(text);
    setInputText("");
    
    // Stop listening temporarily to ensure send proceeds without loopback
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Acoustic microphone capability is restricted or not supported by this browser. Please use keyboard standard inputs.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  const selectSuggestion = (promptText: string) => {
    if (isThinking) return;
    if (promptText === "Jarvis Boot up") {
      triggerBootup();
    } else {
      onSendMessage(promptText);
    }
  };

  const suggestions = [
    { label: "⚡ Boot up Core", text: "Jarvis Boot up" },
    { label: "🎙️ Dictate Bio Log", text: "Jarvis, I have a few updates to dictate about me to store." },
    { label: "❤️ Sync Shrabanti Shift", text: "Write this down from my voice: Shrabanti's clinical constraints changed to 18:30 to 22:45 tonight." },
    { label: "🍵 Feed Matcha Habit", text: "Log a health habit for me: Drink organic matcha tea 2 times daily for diet strategy." }
  ];

  return (
    <div className="relative flex flex-col h-full bg-[#0b0f19] border border-cyan-950/40 rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      {/* Immersive Diagnostic Boot Up HUD Overlay */}
      {isBooting && (
        <div className="absolute inset-0 z-50 bg-[#060a12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-cyan-400 font-mono select-none">
          <div className="w-full max-w-sm bg-[#09101f]/95 border-2 border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] relative overflow-hidden flex flex-col gap-5">
            {/* Pulsing Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] pointer-events-none opacity-30" />
            
            {/* Spinning Holographic Core */}
            <div className="flex justify-center py-2">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border border-cyan-400/25 animate-ping absolute" />
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-cyan-400 animate-spin absolute" style={{ animationDuration: '3s' }} />
                <div className="w-10 h-10 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.6)]">
                  <Cpu size={16} className="text-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="text-center">
              <span className="text-xs font-bold tracking-widest text-cyan-300 uppercase block">CORE ENGINE INITIALIZATION</span>
              <span className="text-[10px] text-cyan-500 tracking-wider">JARVIS COGNITIVE MAINFRAME V12-E</span>
            </div>

            {/* Simulated Diagnostic Bar Gauge */}
            <div className="w-full bg-cyan-950/50 border border-cyan-900/60 h-3 rounded-full overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full shadow-[0_0_12px_#22d3ee] transition-all duration-300 ease-out"
                style={{ width: `${(bootStep / 7) * 100}%` }}
              />
            </div>

            {/* Diagnostic Logs Screen */}
            <div className="bg-[#020610] border border-cyan-950/80 rounded-xl p-3 text-[10.5px] h-32 overflow-y-auto space-y-1 font-mono text-cyan-300/95 leading-normal scrollbar-none">
              {bootLogs.map((log, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <span className="text-emerald-400 text-[10px] shrink-0">✔</span>
                  <span className="text-slate-300">{log}</span>
                </div>
              ))}
              {bootStep < 7 && (
                <div className="flex items-center gap-1.5 text-cyan-500 animate-pulse">
                  <span className="text-cyan-400 text-[10px] shrink-0">➜</span>
                  <span>Executing core heuristics...</span>
                  <span className="w-1 h-3 bg-cyan-400 inline-block animate-ping" />
                </div>
              )}
            </div>

            <div className="text-[8.5px] uppercase tracking-wider text-slate-500 border-t border-cyan-950/75 pt-3 flex justify-between items-center font-sans">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                SECURE AUTH: 128-BIT
              </span>
              <span>EFFICIENCY INDX: 100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Component Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d1527] border-b border-cyan-950/60">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${isListening ? "bg-red-500 animate-ping" : "bg-cyan-400 animate-pulse"}`} />
            <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping opacity-75" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-cyan-200 uppercase font-mono flex items-center gap-1.5">
              Jarvis AI Core {isListening && <span className="text-[9px] text-red-500 px-1 bg-red-950/50 border border-red-800/20 rounded font-normal uppercase animate-pulse">MIC LIVE</span>}
            </h2>
            <p className="text-[10px] text-cyan-500 font-mono">INTELLIGENCE MAINFRAME GROUNDED</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hands-Free Intercom Toggle */}
          <button
            onClick={() => setIsHandsFree(!isHandsFree)}
            title={isHandsFree ? "Deactivate Intercom Loop" : "Activate Hands-Free Intercom Mode"}
            className={`p-1.5 rounded-lg border text-[10px] font-mono flex items-center gap-1 transition-all ${
              isHandsFree 
                ? "bg-rose-950/60 text-rose-400 border-rose-500/30 font-bold" 
                : "bg-slate-900/60 text-slate-500 border-slate-800 hover:text-slate-400"
            }`}
          >
            <Radio size={12} className={isHandsFree ? "animate-spin" : ""} />
            <span>{isHandsFree ? "INTERCOM AC" : "VOICE LOOP"}</span>
          </button>

          {/* Voice Output Toggle */}
          <button
            onClick={() => {
              const nextVal = !isVoiceEnabled;
              setIsVoiceEnabled(nextVal);
              if (nextVal && messages.length > 0) {
                const last = messages[messages.length - 1];
                if (last.role === "assistant") speakText(last.content);
              } else {
                window.speechSynthesis?.cancel();
              }
            }}
            title={isVoiceEnabled ? "Stop Voice Readout" : "Speak Responses Aloud (Refined UK Butler)"}
            className={`p-1.5 rounded-lg border transition-all ${
              isVoiceEnabled 
                ? "bg-cyan-950/60 text-cyan-400 border-cyan-500/30" 
                : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300"
            }`}
          >
            {isVoiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Reset chat console */}
          <button
            onClick={onClearHistory}
            title="Reset Chat Matrix"
            className="p-1.5 bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-300 rounded-lg transition-all"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Suggestion Quick Tags */}
      <div className="px-3 py-2 bg-[#0e172a]/40 border-b border-cyan-950/20 flex flex-wrap gap-1.5">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => selectSuggestion(s.text)}
            disabled={isThinking || isListening}
            className="text-[10px] font-mono select-none px-2 py-0.5 bg-cyan-950/10 text-cyan-400/80 hover:bg-cyan-950/40 hover:text-cyan-300 border border-cyan-950/50 rounded-md transition-all active:scale-95 disabled:opacity-50"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Acoustic Waveform Interactive Equalizer Visualizer */}
      {isListening && (
        <div className="bg-red-950/20 border-b border-red-500/10 px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <div className="text-xs font-mono text-red-400 font-bold">Acoustic Audio Channel Captured</div>
          </div>
          
          {/* Equalizer Waveform Bars (7 bars, styled with CSS in index.css) */}
          <div className="flex gap-0.5 items-end h-8">
            <div className="w-1 bg-red-400 h-full animate-wave-1 rounded-sm" />
            <div className="w-1 bg-rose-450 h-full animate-wave-2 rounded-sm" />
            <div className="w-1 bg-red-500 h-full animate-wave-3 rounded-sm" />
            <div className="w-1 bg-yellow-400 h-full animate-wave-4 rounded-sm" />
            <div className="w-1 bg-red-400 h-full animate-wave-5 rounded-sm" />
            <div className="w-1 bg-rose-400 h-full animate-wave-6 rounded-sm" />
            <div className="w-1 bg-red-500 h-full animate-wave-7 rounded-sm" />
          </div>
        </div>
      )}

      {/* Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[480px]">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[85%] ${
                isUser ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div 
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border select-none ${
                  isUser 
                    ? "bg-indigo-950/50 border-indigo-500/30 text-indigo-400" 
                    : "bg-cyan-950/50 border-cyan-500/30 text-cyan-400"
                }`}
              >
                {isUser ? <User size={13} /> : <Cpu size={13} />}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-mono px-1">
                  {isUser ? "Master" : "Jarvis"} • {m.timestamp}
                </span>
                <div
                  className={`px-3 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap transition-all shadow-sm ${
                    isUser
                      ? "bg-indigo-950/60 text-indigo-100 border border-indigo-900/40 rounded-tr-none"
                      : "bg-[#111a2f] text-slate-100 border border-cyan-950/40 rounded-tl-none font-sans"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Thinking Pulse */}
        {isThinking && (
          <div className="flex gap-3 mr-auto max-w-[80%]">
            <div className="w-7 h-7 bg-cyan-950/50 border border-cyan-500/30 rounded-lg flex items-center justify-center">
              <Sparkles size={13} className="text-cyan-400 animate-spin" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-mono px-1">Jarvis is processing...</span>
              <div className="bg-[#111a2f] border border-cyan-950/40 rounded-xl rounded-tl-none px-4 py-3 flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Floating spoken text subtitle box */}
      {isListening && interimTranscript && (
        <div className="px-4 py-2 mx-3 my-2 bg-red-950/40 border border-red-500/25 rounded-lg text-xs font-mono text-red-200 animate-pulse">
          <span className="text-[9px] font-bold text-red-400 block mb-0.5">ACOUSTIC INPUT FEEDBACK:</span>
          "{interimTranscript}"
        </div>
      )}

      {/* Speech Block Details (Errors, Setup Helper, Custom Synth Controls) */}
      <div className="px-4 py-1.5 bg-[#090d16] border-t border-cyan-950/30 flex flex-wrap items-center justify-between gap-2">
        {speechError ? (
          <span className="text-[9.5px] text-rose-450 font-mono font-semibold">⚠️ {speechError}</span>
        ) : (
          <span className="text-[9.5px] text-slate-500 font-mono flex items-center gap-1">
            <Info size={10} className="text-cyan-500" /> Speak update commands directly: Jarvis auto-parses & visualizes updates.
          </span>
        )}
        
        {isVoiceEnabled && (
          <div className="flex flex-wrap items-center gap-4">
            {/* Voice Profile Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-slate-400 font-mono">Voice Profile:</span>
              <select
                value={selectedProfileId}
                onChange={(e) => {
                  const newProfileId = e.target.value;
                  setSelectedProfileId(newProfileId);
                  localStorage.setItem("jarvis_voice_profile_id", newProfileId);
                  
                  // Trigger quick vocal stream confirmation sample!
                  const activeProfile = VOICE_PROFILES.find(p => p.id === newProfileId) || VOICE_PROFILES[0];
                  
                  // Brief timeout to read updated state
                  setTimeout(() => {
                    speakText(`Vocal stream calibrated to ${activeProfile.label}. How can I assist you, Sir?`);
                  }, 120);
                }}
                className="bg-[#0c1527] text-cyan-300 font-mono font-semibold border border-cyan-950/80 rounded px-1.5 py-0.5 text-[9.5px] focus:outline-none focus:border-cyan-500 cursor-pointer hover:border-cyan-800 transition-colors"
                title="Select preferred synthetic vocal identity profile for Jarvis"
              >
                {VOICE_PROFILES.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0b0f19] text-slate-300 font-mono text-xs">
                    {p.icon} {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Speed Modifier */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-slate-400 font-mono">Speed:</span>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={voiceRate}
                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                className="w-12 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-[9px] text-cyan-400 font-mono">{voiceRate}x</span>
            </div>
          </div>
        )}
      </div>

      {/* Command input form */}
      <div className="p-3 bg-[#0d1527] border-t border-cyan-950/40 flex items-center gap-2 relative">
        {/* Toggle Speech Input Button */}
        <button
          onClick={toggleMic}
          title={isListening ? "Pause Auditory Sync" : "Enable Auditory Sync (Vocal Dictation)"}
          className={`p-2 rounded-lg border flex items-center justify-center shrink-0 h-[38px] w-[38px] transition-all duration-300 ${
            isListening 
              ? "bg-red-950 hover:bg-red-900 text-red-400 border-red-500/50 scale-105 animate-pulse" 
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700"
          }`}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <textarea
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={isListening ? "Listening silently... speak details freely" : "Instruct Jarvis... or dictation over voice."}
          className="flex-1 max-h-24 min-h-[38px] px-3 py-2 bg-[#060a13] border border-cyan-950 text-slate-100 placeholder-slate-500 text-sm rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none font-sans"
        />
        
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isThinking}
          className="p-2.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400/50 rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center shrink-0 h-[38px] w-[38px]"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
