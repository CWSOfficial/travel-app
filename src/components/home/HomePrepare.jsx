import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Shield, ShieldCheck, Smartphone, Car, ChevronRight, Route, Sparkles, Pause, Play } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";

// New homepage landing section (replaces the old 9-card QuickActions grid):
//  1. "Plan a Trip" — prominent branching entry → /plan
//  2. "Prepare" — exactly 4 cards: Visa Check, Safety, eSIM, Car Rental
// (Weather, Flights & Hotels, Insurance, Attractions, Pilgrimage are removed from
//  the homepage hero — they remain fully accessible via the Travel Checklist.)
const PREPARE_CARDS = [
  { icon: ShieldCheck, label: "Visa Check", subtitle: "Entry requirements", to: "/visa", tileName: "visa_check" },
  { icon: Shield, label: "Safety", subtitle: "Destination ratings", to: "/safety", tileName: "safety" },
  { icon: Smartphone, label: "eSIM", subtitle: "Stay connected abroad", to: "/esim", tileName: "esim" },
  { icon: Car, label: "Car Rental", subtitle: "Vehicles & transfers", to: "/attractions", tileName: "car_rental" },
];

export default function HomePrepare() {
  const [firstName, setFirstName] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isHeroVideoPlaying, setIsHeroVideoPlaying] = useState(true);
  const heroVideoRef = useRef(null);
  const navigate = useNavigate();

  const toggleHeroVideo = async () => {
    const video = heroVideoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setIsHeroVideoPlaying(false);
      }
    } else {
      video.pause();
    }
  };

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setFirstName(u?.full_name ? u.full_name.trim().split(/\s+/)[0] : null);
        setUserId(u?.id || null);
      })
      .catch(() => {});
  }, []);

  const handleTile = (tileName, to, position) => {
    trackEvent("home_tile_click", { tile_name: tileName, tile_position: position, user_id: userId || "" });
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "home_tile_click", { tile_name: tileName, tile_position: position, user_id: userId || "", timestamp: new Date().toISOString() });
    }
    navigate(to);
  };

  return (
    <section
      className="relative max-w-7xl mx-auto px-4 pt-6 pb-2 sm:px-6 lg:px-8 lg:pt-0 lg:overflow-x-clip"
    >
      {/* Desktop uses the same cinematic video hero as the marketing website.
          Keep the compact app home layout below unchanged on mobile. */}
      <div
        className="relative left-1/2 mb-12 hidden min-h-[min(800px,calc(100svh-80px))] w-screen -translate-x-1/2 overflow-hidden bg-[#173c4a] text-center text-white lg:flex lg:items-center lg:justify-center"
      >
        <video
          ref={heroVideoRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_55%]"
          onPlay={() => setIsHeroVideoPlaying(true)}
          onPause={() => setIsHeroVideoPlaying(false)}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/design/home/assets/hero-coast-poster.jpg"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/design/home/assets/hero-coast.mp4" type="video/mp4" />
        </video>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(4,22,35,.56), rgba(4,22,35,.48) 45%, rgba(4,22,35,.72))" }}
        />
        <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 py-20 xl:px-8">
          <p className="mx-auto mb-7 inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2.5 text-center text-[10px] font-bold tracking-[0.08em] text-white backdrop-blur-md sm:px-5 sm:text-xs sm:tracking-[0.12em]">
            <Sparkles className="h-4 w-4 shrink-0" /> Plan Smarter. Travel Safer. Go Further.
          </p>
          <h1 className="mx-auto max-w-[900px] font-display text-6xl font-bold leading-[1.06] tracking-tight drop-shadow-xl xl:text-7xl">
            Your next journey starts with a feeling.
          </h1>
          <p className="mx-auto mt-6 max-w-[790px] text-lg leading-8 text-white/90 xl:text-xl">
            Tell us what you&apos;re dreaming of. We&apos;ll help turn it into an intuitive voyage sculpted precisely to your natural rhythm.
          </p>
          <button
            type="button"
            onClick={() => navigate("/plan")}
            className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-full bg-gradient-to-r from-[#0060a9] via-[#0878d1] to-[#3ddefe] px-9 py-4 text-sm font-bold text-white shadow-lg shadow-black/25 transition-transform hover:-translate-y-0.5"
          >
            Start Planning <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={toggleHeroVideo}
          aria-label={isHeroVideoPlaying ? "Pause background video" : "Play background video"}
          aria-pressed={!isHeroVideoPlaying}
          className="absolute bottom-6 right-6 z-20 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/35 bg-black/35 px-4 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
        >
          {isHeroVideoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isHeroVideoPlaying ? "Pause video" : "Play video"}
        </button>
      </div>

      {/* Faint world map watermark */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.035 }} viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g fill="#0878D1">
          <path d="M150,80 C120,70 95,105 110,155 L130,210 L185,225 L225,185 L245,140 L230,95 L190,75 Z" />
          <path d="M250,250 C235,245 225,265 240,310 L260,370 L295,385 L315,340 L305,275 Z" />
          <path d="M470,90 L455,135 L495,145 L525,120 L515,90 Z" />
          <path d="M470,160 C455,175 470,230 495,270 L525,305 L548,280 L535,215 L510,175 Z" />
          <path d="M550,80 L535,145 L600,185 L685,165 L745,125 L720,75 L615,65 Z" />
          <path d="M780,300 L755,345 L815,365 L845,330 L820,295 Z" />
        </g>
      </svg>

      <h2 className="relative font-display text-2xl font-bold text-foreground lg:hidden">
        {firstName ? `Hi ${firstName} 👋` : "Hi 👋"}
      </h2>
      {/* How would you like to travel? — 3 primary entry choices */}
      <div className="relative mb-4 lg:mb-8 lg:rounded-[2rem] lg:border lg:border-white/90 lg:bg-white/70 lg:p-7 xl:p-8 lg:shadow-[0_12px_36px_rgba(16,33,73,0.07)] lg:backdrop-blur-sm">
        <h3 className="font-display text-lg font-bold text-foreground mb-3 lg:mb-5 lg:text-2xl">How would you like to travel?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-5">
          {/* Single Trip */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => { trackEvent("home_choice_single_trip"); navigate("/trip-dashboard"); }}
            className="relative text-left rounded-2xl border border-border/90 bg-white shadow-[0_3px_12px_rgba(16,33,73,0.06)] overflow-hidden hover:border-primary/35 hover:shadow-[0_10px_24px_rgba(16,33,73,0.11)] transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:rounded-[1.65rem] lg:shadow-[0_16px_36px_rgba(7,26,64,0.10)] lg:hover:-translate-y-1 lg:hover:shadow-[0_24px_48px_rgba(7,26,64,0.16)]"
          >
            <div className="relative h-36 sm:h-40 overflow-hidden lg:h-40 xl:h-48">
              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=85&auto=format&fit=crop" alt="" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071A40]/55 via-[#071A40]/10 to-transparent" />
              <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                <Compass className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="p-3 lg:p-5">
              <p className="font-semibold text-foreground text-sm lg:text-base">Single Trip</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Plan one destination</p>
              <p className="text-[11px] font-medium text-primary mt-2 inline-flex items-center gap-1">
                Plan a Trip <ChevronRight className="w-3 h-3" />
              </p>
            </div>
          </motion.button>

          {/* Multi-City Journey */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => { trackEvent("home_choice_multi_city"); navigate("/multi-city"); }}
            className="relative text-left rounded-2xl border border-border/90 bg-white shadow-[0_3px_12px_rgba(16,33,73,0.06)] overflow-hidden hover:border-primary/35 hover:shadow-[0_10px_24px_rgba(16,33,73,0.11)] transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:rounded-[1.65rem] lg:shadow-[0_16px_36px_rgba(7,26,64,0.10)] lg:hover:-translate-y-1 lg:hover:shadow-[0_24px_48px_rgba(7,26,64,0.16)]"
          >
            <div className="relative h-36 sm:h-40 overflow-hidden lg:h-40 xl:h-48">
              <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=85&auto=format&fit=crop" alt="" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071A40]/55 via-[#071A40]/10 to-transparent" />
              <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                <Route className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="p-3 lg:p-5">
              <p className="font-semibold text-foreground text-sm lg:text-base">Multi-City Journey</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Build one connected trip across multiple destinations</p>
              <p className="text-[11px] font-medium text-primary mt-2 inline-flex items-center gap-1">
                Build a Journey <ChevronRight className="w-3 h-3" />
              </p>
            </div>
          </motion.button>

          {/* Curated Trips */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => { trackEvent("home_choice_curated"); navigate("/curated-trips"); }}
            className="relative text-left rounded-2xl border border-border/90 bg-white shadow-[0_3px_12px_rgba(16,33,73,0.06)] overflow-hidden hover:border-primary/35 hover:shadow-[0_10px_24px_rgba(16,33,73,0.11)] transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:rounded-[1.65rem] lg:shadow-[0_16px_36px_rgba(7,26,64,0.10)] lg:hover:-translate-y-1 lg:hover:shadow-[0_24px_48px_rgba(7,26,64,0.16)]"
          >
            <div className="relative h-36 sm:h-40 overflow-hidden lg:h-40 xl:h-48">
              <img src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=85&auto=format&fit=crop" alt="" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071A40]/55 via-[#071A40]/10 to-transparent" />
              <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="p-3 lg:p-5">
              <p className="font-semibold text-foreground text-sm lg:text-base">Curated Trips</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Expert-built packages from vetted local partners</p>
              <p className="text-[11px] font-medium text-primary mt-2 inline-flex items-center gap-1">
                Explore Curated Trips <ChevronRight className="w-3 h-3" />
              </p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Prepare — exactly 4 cards */}
      <div className="relative mb-1 lg:mt-6 lg:rounded-[2rem] lg:border lg:border-white/90 lg:bg-white/70 lg:p-7 xl:p-8 lg:shadow-[0_12px_36px_rgba(16,33,73,0.07)] lg:backdrop-blur-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 lg:mb-5 lg:text-sm">Prepare for your trip</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
          {PREPARE_CARDS.map(({ icon: Icon, ...a }, i) => (
            <button
              key={a.label}
              type="button"
              onClick={() => handleTile(a.tileName, a.to, i + 1)}
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_28px_rgba(7,26,64,0.09)] text-center lg:rounded-3xl lg:py-6"
            >
              <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf7ff] text-[#0878d1] transition-colors group-hover:bg-[#0878d1] group-hover:text-white">
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{a.label}</span>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">{a.subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
