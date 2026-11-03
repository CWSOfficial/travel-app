import { Link, useLocation } from "react-router-dom";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useAuth } from "@/lib/AuthContext";
import { siteUrl } from "@/config/siteOrigins";

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "Plan", path: "/plan" },
  { label: "Prepare", path: "/prepare" },
  { label: "Nearby", path: "/nearby" },
  { label: "Profile", path: "/profile" },
];

// DMC Partner header — replaces consumer tabs for users with the dmc_partner role.
const DMC_NAV_LINKS = [
  { label: "My Listed Trips", path: "/dmc" },
  { label: "+ Submit Trip", path: "/dmc/submit" },
  { label: "Bookings", path: "/dmc/dashboard" },
  { label: "Account & Payment", path: "/dmc?profile=1" },
];

export default function Navbar() {
  const location = useLocation();
  const current = location.pathname;
  const { user } = useAuth();
  const isDmc = user?.role === "dmc_partner";
  const links = isDmc ? DMC_NAV_LINKS : NAV_LINKS;
  const marketingHome = siteUrl("marketing", "/");

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[#e4e9f2] shadow-[0_4px_18px_rgba(7,26,64,0.06)]">
      <div className="max-w-[1216px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] lg:h-[88px] grid grid-cols-[auto_1fr_auto] items-center gap-4">

        {/* Brand */}
        <a href={marketingHome} aria-label="Open DheeVoy marketing home" className="flex items-center shrink-0 group">
          <div className="rounded-xl px-1 py-1 group-hover:scale-[1.03] transition-transform">
            <img
              src="https://media.base44.com/images/public/6a1efd8ea4ce97ed07891b4b/b52f79d44_DheeVoyLogo.png"
              alt="DheeVoy"
              className="h-9 lg:h-[62px] w-auto object-contain"
            />
          </div>
        </a>

        {/* Desktop links mirror the marketing-site header; BottomNav remains for mobile/tablet. */}
        <div className="hidden lg:flex items-center justify-center gap-1">
          {links.map(({ label, path }) => {
            const basePath = path.split("?")[0];
            const isActive = basePath === "/" ? current === "/" : current === basePath || current?.startsWith(basePath);
            return (
              <Link
                key={path}
                to={path}
                className={`px-4 xl:px-5 py-2.5 rounded-full text-sm font-semibold tracking-[-0.01em] transition-colors ${
                  isActive ? "text-[#0878d1] bg-[#eaf7ff]" : "text-[#071a40] hover:text-[#0878d1] hover:bg-[#f2f3ff]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right cluster */}
        <div className="flex items-center justify-end gap-2">
          <NotificationBell />
        </div>
      </div>
    </nav>
  );
}
