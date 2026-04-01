import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, ClipboardList, FileText, LogOut, Menu, X, BarChart3, Users, Settings, Bell, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getNotificationNavigatePath } from "@/lib/notificationNavigation";
import {
  getStaffDesktopNotificationsEnabled,
  hasNotificationPermission,
  STAFF_DESKTOP_ENABLED_EVENT,
  tryShowDesktopNotification
} from "@/lib/desktopNotifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const getNavItems = (role: string) => {
  const common = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/records", label: "Visitor Records", icon: ClipboardList },
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ];
  if (role === "admin") {
    common.push({ to: "/user-management", label: "User Management", icon: Users });
  }
  common.push({ to: "/settings", label: "Settings", icon: Settings });
  return common;
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  type InAppNotification = {
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    type: string;
    metadata?: Record<string, unknown>;
  };
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "today" | "yesterday">("all");
  const [notificationFromDate, setNotificationFromDate] = useState("");
  const [notificationToDate, setNotificationToDate] = useState("");
  const [markAllReading, setMarkAllReading] = useState(false);
  const [deleteNotificationId, setDeleteNotificationId] = useState<string | null>(null);
  const staffDesktopInitRef = useRef(false);
  const staffSeenNotificationIdsRef = useRef<Set<string>>(new Set());

  const navItems = getNavItems(user?.role || "receptionist");

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      const list = response.data.notifications as InAppNotification[];
      const count = response.data.unreadCount as number;

      const desktopOk = getStaffDesktopNotificationsEnabled() && hasNotificationPermission();
      if (desktopOk) {
        if (!staffDesktopInitRef.current) {
          list.forEach((n) => staffSeenNotificationIdsRef.current.add(n.id));
          staffDesktopInitRef.current = true;
        } else {
          for (const n of list) {
            if (!staffSeenNotificationIdsRef.current.has(n.id)) {
              staffSeenNotificationIdsRef.current.add(n.id);
              if (!n.read) {
                tryShowDesktopNotification(n.title, { body: n.message, tag: `staff-${n.id}` });
              }
            }
          }
        }
      } else if (!staffDesktopInitRef.current) {
        list.forEach((n) => staffSeenNotificationIdsRef.current.add(n.id));
        staffDesktopInitRef.current = true;
      }

      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // ignore intermittent notification polling failures
    }
  };

  useEffect(() => {
    const resetStaffDesktopTracking = () => {
      staffDesktopInitRef.current = false;
      staffSeenNotificationIdsRef.current.clear();
    };
    window.addEventListener(STAFF_DESKTOP_ENABLED_EVENT, resetStaffDesktopTracking);
    return () => window.removeEventListener(STAFF_DESKTOP_ENABLED_EVENT, resetStaffDesktopTracking);
  }, []);

  useEffect(() => {
    void loadNotifications();
    const timer = setInterval(() => {
      void loadNotifications();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const openNotification = async (n: InAppNotification) => {
    const role = user?.role === "admin" || user?.role === "receptionist" ? user.role : undefined;
    const path = getNotificationNavigatePath(n, role);
    try {
      await api.patch(`/notifications/${n.id}/read`);
      await loadNotifications();
    } catch {
      // still navigate if marking read fails
    }
    setOpenNotifications(false);
    if (path) navigate(path);
  };

  const markAllRead = async () => {
    setMarkAllReading(true);
    try {
      await api.patch("/notifications/read-all");
      await loadNotifications();
    } finally {
      setMarkAllReading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!window.confirm("Delete this notification?")) return;
    setDeleteNotificationId(id);
    try {
      await api.delete(`/notifications/${id}`);
      toast.success("Notification deleted");
      await loadNotifications();
    } catch {
      toast.error("Could not delete notification");
    } finally {
      setDeleteNotificationId(null);
    }
  };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const getDayBucket = (createdAt: string) => {
    const created = new Date(createdAt);
    if (created >= startOfToday) return "today";
    if (created >= startOfYesterday) return "yesterday";
    return "older";
  };

  const filteredNotifications = notifications.filter((n) => {
    const bucket = getDayBucket(n.createdAt);
    const createdDate = new Date(n.createdAt).toISOString().split("T")[0];
    if (notificationFromDate && createdDate < notificationFromDate) return false;
    if (notificationToDate && createdDate > notificationToDate) return false;
    if (notificationFilter === "all") return true;
    return bucket === notificationFilter;
  });

  const groupedNotifications = {
    today: filteredNotifications.filter((n) => getDayBucket(n.createdAt) === "today"),
    yesterday: filteredNotifications.filter((n) => getDayBucket(n.createdAt) === "yesterday"),
    older: filteredNotifications.filter((n) => getDayBucket(n.createdAt) === "older")
  };

  const notificationCard = (n: InAppNotification) => (
    <div
      key={n.id}
      className={`w-full p-3 rounded-md border transition-all duration-150 ${
        n.read ? "bg-background" : "bg-primary/5 border-primary/20"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => void openNotification(n)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm font-medium">{n.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
          <p className="text-[11px] text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString()}</p>
        </button>
        <button
          type="button"
          className="ml-2 text-muted-foreground hover:text-destructive"
          title="Delete notification"
          onClick={() => void deleteNotification(n.id)}
          disabled={deleteNotificationId === n.id}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">
            Reception<span className="text-sidebar-primary">MS</span>
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1 capitalize">{user?.role} Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 active:opacity-80 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3 px-3">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-sidebar-border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm font-bold">
                {user?.name?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent transition-opacity active:opacity-80"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border px-4 lg:px-8 h-14 flex items-center gap-4">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1" />
          <Dialog open={openNotifications} onOpenChange={setOpenNotifications}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-none px-1.5 py-1 min-w-[18px] text-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Notifications</span>
                  <Button variant="outline" size="sm" onClick={() => void markAllRead()} loading={markAllReading}>
                    Mark all read
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant={notificationFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setNotificationFilter("all")}>
                  All
                </Button>
                <Button variant={notificationFilter === "today" ? "default" : "outline"} size="sm" onClick={() => setNotificationFilter("today")}>
                  Today
                </Button>
                <Button variant={notificationFilter === "yesterday" ? "default" : "outline"} size="sm" onClick={() => setNotificationFilter("yesterday")}>
                  Yesterday
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={notificationFromDate}
                  onChange={(e) => setNotificationFromDate(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                />
                <input
                  type="date"
                  value={notificationToDate}
                  onChange={(e) => setNotificationToDate(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNotificationFromDate("");
                    setNotificationToDate("");
                  }}
                >
                  Clear
                </Button>
              </div>
              <div className="max-h-[360px] overflow-auto space-y-2">
                {filteredNotifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                ) : (
                  <>
                    {groupedNotifications.today.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Today</p>
                        {groupedNotifications.today.map((n) => notificationCard(n))}
                      </div>
                    )}
                    {groupedNotifications.yesterday.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Yesterday</p>
                        {groupedNotifications.yesterday.map((n) => notificationCard(n))}
                      </div>
                    )}
                    {groupedNotifications.older.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Older</p>
                        {groupedNotifications.older.map((n) => notificationCard(n))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <span className="text-sm text-muted-foreground capitalize">{user?.role}</span>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
