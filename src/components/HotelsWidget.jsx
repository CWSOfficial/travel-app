import { useState, useEffect, useRef } from "react";
import { Hotel, MapPin, Calendar, Users, Search, Info, ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { buildExpediaHotelSearchUrl, buildHotelsComSearchUrl, buildBookingComSearchUrl } from "@/lib/hotelAffiliateLinks";

// Hotel search widget for the Stays tab — an interactive, themed search form
// that pre-fills the destination and redirects to Expedia/Hotels.com with
// tracked affiliate links.
//
// RESEARCH FINDING: Unlike Viator's "things to do" widget (which renders real
// activity cards with photos/pricing/ratings), Expedia/Hotels.com/Travelpayouts
// only offer SEARCH FORM widgets — not results-display widgets. The
// Travelpayouts tp.media/content script was tested but is blocked in this
// environment (network/CSP restriction — fetch to tp.media returns "Failed to
// fetch"). The Expedia widget builder (expedia.com/marketing/widgets) creates
// only a search form, not a results display, and requires CJ/Partnerize
// tracking credentials configured per-widget.
//
// This custom widget provides the same functionality as the Travelpayouts/
// Expedia search form widgets — destination, dates, guests, search button —
// but is reliable (no third-party script dependency), matches the app's dark
// theme, pre-fills the destination, and uses our existing tracked affiliate
// links. It's a significant visual upgrade from the previous plain text rows.

function toLocalISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function todayISO() {
  return toLocalISO(new Date());
}
function plusDaysISO(value, days) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return toLocalISO(date);
}

export default function HotelsWidget({ destination }) {
  const [checkIn, setCheckIn] = useState(() => todayISO());
  const [checkOut, setCheckOut] = useState(() => plusDaysISO(todayISO(), 7));
  const [guests, setGuests] = useState(1);
  const [destInput, setDestInput] = useState("");
  const [formError, setFormError] = useState("");
  const checkInRef = useRef(null);
  const checkOutRef = useRef(null);

  const openDatePicker = (inputRef) => {
    if (typeof inputRef.current?.showPicker === "function") inputRef.current.showPicker();
    else inputRef.current?.focus();
  };

  // Sync destination prop → local input
  useEffect(() => {
    if (destination?.name) setDestInput(destination.name);
  }, [destination?.name]);

  useEffect(() => {
    if (destination?.name) {
      trackEvent("hotels_widget_view", { destination: destination.name });
    }
  }, [destination?.name]);

  if (!destination?.name) return null;

  const expediaUrl = buildExpediaHotelSearchUrl(destInput, checkIn, checkOut, guests);
  const hotelsComUrl = buildHotelsComSearchUrl(destInput, checkIn, checkOut, guests);
  const bookingUrl = buildBookingComSearchUrl(destInput, checkIn, checkOut, guests);

  const handleSearch = (partner, url) => {
    if (!destInput.trim()) {
      setFormError("Enter a destination to search for stays.");
      return;
    }
    if (checkIn < todayISO()) {
      setFormError("Check-in must be today or a future date.");
      return;
    }
    if (!checkOut || checkOut <= checkIn) {
      setFormError("Choose a check-out date at least one day after check-in.");
      return;
    }
    setFormError("");
    trackEvent("hotels_widget_search", { partner, destination: destInput, checkIn, checkOut, guests });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCheckInChange = (value) => {
    setCheckIn(value);
    if (!checkOut || checkOut <= value) setCheckOut(plusDaysISO(value, 1));
    setFormError("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Hotel className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">
          Search & book hotels
        </p>
      </div>

      {/* Search form card — themed to match the app */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        {/* Destination */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Destination
          </label>
          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <input
              type="text"
              value={destInput}
              onChange={(e) => { setDestInput(e.target.value); setFormError(""); }}
              placeholder="Where to?"
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder-muted-foreground min-w-0"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Check-in
            </label>
            <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
              <button type="button" onClick={() => openDatePicker(checkInRef)} aria-label="Choose check-in date" className="shrink-0 text-muted-foreground hover:text-primary">
                <Calendar className="w-4 h-4" />
              </button>
              <input
                ref={checkInRef}
                type="date"
                value={checkIn}
                min={todayISO()}
                onChange={(e) => handleCheckInChange(e.target.value)}
                className="hotel-date-input flex-1 bg-transparent outline-none text-sm text-foreground min-w-0 [color-scheme:light]"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Check-out
            </label>
            <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
              <button type="button" onClick={() => openDatePicker(checkOutRef)} aria-label="Choose check-out date" className="shrink-0 text-muted-foreground hover:text-primary">
                <Calendar className="w-4 h-4" />
              </button>
              <input
                ref={checkOutRef}
                type="date"
                value={checkOut}
                min={plusDaysISO(checkIn, 1)}
                onChange={(e) => { setCheckOut(e.target.value); setFormError(""); }}
                className="hotel-date-input flex-1 bg-transparent outline-none text-sm text-foreground min-w-0 [color-scheme:light]"
              />
            </div>
          </div>
        </div>

        {/* Guests */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Guests
          </label>
          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="flex-1 bg-transparent outline-none text-sm text-foreground [color-scheme:light]"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n} className="bg-card text-foreground">
                  {n} {n === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search buttons — Expedia + Hotels.com + Booking.com */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => handleSearch("expedia", expediaUrl)}
            className="px-2 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            Expedia
          </button>
          <button
            onClick={() => handleSearch("hotels_com", hotelsComUrl)}
            className="px-2 py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
          >
            Hotels.com
          </button>
          <button
            onClick={() => handleSearch("booking", bookingUrl)}
            className="px-2 py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
          >
            Booking.com
          </button>
        </div>
        {formError && <p role="alert" className="text-xs font-medium text-destructive">{formError}</p>}
      </div>

      <div className="flex items-start gap-1.5 px-1">
        <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Expedia and Booking.com links may earn DheeVoy a commission. Hotels.com opens a direct search.
          Always verify pricing on the partner site.
        </p>
      </div>
    </div>
  );
}
