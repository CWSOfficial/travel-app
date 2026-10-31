import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/travel/BottomNav";
import Navbar from "@/components/travel/Navbar";
import SupportAIChat from "@/components/help/SupportAIChat";
import SupportFAQ from "@/components/help/SupportFAQ";
import SupportContactForm from "@/components/help/SupportContactForm";

export default function HelpSupport() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-28 lg:bg-[linear-gradient(180deg,#f2f6ff_0%,#faf8ff_42%,#f7fbff_100%)]">
      <div className="hidden lg:block"><Navbar /></div>
      {/* Header */}
      <div className="text-white px-4 pt-12 pb-8 bg-[#0f1929] lg:bg-transparent lg:px-8 lg:pt-11 lg:pb-5 lg:text-[#071a40]">
        <div className="max-w-lg mx-auto lg:max-w-7xl">
          <Link to="/profile" className="flex items-center gap-1.5 text-white/70 text-sm mb-4 hover:text-white transition-colors lg:mb-5 lg:text-[#617084] lg:hover:text-[#0878d1]">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
          <div className="text-center lg:text-left lg:rounded-[30px] lg:border lg:border-[#dfe8f3] lg:bg-[linear-gradient(115deg,#ffffff_0%,#f1f8ff_68%,#e9f7fa_100%)] lg:px-9 lg:py-8 lg:shadow-[0_18px_46px_rgba(16,33,73,0.07)]">
            <p className="hidden lg:block mb-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#0878d1]">DheeVoy concierge</p>
            <h1 className="font-black text-2xl mb-1 lg:text-[38px] lg:leading-tight lg:tracking-[-0.04em]">Help &amp; Support</h1>
            <p className="text-white/70 text-sm lg:mt-2 lg:text-[#617084]">We're here to help you travel smarter</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 lg:max-w-7xl lg:px-8 lg:py-7 lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(380px,0.88fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <SupportAIChat user={user} />
        <aside className="space-y-6 lg:space-y-5">
          <SupportFAQ />
          <SupportContactForm user={user} />
        </aside>

      </div>

      <BottomNav />
    </div>
  );
}
