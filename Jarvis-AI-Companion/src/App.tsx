import React, { useState, useEffect } from "react";
import { 
  Phone, Mail, Calendar, Heart, Activity, Briefcase, Wrench, MapPin, 
  Sparkles, Trash2, Plus, AlertTriangle, CheckCircle, Check, ExternalLink, 
  Cpu, Clock, ArrowRight, Lock, ChevronDown, RefreshCw, Send, ShieldAlert,
  Info, TrendingUp, Compass, Volume2, Moon, LogOut
} from "lucide-react";
import { Message, Email, CalendarEvent, CallLog, Habit, BusinessIdea, VehicleIssue, CallStatus } from "./types";
import { ChatHub } from "./components/ChatHub";
import { 
  initialEmails, initialCalendar, initialCalls, 
  initialHabits, initialBusiness, initialVehicles 
} from "./initialData";
import { initAuth, googleSignIn, logout, getAccessToken } from "./auth";
import { fetchGoogleCalendar, fetchGmailInbox, sendGmailEmail } from "./googleApi";

export default function App() {
  // Main state matrices
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "system",
      content: "Mainframe fully synced, Sir. I am ready to process scheduling alignments, market SWOT analysis, legal reviews, or vehicular diagnostics.",
      timestamp: "18:00"
    },
    {
      id: "first-jarvis",
      role: "assistant",
      content: "Good evening, Sir. I hope your day at Infosys is wrapping up productively. I have analyzed Shrabanti's clinical constraints, marked Project Antigravity's key market targets, and isolated the physical parameters of the S-Model's suspension sound. How shall we coordinate the evening?",
      timestamp: "18:01"
    }
  ]);
  
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [calendar, setCalendar] = useState<CalendarEvent[]>(initialCalendar);
  const [calls, setCalls] = useState<CallLog[]>(initialCalls);
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [businesses, setBusinesses] = useState<BusinessIdea[]>(initialBusiness);
  const [vehicles, setVehicles] = useState<VehicleIssue[]>(initialVehicles);

  // Active items trackers
  const [selectedBizId, setSelectedBizId] = useState<string>("biz-1");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("veh-1");
  const [activeTab, setActiveTab] = useState<"SWOT" | "CANVAS">("SWOT");
  
  // Custom states
  const [isThinking, setIsThinking] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [showInterceptionModal, setShowInterceptionModal] = useState<CallLog | null>(null);
  
  // Custom form bindings
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventType, setNewEventType] = useState<"personal" | "business" | "sarah">("personal");
  const [newEventDesc, setNewEventDesc] = useState("");
  
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState<"health" | "routine" | "diet">("health");
  const [newHabitTarget, setNewHabitTarget] = useState("");
  
  const [isAnsweringLive, setIsAnsweringLive] = useState(false);
  const [activeInterceptionTranscript, setActiveInterceptionTranscript] = useState<string[]>([]);
  const [interceptionStatus, setInterceptionStatus] = useState<"idle" | "connecting" | "live" | "complete">("idle");
  const [interceptionMemo, setInterceptionMemo] = useState("");

  const [user, setUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [replyingToEmail, setReplyingToEmail] = useState<Email | null>(null);
  const [emailReplyBody, setEmailReplyBody] = useState("");

  const activeBiz = businesses.find(b => b.id === selectedBizId) || businesses[0];
  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];

  // Derive schedule conflicts
  const hasCalendarConflict = true; // Marcus Vance pitch (18:15) overlaps with Shrabanti's clinical shift start (18:00)

  // API handler to interact with Jarvis back-end service
  const handleSendMessage = async (text: string) => {
    // 1. Post user message instantly to UI
    const userMsg: Message = {
      id: `m-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsThinking(true);

    try {
      // Build high-affinity context package for server-side system grounding
      const context = {
        wifeScheduleShared: true,
        vehicleIssues: vehicles.map(v => ({ title: v.title, symptoms: v.symptoms })),
        habits: habits.map(h => ({ name: h.name, streak: h.streak })),
        businessIdeas: businesses.map(b => ({ title: b.title, swot: b.swot })),
        inboxCount: emails.filter(e => !e.read).length,
        missedCallsCount: calls.filter(c => c.status === CallStatus.INCOMING).length,
        hasCalendarConflict: hasCalendarConflict,
        realCalendarEvents: calendar.map(e => ({ title: e.title, time: e.time, desc: e.description })),
        realEmails: emails.map(e => ({ from: e.fromName, subject: e.subject, body: e.body, time: e.time, read: e.read }))
      };

      const response = await fetch("/api/jarvis/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: updatedMessages.filter(m => m.role !== "system"),
          context: context
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned code: ${response.status}`);
      }

      const data = await response.json();
      
      const jarvisMsg: Message = {
        id: `jarvis-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Connection interrupted, Sir. Retrying strategic bridge lines.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, jarvisMsg]);

      // --- FACT SECURE LEARNING LAYER INTEGRATION ---
      if (data.extractedFacts && data.extractedFacts.length > 0) {
        data.extractedFacts.forEach((fact: any) => {
          const { category, action, summary, payload } = fact;
          if (!payload) return;

          if (category === "spouse") {
            const newEv: CalendarEvent = {
              id: `ev-${Date.now()}-${Math.random()}`,
              title: payload.title || "Shrabanti Activity Sync",
              time: payload.time || "18:00 - 19:00",
              date: "2026-05-26",
              type: "sarah",
              category: "Wife Sync",
              description: payload.description || "Synthesized Schedule adjustment."
            };
            setCalendar(prev => [newEv, ...prev]);
          } else if (category === "habit") {
            const newHab: Habit = {
              id: `hab-${Date.now()}-${Math.random()}`,
              name: payload.habitName || "Voice Synced KPI Tracker",
              category: (payload.habitCategory || "health") as any,
              completedDays: [],
              streak: 0,
              targetCountText: payload.targetDescription || "Daily Routine"
            };
            setHabits(prev => [newHab, ...prev]);
          } else if (category === "business") {
            setBusinesses(prev => {
              return prev.map(b => {
                if (b.title.toLowerCase().includes((payload.businessTitle || "").toLowerCase()) || b.id === selectedBizId) {
                  const updatedSwot = { ...b.swot };
                  if (payload.swot_strengths) updatedSwot.strengths = Array.from(new Set([...updatedSwot.strengths, ...payload.swot_strengths]));
                  if (payload.swot_weaknesses) updatedSwot.weaknesses = Array.from(new Set([...updatedSwot.weaknesses, ...payload.swot_weaknesses]));
                  if (payload.swot_opportunities) updatedSwot.opportunities = Array.from(new Set([...updatedSwot.opportunities, ...payload.swot_opportunities]));
                  if (payload.swot_threats) updatedSwot.threats = Array.from(new Set([...updatedSwot.threats, ...payload.swot_threats]));
                  
                  const updatedCanvas = { ...b.leanCanvas };
                  if (payload.pb_problem) updatedCanvas.problem = payload.pb_problem;
                  if (payload.pb_solution) updatedCanvas.solution = payload.pb_solution;

                  return { ...b, swot: updatedSwot, leanCanvas: updatedCanvas };
                }
                return b;
              });
            });
          } else if (category === "vehicle") {
            setVehicles(prev => {
              let updated = false;
              const next = prev.map(v => {
                if (v.id === selectedVehicleId || v.title.toLowerCase().includes((payload.vehicleTitle || "").toLowerCase())) {
                  updated = true;
                  return {
                    ...v,
                    symptoms: payload.symptoms || v.symptoms,
                    remedyOptions: payload.remedyOptions && payload.remedyOptions.length > 0 ? payload.remedyOptions : v.remedyOptions,
                    difficulty: payload.difficulty || v.difficulty
                  };
                }
                return v;
              });

              if (!updated) {
                const newVeh: VehicleIssue = {
                  id: `veh-${Date.now()}-${Math.random()}`,
                  title: payload.vehicleTitle || "New Custom Vehicle",
                  vehicleType: (payload.vehicleType || "car") as any,
                  symptoms: payload.symptoms || "Sound parameters spoken over acoustic stream.",
                  remedyOptions: payload.remedyOptions || [],
                  difficulty: payload.difficulty || "Medium"
                };
                return [newVeh, ...next];
              }
              return next;
            });
          } else if (category === "travel") {
            const newTravelEv: CalendarEvent = {
              id: `ev-${Date.now()}-${Math.random()}`,
              title: `Trip: ${payload.destination || "Planned Vacation"}`,
              time: payload.duration || "TBD",
              date: "2026-05-26",
              type: "personal",
              category: "Routine",
              description: `Logistics: ${payload.logistics || ""}. Budget: $${payload.budget || ""}`
            };
            setCalendar(prev => [newTravelEv, ...prev]);
          }
        });

        const logMsg: Message = {
          id: `sys-log-${Date.now()}`,
          role: "system",
          content: `🔒 Acoustic Core Database Synchronized: Jarvis parsed ${data.extractedFacts.length} live bio-acoustic data points and updated core registries.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, logMsg]);
      }
    } catch (err: any) {
      console.error(err);
      // Fallback answers in case of missing keys or network timeout
      let fallbackText = "I encountered a minor network latency, Sir. However, speaking from local mainframe storage, I highly recommend we adjust that 18:15 Vanguard Pitch so we can escort or meet Shrabanti at 19:15. Shall I draft the response emails?";
      if (text.toLowerCase().includes("suspension") || text.toLowerCase().includes("squeak")) {
        fallbackText = "Sir, looking at the safety specifications for the Model S ball-joints: lubricating dry seals usually grants only 2 weeks of relief. I suggest procuring aftermarket heavy-duty front lower control arm replacements and scheduled torque specs. This has moderate complexity (3/5 on human metric). Let me know if I should plan local garage logistics.";
      } else if (text.toLowerCase().includes("swot") || text.toLowerCase().includes("antigravity")) {
        fallbackText = "Sir, strategic assessment updated. To beat large generic providers on legal summarization: we should emphasize our high-affinity localized deployment. Securing clients in boutique boutique spaces first allows high cash-flow iteration. I've updated our Opportunities matrix.";
      } else if (text.toLowerCase().includes("food") || text.toLowerCase().includes("nutrition") || text.toLowerCase().includes("dinner")) {
        fallbackText = "Sir, considering today's elevated active strain and low potassium notification, a wild Salmon filet coupled with spinach and avocados is optimal for post-ride recovery. Let's arrange a table for two after 19:30 now that Shrabanti is free.";
      }
      
      const jarvisMsg: Message = {
        id: `jarvis-${Date.now()}`,
        role: "assistant",
        content: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, jarvisMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `system-${Date.now()}`,
        role: "system",
        content: "Core brain registers reset. System state monitors remain active, Sir.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Synchronize Google Calendar and Gmail
  const syncGoogleData = async (tokenToCheck?: string) => {
    const activeToken = tokenToCheck || authToken;
    if (!activeToken) return;

    setIsSyncing(true);
    setSyncError(null);
    try {
      const [googleEvents, googleEmails] = await Promise.all([
        fetchGoogleCalendar(activeToken).catch(err => {
          console.error("Calendar sync failure:", err);
          return [] as CalendarEvent[];
        }),
        fetchGmailInbox(activeToken).catch(err => {
          console.error("Gmail sync failure:", err);
          return [] as Email[];
        })
      ]);

      if (googleEvents.length > 0) {
        setCalendar(prev => {
          // Keep local ones that are not in google to preserve custom actions
          const existingLocal = prev.filter(e => !e.id.startsWith("ev-g-") && !googleEvents.some(ge => ge.title === e.title));
          return [...googleEvents, ...existingLocal];
        });
      }

      if (googleEmails.length > 0) {
        setEmails(prev => {
          const existingLocal = prev.filter(e => !googleEmails.some(ge => ge.subject === e.subject));
          return [...googleEmails, ...existingLocal];
        });
      }

      const logMsg: Message = {
        id: `sys-log-${Date.now()}`,
        role: "system",
        content: `🔒 Complete Mainframe Sync: Google Calendar (${googleEvents.length} events) and Google mailboxes (${googleEmails.length} messages) synced safely via user-approved OAuth authorization stream.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, logMsg]);

    } catch (err: any) {
      console.error("Global Workspace sync error:", err);
      setSyncError("One of your secure streams encountered brief latency.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsThinking(true);
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAuthToken(result.accessToken);
        await syncGoogleData(result.accessToken);
        
        const welcomeMsg: Message = {
          id: `welcome-auth-${Date.now()}`,
          role: "assistant",
          content: `Splendid to meet you, Sir. I have established a direct, secure interface to your Google Cloud authorization context under ${result.user.email ?? "your preferred account"}. Rest assured, your schedule is fully aligned inside my central cognitive mainframe now.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, welcomeMsg]);
      }
    } catch (err: any) {
      console.error("Login authorization failed:", err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAuthToken(null);
    
    const logoutMsg: Message = {
      id: `logout-auth-${Date.now()}`,
      role: "system",
      content: "🔒 Google Account authorization revoked. Mainframe caches flushed. Local mock registers restored.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, logoutMsg]);
  };

  const handleSendGmailReply = async (email: Email, replyText: string) => {
    const activeToken = authToken || getAccessToken();
    if (!activeToken) {
      alert("Mainframe link unauthenticated. Please authorize Google Cloud streams first.");
      return;
    }
    
    // Explicit User Confirmation Dialog as mandated for Workspace API mutations 
    const messageShort = replyText.length > 60 ? replyText.substring(0, 60) + "..." : replyText;
    const recipient = email.from || "unknown";
    const confirmed = window.confirm(
      `Do you authorize Jarvis to send this email response from your account?\n\nTo: ${recipient}\nSubject: Re: ${email.subject}\n\nContent:\n"${messageShort}"`
    );
    if (!confirmed) return;

    try {
      setIsThinking(true);
      const success = await sendGmailEmail(activeToken, recipient, `Re: ${email.subject}`, replyText);
      if (success) {
        // Mark the local email status as read and add message
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
        
        const successMsg: Message = {
          id: `email-success-${Date.now()}`,
          role: "assistant",
          content: `I have successfully transmitted your email output to ${email.fromName} via your synced account, Sir. The message has been logged in your sent outputs.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, successMsg]);
        setReplyingToEmail(null);
        setEmailReplyBody("");
      } else {
        alert("The transmission stream rejected the payload. Please verify your connection limits.");
      }
    } catch (err) {
      console.error("Failed to send reply:", err);
      alert("An exception occurred during email submission.");
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAuthToken(token);
        syncGoogleData(token);
      },
      () => {
        setUser(null);
        setAuthToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Intercept incoming calls
  const startInterception = (call: CallLog) => {
    setShowInterceptionModal(call);
    setInterceptionStatus("connecting");
    setActiveInterceptionTranscript(["[MAIN INFRASTRUCTURE] Establishing secure bridge..."]);
    
    setTimeout(() => {
      setInterceptionStatus("live");
      setActiveInterceptionTranscript([
        "[Line Open] Ring tone intercepted by JARVIS core.",
        `Caller: Hello? Is ${call.callerName} available? This is Marcus's priority associate line.`,
        "Jarvis: Good evening. I am Jarvis, lifelong AI chief strategist and electronic companion. Master is wrapping up sensitive tactical files right now. I am authorized to map details. Please proceed.",
        "Caller: Oh, excellent! Tell him we refined Project Antigravity's advisory layout. We got 12% extra room on the valuation pitch. But he needs to verify the weaknesses column in SWOT.",
        "Jarvis: Fully documented. I have parsed the valuation parameters and integrated notes with active business dashboard items automatically. Master will view this instantly.",
        "Caller: Perfect. Tell him to ping me later. Bye!"
      ]);
      
      // Complete state updates in local databases
      setInterceptionStatus("complete");
      setInterceptionMemo("Vanguard associate reviewed project valuation. Confirming +12% growth room. Requested immediate SWOT review.");
      
      // update central calls array state to forwarded
      setCalls(prev => prev.map(c => c.id === call.id ? { 
        ...c, 
        status: CallStatus.FORWARDED_TO_JARVIS,
        memoSummary: "Jarvis intercepted: Marcus Vanguard updated valuation structure. Requested review." 
      } : c));

    }, 2800);
  };

  // Trigger conversational events directly
  const executeDirectAction = (label: string, requestText: string) => {
    handleSendMessage(requestText);
  };

  // Track habit completions
  const toggleHabitToday = (habitId: string) => {
    const today = "2026-05-26";
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const completed = h.completedDays.includes(today);
        let nextDays = [...h.completedDays];
        let nextStreak = h.streak;
        if (completed) {
          nextDays = nextDays.filter(d => d !== today);
          nextStreak = Math.max(0, h.streak - 1);
        } else {
          nextDays.push(today);
          nextStreak += 1;
        }
        return { ...h, completedDays: nextDays, streak: nextStreak };
      }
      return h;
    }));
  };

  // Check Email
  const toggleReadEmail = (emailId: string) => {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, read: true } : e));
  };

  // Add customized schedule items
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    
    const nextItem: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: newEventTitle,
      time: newEventTime || "19:00 - 20:00",
      date: "2026-05-26",
      type: newEventType,
      category: newEventType === "business" ? "Strategy" : newEventType === "sarah" ? "Wife Sync" : "Routine",
      description: newEventDesc
    };
    
    setCalendar(prev => [...prev, nextItem]);
    setShowAddEventModal(false);
    setNewEventTitle("");
    setNewEventTime("");
    setNewEventDesc("");
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const nextHab: Habit = {
      id: `hab-${Date.now()}`,
      name: newHabitName,
      category: newHabitCategory,
      completedDays: [],
      streak: 0,
      targetCountText: newHabitTarget || "1 session daily"
    };

    setHabits(prev => [...prev, nextHab]);
    setShowAddHabitModal(false);
    setNewHabitName("");
    setNewHabitTarget("");
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-300">
      
      {/* Dynamic Ambient Blur Blobs */}
      <div className="absolute rounded-full bg-cyan-700/10 blur-[130px] w-[500px] h-[500px] -top-32 -left-32 pointer-events-none z-0" />
      <div className="absolute rounded-full bg-indigo-700/10 blur-[130px] w-[500px] h-[500px] -bottom-32 -right-32 pointer-events-none z-0" />
      <div className="absolute rounded-full bg-fuchsia-500/5 blur-[120px] w-[350px] h-[350px] top-[40%] left-[30%] pointer-events-none z-0" />

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto w-full px-4 lg:px-8 py-6 z-10 flex-1 flex flex-col gap-6">
        
        {/* Futuristic Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 mb-2 uppercase font-mono flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              LIFELONG COMPANION INTERFACE • v8.4-PROACTIVE
            </div>
            <h1 className="text-3xl font-extralight tracking-tight text-slate-100">
              Good evening, <span className="font-semibold text-white">Sir</span>.
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono italic">
              "Providing precise foresight into business development, spouse schedules, logistics & vitality buffers."
            </p>
          </div>
          
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            {user ? (
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex flex-col items-start sm:items-end font-mono">
                  <div className="text-[10px] font-bold tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    SECURE ACTIVE STREAM
                  </div>
                  <div className="text-[11px] text-slate-300 font-semibold truncate max-w-[200px]">
                    {user.email}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => syncGoogleData()}
                    disabled={isSyncing}
                    className="px-2.5 py-1.5 text-[11px] font-mono font-bold bg-[#0d1527] hover:bg-slate-850 border border-slate-700/60 text-cyan-300 rounded-lg flex items-center gap-1.5 transition-all select-none active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={11} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Syncing..." : "Sync"}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-1 px-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Revoke Credentials Link"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-950/80 to-indigo-950/80 hover:from-cyan-900/60 hover:to-indigo-900/60 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(34,211,238,0.1)] active:scale-95 cursor-pointer"
              >
                <Lock size={12} className="text-cyan-400 animate-pulse" />
                <span>Sync Calendar & Gmail</span>
              </button>
            )}

            <div className="text-[10px] text-slate-500 font-mono">
              LATENCY: <span className="text-cyan-400">12ms (SECURE LINK)</span> • EVOLUTION STAGE: <span className="text-indigo-400">12-C</span>
            </div>
          </div>
        </header>

        {/* Global Alert Notification Banner for Scheduling Conflicts */}
        {hasCalendarConflict && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-md shadow-sm">
            <div className="flex items-start md:items-center gap-3">
              <div className="p-2 bg-amber-950/40 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
                <ShieldAlert size={20} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-300 uppercase font-mono tracking-wider">Active Schedule Conflict Alert</h4>
                <p className="text-sm text-slate-200 mt-0.5">
                  Your <strong className="text-white">Vanguard board Presentation (18:15)</strong> overlaps with <strong className="text-white">Shrabanti's Duty shift</strong> context which just ended early. She is free at 19:00.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                onClick={() => executeDirectAction("Resolve Conflict", "Jarvis, suggest a response regarding my early shift conflict. Propose a polite letter to Marcus requesting we adjust Vanguard boards forward or backward by 30 mins so I can escort Shrabanti.")}
                className="w-full md:w-auto px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:border-amber-400 rounded-lg text-xs font-mono font-bold transition-all active:scale-95"
              >
                Draft Adjustments with Jarvis
              </button>
            </div>
          </div>
        )}

        {/* Major 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Column 1: Left Widget Sidebar (Vitals, Vigor, and Conjugal Balance) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Relationship Care Hub */}
            <div className="bg-[#0f172a]/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl relative group">
              <div className="absolute top-4 right-4 text-rose-500/30 group-hover:text-rose-400/50 transition-colors pointer-events-none">
                <Heart size={20} fill="currentColor" />
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono mb-3">
                Relationship & Family Sync
              </div>
              
              <div className="space-y-4">
                <div className="bg-rose-950/10 border border-rose-500/10 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100 text-sm">Shrabanti (Wife)</span>
                    <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                      Shift Free: 19:00
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Clinical night duty adjusted. She is free after <span className="text-white font-semibold">19:00</span> and expressed interest in celebrating.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => executeDirectAction("Dinner Sync", "Jarvis, examine Shrabanti's schedule email. Find a perfect restaurant reservation option in our travel zone, budget is $150. Suggest an elegant itinerary.")}
                      className="px-2.5 py-1 text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:border-rose-400 rounded-md transition-all font-mono"
                    >
                      Coordinate Path
                    </button>
                    <button
                      onClick={() => executeDirectAction("Send Love Message", "Jarvis, draft a loving and witty dinner invitation text to send to Shrabanti, taking into account our anniversary countdown!")}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-all font-mono"
                    >
                      Love Draft
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/60">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <Sparkles size={11} /> Anniversary Warning
                    </span>
                    <span className="text-xs text-white font-mono bg-indigo-950/60 px-2 py-0.5 border border-indigo-500/20 rounded">
                      In 8 Days
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    I have locked in early options for the custom fine-leather travel watch and vintage book binder you selected, Sir.
                  </p>
                </div>
              </div>
            </div>

            {/* Health, Habits & Fitness Vitals */}
            <div className="bg-[#0f172a]/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                    Health & Vitality Tracker
                  </div>
                  <button
                    onClick={() => setShowAddHabitModal(true)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Add Custom Habit Tracker"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 font-mono">
                  <div className="bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-xl">
                    <span className="block text-[9px] uppercase tracking-wide text-slate-500">Resting Pulse</span>
                    <span className="text-base font-semibold text-cyan-400">64 BPM</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-xl">
                    <span className="block text-[9px] uppercase tracking-wide text-slate-500">Sleep Quality</span>
                    <span className="text-base font-semibold text-indigo-400">92%</span>
                  </div>
                </div>

                {/* Habits checklists */}
                <div className="space-y-2 mb-4">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Habit Realization:</span>
                  {habits.map(h => {
                    const isCompleted = h.completedDays.includes("2026-05-26");
                    return (
                      <div 
                        key={h.id}
                        onClick={() => toggleHabitToday(h.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                          isCompleted
                            ? "bg-emerald-950/10 border-emerald-500/20 text-slate-300"
                            : "bg-slate-900/40 border-slate-800/50 hover:border-slate-700 text-slate-400"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isCompleted
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                            : "border-slate-700 bg-slate-950"
                        }`}>
                          {isCompleted && <Check size={11} strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${isCompleted ? "text-slate-200 line-through" : ""}`}>
                            {h.name}
                          </p>
                          <span className="text-[9px] text-slate-500 block">
                            Streak: <strong className="text-cyan-400">{h.streak}d</strong> • {h.targetCountText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Nutrition Insight alert block */}
              <div className="bg-emerald-950/10 border border-emerald-500/20 p-3 rounded-xl">
                <div className="text-[9px] font-mono font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <Activity size={12} /> Dietary Core Advisor
                </div>
                <p className="text-[11px] text-emerald-100 mt-1 leading-relaxed">
                  Post-cardio electrolytes indicate lower potassium range. Dinner option: wild Salmon with fresh spinach and avocado slices to boost vital reserves.
                </p>
              </div>

            </div>

          </div>

          {/* Column 2: Center Main Frame (Core Attention Visualization & State-grounded Chatbox) */}
          <div className="lg:col-span-6 flex flex-col gap-6">

            {/* Pulse Visualizer Panel */}
            <div className="bg-slate-950/80 border border-cyan-950/40 rounded-2xl p-5 shadow-inner flex flex-col items-center justify-center relative overflow-hidden h-[180px]">
              
              {/* Spinning Orbital rings simulating Jarvis AI attention state */}
              <div className="absolute w-[220px] h-[220px] rounded-full border border-dashed border-cyan-500/10 animate-[spin_40s_linear_infinite]" />
              <div className="absolute w-[180px] h-[180px] rounded-full border border-cyan-500/20 animate-[spin_20s_linear_infinite]" />
              <div className="absolute w-[140px] h-[140px] rounded-full border border-dashed border-cyan-400/30 animate-[spin_10s_linear_infinite_reverse]" />
              
              {/* Pulsing Core */}
              <div className="relative w-20 h-20 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/10 border border-cyan-400/30 transition-all hover:scale-105">
                <Cpu size={24} className="text-cyan-400 animate-pulse" />
                
                {/* Visualizer wave lines surrounding center */}
                <div className="absolute -inset-2 rounded-full border border-cyan-500/20 animate-ping opacity-60" style={{ animationDuration: "3s" }} />
              </div>

              <div className="mt-3 text-center z-10">
                <div className="text-[10px] font-mono tracking-widest text-cyan-300 uppercase">Attention Grid System Connected</div>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md italic">
                  "Listening for environmental voice cues or strategic instructions from terminal feed, Sir."
                </p>
              </div>
            </div>

            {/* Core Jarvis Chat Box widget */}
            <div className="flex-1 min-h-[500px] flex flex-col">
              <ChatHub 
                messages={messages}
                onSendMessage={handleSendMessage}
                isThinking={isThinking}
                onClearHistory={handleClearHistory}
              />
            </div>

          </div>

          {/* Column 3: Right Widget Sidebar (Business SWOT analysis, Vehicles diagnostics, Logistics) */}
          <div className="lg:col-span-3 flex flex-col gap-6">

            {/* Business Intelligence Stratum */}
            <div className="bg-[#0f172a]/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl">
              <div className="flex justify-between items-center mb-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                  Business Strategic Room
                </div>
                <span className="text-[10px] text-amber-500 bg-amber-505/10 font-mono px-2 py-0.5 border border-amber-500/20 rounded">
                  Pitch Target
                </span>
              </div>

              {/* Choose business dropdown / tabs */}
              <div className="space-y-3">
                <div className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-100">{activeBiz.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{activeBiz.summary}</p>
                </div>

                {/* Mode Selectors */}
                <div className="flex border-b border-slate-850/60 gap-1.5 pt-1">
                  <button
                    onClick={() => setActiveTab("SWOT")}
                    className={`pb-1 text-[11px] tracking-wider font-mono font-bold transition-all ${
                      activeTab === "SWOT"
                        ? "text-cyan-400 border-b-2 border-cyan-400"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    SWOT Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab("CANVAS")}
                    className={`pb-1 text-[11px] tracking-wider font-mono font-bold transition-all ${
                      activeTab === "CANVAS"
                        ? "text-cyan-400 border-b-2 border-cyan-400"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Lean Canvas
                  </button>
                </div>

                {/* SWOT Container with mini matrices */}
                {activeTab === "SWOT" && activeBiz.swot && (
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-cyan-950/15 border border-cyan-500/10 p-2 rounded-lg">
                        <strong className="text-cyan-400 font-mono block">Strengths</strong>
                        {activeBiz.swot.strengths.slice(0, 1).map((s, i) => (
                          <p key={i} className="text-slate-300 mt-0.5 truncate">{s}</p>
                        ))}
                      </div>
                      <div className="bg-amber-950/15 border border-amber-500/10 p-2 rounded-lg">
                        <strong className="text-amber-400 font-mono block">Weaknesses</strong>
                        {activeBiz.swot.weaknesses.slice(0, 1).map((w, i) => (
                          <p key={i} className="text-slate-300 mt-0.5 truncate">{w}</p>
                        ))}
                      </div>
                      <div className="bg-emerald-950/15 border border-emerald-500/10 p-2 rounded-lg">
                        <strong className="text-emerald-400 font-mono block">Opportunities</strong>
                        {activeBiz.swot.opportunities.slice(0, 1).map((o, i) => (
                          <p key={i} className="text-slate-300 mt-0.5 truncate">{o}</p>
                        ))}
                      </div>
                      <div className="bg-rose-950/15 border border-rose-500/10 p-2 rounded-lg">
                        <strong className="text-rose-400 font-mono block">Threats</strong>
                        {activeBiz.swot.threats.slice(0, 1).map((t, i) => (
                          <p key={i} className="text-slate-300 mt-0.5 truncate">{t}</p>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => executeDirectAction("Refine SWOT", "Jarvis, evaluate the Project Antigravity legal strategy. Refine the Strengths and Weaknesses to secure series A investments with Vanguard, factoring Marcus's advice.")}
                      className="w-full py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 rounded-lg text-[10px] font-mono font-bold transition-all"
                    >
                      Audit SWOT in ChatGPT/Jarvis core
                    </button>
                  </div>
                )}

                {/* Lean Canvas Container */}
                {activeTab === "CANVAS" && activeBiz.leanCanvas && (
                  <div className="space-y-2 mt-2 text-xs">
                    <div className="bg-slate-900/40 border border-slate-800/40 p-2.5 rounded-lg">
                      <strong className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block">Problem</strong>
                      <p className="text-slate-200 text-[11px] mt-0.5 leading-normal">{activeBiz.leanCanvas.problem}</p>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800/40 p-2.5 rounded-lg">
                      <strong className="text-slate-400 font-mono text-[9px] uppercase tracking-wider block">Value Proposition</strong>
                      <p className="text-slate-200 text-[11px] mt-0.5 leading-normal">{activeBiz.leanCanvas.valueProp}</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Vehicular Diagnosis Hub (Bike and Model S troubleshooters) */}
            <div className="bg-[#0f172a]/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono mb-2.5">
                Vehicular Diagnostic Unit
              </div>

              {/* Selection between vehicles list */}
              <div className="space-y-3">
                <div className="flex gap-1">
                  {vehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`flex-1 py-1 px-1.5 border rounded-lg text-[10px] font-mono font-bold transition-all text-center ${
                        selectedVehicleId === v.id
                          ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
                          : "bg-slate-900/40 border-slate-800/70 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {v.vehicleType === "car" ? "Tesla Model S" : "Ducati Bike"}
                    </button>
                  ))}
                </div>

                {/* Specific selected vehicle symptoms */}
                <div className="bg-slate-900/50 border border-slate-850 p-3 rounded-xl relative">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-500/20">
                      DIFFICULTY: {activeVehicle.difficulty}
                    </span>
                    <Wrench size={12} className="text-slate-400" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-100">{activeVehicle.title}</h5>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    <strong>Symptoms:</strong> {activeVehicle.symptoms}
                  </p>

                  <div className="mt-3.5 space-y-1.5 border-t border-slate-800/60 pt-2.5">
                    <span className="text-[9px] font-mono block text-slate-500 uppercase tracking-wide">Suggested Repair Path:</span>
                    {activeVehicle.remedyOptions?.slice(0, 2).map((opt, idx) => (
                      <p key={idx} className="text-[10.5px] text-slate-300 list-item list-inside leading-normal">
                        {opt}
                      </p>
                    ))}
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => executeDirectAction("Audit Suspension", `Jarvis, walk through step-by-step diagnostic strategy for my ${activeVehicle.vehicleType === "car" ? 'Model S front suspension squeak' : 'Ducati bike skipping chain'}. Give difficulty, tools list, safety procedures, and replacement options.`)}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 hover:border-slate-600 rounded-lg text-[10px] font-mono transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={11} className="text-cyan-400" /> Query Jarvis Diagnosis
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Travel & Logistics Dashboard */}
            <div className="bg-[#0f172a]/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono mb-2.5">
                Logistics & Travel Planner
              </div>
              
              <div className="bg-indigo-950/10 border border-indigo-500/20 p-3.5 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      UPCOMING: LONDON
                    </span>
                    <h5 className="text-xs font-bold text-slate-100 mt-2">Flight BA242 • Tomorrow 08:45</h5>
                  </div>
                  <MapPin size={15} className="text-indigo-400" />
                </div>
                <div className="text-[11px] mt-1 text-slate-400">
                  Weather: 12°C, Light drizzle. packing recommendation active.
                </div>
                <div className="mt-3.5 pt-2 border-t border-slate-800/50 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-mono">ESTIMATED BUDGET:</span>
                  <span className="text-cyan-400 font-mono font-bold">$2,450.00</span>
                </div>
                <div className="mt-2.5">
                  <button
                    onClick={() => executeDirectAction("Travel Guide", "Jarvis, compile an immersive cultural guide and hour-by-hour logistics breakdown for my London flight tomorrow. Include rain forecast check and standard Heathrow airport fast-track options.")}
                    className="w-full py-1 text-center bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 rounded-lg text-[10px] font-mono transition-all"
                  >
                    Generate Cultural Insights
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Lower Core Dashboard: Phone Interceptor, Simulated Schedulers, and Emails Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          
          {/* Calendar Events Console */}
          <div className="lg:col-span-4 bg-[#0f172a]/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl">
            <div className="flex justify-between items-center mb-3">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                My Calendar Sync
              </div>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Add Calendar Event"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {calendar.map(event => (
                <div 
                  key={event.id}
                  className={`p-3 border rounded-xl relative ${
                    event.type === "sarah"
                      ? "bg-rose-950/10 border-rose-500/20"
                      : event.type === "business"
                      ? "bg-indigo-950/10 border-indigo-500/20"
                      : "bg-slate-900/40 border-slate-800/50"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-500 font-semibold">{event.time}</span>
                    <span className={`px-2 py-0.5 rounded uppercase tracking-wider text-[8px] font-bold ${
                      event.type === "sarah" ? "bg-rose-500/10 text-rose-300" :
                      event.type === "business" ? "bg-indigo-500/10 text-indigo-300" :
                      "bg-emerald-505/10 text-emerald-300"
                    }`}>
                      {event.category}
                    </span>
                  </div>
                  <h6 className="text-xs font-bold text-slate-100 mt-1">{event.title}</h6>
                  <p className="text-[10.5px] text-slate-400 mt-1 leading-normal">
                    {event.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Call logs list with direct simulated Jarvis Answer interaction */}
          <div className="lg:col-span-4 bg-[#0f172a]/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono mb-3">
                Live Intercept Phone Logs
              </div>

              <div className="space-y-3">
                {calls.map(call => {
                  const isIncoming = call.status === CallStatus.INCOMING;
                  const isForwarded = call.status === CallStatus.FORWARDED_TO_JARVIS;
                  
                  return (
                    <div 
                      key={call.id}
                      className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 border ${
                          call.type === "wife" 
                            ? "bg-rose-950/20 border-rose-500/20 text-rose-400" 
                            : call.type === "spam" 
                            ? "bg-amber-950/20 border-amber-500/20 text-amber-500" 
                            : "bg-slate-950 border-slate-800 text-slate-300"
                        }`}>
                          <Phone size={13} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-100 truncate">{call.callerName}</span>
                            <span className="text-[9px] text-slate-500 font-mono shrink-0">{call.time}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{call.callerNumber}</p>
                          
                          {/* Display the Jarvis intercepted memo */}
                          {call.memoSummary && (
                            <p className="text-[10px] font-mono text-cyan-400 mt-1.5 bg-cyan-950/15 p-1 px-1.5 rounded border border-cyan-800/10 leading-normal">
                              📝 {call.memoSummary}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isIncoming ? (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => startInterception(call)}
                              className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 rounded text-[10px] font-mono transition-all animate-pulse"
                              title="Ask Jarvis to answer the phone dynamically"
                            >
                              Intercept with Jarvis
                            </button>
                            <button
                              onClick={() => {
                                setCalls(prev => prev.map(c => c.id === call.id ? { ...c, status: CallStatus.DECLINED } : c));
                              }}
                              className="px-2 py-0.5 bg-slate-950 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 text-[9px] rounded transition-all text-center"
                            >
                              Decline
                            </button>
                          </div>
                        ) : isForwarded ? (
                          <span className="text-[9px] font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-800/20 px-1.5 py-0.5 rounded uppercase">
                            Jarvis Audited
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                            Answered
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500 leading-normal">
              ℹ️ Jarvis is connected to your primary smartphone's SIP profile. When "Intercept with Jarvis" is activated, callers communicate with your customized AI voice persona.
            </div>
          </div>

          {/* Secure Mail Feed Console */}
          <div className="lg:col-span-4 bg-[#0f172a]/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono mb-3 flex items-center justify-between">
              <span>Secure Mail Inbox Sync</span>
              <span className="text-[9px] text-cyan-400 font-mono">
                {emails.filter(e => !e.read).length} UNREAD
              </span>
            </div>

            <div className="space-y-3">
              {emails.map(email => (
                <div 
                  key={email.id}
                  onClick={() => toggleReadEmail(email.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    !email.read 
                      ? "bg-slate-900/60 border-cyan-500/20" 
                      : "bg-[#090d16] border-slate-850 hover:border-slate-800 opacity-70"
                  }`}
                >
                  {!email.read && (
                    <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-semibold ${!email.read ? "text-cyan-200" : "text-slate-300"}`}>
                      {email.fromName}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">{email.time}</span>
                  </div>
                  <h6 className={`text-xs mt-1 truncate ${!email.read ? "text-white font-medium" : "text-slate-400"}`}>
                    {email.subject}
                  </h6>
                  <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {email.body}
                  </p>
                  
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-800/20 pt-2 font-mono text-[9px]">
                    <span className="text-slate-500 truncate max-w-[130px]" title={email.from}>
                      To: {email.from || email.fromEmail || "Linked Account"}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          executeDirectAction(`Reply: ${email.fromName}`, `Review this email from ${email.fromName} (Subject: ${email.subject}). Draft a short, incredibly witty, and professional response that resolves the subject. Email content: "${email.body}"`);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-[#111c34] px-1.5 py-1 rounded transition-all cursor-pointer"
                        title="Draft query via Jarvis"
                      >
                        Jarvis Draft
                      </button>
                      {user && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingToEmail(replyingToEmail?.id === email.id ? null : email);
                            setEmailReplyBody("");
                          }}
                          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/20 hover:bg-emerald-950/40 px-1.5 py-1 border border-emerald-500/20 rounded transition-all cursor-pointer"
                          title="Transmit real reply via Gmail API"
                        >
                          Gmail Reply
                        </button>
                      )}
                    </div>
                  </div>

                  {replyingToEmail?.id === email.id && (
                    <div className="mt-2.5 p-2 bg-slate-950/80 rounded-lg border border-slate-850" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={emailReplyBody}
                        onChange={(e) => setEmailReplyBody(e.target.value)}
                        placeholder="Type standard electronic text response..."
                        className="w-full bg-[#030712] border border-slate-800 rounded p-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 resize-none h-16"
                      />
                      <div className="flex justify-end gap-1.5 mt-2">
                        <button
                          onClick={() => {
                            setReplyingToEmail(null);
                            setEmailReplyBody("");
                          }}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-[10px] transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendGmailReply(email, emailReplyBody)}
                          disabled={!emailReplyBody.trim()}
                          className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          Send via Gmail
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Global Cinematic Footer */}
        <footer className="mt-8 border-t border-slate-850/80 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex flex-wrap gap-8 justify-center md:justify-start">
            <div>
              <div className="text-[9px] text-slate-500 font-bold tracking-widest uppercase font-mono mb-0.5">Global Latency</div>
              <div className="text-cyan-400 font-mono font-bold">12ms (Secure Link)</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 font-bold tracking-widest uppercase font-mono mb-0.5">Self-Evolution Core</div>
              <div className="text-indigo-400 font-mono font-bold">Learning Phase 12-C (Continuous)</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 font-bold tracking-widest uppercase font-mono mb-0.5">Total System Nodes</div>
              <div className="text-cyan-400 font-mono font-bold">3 Active, 0 Latent</div>
            </div>
          </div>
          
          <div className="text-slate-500 font-mono text-[10px] text-center md:text-right uppercase tracking-wider">
            Evolving with you since 2024. Your guide until the last breath.
          </div>
        </footer>

      </div>

      {/* --- ADD CALENDAR EVENT MODAL --- */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-4">Add Custom Schedule Element</h3>
            <form onSubmit={handleAddEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono uppercase tracking-widest mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Quick anniversary surprise dinner booking"
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  className="w-full bg-[#060a13] border border-slate-800 text-slate-100 px-3 py-2 rounded focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono uppercase tracking-widest mb-1">Time Block</label>
                  <input
                    type="text"
                    placeholder="e.g., 19:30 - 21:00"
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                    className="w-full bg-[#060a13] border border-slate-800 text-slate-100 px-3 py-2 rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono uppercase tracking-widest mb-1">Association</label>
                  <select
                    value={newEventType}
                    onChange={e => setNewEventType(e.target.value as any)}
                    className="w-full bg-[#060a13] border border-slate-800 text-slate-100 px-3 py-2 rounded focus:outline-none focus:border-cyan-500"
                  >
                    <option value="personal">Personal / Leisure</option>
                    <option value="business">Business Strategy</option>
                    <option value="sarah">Shrabanti's Schedule Sync</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono uppercase tracking-widest mb-1">Event Description</label>
                <textarea
                  rows={2}
                  value={newEventDesc}
                  onChange={e => setNewEventDesc(e.target.value)}
                  placeholder="Additional context to help Jarvis match options..."
                  className="w-full bg-[#060a13] border border-slate-800 text-slate-100 px-3 py-2 rounded focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 hover:border-cyan-500 text-cyan-300 rounded text-xs font-mono font-bold transition-all"
                >
                  Insert Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD HABIT MODAL --- */}
      {showAddHabitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-4">Add Habit Core KPI</h3>
            <form onSubmit={handleAddHabit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono uppercase tracking-widest mb-1">Habit / Routine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Vitamin supplements, high-fidelity book reading"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  className="w-full bg-[#060a13] border border-slate-800 text-slate-100 px-3 py-2 rounded focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono uppercase tracking-widest mb-1">Category</label>
                  <select
                    value={newHabitCategory}
                    onChange={e => setNewHabitCategory(e.target.value as any)}
                    className="w-full bg-[#060a13] border border-slate-800 text-slate-100 px-3 py-2 rounded focus:outline-none focus:border-cyan-500"
                  >
                    <option value="health">Health Vitality</option>
                    <option value="routine">Mindfulness / Routine</option>
                    <option value="diet">Dietary Strategy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono uppercase tracking-widest mb-1">Target Description</label>
                  <input
                    type="text"
                    placeholder="e.g., Once in the morning"
                    value={newHabitTarget}
                    onChange={e => setNewHabitTarget(e.target.value)}
                    className="w-full bg-[#060a13] border border-slate-800 text-slate-100 px-3 py-2 rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHabitModal(false)}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 hover:border-cyan-500 text-cyan-300 rounded text-xs font-mono font-bold transition-all"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DYNAMIC TELECOM INTERCEPTION LIGHTBOX PANEL --- */}
      {showInterceptionModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0a0f1d] border-2 border-cyan-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative shadow-cyan-950/20">
            
            <div className="flex justify-between items-start border-b border-cyan-950/60 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 animate-pulse font-bold">
                  🚨 LIVE TELECOM PROTOCOL INTERCEPT
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Jarvis Core answering relative line for: {showInterceptionModal.callerName}
                </h3>
              </div>
              <span className="text-rose-500 font-mono text-[10px] animate-pulse bg-rose-950/30 px-2 py-0.5 border border-rose-500/30 rounded">
                ● AUDIO ROUTED TO CONSOLE
              </span>
            </div>

            {/* Simulated Live Dialogue box */}
            <div className="bg-[#050811] border border-slate-850 rounded-xl p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-3.5 select-none h-60">
              {activeInterceptionTranscript.map((t, index) => {
                const isSystem = t.startsWith("[");
                const isJarvis = t.startsWith("Jarvis:");
                return (
                  <div 
                    key={index} 
                    className={`${
                      isSystem ? "text-slate-500 italic" : 
                      isJarvis ? "text-cyan-400 text-[11.5px]" : 
                      "text-slate-200"
                    }`}
                  >
                    {t}
                  </div>
                );
              })}
              
              {interceptionStatus === "connecting" && (
                <div className="flex gap-1 items-center justify-start text-cyan-500 italic text-[11px] animate-pulse">
                  <span>Routing signals...</span>
                  <RefreshCw size={10} className="animate-spin" />
                </div>
              )}
            </div>

            {/* Interception Complete Memo Result details */}
            {interceptionStatus === "complete" && interceptionMemo && (
              <div className="mt-4 p-3.5 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
                <span className="text-[9px] font-mono uppercase text-cyan-300 font-bold block">
                  Generated Interactive Memo Summary:
                </span>
                <p className="text-sm text-slate-100 mt-1 leading-relaxed italic">
                  "{interceptionMemo}"
                </p>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">
                  💡 This record has been registered in the persistent logs below.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2.5 mt-5">
              <button
                type="button"
                className="px-5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors"
                onClick={() => setShowInterceptionModal(null)}
              >
                Close Connection Feed
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
