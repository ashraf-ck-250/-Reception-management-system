import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, Search, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { AxiosError } from "axios";

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

export default function VisitorRecords() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const [searchParams, setSearchParams] = useSearchParams();

  const highlightId = searchParams.get("highlight") || "";
  const visitorPeriod = searchParams.get("visitorPeriod");
  const [search, setSearch] = useState("");
  const [visitorReportFilter, setVisitorReportFilter] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [visitorCustomDate, setVisitorCustomDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Approved" | "Rejected">("all");
  const [includeBrand, setIncludeBrand] = useState(true);

  const [visitors, setVisitors] = useState<VisitorRequestRecord[]>([]);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const tableWrapRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const vRes = await api.get("/visitor-requests");
      setVisitors(vRes.data);
    } catch {
      toast.error("Failed to load records");
    }
  };

  useEffect(() => {
    void load();
  }, [isAdmin]);

  useEffect(() => {
    if (!visitorPeriod) return;
    if (visitorPeriod === "today") {
      setVisitorReportFilter("today");
      return;
    }
    if (visitorPeriod === "yesterday") {
      setVisitorReportFilter("yesterday");
      return;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(visitorPeriod)) {
      setVisitorReportFilter("custom");
      setVisitorCustomDate(visitorPeriod);
    }
  }, [visitorPeriod]);

  useEffect(() => {
    setPage(0);
  }, [visitorReportFilter, visitorCustomDate, statusFilter, search]);

  useEffect(() => {
    if (!highlightId) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const row = document.getElementById(`record-${highlightId}`);
      if (row && target && row.contains(target)) return;
      // Only clear highlight when clicking around the data area.
      if (tableWrapRef.current && target && !tableWrapRef.current.contains(target)) return;
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete("highlight");
          return p;
        },
        { replace: true }
      );
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [highlightId, setSearchParams]);

  useEffect(() => {
    const h = searchParams.get("highlight");
    if (!h) return;
    const t = window.setTimeout(() => {
      document.getElementById(`record-${h}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [searchParams, visitors]);

  const filteredVisitors = useMemo(() => {
    let list = visitors;
    if (visitorReportFilter === "today") {
      const day = new Date().toISOString().slice(0, 10);
      list = list.filter((r) => new Date(r.createdAt).toISOString().slice(0, 10) === day);
    } else if (visitorReportFilter === "yesterday") {
      const day = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      list = list.filter((r) => new Date(r.createdAt).toISOString().slice(0, 10) === day);
    } else if (visitorReportFilter === "custom" && visitorCustomDate) {
      const day = visitorCustomDate;
      list = list.filter((r) => new Date(r.createdAt).toISOString().slice(0, 10) === day);
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
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
  }, [visitors, search, visitorReportFilter, visitorCustomDate, statusFilter]);

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
        : visitorReportFilter === "custom"
          ? visitorCustomDate
          : "";

  const pageCount = Math.max(1, Math.ceil(filteredVisitors.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedVisitors = filteredVisitors.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const setVisitorStatus = async (id: string, status: "Approved" | "Rejected") => {
    setActionKey(`${id}:${status}`);
    const prev = visitors;
    setVisitors((cur) =>
      cur.map((v) =>
        v.id === id
          ? {
              ...v,
              status,
              decidedAt: new Date().toISOString()
            }
          : v
      )
    );
    try {
      await api.patch(`/visitor-requests/${id}/status`, { status });
      toast.success(`Visitor ${status.toLowerCase()}`);
    } catch (err: unknown) {
      setVisitors(prev);
      const msg = (err as AxiosError<any>)?.response?.data?.message || "Could not update status";
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
            <div className="flex items-center gap-2 px-2">
              <Switch checked={includeBrand} onCheckedChange={setIncludeBrand} />
              <span className="text-xs text-muted-foreground">Include stamp</span>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                void downloadAdminExport(
                  `/admin/exports/visitor-requests.csv?reportDate=${encodeURIComponent(selectedVisitorDate)}`,
                  `visitor-requests-${selectedVisitorDate || "report"}.csv`
                )
              }
              disabled={visitorReportFilter !== "today" && visitorReportFilter !== "yesterday" && !(visitorReportFilter === "custom" && selectedVisitorDate)}
            >
              <Download size={16} /> CSV
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                void downloadAdminExport(
                  `/admin/exports/visitor-requests.pdf?reportDate=${encodeURIComponent(selectedVisitorDate)}&includeBrand=${includeBrand ? "1" : "0"}`,
                  `visitor-requests-${selectedVisitorDate || "report"}.pdf`
                )
              }
              disabled={visitorReportFilter !== "today" && visitorReportFilter !== "yesterday" && !(visitorReportFilter === "custom" && selectedVisitorDate)}
            >
              <Download size={16} /> PDF
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v: "all" | "Pending" | "Approved" | "Rejected") => setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visitor requests ({filteredVisitors.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 pt-3">
              <Select
                value={visitorReportFilter}
                onValueChange={(v: "all" | "today" | "yesterday" | "custom") => {
                  setVisitorReportFilter(v);
                  if (v === "custom") setVisitorCustomDate("");
                  setSearchParams(
                    (prev) => {
                      const p = new URLSearchParams(prev);
                      if (v === "today") p.set("visitorPeriod", "today");
                      else if (v === "yesterday") p.set("visitorPeriod", "yesterday");
                      else if (v === "custom") {
                        if (visitorCustomDate) p.set("visitorPeriod", visitorCustomDate);
                        else p.delete("visitorPeriod");
                      } else {
                        p.delete("visitorPeriod");
                      }
                      return p;
                    },
                    { replace: true }
                  );
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="today">Today's report</SelectItem>
                  <SelectItem value="yesterday">Yesterday's report</SelectItem>
                  <SelectItem value="custom">Other day</SelectItem>
                </SelectContent>
              </Select>
              {visitorReportFilter === "custom" && (
                <Input
                  type="date"
                  value={visitorCustomDate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setVisitorCustomDate(next);
                    setSearchParams(
                      (prev) => {
                        const p = new URLSearchParams(prev);
                        if (next) p.set("visitorPeriod", next);
                        else p.delete("visitorPeriod");
                        return p;
                      },
                      { replace: true }
                    );
                  }}
                  className="w-full sm:w-[220px]"
                />
              )}
              {isAdmin && (
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
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={tableWrapRef} className="overflow-x-auto">
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
                  {pagedVisitors.map((r) => (
                    <TableRow
                      key={r.id}
                      id={`record-${r.id}`}
                      className={highlightId === r.id ? "scroll-mt-24 bg-primary/5 ring-2 ring-inset ring-primary/40" : "scroll-mt-24"}
                    >
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
            {pageCount > 1 && (
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage + 1} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
