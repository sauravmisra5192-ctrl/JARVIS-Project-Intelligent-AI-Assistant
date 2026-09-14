export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface Email {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  time: string;
  read: boolean;
  replyDraft?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  date: string;
  type: "personal" | "business" | "sarah"; // Shrabanti is the wife's schedule!
  category: string;
  description: string;
}

export enum CallStatus {
  INCOMING = "INCOMING",
  ANSWERED = "ANSWERED",
  FORWARDED_TO_JARVIS = "FORWARDED_TO_JARVIS",
  DECLINED = "DECLINED",
}

export interface CallLog {
  id: string;
  callerName: string;
  callerNumber: string;
  time: string;
  status: CallStatus;
  type: "wife" | "work" | "spam" | "general";
  transcript?: string[]; // Interactive dialogue with caller
  memoSummary?: string; // Jarvis summary
}

export interface Habit {
  id: string;
  name: string;
  category: "health" | "routine" | "diet";
  completedDays: string[]; // dates array (YYYY-MM-DD)
  streak: number;
  targetCountText: string;
}

export interface BusinessIdea {
  id: string;
  title: string;
  summary: string;
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  leanCanvas?: {
    problem: string;
    solution: string;
    metrics: string;
    valueProp: string;
  };
}

export interface VehicleIssue {
  id: string;
  vehicleType: "bike" | "car";
  title: string;
  symptoms: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  diagnostics?: string;
  remedyOptions?: string[];
}

export interface TripProposal {
  id: string;
  destination: string;
  duration: string;
  budget: number;
  logistics: string;
  itineraryDays?: { day: number; scheduleDetail: string; cost: number }[];
}
