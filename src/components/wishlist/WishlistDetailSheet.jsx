import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, MapPin, Plane } from "lucide-react";
import { motion } from "framer-motion";

const PRIORITIES = [
  { value: "dream", label: "Dream", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "planning_soon", label: "Planning Soon", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "next_trip", label: "Next Trip", color: "bg-orange-100 text-orange-700 border-orange-200" },
];
const STATUSES = [
  { value: "saved", label: "Saved" },
  { value: "planned", label: "Planned" },
  { value: "visited", label: "Visited" },
];

export default function WishlistDetailSheet({ item, onClose, onUpdate, onPlanTrip }) {
  const [notes, setNotes] = useState(item.notes || "");
  const [priority, setPriority] = useState(item.priority || "");
  const [status, setStatus] = useState(item.status || "saved");
  const [travelDate, setTravelDate] = useState(item.estimated_travel_date || "");
  const [saving, setSaving] = useState(false);

  const save = async (patch) => {
    setSaving(true);
    const updated = await base44.entities.Wishlist.update(item.id, patch);
    onUpdate({ ...item, ...patch });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 bg-black/50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="bg-white rounded-t-3xl w-full max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-52 flex-shrink-0">
          {item.destination_image_url ? (
            <img src={item.destination_image_url} alt={item.destination_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-slate-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-4 left-4">
            <p className="font-black text-white text-xl">{item.destination_name}</p>
            <p className="text-white/80 text-sm">{item.destination_country}</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Status toggle */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
            <div className="flex gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setStatus(s.value); save({ status: s.value }); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${status === s.value ? "bg-slate-900 text-white border-slate-900" : "border-border text-muted-foreground"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Priority</p>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setPriority(p.value); save({ priority: p.value }); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${priority === p.value ? p.color : "border-border text-muted-foreground"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estimated date */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Estimated Travel Date</p>
            <input
              type="date"
              value={travelDate}
              onChange={e => setTravelDate(e.target.value)}
              onBlur={() => save({ estimated_travel_date: travelDate })}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personal Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => save({ notes })}
              rows={3}
              placeholder="Add your notes, dreams, or must-dos..."
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white resize-none focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>

          {/* CTA */}
          <button
            onClick={() => onPlanTrip(item)}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2"
            style={{ backgroundColor: "#00E5CC" }}
          >
            <Plane className="w-5 h-5" /> Plan This Trip with AI →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}