import { Email, CalendarEvent, CallLog, Habit, BusinessIdea, VehicleIssue, CallStatus } from "./types";

export const initialEmails: Email[] = [
  {
    id: "email-1",
    from: "shrabanti.m@healthnet.com",
    fromName: "Shrabanti (My Wife)",
    subject: "Clinical schedule adjustment & dinner details 🍕",
    body: "Hi love! I got my final schedule for today (May 26th). My hospital night-shift is start-shifted, and I am free after 19:00 now! Shall we coordinate that celebratory dinner we kept postponing? Let me know if Jarvis maps out a clean travel path for us or matches your slots.",
    time: "17:35",
    read: false
  },
  {
    id: "email-2",
    from: "marcus_venture@vanguard.co",
    fromName: "Marcus Vance (Venture Lead)",
    subject: "Strategic Audit: Brainstorming Pitch decks for Project Antigravity",
    body: "Hey Sir, impressive preview results last week. We are consolidating our Series A pitch decks. Need your core SWOT analysis and value proposition finalized today, if your AI strategist engine can run a clean refinement. Catch up tomorrow?",
    time: "16:20",
    read: false
  },
  {
    id: "email-3",
    from: "alerts@roadsideassist.com",
    fromName: "Bayside Premium Auto Guard",
    subject: "Reminder: Model S Scheduled Safety Check",
    body: "Dear Member, your electric vehicle safety audit interval has elapsed. Please inspect your front suspension and rear brakes for squeals or vibrations. Contact our center or run a standard structural check with your onboard technician.",
    time: "11:15",
    read: true
  }
];

export const initialCalendar: CalendarEvent[] = [
  {
    id: "event-1",
    title: "Vanguard Investment Committee Board Presentation",
    time: "18:15 - 19:45",
    date: "2026-05-26",
    type: "business",
    category: "Pitch",
    description: "Crucial funding board review. Need revised SWOT and project financial estimates ready."
  },
  {
    id: "event-2",
    title: "Shrabanti: Evening Clinical Ward Duty Shift",
    time: "18:00 - 23:30",
    date: "2026-05-26",
    type: "sarah",
    category: "Clinical Duty",
    description: "Wife's hospital duty. Note: Clinicians are highly busy. Dinner plans need scheduling sync."
  },
  {
    id: "event-3",
    title: "Daily Tactical Mindful Wrap-Up",
    time: "21:30 - 22:00",
    date: "2026-05-26",
    type: "personal",
    category: "Routine",
    description: "Align with health logs, write gratitude journals, review travel arrangements."
  }
];

export const initialCalls: CallLog[] = [
  {
    id: "call-1",
    callerName: "Unknown Spammer (Ad Agency)",
    callerNumber: "+1 (800) 555-0199",
    time: "17:10",
    status: CallStatus.INCOMING,
    type: "spam"
  },
  {
    id: "call-2",
    callerName: "Shrabanti (Wife)",
    callerNumber: "+1 (555) 0184_SHRABANTI",
    time: "15:45",
    status: CallStatus.ANSWERED,
    type: "wife",
    transcript: [
      "Wife: Hey honey, hope your project isn't stressing you out too much!",
      "Me: Doing well, managing pitch items with Jarvis! How is your day?",
      "Wife: Busy clinical trials! Send Jarvis's response draft if you get a slot."
    ],
    memoSummary: "Shrabanti called to check in and express support. Reminded to sync dinner options."
  },
  {
    id: "call-3",
    callerName: "Marcus Vance (Vanguard)",
    callerNumber: "+1 (415) 888-9102",
    time: "14:20",
    status: CallStatus.INCOMING,
    type: "work"
  }
];

export const initialHabits: Habit[] = [
  {
    id: "habit-1",
    name: "Cardio Conditioning Routine",
    category: "health",
    completedDays: ["2026-05-24", "2026-05-25"],
    streak: 2,
    targetCountText: "30 mins daily brisk walk/ride"
  },
  {
    id: "habit-2",
    name: "Mindful Deep Breathing Cycle",
    category: "routine",
    completedDays: ["2026-05-23", "2026-05-24", "2026-05-25"],
    streak: 3,
    targetCountText: "3 sessions (morning, midway, evening)"
  },
  {
    id: "habit-3",
    name: "Heart-Healthy Mediterranean Diet Intake",
    category: "diet",
    completedDays: ["2026-05-25"],
    streak: 1,
    targetCountText: "Low sodium, fish, olive oils, fresh spinach"
  }
];

export const initialBusiness: BusinessIdea[] = [
  {
    id: "biz-1",
    title: "Project Antigravity (AI-Powered Legal Strategist)",
    summary: "A high-fidelity pipeline compiling precedents, case structures, and deposition summaries for specialized corporate litigation.",
    swot: {
      strengths: [
        "Incredibly high accuracy parsing 500+ page depositions",
        "Pristine user experience paired with secure cloud servers",
        "Witty summarizers that save litigation teams up to 40 hours per case"
      ],
      weaknesses: [
        "Higher initialization latency due to heavy logical analysis",
        "Need clean integration interfaces to legacy legal databases"
      ],
      opportunities: [
        "Specialized Boutique litigation boutique firms are buying instantly",
        "Can expand to corporate internal compliance reviews"
      ],
      threats: [
        "Rapid changes in data privacy legislation",
        "Large-scale generic cloud providers entering custom legal summarization spaces"
      ]
    },
    leanCanvas: {
      problem: "Attorneys spend 60% of their billing hours manually scanning dense court logs and dep transcripts.",
      solution: "Provide an automated semantic compiler summarizing structures, citing exact clauses and conflict histories instantly.",
      metrics: "Average summarization turnaround speed, active litigation accuracy scores.",
      valueProp: "Convert hundreds of legal deposition documents into a single indexed, witty, and bulletproof strategic playbook in minutes."
    }
  }
];

export const initialVehicles: VehicleIssue[] = [
  {
    id: "veh-1",
    vehicleType: "car",
    title: "Model S Front Suspension Squeaks",
    symptoms: "High-pitched metallic friction sound when executing slow-speed tight steering, or traveling over speed cushions.",
    difficulty: "Medium",
    remedyOptions: [
      "Inspect front lower control arms - upper ball joint grease seals may be dried out.",
      "Check inner tie-rod sleeves and sway-bar bushings for road-salt abrasion.",
      "Spray high-performance silicone lubricant over rubber boots as temporary relief, otherwise replace ball joint."
    ]
  },
  {
    id: "veh-2",
    vehicleType: "bike",
    title: "Slipping Rear Chain on High Torque pedaling",
    symptoms: "Chain skips dynamically when pedaling uphill in high gears, causing immediate loss of forward momentum or metallic pops.",
    difficulty: "Easy",
    remedyOptions: [
      "Measure chain alignment and stretch margin using a chain wear gauge (stretch > 0.75% means chain replacement required).",
      "Inspect rear cassette cogs for 'shark-tooth' profile wear - worn teeth slip instantly under stress and require buying a new cluster.",
      "Check limit screws and barrel adjuster on rear derailleur to optimize index tension."
    ]
  }
];
