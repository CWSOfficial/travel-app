import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Heart } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

/**
 * Reusable wishlist heart button. Pass destination object.
 * Shows filled teal heart if wishlisted, outline if not.
 * Handles login gate inline.
 */
export default function WishlistHeart({ destination, className = "" }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wishlistId, setWishlistId] = useState(null);
  const [user, setUser] = useState(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) checkWishlisted(u.id);
    }).catch(() => {});
  }, [destination?.name]);

  const checkWishlisted = async (userId) => {
    const name = destination?.destination_name || destination?.name || destination?.city;
    if (!name) return;
    const existing = await base44.entities.Wishlist.filter({ user_id: userId, destination_name: name }).catch(() => []);
    if (existing.length > 0) {
      setWishlisted(true);
      setWishlistId(existing[0].id);
    }
  };

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!user) { setShowLoginPopup(true); return; }
    if (loading) return;
    setLoading(true);

    if (wishlisted && wishlistId) {
      await base44.entities.Wishlist.delete(wishlistId);
      setWishlisted(false);
      setWishlistId(null);
      toast({ title: "Removed from Wishlist" });
    } else {
      const name = destination?.destination_name || destination?.name || destination?.city || "Unknown";
      const country = destination?.destination_country || destination?.name?.split(",")[1]?.trim() || "";
      const city = destination?.destination_city || destination?.city || name;
      const item = await base44.entities.Wishlist.create({
        user_id: user.id,
        destination_name: name,
        destination_country: country,
        destination_city: city,
        destination_image_url: destination?.destination_image_url || "",
        destination_lat: destination?.destination_lat,
        destination_lng: destination?.destination_lng,
        status: "saved",
        added_date: new Date().toISOString().split("T")[0],
      });
      setWishlisted(true);
      setWishlistId(item.id);
      toast({ title: "Added to your Wishlist ♥", description: name });
    }
    setLoading(false);
  };

  return (
    <div className={className}>
      <button
        onClick={handleToggle}
        className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center transition-transform active:scale-90"
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          className="w-5 h-5 transition-colors"
          style={wishlisted ? { fill: "#00E5CC", color: "#00E5CC" } : { color: "#6b7280" }}
        />
      </button>

      {showLoginPopup && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowLoginPopup(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <Heart className="w-10 h-10 mx-auto mb-3 text-rose-400" />
            <p className="font-bold text-base mb-1">Sign in to save destinations</p>
            <p className="text-sm text-muted-foreground mb-5">Create a free account to build your dream travel wishlist.</p>
            <a
              href="/login"
              className="block w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ backgroundColor: "#00E5CC" }}
            >
              Sign In →
            </a>
            <button onClick={() => setShowLoginPopup(false)} className="mt-3 text-xs text-muted-foreground">Not now</button>
          </div>
        </div>
      )}
    </div>
  );
}