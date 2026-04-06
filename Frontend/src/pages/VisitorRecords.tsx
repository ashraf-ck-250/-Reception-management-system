import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, Search, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type RecordType = "visitors" | "meetings";

type VisitorRequestRecord = {
  id: string;
  createdAt: string;
  nationality: "rwandan" | "foreign";
  fullName: string;
  phoneNumber: string;
  passportNumber: string;
  contactNumber: string;
  email: string;
  service: string;
  message: string;
  status: "Pending" | "Approved" | "Rejected";
  decidedAt?: string | null;
};

type MeetingAttendanceRecord = {
  id: string;
  eventDate: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  institution: string;
  position: string;
  createdAt: string;
};

function tabFromParam(value: string | null): RecordType {
  if (value === "meetings") return value;
  return "visitors";
}

export default function VisitorRecords() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = tabFromParam(searchParams.get("tab"));
  const activeTab: RecordType = !isAdmin && tab === "meetings" ? "visitors" : tab;
  const visitorPeriod = searchParams.get("visitorPeriod");
  const [search, setSearch] = useState("");
  const [visitorReportFilter, setVisitorReportFilter] = useState<"today" | "yesterday" | "custom">("today");
  const [visitorCustomDate, setVisitorCustomDate] = useState("");
  const [meetingDateFilter, setMeetingDateFilter] = useState<"today" | "yesterday" | "custom">("today");
  const [meetingCustomDate, setMeetingCustomDate] = useState("");

  const [visitors, setVisitors] = useState<VisitorRequestRecord[]>([]);
  const [meetings, setMeetings] = useState<MeetingAttendanceRecord[]>([]);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const setTab = (next: RecordType) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("tab", next);
        return p;
      },
      { replace: true }
    );
  };

  const load = async () => {
    try {
      const meetingDate =
        meetingDateFilter === "today"
          ? new Date().toISOString().slice(0, 10)
          : meetingDateFilter === "yesterday"
            ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
            : meetingCustomDate;

      const calls = [api.get("/visitor-requests")];
      if (isAdmin) {
        if (meetingDate) {
          calls.push(api.get("/meeting-attendance", { params: { eventDate: meetingDate } }));
        } else {
          calls.push(Promise.resolve({ data: [] }));
        }
      }
      const [vRes, mRes] = await Promise.all(calls);
      setVisitors(vRes.data);
      setMeetings(isAdmin ? (mRes?.data ?? []) : []);
    } catch {
      toast.error("Failed to load records");
    }
  };

  useEffect(() => {
    void load();
  }, [isAdmin, meetingDateFilter, meetingCustomDate]);

  useEffect(() => {
    const h = searchParams.get("highlight");
    if (!h) return;
    const t = window.setTimeout(() => {
      document.getElementById(`record-${h}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [searchParams, activeTab, visitors, meetings]);

  const filteredVisitors = useMemo(() => {
    let list = visitors;
    if (visitorPeriod === "today") {
      const day = new Date().toISOString().slice(0, 10);
      list = list.filter((r) => new Date(r.createdAt).toISOString().slice(0, 10) === day);
    }
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((r) => {
      return (
        (r.fullName || "").toLowerCase().includes(q) ||
        (r.phoneNumber || "").toLowerCase().includes(q) ||
        (r.passportNumber || "").toLowerCase().includes(q) ||
        (r.service || "").toLowerCase().includes(q)
      );
    });
  }, [visitors, search, visitorPeriod]);

  const filteredMeetings = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return meetings;
    return meetings.filter((r) => {
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.phoneNumber.toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        r.institution.toLowerCase().includes(q)
      );
    });
  }, [meetings, search]);

  const downloadAdminExport = async (path: string, fallbackFilename: string) => {
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

  const selectedVisitorDate =
    visitorReportFilter === "today"
      ? new Date().toISOString().slice(0, 10)
      : visitorReportFilter === "yesterday"
        ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : visitorCustomDate;

  const selectedMeetingDate =
    meetingDateFilter === "today"
      ? new Date().toISOString().slice(0, 10)
      : meetingDateFilter === "yesterday"
        ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : meetingCustomDate;

  const setVisitorStatus = async (id: string, status: "Approved" | "Rejected") => {
    setActionKey(`${id}:${status}`);
    try {
      await api.patch(`/visitor-requests/${id}/status`, { status });
      toast.success(`Visitor ${status.toLowerCase()}`);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Could not update status";
      toast.error(msg);
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Records</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin
              ? "Visitor requests and exports"
              : "Approve or reject visitor requests"}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            {activeTab === "visitors" ? (
              <>
                <Button variant="outline" className="gap-2" onClick={() => downloadAdminExport("/admin/exports/visitor-requests.csv")}>
                  <Download size={16} /> CSV
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => downloadAdminExport("/admin/exports/visitor-requests.pdf")}>
                  <Download size={16} /> PDF
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    void downloadAdminExport(
                      `/admin/exports/meeting-attendance.csv?eventDate=${encodeURIComponent(selectedMeetingDate)}`,
                      `meeting-attendance-${selectedMeetingDate || "report"}.csv`
                    )
                  }
                  disabled={!selectedMeetingDate}
                >
                  <Download size={16} /> CSV
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    void downloadAdminExport(
                      `/admin/exports/meeting-attendance.pdf?eventDate=${encodeURIComponent(selectedMeetingDate)}`,
                      `meeting-attendance-${selectedMeetingDate || "report"}.pdf`
                    )
                  }
                  disabled={!selectedMeetingDate}
                >
                  <Download size={16} /> PDF
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={activeTab} onValueChange={(v: RecordType) => setTab(v)}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="visitors">Visitor requests</SelectItem>
            {isAdmin && <SelectItem value="meetings">Meeting attendance</SelectItem>}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {activeTab === "visitors" && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visitor requests ({filteredVisitors.length})</CardTitle>
            {isAdmin && (
              <div className="flex flex-col sm:flex-row gap-2 pt-3">
                <Select value={visitorReportFilter} onValueChange={(v: "today" | "yesterday" | "custom") => setVisitorReportFilter(v)}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                    className="w-full sm:w-[220px]"
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      void downloadAdminExport(
                        `/admin/exports/visitor-requests.csv?reportDate=${encodeURIComponent(selectedVisitorDate)}`,
                        `visitor-requests-${selectedVisitorDate || "report"}.csv`
                      )
                    }
                    disabled={!selectedVisitorDate}
                  >
                    <Download size={16} /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      void downloadAdminExport(
                        `/admin/exports/visitor-requests.pdf?reportDate=${encodeURIComponent(selectedVisitorDate)}`,
                        `visitor-requests-${selectedVisitorDate || "report"}.pdf`
                      )
                    }
                    disabled={!selectedVisitorDate}
                  >
                    <Download size={16} /> PDF
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Full name</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className={isReceptionist ? "w-32" : "w-10"} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisitors.map((r) => (
                    <TableRow key={r.id} id={`record-${r.id}`} className="scroll-mt-24">
                      <TableCell className="text-sm">{new Date(r.createdAt).toISOString().slice(0, 10)}</TableCell>
                      <TableCell className="font-medium text-sm">{r.fullName || "—"}</TableCell>
                      <TableCell className="text-sm capitalize">{r.nationality}</TableCell>
                      <TableCell className="text-sm">{r.service}</TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            r.status === "Approved"
                              ? "bg-success/10 text-success"
                              : r.status === "Rejected"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-warning/10 text-warning"
                          }`}
                        >
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Eye size={16} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Visitor details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-muted-foreground">Name</span>
                                    <p className="font-medium break-words">{r.fullName || "—"}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Nationality</span>
                                    <p className="font-medium capitalize">{r.nationality}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Phone</span>
                                    <p className="font-medium break-words">{r.phoneNumber || "—"}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Passport</span>
                                    <p className="font-medium break-words">{r.passportNumber || "—"}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Contact number</span>
                                    <p className="font-medium break-words">{r.contactNumber || "—"}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Email</span>
                                    <p className="font-medium break-words">{r.email || "—"}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Service</span>
                                    <p className="font-medium">{r.service}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Message</span>
                                    <p className="font-medium whitespace-pre-wrap">{r.message || "—"}</p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {isReceptionist && r.status === "Pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-success hover:text-success hover:bg-success/10"
                                loading={actionKey === `${r.id}:Approved`}
                                disabled={actionKey !== null && actionKey !== `${r.id}:Approved`}
                                onClick={() => void setVisitorStatus(r.id, "Approved")}
                              >
                                <CheckCircle size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                loading={actionKey === `${r.id}:Rejected`}
                                disabled={actionKey !== null && actionKey !== `${r.id}:Rejected`}
                                onClick={() => void setVisitorStatus(r.id, "Rejected")}
                              >
                                <XCircle size={16} />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && activeTab === "meetings" && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Meeting attendance ({filteredMeetings.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 pt-3">
              <Select value={meetingDateFilter} onValueChange={(v: "today" | "yesterday" | "custom") => setMeetingDateFilter(v)}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today's list</SelectItem>
                  <SelectItem value="yesterday">Yesterday's list</SelectItem>
                  <SelectItem value="custom">Other day</SelectItem>
                </SelectContent>
              </Select>
              {meetingDateFilter === "custom" && (
                <Input
                  type="date"
                  value={meetingCustomDate}
                  onChange={(e) => setMeetingCustomDate(e.target.value)}
                  className="w-full sm:w-[220px]"
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event date</TableHead>
                    <TableHead>Full name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeetings.map((r) => (
                    <TableRow key={r.id} id={`record-${r.id}`} className="scroll-mt-24">
                      <TableCell className="text-sm">{r.eventDate}</TableCell>
                      <TableCell className="font-medium text-sm">{r.fullName}</TableCell>
                      <TableCell className="text-sm">{r.phoneNumber}</TableCell>
                      <TableCell className="text-sm">{r.institution}</TableCell>
                      <TableCell className="text-sm">{r.position}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Meeting attendee</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Name</span>
                                <p className="font-medium">{r.fullName}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Event date</span>
                                <p className="font-medium">{r.eventDate}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Phone</span>
                                <p className="font-medium">{r.phoneNumber}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Email</span>
                                <p className="font-medium">{r.email || "—"}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Institution</span>
                                <p className="font-medium">{r.institution}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Position</span>
                                <p className="font-medium">{r.position}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
