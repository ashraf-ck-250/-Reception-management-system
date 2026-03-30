import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Filter, Eye, Pencil, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type RecordType = "attendance" | "service";

type AttendanceRecord = { id: string; date: string; name: string; position: string; institution: string; contactType: string; contact: string; email: string; time: string };
type ServiceRecord = { id: string; date: string; name: string; phone: string; passport: string; email: string; service: string; eventDate: string; message: string; status: string };

const PAGE_SIZE = 10;

function escapeCsv(value: string | number) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function VisitorRecords() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight") || "";
  const tabParam = searchParams.get("tab");
  const serviceStatusParam = searchParams.get("serviceStatus");
  const visitorPeriodParam = searchParams.get("visitorPeriod");
  const [recordType, setRecordType] = useState<RecordType>("attendance");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);
  const [saveAttendanceLoading, setSaveAttendanceLoading] = useState(false);
  const [deleteAttendanceId, setDeleteAttendanceId] = useState<string | null>(null);
  const [serviceActionKey, setServiceActionKey] = useState<string | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [attendancePage, setAttendancePage] = useState(1);
  const [servicePage, setServicePage] = useState(1);

  const load = async () => {
    try {
      const [attendanceRes, servicesRes] = await Promise.all([api.get("/attendance"), api.get("/service-requests")]);
      setAttendance(attendanceRes.data);
      setServices(servicesRes.data);
    } catch {
      toast.error("Failed to load records");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (tabParam === "service" || tabParam === "attendance") {
      setRecordType(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (tabParam === "attendance" && visitorPeriodParam === "today") {
      const t = new Date().toISOString().split("T")[0];
      setFromDate(t);
      setToDate(t);
    }
  }, [tabParam, visitorPeriodParam]);

  useEffect(() => {
    if (!highlightId) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`record-row-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightId, recordType, attendance, services]);

  const updateEditingAttendance = (key: keyof AttendanceRecord, value: string) => {
    if (!editingAttendance) return;
    setEditingAttendance({ ...editingAttendance, [key]: value });
  };

  const handleSaveAttendance = async () => {
    if (!editingAttendance) return;
    setSaveAttendanceLoading(true);
    try {
      await api.put(`/attendance/${editingAttendance.id}`, {
        date: editingAttendance.date,
        fullName: editingAttendance.name,
        position: editingAttendance.position,
        institution: editingAttendance.institution,
        contactType: editingAttendance.contactType.toLowerCase(),
        phonePassport: editingAttendance.contact,
        email: editingAttendance.email
      });
      toast.success("Visitor updated");
      setEditingAttendance(null);
      await load();
    } catch {
      toast.error("Could not update visitor");
    } finally {
      setSaveAttendanceLoading(false);
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    setDeleteAttendanceId(id);
    try {
      await api.delete(`/attendance/${id}`);
      toast.success("Visitor deleted");
      await load();
    } catch {
      toast.error("Could not delete visitor");
    } finally {
      setDeleteAttendanceId(null);
    }
  };

  const handleServiceStatus = async (id: string, status: "Completed" | "Rejected") => {
    setServiceActionKey(`${id}:${status}`);
    try {
      await api.patch(`/service-requests/${id}/status`, { status });
      toast.success(`Service request ${status.toLowerCase()}`);
      await load();
    } catch {
      toast.error("Could not update status");
    } finally {
      setServiceActionKey(null);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm("Delete this service request?")) return;
    setDeleteServiceId(id);
    try {
      await api.delete(`/service-requests/${id}`);
      toast.success("Service request deleted");
      await load();
    } catch {
      toast.error("Could not delete service request");
    } finally {
      setDeleteServiceId(null);
    }
  };

  const isDateInRange = (date: string) => {
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const applyVisitorToday = tabParam === "attendance" && visitorPeriodParam === "today";

  const serviceStatusFilter =
    serviceStatusParam === "Pending" || serviceStatusParam === "Completed" || serviceStatusParam === "Rejected"
      ? serviceStatusParam
      : "";

  const filteredAttendance = useMemo(() => {
    return attendance.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.institution.toLowerCase().includes(search.toLowerCase());
      if (applyVisitorToday && r.date !== todayStr) return false;
      return matchesSearch && isDateInRange(r.date);
    });
  }, [attendance, search, fromDate, toDate, applyVisitorToday, todayStr]);

  const filteredServices = useMemo(() => {
    return services.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.service.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !serviceStatusFilter || r.status === serviceStatusFilter;
      return matchesSearch && isDateInRange(r.date) && matchesStatus;
    });
  }, [services, search, fromDate, toDate, serviceStatusFilter]);

  const attendanceTotalPages = Math.max(1, Math.ceil(filteredAttendance.length / PAGE_SIZE));
  const serviceTotalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));

  useEffect(() => {
    setAttendancePage((p) => Math.min(p, attendanceTotalPages));
  }, [attendanceTotalPages]);

  useEffect(() => {
    setServicePage((p) => Math.min(p, serviceTotalPages));
  }, [serviceTotalPages]);

  const safeAttendancePage = Math.min(attendancePage, attendanceTotalPages);
  const safeServicePage = Math.min(servicePage, serviceTotalPages);
  const paginatedAttendance = filteredAttendance.slice((safeAttendancePage - 1) * PAGE_SIZE, safeAttendancePage * PAGE_SIZE);
  const paginatedServices = filteredServices.slice((safeServicePage - 1) * PAGE_SIZE, safeServicePage * PAGE_SIZE);

  useEffect(() => {
    setAttendancePage(1);
  }, [search, fromDate, toDate, applyVisitorToday]);

  useEffect(() => {
    setServicePage(1);
  }, [search, fromDate, toDate, serviceStatusFilter]);

  useEffect(() => {
    if (!highlightId) return;
    if (recordType === "attendance") {
      const idx = filteredAttendance.findIndex((r) => r.id === highlightId);
      if (idx >= 0) setAttendancePage(Math.floor(idx / PAGE_SIZE) + 1);
    } else {
      const idx = filteredServices.findIndex((r) => r.id === highlightId);
      if (idx >= 0) setServicePage(Math.floor(idx / PAGE_SIZE) + 1);
    }
  }, [highlightId, recordType, filteredAttendance, filteredServices]);

  const handleExportCsv = () => {
    const datePart = fromDate || toDate ? `${fromDate || "start"}_to_${toDate || "end"}` : new Date().toISOString().slice(0, 10);
    const filename = `visitor-records-${recordType}-${datePart}.csv`;
    let csv = "";

    if (recordType === "attendance") {
      const headers = ["Date", "Full Name", "Position", "Institution", "Contact Type", "Contact", "Email", "Time"];
      const rows = filteredAttendance.map((r) =>
        [r.date, r.name, r.position, r.institution, r.contactType, r.contact, r.email, r.time].map(escapeCsv).join(",")
      );
      csv = [headers.join(","), ...rows].join("\n");
    } else {
      const headers = ["Date", "Full Name", "Phone", "Passport", "Email", "Service", "Event Date", "Status", "Message"];
      const rows = filteredServices.map((r) =>
        [r.date, r.name, r.phone, r.passport, r.email, r.service, r.eventDate, r.status, r.message].map(escapeCsv).join(",")
      );
      csv = [headers.join(","), ...rows].join("\n");
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Visitor Records</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage all submitted records</p>
        {(applyVisitorToday || serviceStatusFilter) && (
          <p className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-2 items-center">
            {applyVisitorToday && (
              <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-0.5 font-medium">
                Dashboard: today&apos;s visitors
              </span>
            )}
            {serviceStatusFilter && (
              <span className="inline-flex items-center rounded-md bg-accent/15 text-accent-foreground px-2 py-0.5 font-medium">
                Service requests — {serviceStatusFilter}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={recordType}
          onValueChange={(v: RecordType) => {
            setRecordType(v);
            setAttendancePage(1);
            setServicePage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter size={16} className="mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="attendance">Visitor Attendance</SelectItem>
            <SelectItem value="service">Service Requests</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, institution..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full sm:w-[170px]" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full sm:w-[170px]" />
        <Button variant="outline" onClick={() => { setFromDate(""); setToDate(""); }}>
          Clear Dates
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
          <Download size={16} />
          Export CSV
        </Button>
      </div>

      {recordType === "attendance" ? (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visitor Attendance ({filteredAttendance.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className={isAdmin ? "w-32" : "w-10"}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttendance.map((r) => (
                    <TableRow
                      key={r.id}
                      id={`record-row-${r.id}`}
                      className={highlightId === r.id ? "bg-primary/5 ring-2 ring-inset ring-primary/40" : undefined}
                    >
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="font-medium text-sm">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.position}</TableCell>
                      <TableCell className="text-sm">{r.institution}</TableCell>
                      <TableCell className="text-sm">{r.contact}</TableCell>
                      <TableCell className="text-sm">{r.time}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(r)}>
                                <Eye size={16} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Visitor Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div><span className="text-muted-foreground">Name:</span><p className="font-medium">{r.name}</p></div>
                                  <div><span className="text-muted-foreground">Position:</span><p className="font-medium">{r.position}</p></div>
                                  <div><span className="text-muted-foreground">Institution:</span><p className="font-medium">{r.institution}</p></div>
                                  <div><span className="text-muted-foreground">Contact Type:</span><p className="font-medium">{r.contactType}</p></div>
                                  <div><span className="text-muted-foreground">Contact:</span><p className="font-medium">{r.contact}</p></div>
                                  <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{r.email}</p></div>
                                  <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{r.date}</p></div>
                                  <div><span className="text-muted-foreground">Time:</span><p className="font-medium">{r.time}</p></div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {isAdmin && (
                            <>
                              <Dialog open={editingAttendance?.id === r.id} onOpenChange={(open) => setEditingAttendance(open ? r : null)}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setEditingAttendance(r)}>
                                    <Pencil size={16} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader><DialogTitle>Edit Visitor</DialogTitle></DialogHeader>
                                  {editingAttendance && (
                                    <div className="space-y-3">
                                      <div><Label>Full Name</Label><Input value={editingAttendance.name} onChange={(e) => updateEditingAttendance("name", e.target.value)} /></div>
                                      <div><Label>Position</Label><Input value={editingAttendance.position} onChange={(e) => updateEditingAttendance("position", e.target.value)} /></div>
                                      <div><Label>Institution</Label><Input value={editingAttendance.institution} onChange={(e) => updateEditingAttendance("institution", e.target.value)} /></div>
                                      <div><Label>Contact Type</Label><Select value={editingAttendance.contactType} onValueChange={(v) => updateEditingAttendance("contactType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Phone">Phone</SelectItem><SelectItem value="Passport">Passport</SelectItem></SelectContent></Select></div>
                                      <div><Label>Contact</Label><Input value={editingAttendance.contact} onChange={(e) => updateEditingAttendance("contact", e.target.value)} /></div>
                                      <div><Label>Email</Label><Input value={editingAttendance.email} onChange={(e) => updateEditingAttendance("email", e.target.value)} /></div>
                                      <Button onClick={() => void handleSaveAttendance()} className="w-full" loading={saveAttendanceLoading}>
                                        Save Changes
                                      </Button>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                loading={deleteAttendanceId === r.id}
                                disabled={deleteAttendanceId !== null && deleteAttendanceId !== r.id}
                                onClick={() => void handleDeleteAttendance(r.id)}
                              >
                                <Trash2 size={16} />
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
            {filteredAttendance.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-border text-sm text-muted-foreground">
                <span>
                  Showing {(safeAttendancePage - 1) * PAGE_SIZE + 1}–{Math.min(safeAttendancePage * PAGE_SIZE, filteredAttendance.length)} of{" "}
                  {filteredAttendance.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setAttendancePage((p) => Math.max(1, p - 1))}
                    disabled={safeAttendancePage <= 1}
                    aria-label="Previous visitors page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-xs tabular-nums min-w-[4.5rem] text-center text-foreground">
                    {safeAttendancePage} / {attendanceTotalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setAttendancePage((p) => Math.min(attendanceTotalPages, p + 1))}
                    disabled={safeAttendancePage >= attendanceTotalPages}
                    aria-label="Next visitors page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Service Requests ({filteredServices.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className={isAdmin ? "w-40" : "w-10"}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedServices.map((r) => (
                    <TableRow
                      key={r.id}
                      id={`record-row-${r.id}`}
                      className={highlightId === r.id ? "bg-primary/5 ring-2 ring-inset ring-primary/40" : undefined}
                    >
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="font-medium text-sm">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.service}</TableCell>
                      <TableCell className="text-sm">{r.eventDate}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.status === "Completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(r)}>
                                <Eye size={16} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Service Request Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div><span className="text-muted-foreground">Name:</span><p className="font-medium">{r.name}</p></div>
                                  <div><span className="text-muted-foreground">Phone:</span><p className="font-medium">{r.phone}</p></div>
                                  <div><span className="text-muted-foreground">Passport:</span><p className="font-medium">{r.passport}</p></div>
                                  <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{r.email}</p></div>
                                  <div><span className="text-muted-foreground">Service:</span><p className="font-medium">{r.service}</p></div>
                                  <div><span className="text-muted-foreground">Event Date:</span><p className="font-medium">{r.eventDate}</p></div>
                                  <div className="col-span-2"><span className="text-muted-foreground">Status:</span><p className="font-medium">{r.status}</p></div>
                                  <div className="col-span-2"><span className="text-muted-foreground">Message:</span><p className="font-medium">{r.message}</p></div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-success hover:text-success hover:bg-success/10"
                                loading={serviceActionKey === `${r.id}:Completed`}
                                disabled={serviceActionKey !== null && serviceActionKey !== `${r.id}:Completed`}
                                onClick={() => void handleServiceStatus(r.id, "Completed")}
                              >
                                <CheckCircle size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                loading={serviceActionKey === `${r.id}:Rejected`}
                                disabled={serviceActionKey !== null && serviceActionKey !== `${r.id}:Rejected`}
                                onClick={() => void handleServiceStatus(r.id, "Rejected")}
                              >
                                <XCircle size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                loading={deleteServiceId === r.id}
                                disabled={(deleteServiceId !== null && deleteServiceId !== r.id) || serviceActionKey !== null}
                                onClick={() => void handleDeleteService(r.id)}
                              >
                                <Trash2 size={16} />
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
            {filteredServices.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-border text-sm text-muted-foreground">
                <span>
                  Showing {(safeServicePage - 1) * PAGE_SIZE + 1}–{Math.min(safeServicePage * PAGE_SIZE, filteredServices.length)} of{" "}
                  {filteredServices.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setServicePage((p) => Math.max(1, p - 1))}
                    disabled={safeServicePage <= 1}
                    aria-label="Previous service requests page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-xs tabular-nums min-w-[4.5rem] text-center text-foreground">
                    {safeServicePage} / {serviceTotalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setServicePage((p) => Math.min(serviceTotalPages, p + 1))}
                    disabled={safeServicePage >= serviceTotalPages}
                    aria-label="Next service requests page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
