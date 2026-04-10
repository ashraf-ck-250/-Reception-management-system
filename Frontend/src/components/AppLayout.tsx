import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  X,
  BarChart3,
  Users,
  Settings,
  Bell,
  UsersRound,
  CalendarDays,
  ClipboardSignature,
  Trash2,
  Moon,
  Sun,
} from "lucide-react";
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
  if (role === "meeting_leader") {
    return [
      { to: "/meeting-leader", label: "Meeting Leader", icon: ClipboardSignature },
      { to: "/settings", label: "Settings", icon: Settings },
    ];
  }
  if (role === "admin") {
    common.push({ to: "/user-management", label: "User Management", icon: Users });
    // Insert between Visitor Records and Reports visually (ordering is based on this array)
    common.splice(2, 0, { to: "/meeting-records", label: "Meeting Records", icon: CalendarDays });
  }
  common.push({ to: "/settings", label: "Settings", icon: Settings });
  return common;
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
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
  const themeStorageKey = user
    ? `theme:${String(user.id || user.email || "unknown")}:${String(user.role || "unknown")}`
    : "theme:guest";

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

  useEffect(() => {
    // Persist last visited protected route so refresh/login can return users to where they were.
    if (!user) return;
    const path = `${location.pathname}${location.search || ""}`;
    if (path.startsWith("/login") || path === "/") return;
    localStorage.setItem("last_protected_path", path);
  }, [location.pathname, location.search, user]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(themeStorageKey);
    const isDark = savedTheme ? savedTheme === "dark" : false;
    setDarkMode(isDark);
  }, [themeStorageKey]);

  useEffect(() => {
    // Ensure theme stays panel-scoped and never leaks globally.
    document.documentElement.classList.remove("dark");
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem(themeStorageKey, next ? "dark" : "light");
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void deleteNotification(n.id);
          }}
          loading={deleteNotificationId === n.id}
          title="Delete notification"
          aria-label="Delete notification"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className={`flex min-h-screen ${darkMode ? "dark" : ""}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-40 ${darkMode ? "bg-sky-800" : "bg-sky-500"} text-white flex flex-col transition-all duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopExpanded ? "lg:w-64" : "lg:w-20"} w-64`}
      >
        <div className="relative p-6 border-b border-white/30">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                <span className={desktopExpanded ? "lg:inline" : "lg:hidden"}>Reception</span>
                <span className="text-sky-100">MS</span>
              </h1>
            </div>
            <p className={`text-xs text-white/80 mt-1 capitalize ${desktopExpanded ? "lg:block" : "lg:hidden"}`}>{user?.role} Panel</p>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={desktopExpanded ? "Collapse sidebar" : "Expand sidebar"}
            className="hidden lg:inline-flex absolute -right-4 bottom-0 translate-y-1/2 z-50 h-8 w-8 rounded-full border border-sky-300 bg-sky-600 text-white shadow-md transition-all duration-200 hover:bg-sky-700 hover:border-sky-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-200"
            onClick={() => setDesktopExpanded((prev) => !prev)}
          >
            <span className="text-base font-semibold leading-none">{desktopExpanded ? "<" : ">"}</span>
          </Button>
        </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 active:opacity-80 ${
                    desktopExpanded ? "lg:justify-start" : "lg:justify-center"
                  } ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "text-white hover:bg-white/20 hover:text-white"
                  }`
                }
              >
                <span className="inline-flex w-5 min-w-5 items-center justify-center">
                  <item.icon size={18} />
                </span>
                <span className={`ml-3 whitespace-nowrap ${desktopExpanded ? "lg:inline" : "lg:hidden"}`}>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white/30">
            <div className="flex items-center gap-3 mb-3 px-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 min-w-8 min-h-8 rounded-full object-cover aspect-square overflow-hidden border border-white/40" />
              ) : (
                <div className="w-8 h-8 min-w-8 min-h-8 rounded-full aspect-square bg-white/25 flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.[0]}
                </div>
              )}
              <div className={`flex-1 min-w-0 ${desktopExpanded ? "lg:block" : "lg:hidden"}`}>
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-white/80 truncate">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
                className={`w-full rounded-lg px-2 py-2 text-white transition-colors cursor-pointer hover:bg-white/20 ${
                  desktopExpanded ? "flex items-center justify-between" : "flex items-center justify-center"
                }`}
              >
                <div className={`items-center gap-2 ${desktopExpanded ? "flex" : "hidden lg:flex"}`}>
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  <span className={desktopExpanded ? "lg:inline" : "lg:hidden"}>Dark mode</span>
                </div>
              </button>

              <Button
                variant="ghost"
                className={`w-full gap-2 text-white hover:bg-white/20 transition-opacity active:opacity-80 ${
                  desktopExpanded ? "justify-start" : "justify-center"
                }`}
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span className={desktopExpanded ? "lg:inline" : "lg:hidden"}>Sign Out</span>
              </Button>
            </div>
          </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className={`flex-1 bg-background transition-all duration-200 ${desktopExpanded ? "lg:ml-64" : "lg:ml-20"}`}>
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
