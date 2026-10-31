import { useState } from "react";
import { base44 } from "@/api/base44Client";
import IntentSearchBar from "./IntentSearchBar";
import TrendingVisaRules from "./TrendingVisaRules";
import VisaRuleDrawer from "./VisaRuleDrawer";

// Orchestrates the discover widgets below the Quick Actions grid:
//  1. Query the existing DestinationSafetyCache entity (country-level visa + safety).
//  2. If the searched route is not indexed, fall back to InvokeLLM for real-time
//     structured visa & safety details in the exact same shape.
export default function DiscoverSection() {
  const [selected, setSelected] = useState(null);

  const handleSearch = async (term) => {
    const termLower = term.toLowerCase().trim();
    try {
      // 1. Existing entity first (destination or country-code match).
      const rows = await base44.entities.DestinationSafetyCache.list("-last_updated", 200).catch(() => []);
      const match = (rows || []).find(
        (r) =>
          (r.country_name || "").toLowerCase().includes(termLower) ||
          (r.country_code || "").toLowerCase() === termLower
      );
      if (match) {
        setSelected(match);
        return;
      }

      // 2. Fallback — InvokeLLM for real-time structured details.
      const invokeRes = await base44.functions.invoke("generateAiContent", {
        purpose: "visa_safety_oracle",
        input: { term },
      });
      const res = invokeRes.data;
      setSelected(res || { country: term, visa_status: "Check official sources", safety_index_score: null });
    } catch (e) {
      setSelected({
        country: term,
        critical_advisories_text: "Could not fetch live data right now. Please try again.",
        safety_index_score: null,
      });
    }
  };

  return (
    <>
      <IntentSearchBar onResult={handleSearch} />
      <TrendingVisaRules onSelect={setSelected} />
      <VisaRuleDrawer item={selected} onClose={() => setSelected(null)} />
    </>
  );
}