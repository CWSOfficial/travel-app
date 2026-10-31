import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Globe, Zap, Lock } from "lucide-react";

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&q=80",
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=800&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
];

const features = [
  { icon: ShieldCheck, label: "Visa Intelligence" },
  { icon: Globe, label: "Safety Index" },
  { icon: Zap, label: "Flash Deals" },
];

export default function HeroSection({ onStartPlanning }) {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Background grid — 4 cols × 3 rows = 12 images */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-1">
        {BG_IMAGES.map((src, i) => (
          <div key={i} className="overflow-hidden">
            <img src={src} alt="" fetchpriority="high" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {/* Dark overlay — stronger center vignette */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 100%)" }} />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-3xl w-full text-center"
      >
        {/* Brand name */}
        <h1 className="text-7xl md:text-[8rem] font-black leading-none tracking-tight text-white mb-0 drop-shadow-2xl">
          DheeVoy
        </h1>

        {/* Amber underline with flying plane */}
        <div className="flex justify-center mb-6">
          <svg viewBox="0 0 520 36" className="w-80 md:w-[520px] h-8" fill="none">
            {/* Curved amber line */}
            <path
              d="M10 26 Q260 6 510 22"
              stroke="#F59E0B"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Plane flying along the line — positioned at ~70% along the curve */}
            <g transform="translate(358,10) rotate(-8)">
              {/* Fuselage */}
              <ellipse cx="0" cy="0" rx="11" ry="3.5" fill="#F59E0B" />
              {/* Nose */}
              <path d="M11 0 Q18 0 14 -1.5 Q18 0 14 1.5 Z" fill="#F59E0B" />
              {/* Main wing */}
              <path d="M-2 0 L-8 -10 L4 -4 Z" fill="#FBBF24" />
              <path d="M-2 0 L-8 10 L4 4 Z" fill="#FBBF24" />
              {/* Tail fin */}
              <path d="M-10 -1 L-14 -7 L-7 -2 Z" fill="#F59E0B" />
              <path d="M-10 1 L-14 6 L-7 2 Z" fill="#F59E0B" />
              {/* Contrail dots */}
              <circle cx="-18" cy="0" r="1.5" fill="#FDE68A" opacity="0.8" />
              <circle cx="-23" cy="0.5" r="1.1" fill="#FDE68A" opacity="0.5" />
              <circle cx="-27" cy="1" r="0.7" fill="#FDE68A" opacity="0.3" />
            </g>
          </svg>
        </div>

        {/* Value prop */}
        <p className="text-lg md:text-xl text-white/90 font-normal mb-2 max-w-2xl mx-auto leading-relaxed">
          <span className="font-bold">Stop overpaying and flying blind.</span> Get AI-curated destinations, live visa checks,{" "}
          real safety scores and flash flight deals — all before you book.
        </p>

        <p className="text-sm text-white/50 mb-7">No credit card required · Takes 60 seconds</p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2.5 justify-center mb-8 max-w-lg mx-auto">
          {features.map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.07, duration: 0.35 }}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-sm font-medium text-white"
            >
              <Icon className="w-4 h-4 text-amber-400" />
              {label}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <Button
            size="lg"
            onClick={onStartPlanning}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-12 py-6 text-base font-bold shadow-2xl shadow-black/50 transition-colors duration-200 cursor-pointer"
          >
            Plan My Trip Free →
          </Button>
          <p className="text-xs text-white/45 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Your data is never sold · Cancel anytime
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}