import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Pencil, Trash2, Save, X,
  ExternalLink, CheckCircle2, Loader2, Link2, BarChart3
} from "lucide-react";

const EMPTY = {
  partner_name: "",
  affiliate_link: "",
  network: "",
  commission_rate: "",
  cookie_window_days: "",
  status: "pending",
  last_tested: "",
};

const STATUS_STYLES = {
  active:  "bg-green-100 text-green-700 border-green-200",
  paused:  "bg-amber-100 text-amber-700 border-amber-200",
  pending: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AdminAffiliateLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null = list, "new" = new form, id = edit form
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role !== "admin") { navigate("/"); return; }
      setIsAdmin(true);
      loadLinks();
    }).catch(() => navigate("/"));
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    const data = await base44.entities.AffiliateLink.list("-created_date", 100);
    setLinks(data);
    setLoading(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleEdit = (link) => {
    setForm({
      partner_name: link.partner_name || "",
      affiliate_link: link.affiliate_link || "",
      network: link.network || "",
      commission_rate: link.commission_rate || "",
      cookie_window_days: link.cookie_window_days ?? "",
      status: link.status || "pending",
      last_tested: link.last_tested || "",
    });
    setEditingId(link.id);
  };

  const handleNew = () => {
    setForm(EMPTY);
    setEditingId("new");
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const handleSave = async () => {
    if (!form.partner_name || !form.affiliate_link) return;
    setSaving(true);
    const payload = {
      ...form,
      cookie_window_days: form.cookie_window_days !== "" ? Number(form.cookie_window_days) : undefined,
      last_tested: form.last_tested || undefined,
    };
    if (editingId === "new") {
      await base44.entities.AffiliateLink.create(payload);
    } else {
      await base44.entities.AffiliateLink.update(editingId, payload);
    }
    setSaving(false);
    setEditingId(null);
    setForm(EMPTY);
    loadLinks();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this affiliate link?")) return;
    await base44.entities.AffiliateLink.delete(id);
    loadLinks();
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-border/60 shadow-sm px-4 py-3 flex items-center gap-3">
        <Link to="/profile" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-slate-600" />
          <h1 className="font-bold text-sm">Affiliate Links</h1>
        </div>
        <Link to="/admin/affiliate-analytics" className="ml-auto flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline">
          <BarChart3 className="w-3.5 h-3.5" /> Analytics
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs text-blue-800 leading-relaxed">
            Manage all affiliate partner links in one place. Changes here update the links used across the app without touching code.
          </p>
        </div>

        {/* Add button */}
        {editingId === null && (
          <div className="flex justify-end">
            <Button onClick={handleNew} className="rounded-xl gap-2 bg-black hover:bg-black/80">
              <Plus className="w-4 h-4" /> Add Partner
            </Button>
          </div>
        )}

        {/* Form (new or edit) */}
        {editingId !== null && (
          <Card className="p-5 rounded-2xl border-2 border-black">
            <h3 className="font-bold text-sm mb-5">
              {editingId === "new" ? "➕ New Affiliate Partner" : `✏️ Edit — ${form.partner_name}`}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Partner Name *</Label>
                <Input placeholder="e.g. Expedia" value={form.partner_name} onChange={e => set("partner_name", e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Network</Label>
                <Input placeholder="e.g. Partnerize, Travelpayouts, CJ" value={form.network} onChange={e => set("network", e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Affiliate Link *</Label>
                <Input placeholder="https://..." value={form.affiliate_link} onChange={e => set("affiliate_link", e.target.value)} className="h-10 rounded-xl font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Commission Rate</Label>
                <Input placeholder="e.g. up to 12%" value={form.commission_rate} onChange={e => set("commission_rate", e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cookie Window (days)</Label>
                <Input type="number" placeholder="e.g. 30" value={form.cookie_window_days} onChange={e => set("cookie_window_days", e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <select
                  value={form.status}
                  onChange={e => set("status", e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-white px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Last Tested</Label>
                <Input type="date" value={form.last_tested} onChange={e => set("last_tested", e.target.value)} className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button onClick={handleSave} disabled={saving || !form.partner_name || !form.affiliate_link} className="rounded-xl gap-2 bg-black hover:bg-black/80">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={handleCancel} className="rounded-xl gap-2">
                <X className="w-4 h-4" /> Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Links list */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : links.length === 0 ? (
          <Card className="p-10 rounded-2xl text-center text-muted-foreground">
            <Link2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No affiliate partners yet</p>
            <p className="text-xs mt-1">Click "Add Partner" to add your first one.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {links.map(link => (
              <Card key={link.id} className="p-5 rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-sm">{link.partner_name}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[link.status] || STATUS_STYLES.pending}`}>
                        {link.status}
                      </span>
                      {link.network && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{link.network}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate mb-2">{link.affiliate_link}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {link.commission_rate && <span>💰 {link.commission_rate}</span>}
                      {link.cookie_window_days && <span>🍪 {link.cookie_window_days}d cookie</span>}
                      {link.last_tested && <span>✅ Tested {link.last_tested}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={link.affiliate_link} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(link)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(link.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}