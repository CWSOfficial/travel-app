import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Activity, Plane, MapPin, ShieldCheck, CloudSun,
  AlertTriangle, CheckCircle2, Clock, Loader2, Bell, RefreshCw,
  Navigation, Wifi, ChevronRight, Info, Zap, Radio
} from "lucide-react";
import BottomNav from "@/components/travel/BottomNav";
import { format, isAfter, isBefore, parseISO, addDays } from "date-fns";

const STATUS_CONFIG = {
  upcoming: { label: "Upcoming", color: "bg-blue-100 text-blue-700", icon: Clock },
  active: { label: "Live Journey", color: "bg-green-100 text-green-700 animate-pulse", icon: Radio },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-600", icon: CheckCircle2 },
};

function getTripStatus(trip) {
  const today = new Date();
  const start = parseISO(trip.start_date);
  const end = addDays(start, trip.duration_days || 7);
  if (isBefore(today, start)) return "upcoming";
  if (isAfter(today, end)) return "completed";
  return "active";
}

function MonitorCard({ trip, updates, isLoadingUpdates, onRefresh }) {
  const status = getTripStatus(trip);
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon; // eslint-disable-line

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Trip header */}
      <Card className="p-5 rounded-2xl mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-black text-lg leading-tight">{trip.selected_destination || "Your Trip"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">From {trip.departure_city} · {trip.duration_days} days</p>
          </div>
          <Badge className={`${cfg.color} gap-1 text-xs font-bold`}>
            <StatusIcon className="w-3 h-3" /> {cfg.label}
          </Badge>
        </div>

        {/* Journey timeline */}
        <div className="flex items-center gap-2 my-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-bold mt-1">{trip.departure_city?.split(",")[0]}</p>
            <p className="text-[10px] text-muted-foreground">{trip.start_date}</p>
          </div>
          <div className="flex-1 relative">
            <div className="h-0.5 bg-muted rounded-full" />
            {status === "active" && (
              <motion.div
                className="absolute top-0 left-0 h-0.5 bg-green-500 rounded-full"
                animate={{ width: ["30%", "60%", "30%"] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            )}
            <p className="text-center text-[10px] text-muted-foreground mt-1">{trip.duration_days} days</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-bold mt-1">{trip.selected_destination?.split(",")[0]}</p>
            <p className="text-[10px] text-muted-foreground">{format(addDays(parseISO(trip.start_date), trip.duration_days || 7), "yyyy-MM-dd")}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onRefresh(trip)}
          disabled={isLoadingUpdates}
          className="w-full rounded-xl gap-2 text-xs"
        >
          {isLoadingUpdates ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {isLoadingUpdates ? "Fetching live updates..." : "Refresh Live Updates"}
        </Button>
      </Card>

      {/* Live updates */}
      {updates && (
        <div className="space-y-3">
          {/* Safety alert */}
          {updates.safety_alert && (
            <Card className={`p-4 rounded-2xl border-l-4 ${updates.safety_alert.level === "warning" ? "border-orange-400 bg-orange-50" : updates.safety_alert.level === "critical" ? "border-red-500 bg-red-50" : "border-green-400 bg-green-50"}`}>
              <div className="flex items-start gap-2">
                {updates.safety_alert.level === "ok"
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                }
                <div>
                  <p className="text-xs font-bold">{updates.safety_alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{updates.safety_alert.message}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Weather */}
          {updates.weather && (
            <Card className="p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <CloudSun className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold">Live Weather</span>
                <Badge className="text-[10px] bg-green-100 text-green-700 ml-auto">Live</Badge>
              </div>
              <p className="text-sm font-semibold">{updates.weather.current}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{updates.weather.forecast}</p>
            </Card>
          )}

          {/* Flight status */}
          {updates.flight_status && (
            <Card className="p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <Plane className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold">Flight Status</span>
              </div>
              <p className="text-sm font-semibold">{updates.flight_status.status}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{updates.flight_status.note}</p>
            </Card>
          )}

          {/* Local alerts */}
          {updates.local_alerts?.length > 0 && (
            <Card className="p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold">Local Travel Alerts</span>
              </div>
              <div className="space-y-2">
                {updates.local_alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                    <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">{a}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tips */}
          {updates.today_tip && (
            <Card className="p-4 rounded-2xl bg-black text-white">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-black">D</div>
                <span className="text-xs font-bold text-white/70">Dbuddy AI Tip</span>
                <Zap className="w-3 h-3 text-yellow-400 ml-auto" />
              </div>
              <p className="text-sm leading-relaxed">{updates.today_tip}</p>
            </Card>
          )}

          <p className="text-[10px] text-center text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()} · Updates every 30 mins
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function TripMonitor() {
  const [user, setUser] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [updates, setUpdates] = useState({});
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {});
  }, []);

  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: () => base44.entities.Trip.list("-created_date", 10),
  });

  // Auto-select most relevant trip (active or soonest upcoming)
  useEffect(() => {
    if (!trips.length || selectedTripId) return;
    const active = trips.find(t => getTripStatus(t) === "active");
    const upcoming = trips.find(t => getTripStatus(t) === "upcoming");
    setSelectedTripId((active || upcoming || trips[0])?.id);
  }, [trips]);

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  const fetchUpdates = async (trip) => {
    setLoadingId(trip.id);
    const status = getTripStatus(trip);
    try {
      const res = await base44.functions.invoke("generateAiContent", {
        purpose: "trip_monitor",
        input: {
          destination: trip.selected_destination,
          startDate: trip.start_date,
          durationDays: trip.duration_days,
          status,
          todayDate: new Date().toISOString().split("T")[0],
        },
      });
      const result = res.data;
      setUpdates(prev => ({ ...prev, [trip.id]: result }));
    } catch (err) {
      // silently fail, user can retry
    }
    setLoadingId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-none">Trip Monitor</h1>
          <p className="text-xs text-muted-foreground">Continuous live journey updates</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <>
            {trips.length === 0 ? (
              <Card className="p-8 rounded-2xl text-center">
                <p className="text-4xl mb-3">📡</p>
                <p className="font-bold mb-2">No trips to monitor</p>
                <p className="text-sm text-muted-foreground mb-4">Plan a trip to start continuous monitoring.</p>
                <Link to="/"><Button className="rounded-xl bg-black text-white">Plan a Trip</Button></Link>
              </Card>
            ) : (
              <>
                {/* Trip selector */}
                {trips.length > 1 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    {trips.slice(0, 5).map(trip => {
                      const s = getTripStatus(trip);
                      return (
                        <button
                          key={trip.id}
                          onClick={() => setSelectedTripId(trip.id)}
                          className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${selectedTripId === trip.id ? "bg-black text-white border-black" : "bg-white border-border"}`}
                        >
                          <span>{trip.selected_destination?.split(",")[0] || "Trip"}</span>
                          {s === "active" && <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-green-400 rounded-full align-middle" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedTrip && (
                  <MonitorCard
                    trip={selectedTrip}
                    updates={updates[selectedTrip.id]}
                    isLoadingUpdates={loadingId === selectedTrip.id}
                    onRefresh={fetchUpdates}
                  />
                )}

                {selectedTrip && !updates[selectedTrip.id] && loadingId !== selectedTrip.id && (
                  <Button
                    onClick={() => fetchUpdates(selectedTrip)}
                    className="w-full rounded-xl bg-black text-white gap-2 h-12 mt-2"
                  >
                    <Activity className="w-4 h-4" /> Start Monitoring This Trip
                  </Button>
                )}
              </>
            )}
        </>
      </div>

      <BottomNav active="/monitor" />
    </div>
  );
}