import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import { Link } from "react-router-dom";
import { getGuestClaimToken } from "@/lib/guestClaimToken";
import { Loader2, FileText, Cloud, Shield, Plane, Smartphone, Umbrella, Ticket, ChevronDown, Trash2, BedDouble, Landmark } from "lucide-react";

const FLOW_META = {
  weather: { icon: Cloud, label: "Weather", color: "text-sky-300", ring: "border-sky-500/30" },
  safety: { icon: Shield, label: "Safety", color: "text-amber-300", ring: "border-amber-500/30" },
  visa: { icon: Plane, label: "Visa", color: "text-emerald-300", ring: "border-emerald-500/30" },
  esim: { icon: Smartphone, label: "eSIM", color: "text-teal-300", ring: "border-teal-500/30" },
  insurance: { icon: Umbrella, label: "Insurance", color: "text-rose-300", ring: "border-rose-500/30" },
  attractions: { icon: Ticket, label: "Attractions", color: "text-purple-300", ring: "border-purple-500/30" },
  flights: { icon: Plane, label: "Flights", color: "text-sky-300", ring: "border-sky-500/30" },
  hotels: { icon: BedDouble, label: "Hotels", color: "text-indigo-300", ring: "border-indigo-500/30" },
  pilgrimage_tours: { icon: Landmark, label: "Pilgrimage", color: "text-amber-300", ring: "border-amber-500/30" },
};

const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

const summary = (log) => {
  if (log.flow_type === "safety" && log.safety_score != null) return `${log.safety_score_country || log.destination}: ${log.safety_score}/100`;
  if (log.flow_type === "weather" && (log.weather_high_c != null || log.weather_low_c != null)) return `High ${log.weather_high_c ?? "—"}°C · Low ${log.weather_low_c ?? "—"}°C`;
  if (log.flow_type === "visa" && log.entry_status) return `${log.entry_status}${log.passport_nationality ? ` · ${log.passport_nationality}` : ""}`;
  if (log.flow_type === "esim" && log.data_plan) return `${log.data_plan} plan`;
  if (log.flow_type === "insurance" && log.trip_cost) return `Trip ${log.trip_cost}`;
  if (log.flow_type === "attractions" && log.branch_taken) return log.branch_taken.replace(/_/g, " ");
  if (log.flow_type === "flights") return `${log.flow_context?.origin || "—"} → ${log.destination}`;
  if (log.flow_type === "hotels") return `${log.flow_context?.nights || "Stay"}`;
  if (log.flow_type === "pilgrimage_tours") return log.flow_context?.experience_type || log.destination;
  return log.destination;
};

function Meta({ label, value }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2 lg:rounded-xl lg:bg-[#f5f8fc] lg:px-4 lg:py-3">
      <p className="text-[10px] uppercase tracking-wide text-white/40 lg:text-[#738198]">{label}</p>
      <p className="text-sm text-white/80 truncate lg:mt-0.5 lg:text-[#102149]">{value}</p>
    </div>
  );
}

export default function SavedReports() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleDelete = async (log) => {
    if (!window.confirm("Delete this saved report? This can't be undone.")) return;
    setDeletingId(log.id);
    try {
      await base44.entities.AiSessionLog.delete(log.id);
      setLogs((l) => l.filter((x) => x.id !== log.id));
      if (openId === log.id) setOpenId(null);
    } catch {
      // RLS may block deletion; silently ignore
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setIsAdmin(u?.role === "admin");
      // Link previously-anonymous logs captured with this email to this account.
      if (u?.email) {
        try { await base44.functions.invoke("linkGuestReports", { claim_token: getGuestClaimToken() }); } catch (e) {}
      }
      const rows = await base44.entities.AiSessionLog.filter({ cta_clicked: true }, "-created_date", 100);
      setLogs(rows);
    }).catch(() => setLogs([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0A1628] pb-24 lg:bg-[linear-gradient(180deg,#f2f6ff_0%,#faf8ff_42%,#f7fbff_100%)]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:max-w-7xl lg:px-8 lg:pt-12">
        <header className="mb-5 lg:mb-8 lg:rounded-[30px] lg:border lg:border-[#dfe8f3] lg:bg-[linear-gradient(115deg,#ffffff_0%,#f1f8ff_68%,#e9f7fa_100%)] lg:px-9 lg:py-8 lg:shadow-[0_18px_46px_rgba(16,33,73,0.07)]">
          <Link to="/profile" className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1 mb-2 lg:mb-3 lg:text-[#617084] lg:hover:text-[#0878d1]">‹ Back to Profile</Link>
          <p className="hidden lg:block mb-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#0878d1]">Your DheeVoy activity</p>
          <h1 className="font-display text-2xl font-bold text-white lg:text-[38px] lg:leading-tight lg:tracking-[-0.04em] lg:text-[#071a40]">Saved Reports</h1>
          <p className="text-xs text-white/50 lg:mt-2 lg:text-sm lg:text-[#617084]">Your saved weather, safety & visa reports from DheeVoy AI flows.</p>
        </header>

        {loading ? (
          <div className="flex justify-center rounded-3xl border border-white/10 py-12 lg:min-h-64 lg:items-center lg:border-[#e4e9f2] lg:bg-white lg:shadow-[0_12px_36px_rgba(16,33,73,0.055)]"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 px-4 lg:rounded-[28px] lg:border lg:border-[#e4e9f2] lg:bg-white lg:py-20 lg:shadow-[0_12px_36px_rgba(16,33,73,0.055)]">
            <FileText className="w-10 h-10 text-white/30 mx-auto mb-3 lg:text-[#0878d1]" />
            <p className="text-sm text-white/60 lg:text-base lg:font-semibold lg:text-[#102149]">No saved reports yet.</p>
            <p className="text-xs text-white/40 mt-1 lg:text-sm lg:text-[#617084]">Run a Weather, Safety or Visa Check flow and tap save to see it here.</p>
          </div>
        ) : (
          <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
            {logs.map((log) => {
              const meta = FLOW_META[log.flow_type] || FLOW_META.weather;
              const Icon = meta.icon;
              const open = openId === log.id;
              return (
                <div key={log.id} className={`rounded-2xl border ${meta.ring} bg-white/[0.05] overflow-hidden lg:rounded-[24px] lg:border-[#e1e9f2] lg:bg-white lg:shadow-[0_9px_26px_rgba(16,33,73,0.055)] lg:transition-shadow lg:hover:shadow-[0_16px_34px_rgba(16,33,73,0.09)]`}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : log.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors lg:p-5 lg:hover:bg-[#f8fbff]"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 lg:h-11 lg:w-11 lg:bg-[#eaf7ff]">
                      <Icon className={`w-4 h-4 ${meta.color} lg:text-[#0878d1]`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${meta.color} lg:text-[#0878d1]`}>{meta.label}</span>
                        <span className="text-[10px] text-white/40 lg:text-[#738198]">{fmtDate(log.created_date)}</span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate lg:text-base lg:text-[#102149]">{log.destination}</p>
                      <p className="text-xs text-white/60 truncate lg:mt-0.5 lg:text-[#617084]">{summary(log)}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/40 transition-transform lg:text-[#617084] ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-2 lg:border-[#e9eef5] lg:px-5 lg:pb-5 lg:pt-4 lg:space-y-3">
                      {log.recommendation_shown && (
                        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 lg:rounded-2xl lg:border-[#e4e9f2] lg:bg-[#f8faff] lg:p-4">
                          <p className="text-[10px] uppercase tracking-wide text-white/40 mb-1 lg:text-[#738198]">Recommendation</p>
                          <p className="text-sm text-white/85 whitespace-pre-line lg:text-[#3d4f70]">{log.recommendation_shown}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {log.flow_type === "weather" && <>
                          {log.travel_time && <Meta label="Travel time" value={log.travel_time} />}
                          {log.weather_activities?.length > 0 && <Meta label="Activities" value={log.weather_activities.join(", ")} />}
                          {log.weather_mode && <Meta label="Data" value={log.weather_mode === "forecast" ? "Forecast" : "Typical"} />}
                        </>}
                        {log.flow_type === "safety" && <>
                          {log.traveler_type && <Meta label="Traveler" value={log.traveler_type} />}
                          {log.safety_concern && <Meta label="Concern" value={log.safety_concern} />}
                          {log.safety_score != null && <Meta label="Safety score" value={`${log.safety_score}/100`} />}
                        </>}
                        {log.flow_type === "visa" && <>
                          {log.passport_nationality && <Meta label="Passport" value={log.passport_nationality} />}
                          {log.purpose_of_trip && <Meta label="Purpose" value={log.purpose_of_trip} />}
                          {log.departure_date && <Meta label="Departure" value={fmtDate(log.departure_date)} />}
                          {log.days_until_trip != null && <Meta label="Days until trip" value={String(log.days_until_trip)} />}
                        </>}
                        {(log.flow_type === "flights" || log.flow_type === "hotels" || log.flow_type === "pilgrimage_tours") && log.flow_context && Object.entries(log.flow_context).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).map(([k, v]) => (
                          <Meta key={k} label={k.replace(/_/g, " ")} value={Array.isArray(v) ? v.join(", ") : String(v)} />
                        ))}
                      </div>
                      {isAdmin && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={deletingId === log.id}
                            onClick={() => handleDelete(log)}
                            className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-rose-300 disabled:opacity-50 lg:text-[#617084]"
                          >
                            {deletingId === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav active="profile" />
    </div>
  );
}
