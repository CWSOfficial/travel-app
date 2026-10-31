import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, Plane, Hotel, ChevronDown, ChevronUp, Wallet, Users, Shield, Stamp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_STYLES = {
  planning: { label: "Planning", className: "bg-yellow-100 text-yellow-700" },
  recommended: { label: "Recommended", className: "bg-blue-100 text-blue-700" },
  selected: { label: "Selected", className: "bg-purple-100 text-purple-700" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700" },
  booked: { label: "Booked ✓", className: "bg-black text-white" },
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80",
];

export default function TripCard({ trip, index }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const status = STATUS_STYLES[trip.status] || STATUS_STYLES.planning;
  const img = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  const dest = trip.destination_details || {};

  return (
    <div className="bg-white rounded-2xl border border-border/90 overflow-hidden shadow-[0_3px_12px_rgba(16,33,73,0.055)] hover:shadow-[0_12px_28px_rgba(16,33,73,0.12)] hover:-translate-y-0.5 transition-all duration-200">
      {/* Card header — always visible, click to expand */}
      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        <div className="relative h-36">
          <img src={img} alt={trip.selected_destination || "Trip"} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
          <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${status.className}`}>
            {status.label}
          </span>
          <h3 className="absolute bottom-3 left-3 font-bold text-white text-base">
            {trip.selected_destination || "Trip Planned"}
          </h3>
        </div>
        <div className="px-4 pt-3 pb-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" /> From {trip.departure_city}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {trip.start_date}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {trip.duration_days} days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs capitalize text-muted-foreground">{trip.budget?.replace("_", " ")} · {trip.travel_style}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Less" : "Details"}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-3">

              {/* Destination AI summary */}
              {dest.why_recommended && (
                <div className="bg-black text-white rounded-xl p-3 text-xs leading-relaxed">
                  <p className="font-bold text-white/60 mb-1 text-[10px] uppercase tracking-wide">Dbuddy AI · Why this trip</p>
                  {dest.why_recommended}
                </div>
              )}

              {/* Cost breakdown */}
              {(dest.flight_cost || dest.hotel_cost || dest.total_cost) && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  {dest.flight_cost && (
                    <div className="bg-muted rounded-xl p-2">
                      <Plane className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">Flights</p>
                      <p className="font-bold text-xs">{dest.flight_cost}</p>
                    </div>
                  )}
                  {dest.hotel_cost && (
                    <div className="bg-muted rounded-xl p-2">
                      <Hotel className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">Hotel</p>
                      <p className="font-bold text-xs">{dest.hotel_cost}</p>
                    </div>
                  )}
                  {dest.total_cost && (
                    <div className="bg-muted rounded-xl p-2">
                      <Wallet className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">Total</p>
                      <p className="font-bold text-xs">{dest.total_cost}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Visa & Safety */}
              <div className="grid grid-cols-2 gap-2">
                {dest.visa_requirement && (
                  <div className="bg-blue-50 rounded-xl p-2.5">
                    <p className="text-[10px] font-semibold text-blue-700 flex items-center gap-1 mb-0.5"><Stamp className="w-3 h-3" /> Visa</p>
                    <p className="text-xs font-bold text-blue-900">{dest.visa_requirement}</p>
                  </div>
                )}
                {dest.safety_rating && (
                  <div className="bg-green-50 rounded-xl p-2.5">
                    <p className="text-[10px] font-semibold text-green-700 flex items-center gap-1 mb-0.5"><Shield className="w-3 h-3" /> Safety</p>
                    <p className="text-xs font-bold text-green-900">{dest.safety_rating}</p>
                  </div>
                )}
              </div>

              {/* Traveller info */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {trip.num_travelers} traveller{trip.num_travelers > 1 ? "s" : ""}</span>
                <span className="capitalize">{trip.group_type}</span>
              </div>

              {/* Booking refs */}
              {(trip.flight_booking_ref || trip.hotel_booking_ref) && (
                <div className="pt-2 space-y-1 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Booking References</p>
                  {trip.flight_booking_ref && (
                    <p className="text-xs flex items-center gap-1.5 font-medium"><Plane className="w-3 h-3 text-muted-foreground" /> {trip.flight_booking_ref}</p>
                  )}
                  {trip.hotel_booking_ref && (
                    <p className="text-xs flex items-center gap-1.5 font-medium"><Hotel className="w-3 h-3 text-muted-foreground" /> {trip.hotel_booking_ref}</p>
                  )}
                </div>
              )}

              {/* Contact details used */}
              {trip.email && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">Alerts sent to: <span className="font-medium text-foreground">{trip.email}</span></p>
                </div>
              )}

              {/* Continue Planning — loads this trip's state and jumps to flight/hotel picker */}
              <button
                onClick={() => navigate(`/?trip=${trip.id}`)}
                className="w-full mt-2 py-2.5 rounded-xl font-semibold text-xs text-white flex items-center justify-center gap-1.5 bg-black hover:bg-black/80 transition-colors"
              >
                <Plane className="w-3.5 h-3.5" /> Continue Planning
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
