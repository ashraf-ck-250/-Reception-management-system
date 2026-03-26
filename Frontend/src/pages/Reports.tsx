import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { Download, TrendingUp, TrendingDown, Users, FileText } from "lucide-react";
import { useState } from "react";

const weeklyData = [
  { day: "Mon", visitors: 32, requests: 14 },
  { day: "Tue", visitors: 28, requests: 11 },
  { day: "Wed", visitors: 45, requests: 22 },
  { day: "Thu", visitors: 38, requests: 18 },
  { day: "Fri", visitors: 42, requests: 20 },
  { day: "Sat", visitors: 12, requests: 5 },
  { day: "Sun", visitors: 5, requests: 2 },
];

const monthlyTrend = [
  { month: "Oct", visitors: 420 },
  { month: "Nov", visitors: 380 },
  { month: "Dec", visitors: 310 },
  { month: "Jan", visitors: 450 },
  { month: "Feb", visitors: 520 },
  { month: "Mar", visitors: 490 },
];

const serviceDistribution = [
  { name: "MINIJUST", value: 35, color: "hsl(215, 70%, 45%)" },
  { name: "MININFRA", value: 28, color: "hsl(170, 55%, 42%)" },
  { name: "Rwanda Law Reform", value: 22, color: "hsl(38, 92%, 50%)" },
  { name: "PM Head Office", value: 15, color: "hsl(150, 60%, 40%)" },
];

const chartConfig = {
  visitors: { label: "Visitors", color: "hsl(215, 70%, 45%)" },
  requests: { label: "Requests", color: "hsl(170, 55%, 42%)" },
};

export default function Reports() {
  const [period, setPeriod] = useState("week");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Detailed statistics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Visitors</p>
                <p className="text-2xl font-bold text-foreground mt-1">202</p>
              </div>
              <div className="flex items-center gap-1 text-success text-xs font-medium">
                <TrendingUp size={14} />
                +12%
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
                <p className="text-2xl font-bold text-foreground mt-1">92</p>
              </div>
              <div className="flex items-center gap-1 text-destructive text-xs font-medium">
                <TrendingDown size={14} />
                -3%
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
                <p className="text-2xl font-bold text-foreground mt-1">78%</p>
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
                <p className="text-2xl font-bold text-foreground mt-1">8 min</p>
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
                <Bar dataKey="visitors" fill="hsl(215, 70%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="requests" fill="hsl(170, 55%, 42%)" radius={[4, 4, 0, 0]} />
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
                  <span className="font-medium text-foreground">{s.value}%</span>
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
              <Line type="monotone" dataKey="visitors" stroke="hsl(215, 70%, 45%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(215, 70%, 45%)" }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
