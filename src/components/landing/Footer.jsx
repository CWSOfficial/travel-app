import React from "react";
import { Globe2, DollarSign } from "lucide-react";
import SocialLinksRow from "@/components/landing/SocialLinksRow";
import { siteUrl } from "@/config/siteOrigins";

// Same footer content and grouping as the 5175 marketing site. App links use
// routes that exist in the 5176 travel application; marketing links stay on 5175.
const appPaths = {
  discover: "/",
  dream: "/plan",
  itinerary: "/trip-dashboard",
  budget: "/trip-dashboard",
  dates: "/plan",
  visa: "/visa",
  safety: "/safety",
  weather: "/weather",
  esim: "/esim",
  checklist: "/travel-checklist",
  nearby: "/nearby",
  attractions: "/attractions",
};
const appPath = (key) => siteUrl("travel", appPaths[key]);
const marketingPath = (path) => siteUrl("marketing", path);

const explore = [
  { label: "Destinations", href: marketingPath("/destinations") },
  { label: "Travel Moods", href: appPath("discover") },
  { label: "Hidden Gems", href: appPath("nearby") },
  { label: "Travel Journals", href: marketingPath("/blog") },
];
const plan = [
  { label: "AI Dream Journey", href: appPath("dream") },
  { label: "Itinerary Builder", href: appPath("itinerary") },
  { label: "Trip Budget", href: appPath("budget") },
  { label: "Travel Dates", href: appPath("dates") },
];
const prepare = [
  { label: "Visa Check", href: appPath("visa") },
  { label: "Destination Safety", href: appPath("safety") },
  { label: "Weather Guide", href: appPath("weather") },
  { label: "eSIM & Insurance", href: appPath("esim") },
  { label: "Travel Checklist", href: appPath("checklist") },
];
const nearbySupport = [
  { label: "Local Experiences", href: appPath("nearby") },
  { label: "Attractions & Tours", href: appPath("attractions") },
  { label: "Help Center", href: marketingPath("/support") },
  { label: "About DheeVoy", href: marketingPath("/about") },
];

function Col({ title, items }) {
  return (
    <div>
      <h4 className="mb-4 font-body text-[14px] font-semibold uppercase tracking-[0.05em] text-[#071a40]">{title}</h4>
      <ul className="flex flex-col gap-3.5">
        {items.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="font-body text-[15px] leading-5 text-[#3d4f70] transition-colors hover:text-[#0878d1]">{link.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-[#e4e9f2] bg-[#fafaf7] pt-16 pb-8 text-[#071a40] lg:pt-16">
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:grid-cols-[minmax(0,2.15fr)_repeat(4,minmax(0,1fr))] lg:gap-x-10">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <a href={marketingPath("/")} aria-label="Open DheeVoy marketing home" className="inline-flex items-center">
              <img
                src="/design/home/assets/dheevoy-logo.png"
                alt="DheeVoy"
                className="h-[90px] w-[107px] object-contain object-left"
                loading="lazy"
              />
            </a>
            <p className="mt-4 font-body text-[15px] font-medium text-[#3d4f70]">Plan Smarter. Travel Safer. Go Further.</p>
            <p className="mt-4 max-w-xs font-body text-sm leading-relaxed text-[#3d4f70]">
              Algorithmic intelligence blended with modern sensory luxury for seamless global discovery and curated expeditions.
            </p>
            <div className="mt-5"><SocialLinksRow /></div>
          </div>
          <Col title="Explore" items={explore} />
          <Col title="Plan" items={plan} />
          <Col title="Prepare" items={prepare} />
          <Col title="Nearby & Support" items={nearbySupport} />
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#e4e9f2] pt-8 sm:flex-row sm:gap-3">
          <p className="font-body text-center text-[13px] text-[#626b7c] sm:text-left">© 2026 DheeVoy Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <a href={siteUrl("travel", "/privacy")} className="font-body text-[13px] text-[#626b7c] transition-colors hover:text-[#0878d1]">Privacy</a>
            <a href={siteUrl("travel", "/terms")} className="font-body text-[13px] text-[#626b7c] transition-colors hover:text-[#0878d1]">Terms</a>
            <a href={siteUrl("marketing", "/privacy#security")} className="font-body text-[13px] text-[#626b7c] transition-colors hover:text-[#0878d1]">Security</a>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 font-body text-[13px] font-medium text-[#071a40] shadow-sm"><Globe2 size={14} /> English (US)</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 font-body text-[13px] font-medium text-[#071a40] shadow-sm"><DollarSign size={14} /> USD ($)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
