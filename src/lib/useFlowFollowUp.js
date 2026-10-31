import { useState } from "react";
import { base44 } from "@/api/base44Client";

// Shared "ask another question" follow-up thread for the conversational AI flows.
// Mirrors the inline ask thread used by the eSIM/Insurance flows without touching
// them. Returns the state + a handleAsk(text) runner.
export function useFlowFollowUp(flowLabel, model = "gpt_5_mini") {
  const [askOpen, setAskOpen] = useState(false);
  const [askInput, setAskInput] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askThread, setAskThread] = useState([]);

  const handleAsk = async () => {
    const q = askInput.trim();
    if (!q) return;
    setAskThread((t) => [...t, { from: "user", text: q }]);
    setAskInput("");
    setAskLoading(true);
    try {
      const result = await base44.functions
        .invoke("generateAiContent", {
          purpose: "flow_followup",
          input: { flowContext: `${flowLabel} flow`, q },
        })
        .then((r) => r.data);
      setAskThread((t) => [...t, { from: "assistant", text: result }]);
    } catch (e) {
      console.error("Follow-up AI error:", e);
      setAskThread((t) => [...t, { from: "assistant", text: "Sorry, I couldn't answer that right now." }]);
    } finally {
      setAskLoading(false);
    }
  };

  return { askOpen, setAskOpen, askInput, setAskInput, askThread, askLoading, handleAsk };
}