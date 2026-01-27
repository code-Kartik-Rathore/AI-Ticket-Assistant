import { createAgent, gemini } from "@inngest/agent-kit";

const analyzeTicket = async (ticket) => {
  const supportAgent = createAgent({
    model: gemini({
      model: "gemini-2.0-flash-lite", // updated model
      apiKey: process.env.GEMINI_API_KEY,
    }),
    name: "AI Ticket Triage Assistant",
    system: `You are an expert AI assistant that processes technical support tickets.
Your job is to:
1. Summarize the issue.
2. Estimate its priority.
3. Provide helpful notes and resource links for human moderators.
4. List relevant technical skills required.

IMPORTANT:
- Respond ONLY with valid raw JSON.
- Do NOT include markdown, code fences, comments, or extra formatting.`,
  });

  const response = await supportAgent.run(`
Analyze this support ticket and return ONLY a JSON object:

{
  "summary": "Short summary of the ticket",
  "priority": "high",
  "helpfulNotes": "Here are useful tips...",
  "relatedSkills": ["React", "Node.js"]
}

Ticket:
- Title: ${ticket.title}
- Description: ${ticket.description}
`);

  // Get raw AI output
  const raw = response.output_text || response.output?.[0]?.content || "";
  console.log("Raw AI response:", raw);

  if (!raw) {
    console.warn("⚠️ AI returned empty response");
    return null;
  }

  // Strip code fences like ```json ... ```
  const cleaned = raw.replace(/```json\s*|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ Failed to parse JSON from AI response:", err.message, "\nRaw:", raw);
    return null;
  }
};

export default analyzeTicket;
