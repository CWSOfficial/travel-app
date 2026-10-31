import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Stamp, MapPin, Thermometer, ChevronRight } from "lucide-react";
import WishlistHeart from "@/components/wishlist/WishlistHeart";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
];

function safetyColor(rating = "") {
  const r = rating.toLowerCase();
  if (r.includes("very safe")) return { badge: "bg-green-100 text-green-700 border-green-200", bar: "bg-green-500" };
  if (r.includes("safe")) return { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" };
  if (r.includes("moderate")) return { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", bar: "bg-yellow-500" };
  if (r.includes("caution")) return { badge: "bg-orange-100 text-orange-700 border-orange-200", bar: "bg-orange-500" };
  return { badge: "bg-red-100 text-red-700 border-red-200", bar: "bg-red-500" };
}

export default function DestinationCard({ destination, index, onSelect }) {
  const img = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  const safety = safetyColor(destination.safety_rating);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl overflow-hidden border border-border hover:shadow-2xl transition-all duration-300 flex flex-col"
    >
      {/* Hero image */}
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <img src={img} alt={destination.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20" />
        <WishlistHeart destination={destination} className="absolute top-3 right-3 z-10" />
        {destination.budget_tier && (
          <div className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full border backdrop-blur-sm ${
            destination.budget_tier === "budget" ? "bg-green-100/90 text-green-800 border-green-300" :
            destination.budget_tier === "luxury" ? "bg-purple-100/90 text-purple-800 border-purple-300" :
            "bg-sky-100/90 text-sky-800 border-sky-300"
          }`}>
            {destination.budget_tier === "budget" ? "💚 Budget Pick" : destination.budget_tier === "luxury" ? "💎 Premium" : "✈️ Best Value"}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="font-black text-white text-xl leading-tight">{destination.city || destination.name?.split(",")[0]}</p>
          <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {destination.full_location || destination.name}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* Hint row: temp + safety + visa */}
        <div className="flex flex-wrap gap-1.5">
          {destination.temp_celsius != null && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-sky-50 border border-sky-100 text-sky-700 font-semibold px-2 py-1 rounded-full">
              <Thermometer className="w-3 h-3" />
              {destination.temp_celsius}°C / {destination.temp_fahrenheit}°F
            </span>
          )}
          {destination.safety_rating && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${safety.badge}`}>
              <ShieldCheck className="w-3 h-3" />
              {destination.safety_rating}
            </span>
          )}
          {destination.visa_requirement && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 border border-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-full">
              <Stamp className="w-3 h-3" />
              {destination.visa_requirement.split(" ").slice(0, 3).join(" ")}
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed italic">{destination.why_recommended}</p>

        <Button
          size="sm"
          className="w-full rounded-xl bg-black text-white hover:bg-black/80 gap-1.5 text-xs mt-auto"
          onClick={() => onSelect(destination)}
        >
          ✨ Generate My Itinerary <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}