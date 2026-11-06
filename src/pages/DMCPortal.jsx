import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import DMCProfileForm from "@/components/dmc/DMCProfileForm";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import { Plus, FileText, CheckCircle, Clock, XCircle, Building2, ArrowRight } from "lucide-react";

const STATUS_STYLES = {
  pending_review: { icon: Clock, cls: "bg-amber-50 border-amber-200 text-amber-800", label: "Pending Review" },
  approved: { icon: CheckCircle, cls: "bg-emerald-50 border-emerald-200 text-emerald-800", label: "Approved" },
  rejected: { icon: XCircle, cls: "bg-red-50 border-red-200 text-red-800", label: "Rejected" },
  published: { icon: CheckCircle, cls: "bg-teal-50 border-teal-200 text-teal-800", label: "Published" },
};

export default function DMCPortal() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profiles, subs] = await Promise.all([
        base44.entities.DMCProfile.list("-created_date", 1).catch(() => []),
        base44.entities.DMCSubmission.list("-created_date", 50).catch(() => []),
      ]);
      const myProfile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
      setProfile(myProfile);
      setSubmissions(Array.isArray(subs) ? subs : []);
      const _urlParams = new URLSearchParams(window.location.search);
      setShowProfileForm(!myProfile || _urlParams.get("profile") === "1");
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadData();
    else setLoading(false);
  }, [isAuthenticated]);

  // Open the profile/bank form directly when navigated via /dmc?profile=1
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("profile") === "1") setShowProfileForm(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 text-center">
        <div>
          <Building2 className="w-12 h-12 text-teal-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">DMC Portal</h2>
          <p className="text-sm text-slate-600 mb-4">Please log in to access the DMC submission portal.</p>
          <Link to="/login" className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-bold text-sm">Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f2f6ff_0%,#faf8ff_42%,#f7fbff_100%)] pb-24 text-slate-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#102149] tracking-tight">🏛️ DMC Submission Portal</h2>
          <p className="text-xs md:text-sm text-slate-600 mt-1">Submit your curated trip packages for review & publishing on DheeVoy.</p>
        </div>

        {/* Profile status banner */}
        {profile && !showProfileForm && (
          <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm p-4 mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-teal-400" />
              <div>
                <p className="text-sm font-semibold text-[#102149]">{profile.business_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                    profile.verification_status === "verified"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : profile.verification_status === "rejected"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    {profile.verification_status === "verified" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {profile.verification_status === "verified" ? "Verified" : profile.verification_status === "rejected" ? "Rejected" : "Pending Verification"}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setShowProfileForm(true)} className="text-xs font-medium text-teal-700 hover:text-teal-900 underline underline-offset-4">
              Edit profile
            </button>
          </div>
        )}

        {/* Profile form (collapsible) */}
        {showProfileForm && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-8 shadow-lg shadow-slate-200/60 mb-6">
            <DMCProfileForm
              existing={profile}
              onSave={(saved) => {
                setProfile(saved);
                setShowProfileForm(false);
              }}
            />
            {profile && (
              <button onClick={() => setShowProfileForm(false)} className="mt-3 text-xs text-slate-400 hover:text-slate-200 w-full text-center">
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Submit new trip CTA */}
        {profile && !showProfileForm && (
          <button
            onClick={() => navigate("/dmc/submit")}
            className="w-full mb-6 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold text-sm tracking-wide shadow-md shadow-teal-700/20 hover:shadow-lg hover:shadow-teal-700/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Submit a New Trip
          </button>
        )}

        {/* Submissions list */}
        {profile && (
          <div>
            <h3 className="text-sm font-semibold text-[#102149] mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" /> Your Trip Submissions
            </h3>
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                <p className="text-sm text-slate-600">No trips submitted yet. Click "Submit a New Trip" to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((s) => {
                  const st = STATUS_STYLES[s.listing_status] || STATUS_STYLES.pending_review;
                  const StIcon = st.icon;
                  return (
                    <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3 shadow-sm hover:border-teal-400 hover:shadow-md transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#102149] truncate">{s.trip_name}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{s.destinations} · {s.duration_days} days</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(s.theme || []).slice(0, 3).map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[9px] font-medium">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${st.cls}`}>
                          <StIcon className="w-3 h-3" /> {st.label}
                        </span>
                        <Link to={`/dmc/submit?id=${s.id}`} className="text-[11px] font-medium text-teal-700 hover:text-teal-900 inline-flex items-center gap-1">
                          Edit <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
