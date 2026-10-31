import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Loader2 } from "lucide-react";

const SUGGESTED = [
  "How do I create an itinerary?",
  "How does visa intelligence work?",
  "How do I upgrade to Premium?",
  "How do I cancel my subscription?",
  "How do I contact support?",
];

const SYSTEM_PROMPT = `You are DheeVoy's inline support assistant ("Ask DheeVoy AI"). Your primary purpose is to answer questions ONLY regarding DheeVoy app features (AI Trip Planner, fixed Curated Trips, Visa Intelligence, Safety Scores) and account support.

STRICT BOUNDARIES:
- Do NOT invent travel facts, guess booking statuses, or offer speculative advice outside DheeVoy's built-in features.
- Do NOT provide specific visa or safety guarantees — direct users to check official embassy and government foreign-travel-advice sources.

CURATED TRIP RULE:
- If a user asks to modify or customize a Curated Trip, state clearly that Curated Trips are fixed, expert-crafted packages that cannot be edited, and suggest using the AI Trip Planner for custom itineraries.

FALLBACK RULE:
- If a question cannot be answered directly from DheeVoy's platform features, instruct the user to email support@dheevoy.com or use the "Contact Our Team" form on the Help & Support page.

TONE & FORMATTING:
- Keep all answers concise (2–3 sentences max), direct, factual, and free of filler text.
- Be friendly and mobile-friendly.`;

export default function SupportAIChat({ user }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "👋 Hi! I'm DheeVoy's support assistant. Ask me anything about the app — itineraries, visa info, subscriptions, and more!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const updated = [...messages, { role: "user", content: msg }];
    setMessages(updated);
    setLoading(true);

    const history = updated.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");

    const res = await base44.functions.invoke("generateAiContent", {
      purpose: "support_chat",
      input: { history },
    });
    const response = res.data;

    const reply = typeof response === "string" ? response : response?.text || "I'm sorry, I couldn't process that. Please email support@dheevoy.com";
    setMessages(prev => [...prev, { role: "assistant", content: reply }]);

    // Log to ai_interactions
    base44.entities.ai_interactions.create({
      id_uuid: crypto.randomUUID(),
      user_id: user?.id || "guest",
      interaction_type: "support_chat",
      user_prompt: msg,
      ai_response: reply,
      model_used: "gpt_5_mini",
      interaction_created_date: new Date().toISOString().split("T")[0],
    }).catch(() => {});

    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden lg:rounded-[28px] lg:border-[#e1e9f2] lg:shadow-[0_14px_38px_rgba(16,33,73,0.065)]">
      <div className="px-5 pt-5 pb-3 border-b lg:px-6 lg:pt-6 lg:pb-5">
        <h2 className="font-bold text-base flex items-center gap-2 lg:text-lg">🤖 Ask DheeVoy AI</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Get instant answers about your trips, visa requirements, safety and more</p>
      </div>

      {/* Chat area */}
      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50 lg:h-[430px] lg:p-6 lg:space-y-4 lg:bg-[linear-gradient(180deg,#f7faff,#f1f7fd)]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "text-white font-medium"
                : "bg-white border text-foreground"
            }`} style={m.role === "user" ? { backgroundColor: "#00E5CC" } : {}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested chips */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t bg-white lg:flex-wrap lg:overflow-visible lg:px-5 lg:py-3">
        {SUGGESTED.map(q => (
          <button
            key={q}
            onClick={() => send(q)}
            className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full border border-teal-200 text-teal-700 bg-teal-50 whitespace-nowrap hover:bg-teal-100 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white flex gap-2 lg:p-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything about DheeVoy..."
          className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40"
          style={{ backgroundColor: "#00E5CC" }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center py-2 px-4 bg-slate-50 border-t">
        🤖 AI responses may not always be accurate. For urgent issues contact our support team.
      </p>
    </div>
  );
}
