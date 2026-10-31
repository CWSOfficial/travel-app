import React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";

/**
 * Dynamic repeater for day-by-day itinerary rows.
 * days: [{ day_number, title, morning_activity, midday_activity, evening_activity, accommodation_name }]
 * onChange: (next) => void
 */
const EMPTY_DAY = {
  title: "",
  morning_activity: "",
  midday_activity: "",
  evening_activity: "",
  accommodation_name: "",
};

export default function ItineraryDayBuilder({ days = [], onChange }) {
  const addDay = () => {
    const nextNum = days.length + 1;
    onChange([...days, { ...EMPTY_DAY, day_number: nextNum }]);
  };

  const removeDay = (idx) => {
    const next = days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day_number: i + 1 }));
    onChange(next);
  };

  const updateField = (idx, field, val) => {
    const next = [...days];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {days.map((day, idx) => (
        <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-slate-500" />
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-200 text-sm font-bold">
                {day.day_number}
              </span>
              <span className="text-sm font-semibold text-slate-200">Day {day.day_number}</span>
            </div>
            {days.length > 1 && (
              <button
                type="button"
                onClick={() => removeDay(idx)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <input
            type="text"
            value={day.title || ""}
            onChange={(e) => updateField(idx, "title", e.target.value)}
            placeholder="Day title e.g. Arrival & Old City Walk"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">🌅 Morning</label>
              <textarea
                value={day.morning_activity || ""}
                onChange={(e) => updateField(idx, "morning_activity", e.target.value)}
                placeholder="Morning activity…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">☀️ Midday</label>
              <textarea
                value={day.midday_activity || ""}
                onChange={(e) => updateField(idx, "midday_activity", e.target.value)}
                placeholder="Midday activity…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">🌙 Evening</label>
              <textarea
                value={day.evening_activity || ""}
                onChange={(e) => updateField(idx, "evening_activity", e.target.value)}
                placeholder="Evening activity…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 resize-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">🏨 Accommodation</label>
            <input
              type="text"
              value={day.accommodation_name || ""}
              onChange={(e) => updateField(idx, "accommodation_name", e.target.value)}
              placeholder="Hotel / accommodation name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addDay}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-white/15 text-slate-300 hover:border-teal-400/50 hover:text-teal-200 hover:bg-teal-500/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus className="w-4 h-4" /> Add Next Day
      </button>
    </div>
  );
}