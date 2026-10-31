import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Edit3 } from "lucide-react";

// Persistent navigation/action area for saved multi-city journey views.
// Shows Back to My Trips, Home, and Edit Journey so users are never trapped
// on a saved journey page with no way back. Compact icons on mobile, labels
// on desktop. Reuses existing Link/router — no duplicate nav system.
export default function SavedJourneyNav({ onEdit, tripId }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between gap-2 mb-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
      {/* Back to My Trips */}
      <Link
        to="/trips"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[40px] px-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back to My Trips</span>
        <span className="sm:hidden">Trips</span>
      </Link>

      {/* Home */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[40px] px-2"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {/* Edit Journey */}
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-300 hover:text-teal-200 bg-teal-500/10 border border-teal-500/25 rounded-lg px-3 py-1.5 min-h-[40px]"
      >
        <Edit3 className="w-4 h-4" />
        <span>Edit Journey</span>
      </button>
    </div>
  );
}