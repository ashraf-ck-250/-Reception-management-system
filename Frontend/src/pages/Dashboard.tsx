import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Clock, CheckCircle, ClipboardList, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { api } from "@/lib/api";

const defaultStats = [
  { label: "Total Visitors Today", value: "0", icon: Users, color: "bg-primary" },
  { label: "Service Requests", value: "0", icon: FileText, color: "bg-accent" },
  { label: "Pending Requests", value: "0", icon: Clock, color: "bg-warning" },
  { label: "Completed", value: "0", icon: CheckCircle, color: "bg-success" },
];

const defaultRecentVisitors: Array<{ id?: string; name: string; institution: string; time: string }> = [];

const defaultRecentRequests: Array<{ id?: string; name: string; service: string; status: string }> = [];

const defaultHourlyData = Array.from({ length: 10 }).map((_, i) => {
  const hour24 = 8 + i;
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return { hour: `${hour12}${suffix}`, visitors: 0 };
});

const defaultWeeklyData = [
  { day: "Mon", visitors: 0, requests: 0 },
  { day: "Tue", visitors: 0, requests: 0 },
  { day: "Wed", visitors: 0, requests: 0 },
  { day: "Thu", visitors: 0, requests: 0 },
  { day: "Fri", visitors: 0, requests: 0 },
  { day: "Sat", visitors: 0, requests: 0 },
  { day: "Sun", visitors: 0, requests: 0 },
];

const chartConfig = {
  visitors: { label: "Visitors", color: "hsl(215, 70%, 45%)" },
  requests: { label: "Requests", color: "hsl(170, 55%, 42%)" },
};

/** Same destinations as notification deep-links — aligned with dashboard metric cards */
const DASHBOARD_STAT_DESTINATIONS: Record<string, string> = {
  "Total Visitors Today": "/records?tab=attendance&visitorPeriod=today",
  "Service Requests": "/records?tab=service",
  "Pending Requests": "/records?tab=service&serviceStatus=Pending",
  Completed: "/records?tab=service&serviceStatus=Completed",
};

const defaultPendingApprovals: Array<{ id?: string; name: string; email: string; role: string }> = [];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(defaultStats);
  const [recentVisitors, setRecentVisitors] = useState(defaultRecentVisitors);
  const [recentRequests, setRecentRequests] = useState(defaultRecentRequests);
  const [pendingApprovals, setPendingApprovals] = useState(defaultPendingApprovals);
  const [hourlyData, setHourlyData] = useState(defaultHourlyData);
  const [weeklyData, setWeeklyData] = useState(defaultWeeklyData);
  const [systemOverview, setSystemOverview] = useState({ weekVisitors: 0, activeStaff: 0, avgWaitTime: "8 min" });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const load = async (showLoading: boolean) => {
      if (showLoading) setStatsLoading(true);
      try {
        const response = await api.get("/stats/dashboard");
        setStats((prev) => prev.map((s, i) => ({ ...s, value: response.data.stats[i]?.value ?? s.value })));
        setRecentVisitors(response.data.recentVisitors ?? []);
        setRecentRequests(response.data.recentRequests ?? []);
        setPendingApprovals(response.data.pendingApprovals ?? []);
        setHourlyData(response.data.hourlyData ?? defaultHourlyData);
        setWeeklyData(response.data.weeklyData ?? defaultWeeklyData);
        setSystemOverview(response.data.systemOverview ?? { weekVisitors: 0, activeStaff: 0, avgWaitTime: "8 min" });
      } catch {
        // response interceptor handles auth errors
      } finally {
        if (showLoading) setStatsLoading(false);
      }
    };
    void load(true);
    const timer = setInterval(() => {
      void load(false);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">Here's your reception overview for today</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
              {user?.name?.[0] || "U"}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Stats — each card opens the matching Visitor Records view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const dest = DASHBOARD_STAT_DESTINATIONS[s.label];
          return (
            <Card key={s.label} className="border-border">
              <CardContent className="p-0">
                <button
                  type="button"
                  disabled={!dest || statsLoading}
                  onClick={() => dest && navigate(dest)}
                  className="w-full p-5 flex items-center gap-4 text-left rounded-lg transition-all duration-150 hover:bg-muted/50 active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait disabled:hover:bg-transparent disabled:active:scale-100"
                >
                  <div className={`${s.color} w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <s.icon size={20} className="text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              Today's Visitor Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="visitors" fill="hsl(215, 70%, 45%)" fillOpacity={0.15} stroke="hsl(215, 70%, 45%)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={18} className="text-accent" />
              This Week's Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="visitors" fill="hsl(215, 70%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="requests" fill="hsl(170, 55%, 42%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Visitors */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList size={18} className="text-primary" />
              Recent Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentVisitors.length === 0 && <p className="text-sm text-muted-foreground">No visitor records yet.</p>}
              {recentVisitors.map((v, i) => (
                <button
                  key={v.id ?? i}
                  type="button"
                  onClick={() =>
                    navigate(
                      v.id
                        ? `/records?tab=attendance&highlight=${encodeURIComponent(v.id)}`
                        : "/records?tab=attendance"
                    )
                  }
                  className="w-full flex items-center justify-between py-2 border-b border-border last:border-0 text-left rounded-md hover:bg-muted/60 transition-all duration-150 active:scale-[0.99] active:opacity-90 -mx-1 px-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {v.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.institution}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{v.time}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={18} className="text-accent" />
              Recent Service Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.length === 0 && <p className="text-sm text-muted-foreground">No service requests yet.</p>}
              {recentRequests.map((r, i) => (
                <button
                  key={r.id ?? i}
                  type="button"
                  onClick={() =>
                    navigate(
                      r.id ? `/records?tab=service&highlight=${encodeURIComponent(r.id)}` : "/records?tab=service"
                    )
                  }
                  className="w-full flex items-center justify-between py-2 border-b border-border last:border-0 text-left rounded-md hover:bg-muted/60 transition-all duration-150 active:scale-[0.99] active:opacity-90 -mx-1 px-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                      {r.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.service}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.status === "Completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {r.status}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin-only sections */}
      {user?.role === "admin" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending User Approvals */}
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle size={18} className="text-warning" />
                Pending User Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApprovals.length === 0 && <p className="text-sm text-muted-foreground">No pending user approvals.</p>}
                {pendingApprovals.map((u, i) => (
                  <button
                    key={u.id ?? i}
                    type="button"
                    onClick={() =>
                      navigate(
                        u.id
                          ? `/user-management?highlight=${encodeURIComponent(u.id)}`
                          : "/user-management"
                      )
                    }
                    className="w-full flex items-center justify-between py-2 border-b border-border last:border-0 text-left rounded-md hover:bg-muted/60 transition-all duration-150 active:scale-[0.99] active:opacity-90 -mx-1 px-1"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center text-warning text-xs font-bold">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{u.role}</span>
                  </button>
                ))}
              </div>
              <Link
                to="/user-management"
                className="text-xs text-primary hover:underline mt-3 inline-block transition-opacity duration-150 active:opacity-70 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View all →
              </Link>
            </CardContent>
          </Card>

          {/* System Overview */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-muted-foreground">This Week</p>
                  <p className="text-xl font-bold text-foreground mt-1">{systemOverview.weekVisitors}</p>
                  <p className="text-xs text-muted-foreground">Total visitors</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Active Staff</p>
                  <p className="text-xl font-bold text-foreground mt-1">{systemOverview.activeStaff}</p>
                  <p className="text-xs text-muted-foreground">Receptionists online</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Avg. Wait Time</p>
                  <p className="text-xl font-bold text-foreground mt-1">{systemOverview.avgWaitTime}</p>
                  <p className="text-xs text-muted-foreground">Today's average</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
