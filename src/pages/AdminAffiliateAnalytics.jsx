import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, TrendingUp, MousePointerClick, Loader2, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["#1d4ed8", "#d97706", "#be123c", "#16a34a", "#7c3aed"];

export default function AdminAffiliateAnalytics() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState([]);
  const [links, setLinks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role !== "admin") { navigate("/"); return; }
      setIsAdmin(true);
      Promise.all([
        base44.entities.AffiliateLinkClick.list("-clicked_at", 500),
        base44.entities.AffiliateLink.list("-created_date", 50),
      ]).then(([c, l]) => {
        setClicks(c);
        setLinks(l);
        setLoading(false);
      });
    }).catch(() => navigate("/"));
  }, []);

  if (!isAdmin) return null;

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalClicks = clicks.length;

  // Clicks per partner
  const byPartner = Object.entries(
    clicks.reduce((acc, c) => {
      acc[c.partner_name] = (acc[c.partner_name] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Clicks by context
  const byContext = Object.entries(
    clicks.reduce((acc, c) => {
      acc[c.context] = (acc[c.context] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  // Last 7 days daily clicks
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const label = format(day, "EEE dd");
    const count = clicks.filter(c => {
      if (!c.clicked_at) return false;
      const d = new Date(c.clicked_at);
      return d >= startOfDay(day) && d < startOfDay(subDays(day, -1));
    }).length;
    return { label, count };
  });

  // Top destinations clicked through to
  const byDest = Object.entries(
    clicks.filter(c => c.destination).reduce((acc, c) => {
      acc[c.destination] = (acc[c.destination] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-border/60 shadow-sm px-4 py-3 flex items-center gap-3">
        <Link to="/admin/affiliate-links" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h1 className="font-bold text-sm">Affiliate Analytics</h1>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">Admin · Click Tracking</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading analytics…
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Clicks", value: totalClicks, icon: MousePointerClick, color: "text-blue-600" },
              { label: "Partners", value: links.filter(l => l.status === "active").length, icon: ExternalLink, color: "text-green-600" },
              { label: "Last 7 Days", value: last7.reduce((s, d) => s + d.count, 0), icon: TrendingUp, color: "text-amber-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="p-4 rounded-2xl text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </Card>
            ))}
          </div>

          {totalClicks === 0 ? (
            <Card className="p-10 rounded-2xl text-center text-muted-foreground">
              <MousePointerClick className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No clicks recorded yet</p>
              <p className="text-xs mt-1">Click tracking starts as soon as users interact with booking links.</p>
            </Card>
          ) : (
            <>
              {/* Daily trend */}
              <Card className="p-5 rounded-2xl">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Clicks — Last 7 Days
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={last7} barSize={28}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" name="Clicks" radius={[6, 6, 0, 0]} fill="#1d4ed8" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Clicks per partner */}
              <Card className="p-5 rounded-2xl">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-amber-600" /> Clicks by Partner
                </h3>
                <ResponsiveContainer width="100%" height={Math.max(120, byPartner.length * 44)}>
                  <BarChart data={byPartner} layout="vertical" barSize={20}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" name="Clicks" radius={[0, 6, 6, 0]}>
                      {byPartner.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Context breakdown */}
              <Card className="p-5 rounded-2xl">
                <h3 className="font-bold text-sm mb-4">Click Context (Flights vs Hotels)</h3>
                <div className="space-y-3">
                  {byContext.map(({ name, count }) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs font-semibold capitalize w-16">{name}</span>
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${Math.round((count / totalClicks) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-10 text-right">{count}</span>
                      <span className="text-xs text-muted-foreground w-10">{Math.round((count / totalClicks) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top destinations */}
              {byDest.length > 0 && (
                <Card className="p-5 rounded-2xl">
                  <h3 className="font-bold text-sm mb-4">Top Destinations Clicked Through To</h3>
                  <div className="space-y-2">
                    {byDest.map(({ name, count }, i) => (
                      <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5">#{i + 1}</span>
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        <Badge className="bg-muted text-foreground text-xs">{count} clicks</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recent clicks log */}
              <Card className="p-5 rounded-2xl">
                <h3 className="font-bold text-sm mb-4">Recent Click Log</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {clicks.slice(0, 50).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.partner_name}</span>
                        <Badge className="text-[10px] capitalize bg-muted text-muted-foreground">{c.context}</Badge>
                        {c.destination && <span className="text-muted-foreground">→ {c.destination}</span>}
                      </div>
                      <span className="text-muted-foreground flex-shrink-0 ml-2">
                        {c.clicked_at ? format(new Date(c.clicked_at), "dd MMM HH:mm") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}