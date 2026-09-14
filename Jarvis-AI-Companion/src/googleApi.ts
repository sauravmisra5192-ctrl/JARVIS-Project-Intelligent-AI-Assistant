import { CalendarEvent, Email } from "./types";

// Helper to decode Gmail headers
function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : "";
}

// Convert Gmail Date header into legible HH:MM string
function parseGmailDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Today";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Today";
  }
}

/**
 * Fetch Google Calendar events
 */
export async function fetchGoogleCalendar(accessToken: string): Promise<CalendarEvent[]> {
  try {
    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0); // Start of today

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&maxResults=15&timeMin=${timeMin.toISOString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Google Calendar API error: ${res.statusText}`);
    }

    const data = await res.json();
    const items = data.items || [];

    return items.map((item: any) => {
      const summary = item.summary || "Untitled Synced Event";
      const start = item.start?.dateTime || item.start?.date || "";
      const end = item.end?.dateTime || item.end?.date || "";

      // Format time block
      let timeBlock = "All Day";
      if (item.start?.dateTime) {
        const startT = new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const endT = new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        timeBlock = `${startT} - ${endT}`;
      }

      // Infer category
      const textForCategory = (summary + " " + (item.description || "")).toLowerCase();
      let type: "personal" | "business" | "sarah" = "personal";
      let category = "Routine";

      if (textForCategory.includes("shrabanti") || textForCategory.includes("sarah") || textForCategory.includes("wife") || textForCategory.includes("clinical") || textForCategory.includes("dinner") || textForCategory.includes("anniversary")) {
        type = "sarah";
        category = "Wife Sync";
      } else if (textForCategory.includes("business") || textForCategory.includes("valuation") || textForCategory.includes("vanguard") || textForCategory.includes("pitch") || textForCategory.includes("antigravity") || textForCategory.includes("swot") || textForCategory.includes("work")) {
        type = "business";
        category = "Strategy";
      }

      return {
        id: item.id || `ev-g-${Date.now()}-${Math.random()}`,
        title: summary,
        time: timeBlock,
        date: start ? start.split("T")[0] : undefined,
        type,
        category,
        description: item.description || "Synced from Google Calendar.",
      };
    });
  } catch (err) {
    console.error("Failed to sync Google Calendar:", err);
    throw err;
  }
}

/**
 * Fetch latest Gmail Inbox items
 */
export async function fetchGmailInbox(accessToken: string): Promise<Email[]> {
  try {
    // 1. List latest 10 messages from Inbox
    const listUrl = "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=label:INBOX";
    const listRes = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listRes.ok) {
      throw new Error(`Gmail API List error: ${listRes.statusText}`);
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    // 2. Fetch specific message payload content in parallel
    const emailPromises = messages.map(async (msgStub: any) => {
      const detailUrl = `https://www.googleapis.com/gmail/v1/users/me/messages/${msgStub.id}`;
      const detailRes = await fetch(detailUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!detailRes.ok) return null;
      const detail = await detailRes.json();

      const headers = detail.payload?.headers || [];
      const fromFull = getHeader(headers, "From") || "Unknown Sender";
      // Extract clean sender name
      const fromMatch = fromFull.match(/^(.*?)\s*<.*?>$/);
      const fromName = fromMatch ? fromMatch[1].replace(/['"]/g, "").trim() : fromFull;

      const subject = getHeader(headers, "Subject") || "(No Subject)";
      const dateVal = getHeader(headers, "Date");
      const timeStr = parseGmailDate(dateVal);
      const read = !(detail.labelIds || []).includes("UNREAD");

      return {
        id: detail.id,
        from: fromFull,
        fromName,
        fromEmail: fromFull,
        subject,
        body: detail.snippet || "",
        time: timeStr,
        read,
      } as Email;
    });

    const results = await Promise.all(emailPromises);
    return results.filter((email): email is Email => email !== null);
  } catch (err) {
    console.error("Failed to sync Gmail:", err);
    throw err;
  }
}

/**
 * Send email via Gmail REST API
 */
export async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string
): Promise<boolean> {
  try {
    const emailParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `MIME-Version: 1.0`,
      ``,
      bodyText,
    ];
    const rawEmail = emailParts.join("\r\n");

    // Base64Url encoding
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error("Failed to send Gmail email:", err);
    return false;
  }
}
