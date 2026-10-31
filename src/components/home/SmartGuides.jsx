import { useState } from "react";
import { Clock, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// "Curated Smart Guides" — horizontal scrollable carousel of bite-sized
// visual guide cards. Tapping a card opens an in-app slide-over sheet with
// 3 bullet points (kept inside the app — no external navigation).
// Mock data below; swap for real blog/CMS source later.

export const smartGuidesData = [
  {
    id: "g1",
    title: "3 Entry Rules for Japan in 2026",
    categoryTag: "UK Passport Tip",
    readTime: "30 sec read",
    coverImage:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=70",
    bulletPoints: [
      "UK passport holders get visa-free stays up to 90 days for tourism — no eVisa needed.",
      "Passport must be valid for the duration of your stay; carry it at all times.",
      "Return/onward ticket may be requested at the border — have it booked before you fly.",
    ],
  },
  {
    id: "g2",
    title: "How to Avoid Taxi Scams in Rome",
    categoryTag: "Safety Rule",
    readTime: "45 sec read",
    coverImage:
      "https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=600&q=70",
    bulletPoints: [
      "Only use official white taxis with a 'TAXI' roof sign and a Roma Capitale licence.",
      "Agree a fixed fare to airports (Fiumicino €48, Ciampino €30) before you set off.",
      "Insist the meter runs for in-city trips — refuse 'flat rate' offers inside the centre.",
    ],
  },
  {
    id: "g3",
    title: "The eSIM Hack That Saves You £20",
    categoryTag: "eSIM Hack",
    readTime: "30 sec read",
    coverImage:
      "https://images.unsplash.com/photo-1512918907442-829d0d48b929?auto=format&fit=crop&w=600&q=70",
    bulletPoints: [
      "Install your eSIM over Wi-Fi before you land — activation needs data or a code.",
      "Turn off 'Data Roaming' on your primary SIM to avoid accidental carrier charges.",
      "Set the eSIM as your data line and keep your home number for calls and SMS.",
    ],
  },
  {
    id: "g4",
    title: "5 Packing Rules for Bali Beaches",
    categoryTag: "Travel Tip",
    readTime: "40 sec read",
    coverImage:
      "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=600&q=70",
    bulletPoints: [
      "Pack reef-safe sunscreen — standard sunblock is banned at marine reserves.",
      "A light sarong doubles as a temple cover-up; required for sacred sites.",
      "Bring a dry bag for phone and passport during boat trips and waterfall hikes.",
    ],
  },
];

export default function SmartGuides() {
  const [active, setActive] = useState(null);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:mt-12 w-full lg:rounded-[2rem] lg:border lg:border-white/90 lg:bg-white/65 lg:p-7 xl:p-8 lg:shadow-[0_12px_36px_rgba(16,33,73,0.07)] lg:backdrop-blur-sm" aria-label="Curated smart guides">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            Curated Smart Guides
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Read Time &lt; 1 Min
          </p>
        </div>
      </div>

      {/* Horizontal scroll — hidden scrollbars */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`section[aria-label="Curated smart guides"] ::-webkit-scrollbar{display:none;}`}</style>
        {smartGuidesData.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActive(g)}
            className="relative shrink-0 w-[240px] lg:w-[280px] h-[160px] lg:h-[180px] rounded-2xl overflow-hidden border border-border text-left group hover:border-primary/60 transition-all duration-200 shadow-[0_3px_12px_rgba(16,33,73,0.07)] hover:shadow-[0_12px_28px_rgba(16,33,73,0.14)] lg:rounded-3xl"
          >
            {/* Background image */}
            <img
              src={g.coverImage}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Dark overlay for legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-[#0B132B]/70 to-[#0B132B]/30" />

            {/* Tag */}
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-[#00E5CC] text-[#0B132B] text-[10px] font-bold">
              {g.categoryTag}
            </span>

            {/* Headline */}
            <p className="absolute left-3 right-3 bottom-9 font-bold text-white text-sm leading-snug line-clamp-2">
              {g.title}
            </p>

            {/* Bottom row */}
            <div className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between">
              <span className="text-[10px] text-white/70 flex items-center gap-1">
                ⚡ {g.readTime}
              </span>
              <ChevronRight className="w-4 h-4 text-[#00E5CC]" />
            </div>
          </button>
        ))}
      </div>

      {/* Slide-over sheet */}
      <AnimatePresence>
        {active && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActive(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md z-[70] flex flex-col"
              style={{ background: "#faf8ff" }}
            >
              {/* Header image */}
              <div className="relative h-40 shrink-0">
                <img src={active.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] to-transparent" />
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="absolute bottom-3 left-4 px-2.5 py-1 rounded-full bg-[#00E5CC] text-[#0B132B] text-[10px] font-bold">
                  {active.categoryTag}
                </span>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5">
                <h4 className="font-display text-xl font-bold text-foreground leading-snug">
                  {active.title}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {active.readTime}
                </p>

                <ul className="mt-5 space-y-3">
                  {active.bulletPoints.map((b, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-foreground/85 leading-relaxed">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-secondary border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-[10px] text-muted-foreground mt-6 pt-4 border-t border-border">
                  This is AI-generated guidance. Always verify with official sources before travelling.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
