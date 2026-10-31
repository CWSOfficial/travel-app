import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Consistent back button for all 8 checklist-linked flows.
// Reads ?trip=ID&path=... from the URL and returns the user to the
// Travel Checklist, preserving their checklist progress (stored in
// the Trip entity's checklist_completion field — survives navigation).
export default function BackToChecklist() {
  const [params] = useSearchParams();
  const tripId = params.get("trip");
  const path = params.get("path");

  if (!tripId) return null;

  const backUrl = `/travel-checklist?trip=${tripId}${path ? `&path=${path}` : ""}`;

  return (
    <Link
      to={backUrl}
      className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-3 transition-colors group"
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      Back to Checklist
    </Link>
  );
}