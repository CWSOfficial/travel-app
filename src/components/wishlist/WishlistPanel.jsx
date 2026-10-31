import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, X, Plane, Trash2, ChevronLeft, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WishlistDetailSheet from "./WishlistDetailSheet";

const PRIORITY_STYLES = {
  dream: { label: "Dream", className: "bg-purple-100 text-purple-700" },
  planning_soon: { label: "Planning Soon", className: "bg-teal-100 text-teal-700" },
  next_trip: { label: "Next Trip", className: "bg-orange-100 text-orange-700" },
};
const STATUS_STYLES = {
  saved: "bg-slate-100 text-slate-600",
  planned: "bg-blue-100 text-blue-700",
  visited: "bg-green-100 text-green-700",
};

export default function WishlistPanel({ onClose, onExplore, onPlanFromWishlist }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    load();
    const unsub = base44.entities.Wishlist.subscribe(() => load());
    return unsub;
  }, []);

  const load = async () => {
    const u = await base44.auth.me().catch(() => null);
    if (!u) { setLoading(false); return; }
    const data = await base44.entities.Wishlist.filter({ user_id: u.id }, "-created_date");
    setItems(data);
    setLoading(false);
  };

  const handleRemove = async (id) => {
    await base44.entities.Wishlist.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
    setConfirmDelete(null);
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 bg-slate-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-white border-b px-4 pt-12 pb-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg flex items-center gap-2">
            My Wishlist <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          </h1>
          <p className="text-xs text-muted-foreground">Destinations you dream of visiting</p>
        </div>
        {items.length > 0 && (
          <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: "#00E5CC" }}>
            {items.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-400 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Heart className="w-14 h-14 text-slate-200 mb-4" />
            <p className="font-bold text-lg text-foreground">Your wishlist is empty</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Tap ♡ on any destination to save it here</p>
            <button
              onClick={onExplore}
              className="px-6 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ backgroundColor: "#00E5CC" }}
            >
              Explore Destinations →
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border overflow-hidden shadow-sm"
              >
                {/* Image */}
                <div
                  className="relative h-44 cursor-pointer"
                  onClick={() => setSelected(item)}
                >
                  {item.destination_image_url ? (
                    <img src={item.destination_image_url} alt={item.destination_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                  <p className="absolute bottom-3 left-3 font-black text-white text-lg leading-tight">{item.destination_name}</p>
                </div>

                <div className="p-3 space-y-2">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.priority && PRIORITY_STYLES[item.priority] && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[item.priority].className}`}>
                        {PRIORITY_STYLES[item.priority].label}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[item.status] || STATUS_STYLES.saved}`}>
                      {item.status}
                    </span>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">{item.notes}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onPlanFromWishlist ? onPlanFromWishlist(item) : setSelected(item)}
                      className="flex-1 py-2 rounded-xl font-semibold text-xs text-white flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: "#00E5CC" }}
                    >
                      <Plane className="w-3.5 h-3.5" /> Plan This Trip →
                    </button>
                    <button
                      onClick={() => setConfirmDelete(item.id)}
                      className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/50 flex items-end justify-center p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <p className="font-bold text-base mb-1">Remove from Wishlist?</p>
              <p className="text-sm text-muted-foreground mb-5">This destination will be removed from your wishlist.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl border font-semibold text-sm">Cancel</button>
                <button onClick={() => handleRemove(confirmDelete)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm">Remove ✕</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail sheet */}
      <AnimatePresence>
        {selected && (
          <WishlistDetailSheet
            item={selected}
            onClose={() => setSelected(null)}
            onUpdate={updated => {
              setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
              setSelected(updated);
            }}
            onPlanTrip={(item) => {
              onClose();
              if (onPlanFromWishlist) onPlanFromWishlist(item);
              else onExplore(item);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}