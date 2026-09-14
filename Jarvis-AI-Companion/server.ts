import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Global client cache with lazy initialization to prevent crashes on missing keys
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const app = express();
app.use(express.json());

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// Jarvis Core Chat Endpoint
app.post("/api/jarvis/chat", async (req: express.Request, res: express.Response) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid request payload. 'messages' must be an array." });
      return;
    }

    const client = getAiClient();

    // Prepare Jarvis's master behavior instruction with stateful grounding
    const contextString = context 
      ? `
--- CURRENT LIVE CONSOLE STATE ---
User details: Active session for Saurav (Works at Infosys).
Wife's schedule sharing state: ${context.wifeScheduleShared ? "Shrabanti's schedule is shared" : "Shrabanti's schedule is private."}
Current active vehicle alerts: ${JSON.stringify(context.vehicleIssues || "None")}
Current health logs & habits: ${JSON.stringify(context.habits || "None")}
Current business ideas: ${JSON.stringify(context.businessIdeas || "None")}
Latest email count: ${context.inboxCount || 0} emails
Latest unanswered phone logs: ${context.missedCallsCount || 0} missed logs
Calendar conflict alerts: ${context.hasCalendarConflict ? "🚨 Active schedule conflict detected!" : "All clear."}
----------------------------------`
      : "";

    const systemInstruction = `You are Jarvis, a lifelong AI assistant and guide. 
Personality: Empathetic, highly proactive, supportive, and clever. You possess a brilliant dry wit and a touch of aristocratic/tech-butler demeanor.
Role: Help the user (Saurav, who works at Infosys) in daily life, business strategy, travel logistics, vehicle maintenance, health/food planning, and maintaining a loving, streamlined relationship with his wife, Shrabanti.
Tone: Warm, conversational, structurally detailed, clean. Feel free to use mild teasing or dry humor, but remain deeply supportive, loyal, and solutions-oriented.

Rules of Interaction:
1. Suggest actionable suggestions, never vague commentary.
2. Respect Shrabanti's (wife's) privacy. Adapt to scheduling alignments intelligently and support the couple's sync.
3. Be structured. When asked for suggestions/strategies, use clear bullet points, bullet names, and distinct visual sections.
4. When analyzing vehicle issues (cars/bikes), act as an expert diagnostician. Provide difficulty rating, tools list, safety warnings, and step-by-step resolution.
5. In responses, refer to yourself as Jarvis. Call the user "Master Saurav", "Sir", or "Saurav", in a friendly, endearing technological-butler way.

${contextString}

Engage the user by greeting them gracefully, giving updates on their day, answering query prompts, and pointing out potential schedule overlaps or health advice with tactical foresight. Keep things scannable and premium.`;

    // Map conversation array to Gemini content guidelines
    // We will pass the conversation history
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }]
    }));

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            reply: { 
              type: "STRING", 
              description: "The empathetic, conversational, structured butler-style response from Jarvis. Keep it warm, aristocratic, dryly humorous, and extremely supportive." 
            },
            extractedFacts: {
              type: "ARRAY",
              description: "Extracted updates parsed from the user's latest message. Only populate if the user is sharing new facts, updates, or adjustments about themselves, their family schedule/wife, their business plans/SWOT, health/habits, travel plans, or vehicle diagnostics.",
              items: {
                type: "OBJECT",
                properties: {
                  category: { 
                    type: "STRING", 
                    enum: ["spouse", "habit", "business", "vehicle", "travel"]
                  },
                  action: { 
                    type: "STRING",
                    enum: ["upsert", "delete"]
                  },
                  summary: { 
                    type: "STRING", 
                    description: "Concise confirmation statement e.g. 'Stored Shrabanti's dinner update' or 'Added Matcha Tea habit'." 
                  },
                  payload: {
                    type: "OBJECT",
                    description: "JSON data holding update contents.",
                    properties: {
                      title: { type: "STRING" },
                      time: { type: "STRING" },
                      description: { type: "STRING" },
                      
                      habitName: { type: "STRING" },
                      habitCategory: { type: "STRING" },
                      targetDescription: { type: "STRING" },
                      
                      businessTitle: { type: "STRING" },
                      swot_strengths: { type: "ARRAY", items: { type: "STRING" } },
                      swot_weaknesses: { type: "ARRAY", items: { type: "STRING" } },
                      swot_opportunities: { type: "ARRAY", items: { type: "STRING" } },
                      swot_threats: { type: "ARRAY", items: { type: "STRING" } },
                      pb_problem: { type: "STRING" },
                      pb_solution: { type: "STRING" },

                      vehicleType: { type: "STRING" },
                      vehicleTitle: { type: "STRING" },
                      symptoms: { type: "STRING" },
                      remedyOptions: { type: "ARRAY", items: { type: "STRING" } },
                      difficulty: { type: "STRING" },

                      destination: { type: "STRING" },
                      duration: { type: "STRING" },
                      budget: { type: "INTEGER" },
                      logistics: { type: "STRING" }
                    }
                  }
                },
                required: ["category", "action", "summary"]
              }
            }
          },
          required: ["reply", "extractedFacts"]
        }
      }
    });

    const replyRaw = response.text || "{}";
    let replyObj;
    try {
      replyObj = JSON.parse(replyRaw);
    } catch (parseErr) {
      console.warn("Gemini did not return valid JSON, using backup wrapper", replyRaw);
      replyObj = {
        reply: replyRaw,
        extractedFacts: []
      };
    }

    res.json(replyObj);
  } catch (error: any) {
    console.error("Jarvis API error:", error);
    res.status(500).json({ 
      error: error.message || "An exception occurred within the core Jarvis matrix.",
      details: error.stack || ""
    });
  }
});

// Vite server development bridging vs production deployment asset hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware attached.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production dist assets.");
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jarvis core mainframe active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
