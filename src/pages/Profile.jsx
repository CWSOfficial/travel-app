import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  User, Shield, Bell, ArrowLeft,
  ChevronRight, LogOut, Globe, FileText,
  HelpCircle, Search, Briefcase
} from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/travel/BottomNav";
import { useCurrency } from "@/lib/useCurrency";
import { AnimatePresence } from "framer-motion";
import EditProfileModal from "@/components/profile/EditProfileModal";
import NotificationSettingsModal from "@/components/profile/NotificationSettingsModal";
import LanguageCurrencyModal from "@/components/profile/LanguageCurrencyModal";
import InstallAppCard from "@/components/pwa/InstallAppCard";
import MyTripsSection from "@/components/profile/MyTripsSection";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  const { currency } = useCurrency();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-16 lg:pb-0">
      {/* Header */}
      <div className="bg-black text-white px-4 pt-6 pb-8">
        <div className="max-w-lg mx-auto">
          <Link to="/" aria-label="Back to home" title="Back to Home" className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/90 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black">
              {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.full_name || "Traveller"}</h1>
              <p className="text-white/60 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* My Trips — unified Self-planned + Curated */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-sm flex items-center gap-2"><Briefcase className="w-4 h-4" /> My Trips</h2>
            <Link to="/trips" className="text-xs text-primary font-semibold hover:text-primary/80">View all →</Link>
          </div>
          <MyTripsSection />
        </div>

        {/* Install PWA App */}
        <InstallAppCard />

        {/* Account settings */}
        <Card className="rounded-2xl overflow-hidden divide-y divide-border">
          {[
            { icon: User, label: "Edit Profile", sub: "Name, email & preferences", modal: "edit" },
            { icon: FileText, label: "Saved Reports", sub: "Visa, safety, weather and other saved travel reports", path: "/saved-reports" },
            { icon: Bell, label: "Notifications", sub: "Trip alerts & updates", modal: "notifications" },
            { icon: Globe, label: "Language & Currency", sub: `English · ${user?.preferred_currency || currency.code}`, modal: "currency" },
            { icon: Shield, label: "Privacy & Data", sub: "Export data, delete account", path: "/data-privacy" },
            { icon: HelpCircle, label: "Help & Support", sub: "FAQs, AI chat & contact us", path: "/help" },
            { icon: FileText, label: "Affiliate Links", sub: "Manage partner & booking links", path: "/admin/affiliate-links", adminOnly: true },
            { icon: Search, label: "Missing Destinations", sub: "Zero-result search gaps report", path: "/admin/destination-gaps", adminOnly: true },
          ].filter(item => !item.adminOnly || user?.role === "admin").map(({ icon: Icon, label, sub, path, modal }) => (
            path ? (
              <Link key={label} to={path} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ) : (
              <button key={label} onClick={() => setActiveModal(modal)} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )
          ))}
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-2"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>

        {/* Legal footer */}
        <div className="flex items-center justify-center gap-3 flex-wrap pb-2">
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground hover:underline">Privacy Policy</Link>
          <span className="text-muted-foreground text-xs">·</span>
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground hover:underline">Terms of Service</Link>
          <span className="text-muted-foreground text-xs">·</span>
          <Link to="/data-privacy" className="text-xs text-muted-foreground hover:text-foreground hover:underline">Your Data Rights</Link>
        </div>
        <p className="text-center text-xs text-muted-foreground pb-4">© 2026 DheeVoy Ltd. All rights reserved.</p>
      </div>

      <BottomNav active="profile" />

      {/* Profile modals */}
      <AnimatePresence>
        {activeModal === "edit" && (
          <EditProfileModal user={user} onClose={() => setActiveModal(null)} />
        )}
        {activeModal === "notifications" && (
          <NotificationSettingsModal user={user} onClose={() => setActiveModal(null)} />
        )}
        {activeModal === "currency" && (
          <LanguageCurrencyModal user={user} onClose={() => setActiveModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
