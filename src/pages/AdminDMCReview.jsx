import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/travel/Navbar";
import BottomNav from "@/components/travel/BottomNav";
import { CheckCircle, XCircle, Clock, Eye, X, Loader2, ExternalLink, Building2 } from "lucide-react";

const STATUS_FILTERS = [
  { value: "pending_review", label: "Pending", icon: Clock, cls: "text-amber-300" },
  { value: "approved", label: "Approved", icon: CheckCircle, cls: "text-emerald-300" },
  { value: "published", label: "Published", icon: CheckCircle, cls: "text-teal-300" },
  { value: "rejected", label: "Rejected", icon: XCircle, cls: "text-red-300" },
];

export default function AdminDMCReview() {
  const [submissions, setSubmissions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending_review");
  const [selected, setSelected] = useState(null);
  const [days, setDays] = useState([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, profs] = await Promise.all([
        base44.entities.DMCSubmission.list("-created_date", 100),
        base44.entities.DMCProfile.list("-created_date", 100),
      ]);
      setSubmissions(subs || []);
      setProfiles(profs || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openDetail = async (sub) => {
    setSelected(sub);
    setAdminNotes(sub.admin_notes || "");
    setLoadingDays(true);
    try {
      const d = await base44.entities.DMCItineraryDay.filter({ submission_id: sub.id });
      setDays((d || []).sort((a, b) => a.day_number - b.day_number));
    } catch (e) {
      setDays([]);
    } finally {
      setLoadingDays(false);
    }
  };

  // ── Curated-trips bridge ──
  // When a submission is published, mirror it into the public `curated_trips`
  // table (public read for published:true) so it appears on the public Curated
  // Trips page + homepage automatically. Upsert by trip_title + destination so
  // re-publishing updates the same record instead of duplicating. When a
  // previously-published submission is approved/rejected, unpublish the linked
  // curated_trips record so it leaves the public listing. No schema/RLS changes.
  const buildCuratedTripFields = (sub, profile, days) => {
    const itinerary_days = (days || [])
      .slice()
      .sort((a, b) => a.day_number - b.day_number)
      .map((d) => ({
        day: d.day_number,
        title: d.title || `Day ${d.day_number}`,
        description: [d.morning_activity, d.midday_activity, d.evening_activity, d.accommodation_name ? `Stay: ${d.accommodation_name}` : null]
          .filter(Boolean)
          .join(" • "),
        included: true,
      }));
    return {
      destination: sub.destinations,
      dmc_partner_name: sub.dmc_partner_name || profile?.business_name || "DMC Partner",
      dmc_profile_id: sub.dmc_profile_id || null,
      dmc_contact_info: [profile?.email, profile?.phone].filter(Boolean).join(" · ") || null,
      trip_title: sub.trip_name,
      days: sub.duration_days,
      dfy_or_dwy: "dfy",
      itinerary_days,
      photos: sub.photo_gallery || [],
      price_display: `From $${sub.price_per_person} ${sub.currency}`,
      tags: sub.theme || [],
      operator_badge_text: profile?.verification_status === "verified" ? "Verified DMC Partner" : "DMC Partner",
      booking_link_or_contact:
        profile?.revolut_payment_link ||
        profile?.paypal_me_link ||
        [profile?.email, profile?.phone].filter(Boolean).join(" · ") ||
        sub.dmc_partner_name ||
        "",
      inclusions: sub.inclusions || null,
      exclusions: sub.exclusions || null,
      cancellation_policy: sub.cancellation_policy || null,
      min_group_size: sub.min_group_size || null,
      max_group_size: sub.max_group_size || null,
      price_per_person: sub.price_per_person || null,
      currency: sub.currency || "USD",
      operator_email: profile?.email || null,
      published: true,
    };
  };

  const syncCuratedTrip = async (sub) => {
    try {
      const [profile, days] = await Promise.all([
        sub.dmc_profile_id
          ? base44.entities.DMCProfile.get(sub.dmc_profile_id).catch(() => null)
          : Promise.resolve(null),
        base44.entities.DMCItineraryDay.filter({ submission_id: sub.id }).catch(() => []),
      ]);
      const fields = buildCuratedTripFields(sub, profile, days);
      // Upsert by trip_title + destination (admin can read unpublished rows too)
      const existing = await base44.entities.curated_trips
        .filter({ trip_title: sub.trip_name, destination: sub.destinations })
        .catch(() => []);
      if (existing.length > 0) {
        await base44.entities.curated_trips.update(existing[0].id, fields);
      } else {
        await base44.entities.curated_trips.create(fields);
      }
    } catch (e) {
      console.error("Failed to sync curated trip:", e);
    }
  };

  const unpublishCuratedTrip = async (sub) => {
    try {
      const existing = await base44.entities.curated_trips
        .filter({ trip_title: sub.trip_name, destination: sub.destinations })
        .catch(() => []);
      if (existing.length > 0) {
        await base44.entities.curated_trips.update(existing[0].id, { published: false });
      }
    } catch (e) {
      console.error("Failed to unpublish curated trip:", e);
    }
  };

  const updateStatus = async (id, status) => {
    setActionLoading(status);
    try {
      const prev = submissions.find((s) => s.id === id);
      await base44.entities.DMCSubmission.update(id, { listing_status: status, admin_notes: adminNotes });
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, listing_status: status, admin_notes: adminNotes } : s)));
      if (selected?.id === id) setSelected({ ...selected, listing_status: status, admin_notes: adminNotes });
      // Bridge to the public curated_trips table
      if (status === "published") {
        const fresh = { ...prev, listing_status: status, admin_notes: adminNotes };
        syncCuratedTrip(fresh);
      } else if (prev?.listing_status === "published") {
        unpublishCuratedTrip(prev);
      }
    } catch (e) {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const profileFor = (subId) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return null;
    return profiles.find((p) => p.id === sub.dmc_profile_id) || null;
  };

  const sendInvite = async () => {
    if (!inviteEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteEmail)) {
      setInviteMsg({ type: "error", text: "Enter a valid email address." });
      return;
    }
    setInviteLoading(true);
    setInviteMsg(null);
    try {
      await base44.users.inviteUser(inviteEmail, "dmc_partner");
      setInviteMsg({ type: "success", text: `Invitation sent to ${inviteEmail}. They'll get the dmc_partner role on sign-up.` });
      setInviteEmail("");
      setInviteOpen(false);
    } catch (e) {
      setInviteMsg({ type: "error", text: e?.message || "Failed to send invitation." });
    } finally {
      setInviteLoading(false);
    }
  };

  const filtered = submissions.filter((s) => s.listing_status === filter);

  const statusBadge = (status) => {
    const map = {
      pending_review: { cls: "bg-amber-500/15 border-amber-400/30 text-amber-300", label: "Pending", icon: Clock },
      approved: { cls: "bg-emerald-500/15 border-emerald-400/30 text-emerald-300", label: "Approved", icon: CheckCircle },
      published: { cls: "bg-teal-500/15 border-teal-400/30 text-teal-300", label: "Published", icon: CheckCircle },
      rejected: { cls: "bg-red-500/15 border-red-400/30 text-red-300", label: "Rejected", icon: XCircle },
    };
    const s = map[status] || map.pending_review;
    const Icon = s.icon;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.cls}`}><Icon className="w-3 h-3" /> {s.label}</span>;
  };

  return (
    <div className="min-h-screen pb-24">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">🛡️ Admin Review Dashboard</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">Review DMC trip submissions, approve, reject, or publish.</p>
        </div>

        {/* Invite DMC Partner */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Invite a DMC Partner</p>
              <p className="text-xs text-slate-400 mt-0.5">Sends a sign-up link — the new user gets the dmc_partner role on registration.</p>
            </div>
            <button onClick={() => setInviteOpen((v) => !v)} className="px-3 py-2 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-semibold hover:bg-teal-500/30 transition-all whitespace-nowrap">
              {inviteOpen ? "Cancel" : "+ Invite DMC"}
            </button>
          </div>
          {inviteOpen && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="partner@dmc-company.com"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50"
              />
              <button onClick={sendInvite} disabled={inviteLoading} className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-bold text-xs disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                {inviteLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</> : "Send Invite"}
              </button>
            </div>
          )}
          {inviteMsg && (
            <p className={`mt-2 text-xs ${inviteMsg.type === "success" ? "text-emerald-300" : "text-red-300"}`}>{inviteMsg.text}</p>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => {
            const Icon = f.icon;
            const count = submissions.filter((s) => s.listing_status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-all ${
                  filter === f.value ? "border-teal-400/50 bg-teal-500/15 text-teal-200" : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${filter === f.value ? "text-teal-300" : f.cls}`} />
                {f.label} <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-slate-700 border-t-teal-400 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <p className="text-sm text-slate-400">No submissions with status "{filter}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((s) => {
              const prof = profiles.find((p) => p.id === s.dmc_profile_id);
              return (
                <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-teal-400/30 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{s.trip_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.destinations} · {s.duration_days}d</p>
                    </div>
                    {statusBadge(s.listing_status)}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(s.theme || []).slice(0, 4).map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded-md bg-teal-500/10 border border-teal-400/20 text-teal-300 text-[9px] font-medium">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> {prof?.business_name || s.dmc_partner_name || "Unknown DMC"}</span>
                    <span className="font-semibold text-slate-300">{s.currency} {s.price_per_person}</span>
                  </div>
                  {s.photo_gallery?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {s.photo_gallery.slice(0, 4).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                      ))}
                    </div>
                  )}
                  <button onClick={() => openDetail(s)} className="mt-3 w-full py-2 rounded-xl border border-teal-400/30 text-teal-300 hover:bg-teal-500/10 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all">
                    <Eye className="w-3.5 h-3.5" /> Review Details
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/15 bg-[#0d141c] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#0d141c]/95 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white truncate pr-3">{selected.trip_name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* DMC info */}
              {(() => {
                const prof = profiles.find((p) => p.id === selected.dmc_profile_id);
                return prof ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">DMC Partner</p>
                    <p className="text-sm font-semibold text-white">{prof.business_name}</p>
                    <p className="text-xs text-slate-400">{prof.contact_name} · {prof.email} · {prof.phone}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{prof.country_region}</p>
                    {prof.bank_name && <p className="text-[11px] text-slate-500 mt-1">Bank: {prof.bank_name} · {prof.account_number} · {prof.swift_ifsc}</p>}
                  </div>
                ) : null;
              })()}

              {/* Trip details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-500">Destinations:</span> <span className="text-slate-200">{selected.destinations}</span></div>
                <div><span className="text-slate-500">Duration:</span> <span className="text-slate-200">{selected.duration_days}d / {selected.duration_nights || selected.duration_days - 1}n</span></div>
                <div><span className="text-slate-500">Departure:</span> <span className="text-slate-200">{selected.departure_cities || "—"}</span></div>
                <div><span className="text-slate-500">Group:</span> <span className="text-slate-200">{selected.min_group_size}–{selected.max_group_size}</span></div>
                <div><span className="text-slate-500">Price:</span> <span className="text-slate-200 font-semibold">{selected.currency} {selected.price_per_person}/person</span></div>
                <div><span className="text-slate-500">Deposit:</span> <span className="text-slate-200">{selected.advance_deposit_percent || 0}%</span></div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Themes</p>
                <div className="flex flex-wrap gap-1.5">
                  {(selected.theme || []).map((t) => <span key={t} className="px-2 py-1 rounded-lg bg-teal-500/15 border border-teal-400/30 text-teal-200 text-xs">{t}</span>)}
                </div>
              </div>
              {selected.languages_spoken?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Languages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.languages_spoken.map((l) => <span key={l} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs">{l}</span>)}
                  </div>
                </div>
              )}

              {/* Itinerary days */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Day-by-Day Itinerary</p>
                {loadingDays ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div>
                ) : days.length === 0 ? (
                  <p className="text-xs text-slate-500">No itinerary days submitted.</p>
                ) : (
                  <div className="space-y-2">
                    {days.map((d) => (
                      <div key={d.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-sm font-semibold text-teal-200">Day {d.day_number}{d.title ? ` — ${d.title}` : ""}</p>
                        <div className="mt-1.5 space-y-1 text-xs text-slate-300">
                          {d.morning_activity && <p>🌅 <span className="text-slate-400">Morning:</span> {d.morning_activity}</p>}
                          {d.midday_activity && <p>☀️ <span className="text-slate-400">Midday:</span> {d.midday_activity}</p>}
                          {d.evening_activity && <p>🌙 <span className="text-slate-400">Evening:</span> {d.evening_activity}</p>}
                          {d.accommodation_name && <p>🏨 <span className="text-slate-400">Stay:</span> {d.accommodation_name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inclusions / Exclusions */}
              {selected.inclusions && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">✅ Inclusions</p>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans">{selected.inclusions}</pre>
                </div>
              )}
              {selected.exclusions && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">❌ Exclusions</p>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans">{selected.exclusions}</pre>
                </div>
              )}
              {selected.cancellation_policy && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">📋 Cancellation Policy</p>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans">{selected.cancellation_policy}</pre>
                </div>
              )}

              {/* Photos */}
              {selected.photo_gallery?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Photos</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {selected.photo_gallery.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/10 relative group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <ExternalLink className="absolute top-1 right-1 w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin notes */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Admin Notes (internal)</label>
                <textarea rows={2} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Notes for this submission…" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 resize-none" />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                {selected.listing_status !== "approved" && (
                  <button onClick={() => updateStatus(selected.id, "approved")} disabled={actionLoading === "approved"} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {actionLoading === "approved" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Approve
                  </button>
                )}
                {selected.listing_status !== "published" && (
                  <button onClick={() => updateStatus(selected.id, "published")} disabled={actionLoading === "published"} className="flex-1 py-2.5 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-semibold hover:bg-teal-500/30 disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {actionLoading === "published" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Publish
                  </button>
                )}
                {selected.listing_status !== "rejected" && (
                  <button onClick={() => updateStatus(selected.id, "rejected")} disabled={actionLoading === "rejected"} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 text-xs font-semibold hover:bg-red-500/30 disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {actionLoading === "rejected" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}