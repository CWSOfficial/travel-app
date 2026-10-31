import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { AnimatePresence, motion } from "framer-motion";

const TEAL = "#00E5CC";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let unsub = null;
    base44.auth.me().then(u => {
      if (u) {
        setUserId(u.id);
        loadNotifications(u.id);
        unsub = base44.entities.Notification.subscribe(() => loadNotifications(u.id));
      }
    }).catch(() => {});
    return () => { if (unsub) unsub(); };
  }, []);

  const loadNotifications = async (uid) => {
    const items = await base44.entities.Notification.filter({ user_id: uid }).catch(() => []);
    items.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setNotifications(items);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mark all as read when dropdown opens
  useEffect(() => {
    if (!isOpen || !userId || unreadCount === 0) return;
    const markRead = async () => {
      const unread = notifications.filter(n => !n.is_read);
      for (const n of unread) {
        await base44.entities.Notification.update(n.id, { is_read: true }).catch(() => {});
      }
      loadNotifications(userId);
    };
    markRead();
  }, [isOpen]);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Invisible backdrop — closes dropdown on outside click */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}

      <div className="relative">
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="relative w-11 h-11 rounded-full border border-[#e5eaf2] bg-[#f3f8fc] flex items-center justify-center hover:bg-[#eaf6ff] transition-colors"
        >
          <Bell className="w-4 h-4 text-[#12325f]" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 text-[8px] font-black text-white w-4 h-4 rounded-full flex items-center justify-center leading-none"
              style={{ backgroundColor: TEAL }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border border-border shadow-xl z-50"
            >
              <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center justify-between z-10">
                <h3 className="font-bold text-sm">Notifications</h3>
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Trip alerts will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map(n => (
                    <div key={n.id} className="px-4 py-3" style={{ backgroundColor: !n.is_read ? "rgba(0,229,204,0.05)" : "transparent" }}>
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: TEAL }} />
                        )}
                        <div className="flex-1 min-w-0" style={{ marginLeft: n.is_read ? "10px" : "0" }}>
                          <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(n.created_date)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}