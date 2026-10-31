import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ChevronLeft, Search, Plus, RefreshCw, TrendingUp } from "lucide-react";

const STATUS_COLORS = {
  missing: "bg-red-100 text-red-700",
  reviewing: "bg-yellow-100 text-yellow-700",
  added: "bg-green-100 text-green-700",
};

export default function AdminDestinationGaps() {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingFor, setAddingFor] = useState(null); // search_term being added
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.DestinationSearchGap.list("-search_count", 200).catch(() => []);
    setGaps(data);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await base44.entities.DestinationSearchGap.update(id, { status });
    setGaps(prev => prev.map(g => g.id === id ? { ...g, status } : g));
  };

  const filtered = statusFilter === "all" ? gaps : gaps.filter(g => g.status === statusFilter);
  const totalSearches = gaps.reduce((sum, g) => sum + (g.search_count || 0), 0);
  const missingCount = gaps.filter(g => g.status === "missing").length;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b px-4 pt-12 pb-4">
        <div className="max-w-3xl mx-auto">
          <Link to="/admin/affiliate-links" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Admin
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-black text-xl flex items-center gap-2">
                <Search className="w-5 h-5" /> Missing Destinations Report
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Zero-result searches from real users</p>
            </div>
            <button onClick={load} className="w-9 h-9 rounded-xl border flex items-center justify-center text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-slate-50 rounded-xl p-3 text-center border">
              <p className="font-black text-lg">{gaps.length}</p>
              <p className="text-xs text-muted-foreground">Unique Terms</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
              <p className="font-black text-lg text-red-700">{missingCount}</p>
              <p className="text-xs text-muted-foreground">Still Missing</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border">
              <p className="font-black text-lg">{totalSearches}</p>
              <p className="text-xs text-muted-foreground">Total Searches</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-4">
            {["all", "missing", "reviewing", "added"].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${statusFilter === f ? "bg-black text-white" : "border border-border text-muted-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No records yet</p>
            <p className="text-sm mt-1">Zero-result searches will appear here automatically</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4">Search Term</div>
              <div className="col-span-2 text-center">Searches</div>
              <div className="col-span-2 text-center">First</div>
              <div className="col-span-2 text-center">Last</div>
              <div className="col-span-2 text-center">Action</div>
            </div>

            {filtered.map((gap, i) => (
              <div key={gap.id} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-b last:border-b-0 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                <div className="col-span-4">
                  <p className="font-semibold text-sm truncate">{gap.search_term}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[gap.status] || STATUS_COLORS.missing}`}>
                    {gap.status}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="font-black text-sm">{gap.search_count}</span>
                </div>
                <div className="col-span-2 text-center text-xs text-muted-foreground">
                  {gap.first_searched || "–"}
                </div>
                <div className="col-span-2 text-center text-xs text-muted-foreground">
                  {gap.last_searched || "–"}
                </div>
                <div className="col-span-2 flex justify-center">
                  <select
                    value={gap.status}
                    onChange={e => updateStatus(gap.id, e.target.value)}
                    className="text-[10px] border border-border rounded-lg px-1.5 py-1 bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="missing">Missing</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="added">Added ✓</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          Sorted by most searched · Auto-populated from zero-result destination searches
        </p>
      </div>
    </div>
  );
}