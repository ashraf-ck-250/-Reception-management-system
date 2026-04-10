import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";

const defaultWeeklyData = [
  { day: "Mon", visitors: 32, requests: 14 },
  { day: "Tue", visitors: 28, requests: 11 },
  { day: "Wed", visitors: 45, requests: 22 },
  { day: "Thu", visitors: 38, requests: 18 },
  { day: "Fri", visitors: 42, requests: 20 },
  { day: "Sat", visitors: 12, requests: 5 },
  { day: "Sun", visitors: 5, requests: 2 },
];

const defaultMonthlyTrend = [
  { month: "Oct", visitors: 420 },
  { month: "Nov", visitors: 380 },
  { month: "Dec", visitors: 310 },
  { month: "Jan", visitors: 450 },
  { month: "Feb", visitors: 520 },
  { month: "Mar", visitors: 490 },
];

const defaultServiceDistribution = [
  { name: "MINIJUST", value: 35, color: "hsl(201, 96%, 42%)" },
  { name: "MININFRA", value: 28, color: "hsl(151, 60%, 42%)" },
  { name: "Rwanda Law Reform", value: 22, color: "hsl(38, 92%, 50%)" },
  { name: "PM Head Office", value: 15, color: "hsl(262, 65%, 56%)" },
];

const chartConfig = {
  visitors: { label: "Visitors", color: "hsl(201, 96%, 42%)" },
  requests: { label: "Requests", color: "hsl(151, 60%, 42%)" },
};

function escapeCsv(value: string | number) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const themeStorageKey = user
    ? `theme:${String(user.id || user.email || "unknown")}:${String(user.role || "unknown")}`
    : "theme:guest";
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [period, setPeriod] = useState("week");
  const [summary, setSummary] = useState({ totalVisitors: 202, totalRequests: 92, completionRate: 78, avgWaitTime: "8 min", visitorChange: 0, requestChange: 0 });
  const [serviceDistribution, setServiceDistribution] = useState(defaultServiceDistribution);
  const [weeklyData, setWeeklyData] = useState(defaultWeeklyData);
  const [monthlyTrend, setMonthlyTrend] = useState(defaultMonthlyTrend);
  const [meetingReportFilter, setMeetingReportFilter] = useState<"today" | "yesterday" | "custom">("today");
  const [meetingCustomDate, setMeetingCustomDate] = useState("");
  const [visitorReportFilter, setVisitorReportFilter] = useState<"today" | "yesterday" | "custom">("today");
  const [visitorCustomDate, setVisitorCustomDate] = useState("");
  const [includeBrand, setIncludeBrand] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setReportsLoading(true);
      try {
        const response = await api.get("/stats/reports", { params: { period } });
        if (cancelled) return;
        setSummary(response.data.summary);
        setWeeklyData(response.data.weeklyData ?? defaultWeeklyData);
        setMonthlyTrend(response.data.monthlyTrend ?? defaultMonthlyTrend);
        setServiceDistribution(
          response.data.serviceDistribution.map((s: { name: string; value: number }, i: number) => ({
            ...s,
            color: defaultServiceDistribution[i % defaultServiceDistribution.length].color
          }))
        );
      } catch {
        if (!cancelled) {
          // keep prior data; optional toast elsewhere
        }
      } finally {
        if (!cancelled) setReportsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(themeStorageKey);
    setIsDarkMode(savedTheme === "dark");
  }, [themeStorageKey]);

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ darkMode?: boolean }>;
      if (typeof customEvent.detail?.darkMode === "boolean") {
        setIsDarkMode(customEvent.detail.darkMode);
      }
    };
    window.addEventListener("panel-theme-change", onThemeChange as EventListener);
    return () => window.removeEventListener("panel-theme-change", onThemeChange as EventListener);
  }, []);

  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push(`Report Period,${escapeCsv(period)}`);
    lines.push("");

    lines.push("Summary");
    lines.push("Metric,Value");
    lines.push(`Total Visitors,${escapeCsv(summary.totalVisitors)}`);
    lines.push(`Total Requests,${escapeCsv(summary.totalRequests)}`);
    lines.push(`Completion Rate,${escapeCsv(`${summary.completionRate}%`)}`);
    lines.push(`Avg Wait Time,${escapeCsv(summary.avgWaitTime)}`);
    lines.push(`Visitor Change,${escapeCsv(`${summary.visitorChange}%`)}`);
    lines.push(`Request Change,${escapeCsv(`${summary.requestChange}%`)}`);
    lines.push("");

    lines.push("Weekly Overview");
    lines.push("Day,Visitors,Requests");
    weeklyData.forEach((d) => {
      lines.push(`${escapeCsv(d.day)},${escapeCsv(d.visitors)},${escapeCsv(d.requests)}`);
    });
    lines.push("");

    lines.push("Service Distribution");
    lines.push("Service,Count");
    serviceDistribution.forEach((s) => {
      lines.push(`${escapeCsv(s.name)},${escapeCsv(s.value)}`);
    });
    lines.push("");

    lines.push("Monthly Visitor Trend");
    lines.push("Month,Visitors");
    monthlyTrend.forEach((m) => {
      lines.push(`${escapeCsv(m.month)},${escapeCsv(m.visitors)}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const meetingReportDate =
    meetingReportFilter === "today"
      ? new Date().toISOString().slice(0, 10)
      : meetingReportFilter === "yesterday"
        ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : meetingCustomDate;

  const visitorReportDate =
    visitorReportFilter === "today"
      ? new Date().toISOString().slice(0, 10)
      : visitorReportFilter === "yesterday"
        ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : visitorCustomDate;

  const downloadProtectedReport = async (path: string, fallbackFilename: string) => {
    const response = await api.get(path, { responseType: "blob" });
    const blob = new Blob([response.data], { type: response.headers["content-type"] || "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const disposition = String(response.headers["content-disposition"] || "");
    const match = disposition.match(/filename="?([^"]+)"?/i);
    a.href = url;
    a.download = match?.[1] || fallbackFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${reportsLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Detailed statistics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod} disabled={reportsLoading}>
            <SelectTrigger className={`w-[140px] ${isDarkMode ? "bg-slate-800 border-slate-600 text-slate-100" : ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : ""}>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className={`gap-2 ${isDarkMode ? "text-white border-slate-600 bg-slate-800 hover:bg-slate-700 hover:text-white" : ""}`}
            onClick={handleExportCsv}
            disabled={reportsLoading}
          >
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {isAdmin && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report Downloads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-2">
              <Switch checked={includeBrand} onCheckedChange={setIncludeBrand} />
              <span className="text-sm text-muted-foreground">Include stamp on PDF</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Visitor report</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={visitorReportFilter} onValueChange={(v: "today" | "yesterday" | "custom") => setVisitorReportFilter(v)}>
                  <SelectTrigger className={`w-full sm:w-[220px] ${isDarkMode ? "bg-slate-800 border-slate-600 text-slate-100" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : ""}>
                    <SelectItem value="today">Today's report</SelectItem>
                    <SelectItem value="yesterday">Yesterday's report</SelectItem>
                    <SelectItem value="custom">Other day</SelectItem>
                  </SelectContent>
                </Select>
                {visitorReportFilter === "custom" && (
                  <Input
                    type="date"
                    value={visitorCustomDate}
                    onChange={(e) => setVisitorCustomDate(e.target.value)}
                    className={`w-full sm:w-[220px] ${isDarkMode ? "bg-slate-800 border-slate-600 text-slate-100 dark-date-input" : ""}`}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!visitorReportDate}
                  onClick={() =>
                    void downloadProtectedReport(
                      `/admin/exports/visitor-requests.csv?reportDate=${encodeURIComponent(visitorReportDate)}`,
                      `visitor-requests-${visitorReportDate || "report"}.csv`
                    )
                  }
                >
                  <Download size={16} /> Visitor CSV
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!visitorReportDate}
                  onClick={() =>
                    void downloadProtectedReport(
                      `/admin/exports/visitor-requests.pdf?reportDate=${encodeURIComponent(visitorReportDate)}&includeBrand=${includeBrand ? "1" : "0"}`,
                      `visitor-requests-${visitorReportDate || "report"}.pdf`
                    )
                  }
                >
                  <Download size={16} /> Visitor PDF
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Meeting report</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={meetingReportFilter} onValueChange={(v: "today" | "yesterday" | "custom") => setMeetingReportFilter(v)}>
                  <SelectTrigger className={`w-full sm:w-[220px] ${isDarkMode ? "bg-slate-800 border-slate-600 text-slate-100" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : ""}>
                    <SelectItem value="today">Today's list</SelectItem>
                    <SelectItem value="yesterday">Yesterday's list</SelectItem>
                    <SelectItem value="custom">Other day</SelectItem>
                  </SelectContent>
                </Select>
                {meetingReportFilter === "custom" && (
                  <Input
                    type="date"
                    value={meetingCustomDate}
                    onChange={(e) => setMeetingCustomDate(e.target.value)}
                    className={`w-full sm:w-[220px] ${isDarkMode ? "bg-slate-800 border-slate-600 text-slate-100 dark-date-input" : ""}`}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!meetingReportDate}
                  onClick={() =>
                    void downloadProtectedReport(
                      `/admin/exports/meeting-attendance.csv?eventDate=${encodeURIComponent(meetingReportDate)}`,
                      `meeting-attendance-${meetingReportDate || "report"}.csv`
                    )
                  }
                >
                  <Download size={16} /> Meeting CSV
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!meetingReportDate}
                  onClick={() =>
                    void downloadProtectedReport(
                      `/admin/exports/meeting-attendance.pdf?eventDate=${encodeURIComponent(meetingReportDate)}&includeBrand=${includeBrand ? "1" : "0"}`,
                      `meeting-attendance-${meetingReportDate || "report"}.pdf`
                    )
                  }
                >
                  <Download size={16} /> Meeting PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Visitors</p>
                <p className="text-2xl font-bold text-foreground mt-1">{summary.totalVisitors}</p>
              </div>
              <div className="flex items-center gap-1 text-success text-xs font-medium">
                <TrendingUp size={14} />
                {summary.visitorChange >= 0 ? "+" : ""}{summary.visitorChange}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">vs last week</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold text-foreground mt-1">{summary.totalRequests}</p>
              </div>
              <div className="flex items-center gap-1 text-destructive text-xs font-medium">
                <TrendingDown size={14} />
                {summary.requestChange >= 0 ? "+" : ""}{summary.requestChange}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">vs last week</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-foreground mt-1">{summary.completionRate}%</p>
              </div>
              <div className="flex items-center gap-1 text-success text-xs font-medium">
                <TrendingUp size={14} />
                +5%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">vs last week</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg. Wait Time</p>
                <p className="text-2xl font-bold text-foreground mt-1">{summary.avgWaitTime}</p>
              </div>
              <div className="flex items-center gap-1 text-success text-xs font-medium">
                <TrendingDown size={14} />
                -2 min
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">vs last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Bar Chart */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="visitors" fill="hsl(201, 96%, 42%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="requests" fill="hsl(151, 60%, 42%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Service Distribution */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Service Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <PieChart>
                <Pie data={serviceDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {serviceDistribution.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-medium text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Visitor Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="visitors" stroke="hsl(201, 96%, 42%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(201, 96%, 42%)" }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
