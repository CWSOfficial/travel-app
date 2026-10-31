import { Link, useLocation } from "react-router-dom";
import { Home, Compass, ShieldCheck, User, MapPinned, FileText, Plus, Building2, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useProfilePrompt } from "@/lib/profilePromptContext";
import Footer from "@/components/landing/Footer";

// 5 top-level items: Home, Plan, Prepare, Nearby, Profile.
// Prepare is the Travel Readiness & Utilities Hub; Nearby is location tools.
const TABS = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Compass, label: "Plan", path: "/plan" },
  { icon: ShieldCheck, label: "Prepare", path: "/prepare" },
  { icon: MapPinned, label: "Nearby", path: "/nearby" },
  { icon: User, label: "Profile", path: "/profile" },
];

// DMC Partner bottom nav — replaces consumer tabs for users with the dmc_partner role.
const DMC_TABS = [
  { icon: FileText, label: "My Trips", path: "/dmc" },
  { icon: Plus, label: "Submit", path: "/dmc/submit" },
  { icon: ClipboardCheck, label: "Bookings", path: "/dmc/dashboard" },
  { icon: Building2, label: "Account", path: "/dmc?profile=1" },
];

export default function BottomNav({ active }) {
  const location = useLocation();
  const current = active || location.pathname;
  const { isAuthenticated, user } = useAuth();
  const { openPrompt } = useProfilePrompt();
  const isGuest = !isAuthenticated;
  const isDmc = user?.role === "dmc_partner";
  const tabs = isDmc ? DMC_TABS : TABS;
  // Tabs that require an account — guests see the profile prompt instead of navigating.
  // DMC tabs are all auth-gated by route, so no guest-prompt gating needed for DMC users.
  const GATED = isDmc ? [] : ["/profile"];

  return (
    <>
      <div className="hidden w-full lg:block"><Footer /></div>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center gap-1.5 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none lg:hidden">
        <nav className="pointer-events-auto w-full max-w-md bg-white/95 backdrop-blur-2xl border border-[#e5eaf2] shadow-[0_8px_30px_rgba(11,28,64,0.12)] rounded-[22px] px-2 py-2">
          <div className="flex items-center justify-around">
            {tabs.map(({ icon: Icon, label, path }) => {
              const basePath = path.split("?")[0];
              const isActive = basePath === "/" ? current === "/" : current === basePath || current?.startsWith(basePath);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={(e) => {
                    if (isGuest && GATED.includes(basePath)) {
                      e.preventDefault();
                      openPrompt();
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                    isActive ? "bg-[#eaf6ff] text-[#006fc9] shadow-[inset_0_0_0_1px_rgba(0,111,201,0.12)]" : "text-[#63718a] hover:text-[#006fc9] hover:bg-[#f5f8fc]"
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? "stroke-[2.25px]" : "stroke-[1.7px]"}`} />
                  <span className="text-[10px] font-semibold leading-none">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
