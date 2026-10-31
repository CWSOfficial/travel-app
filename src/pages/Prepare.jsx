import { useEffect } from "react";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import posthog from 'posthog-js';
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import PrepareToolCard from "@/components/prepare/PrepareToolCard";
import ChecklistWidget from "@/components/prepare/ChecklistWidget";

const TOOLS = [
  { emoji: "🛂", title: "Visa Requirements AI Chat", description: "Check entry rules, visa types and passport validity with AI guidance.", to: "/visa", eventName: "prepare_tool_visa" },
  { emoji: "📶", title: "Mobile eSIM Instant Activation", description: "Stay connected from landing — compare and activate eSIM plans.", to: "/esim", eventName: "prepare_tool_esim" },
  { emoji: "🛡️", title: "Travel Safety & Advisory Index", description: "Real government safety scores and travel advisories for any destination.", to: "/safety", eventName: "prepare_tool_safety" },
  { emoji: "🚗", title: "Car Rental & Mobility Finder", description: "Find rental cars, transfers and local transport options for your trip.", to: "/attractions", eventName: "prepare_tool_car_rental" },
  { emoji: "⛅", title: "Local Weather & Packing Guide", description: "Get the forecast and a tailored packing list for your destination.", to: "/weather", eventName: "prepare_tool_weather" },
  { emoji: "🕋", title: "Pilgrimage & Cultural Travel Guidance", description: "Faith-based travel planning for Hajj, Umrah and cultural tours.", to: "/pilgrimage-tours", eventName: "prepare_tool_pilgrimage" },
];

export default function Prepare() {
  useEffect(() => {
    posthog.capture('pillar_engaged', {
      pillar: 'Prepare',
      action: 'viewed',
      page: window.location.pathname,
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-border bg-gradient-to-br from-card to-muted/30 p-6 md:p-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Trip Preparation Tools</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Everything you need before you fly — in one place.</p>
            </div>
          </div>
        </motion.div>

        {/* 6-card interactive grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((tool, i) => (
            <PrepareToolCard key={tool.to} {...tool} delay={i * 0.06} />
          ))}
        </div>

        {/* Interactive checklist widget */}
        <div>
          <ChecklistWidget />
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          AI-generated guidance. Always verify visa requirements with the official embassy and check government foreign-travel-advice before travelling.
        </p>
      </div>

      <BottomNav active="/prepare" />
    </div>
  );
}