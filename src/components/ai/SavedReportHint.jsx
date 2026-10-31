import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import ChatBubble from "./ChatBubble";

const MSG = "Saved to your DheeVoy profile ✅ — find it anytime under Saved Reports in your Profile.";

// Link-only chip — used by Weather/Safety/Visa where the saved chat bubble is
// already pushed into the message thread.
export function SavedReportLink() {
  return (
    <Link
      to="/saved-reports"
      className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
    >
      <FileText className="w-3.5 h-3.5" /> View Saved Reports →
    </Link>
  );
}

// Bubble + link — used by eSIM/Insurance/Attractions, which previously had no
// saved confirmation at all.
export default function SavedReportHint() {
  return (
    <div className="space-y-2">
      <ChatBubble from="assistant">{MSG}</ChatBubble>
      <div className="flex justify-center">
        <SavedReportLink />
      </div>
    </div>
  );
}