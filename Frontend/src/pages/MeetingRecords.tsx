import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { Switch } from "@/components/ui/switch";

type MeetingTitleConfigRow = {
  meetingTitle: string;
  isActive?: boolean;
  updatedAt?: string;
};

type MeetingAttendanceRecord = {
  id: string;
  eventDate: string;
  meetingTitle: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  institution: string;
  position: string;
  createdAt: string;
  signatureDataUrl?: string;
};

export default function MeetingRecords() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight") || "";

  const [tab, setTab] = useState<"view" | "manage">("view");
  const [search, setSearch] = useState("");
  const [manageSearch, setManageSearch] = useState("");
  const [meetingDateFilter, setMeetingDateFilter] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [meetingCustomDate, setMeetingCustomDate] = useState("");
  const [meetings, setMeetings] = useState<MeetingAttendanceRecord[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [selectedMeetingKey, setSelectedMeetingKey] = useState<string | null>(null);
  const [brandMarkDataUrl, setBrandMarkDataUrl] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [adminMeetingTitles, setAdminMeetingTitles] = useState<MeetingTitleConfigRow[]>([]);
  const [includeBrand, setIncludeBrand] = useState(true);
  const viewSelectionRef = useRef<HTMLDivElement | null>(null);
  const viewFilterSnapshotRef = useRef<{ meetingDateFilter: "all" | "today" | "yesterday" | "custom"; meetingCustomDate: string } | null>(
    null
  );

  const meetingDate =
    meetingDateFilter === "today"
      ? new Date().toISOString().slice(0, 10)
      : meetingDateFilter === "yesterday"
        ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : meetingDateFilter === "custom"
          ? meetingCustomDate
          : "";

  useEffect(() => {
    // Manage defaults to "today", but user can change it (yesterday/custom).
    // Preserve and restore the View filter when switching tabs.
    if (tab === "manage") {
      if (!viewFilterSnapshotRef.current) {
        viewFilterSnapshotRef.current = { meetingDateFilter, meetingCustomDate };
      }
      if (meetingDateFilter === "all") {
        setMeetingDateFilter("today");
      }
      return;
    }

    // Back to view: restore the previous view filter (if any)
    if (tab === "view" && viewFilterSnapshotRef.current) {
      const snap = viewFilterSnapshotRef.current;
      viewFilterSnapshotRef.current = null;
      setMeetingDateFilter(snap.meetingDateFilter);
      setMeetingCustomDate(snap.meetingCustomDate);
    }
  }, [tab, meetingCustomDate, meetingDateFilter]);

  const load = async () => {
    try {
      if (!isAdmin) return;

      const res = await api.get("/meeting-attendance", {
        params: meetingDate ? { eventDate: meetingDate } : undefined
      });
      setMeetings(res.data);
    } catch {
      toast.error("Failed to load meeting records");
    }
  };

  const loadBranding = async () => {
    try {
      if (!isAdmin) return;
      const res = await api.get("/admin/branding");
      setBrandMarkDataUrl(res.data?.brandMarkDataUrl || "");
    } catch {
      // ignore
    }
  };

  const loadMeetingTitle = async () => {
    try {
      if (!isAdmin) return;
      if (!meetingDate) {
        setAdminMeetingTitles([]);
        return;
      }
      const res = await api.get("/admin/meeting-titles", { params: { eventDate: meetingDate } });
      const rows = Array.isArray(res.data?.meetingTitles) ? (res.data.meetingTitles as MeetingTitleConfigRow[]) : [];
      setAdminMeetingTitles(
        rows
          .map((r) => ({
            meetingTitle: String(r.meetingTitle || "").trim(),
            isActive: Boolean(r.isActive),
            updatedAt: r.updatedAt ? String(r.updatedAt) : undefined
          }))
          .filter((r) => r.meetingTitle)
      );
    } catch {
      setAdminMeetingTitles([]);
    }
  };

  useEffect(() => {
    void load();
    void loadBranding();
    void loadMeetingTitle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, meetingDateFilter, meetingCustomDate]);

  useEffect(() => {
    setPage(0);
  }, [meetingDateFilter, meetingCustomDate, search]);

  const filteredMeetings = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return meetings;
    return meetings.filter((r) => {
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.phoneNumber.toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        r.institution.toLowerCase().includes(q) ||
        (r.meetingTitle || "").toLowerCase().includes(q)
      );
    });
  }, [meetings, search]);

  type MeetingGroup = {
    key: string;
    eventDate: string;
    title: string; // Meeting title
    attendeeCount: number;
    attendees: MeetingAttendanceRecord[];
    latestCreatedAt: string;
  };

  const meetingGroups = useMemo<MeetingGroup[]>(() => {
    const map = new Map<string, MeetingGroup>();
    for (const a of filteredMeetings) {
      const eventDate = a.eventDate || "";
      const title = a.meetingTitle || "";
      const key = `${eventDate}__${title}`;

      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          key,
          eventDate,
          title,
          attendeeCount: 1,
          attendees: [a],
          latestCreatedAt: a.createdAt || ""
        });
      } else {
        prev.attendees.push(a);
        prev.attendeeCount += 1;
        if ((a.createdAt || "") > prev.latestCreatedAt) prev.latestCreatedAt = a.createdAt || "";
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => (b.latestCreatedAt || "").localeCompare(a.latestCreatedAt || ""));
    return list;
  }, [filteredMeetings]);

  const pageCount = Math.max(1, Math.ceil(meetingGroups.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedMeetingGroups = meetingGroups.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  useEffect(() => {
    if (!highlightId) return;
    const hit = meetings.find((a) => a.id === highlightId);
    if (!hit) return;
    const key = `${hit.eventDate || ""}__${hit.meetingTitle || ""}`;
    setSelectedMeetingKey(key);
  }, [highlightId, meetings]);

  const selectedMeeting = useMemo(() => {
    if (!selectedMeetingKey) return null;
    return meetingGroups.find((g) => g.key === selectedMeetingKey) || null;
  }, [meetingGroups, selectedMeetingKey]);

  const selectedAttendees = useMemo(() => {
    if (!selectedMeetingKey) return [];
    return filteredMeetings.filter((a) => `${a.eventDate || ""}__${a.meetingTitle || ""}` === selectedMeetingKey);
  }, [filteredMeetings, selectedMeetingKey]);

  const filteredAdminMeetingTitles = useMemo(() => {
    const q = manageSearch.toLowerCase().trim();
    const list = [...adminMeetingTitles].sort((a, b) => Number(Boolean(b.isActive)) - Number(Boolean(a.isActive)));
    if (!q) return list;
    return list.filter((t) => (t.meetingTitle || "").toLowerCase().includes(q));
  }, [adminMeetingTitles, manageSearch]);

  useEffect(() => {
    // When clicking outside the "view" selection area, clear the selection.
    if (tab !== "view") return;
    const onDown = (e: MouseEvent) => {
      const root = viewSelectionRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (root.contains(target)) return;
      setSelectedMeetingKey(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [tab]);

  useEffect(() => {
    if (!highlightId) return;
    const t = window.setTimeout(() => {
      document.getElementById(`record-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [highlightId, selectedMeetingKey, selectedAttendees.length]);

  const downloadProtectedReport = async (path: string, fallbackFilename: string) => {
    const response = await api.get(path, { responseType: "blob" });
    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "application/octet-stream"
    });
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

  const selectedDateForDownload =
    meetingDateFilter === "today" || meetingDateFilter === "yesterday" || (meetingDateFilter === "custom" && meetingDate)
      ? meetingDate
      : "";

  // Admin cannot add meeting titles here; only Meeting Leader can.

  const onBrandFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Image is too large (max 1.5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setBrandMarkDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const saveBranding = async () => {
    try {
      setSavingBrand(true);
      await api.put("/admin/branding", { brandMarkDataUrl: brandMarkDataUrl || "" });
      toast.success("Brand mark saved");
    } catch (err: unknown) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || "Failed to save brand mark";
      toast.error(msg);
    } finally {
      setSavingBrand(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meeting Records</h1>
          <p className="text-muted-foreground text-sm mt-1">Attendance history by event date</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "view" | "manage")}>
        <TabsList>
          <TabsTrigger value="view">View</TabsTrigger>
          <TabsTrigger value="manage" disabled={!isAdmin}>
            Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view">
          <div ref={viewSelectionRef} className="space-y-6">
            <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Meetings ({meetingGroups.length})</CardTitle>

              <div className="flex flex-col sm:flex-row gap-2 pt-3">
                <Select
                  value={meetingDateFilter}
                  onValueChange={(v: "all" | "today" | "yesterday" | "custom") => {
                    setMeetingDateFilter(v);
                    if (v === "custom") setMeetingCustomDate("");
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dates</SelectItem>
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
              <p className="text-xs text-muted-foreground mt-2">View only. No actions on this page.</p>
            </CardHeader>

            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row gap-3 p-4">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
              </div>

              <div className="overflow-x-auto pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event date</TableHead>
                      <TableHead>Meeting title</TableHead>
                      <TableHead>Attendees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedMeetingGroups.map((g) => (
                      <TableRow
                        key={g.key}
                        id={`meeting-${g.key}`}
                        className={`scroll-mt-24 cursor-pointer ${
                          selectedMeetingKey === g.key ? "bg-primary/5 ring-2 ring-inset ring-primary/40" : ""
                        }`}
                    onClick={() => setSelectedMeetingKey((prev) => (prev === g.key ? null : g.key))}
                      >
                        <TableCell className="text-sm">{g.eventDate}</TableCell>
                        <TableCell className="font-medium text-sm">{g.title || "—"}</TableCell>
                        <TableCell className="text-sm">{g.attendeeCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
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
            </Card>

            {selectedMeeting && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {selectedMeeting.title || "Meeting"} — {selectedMeeting.eventDate}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">Attending people</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto pb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Full name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Institution</TableHead>
                          <TableHead>Position</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedAttendees.map((a) => (
                          <TableRow
                            key={a.id}
                            id={`record-${a.id}`}
                            className={
                              highlightId === a.id
                                ? "scroll-mt-24 bg-primary/5 ring-2 ring-inset ring-primary/40"
                                : "scroll-mt-24"
                            }
                          >
                            <TableCell className="font-medium text-sm">{a.fullName}</TableCell>
                            <TableCell className="text-sm">{a.phoneNumber}</TableCell>
                            <TableCell className="text-sm">{a.email || "—"}</TableCell>
                            <TableCell className="text-sm">{a.institution}</TableCell>
                            <TableCell className="text-sm">{a.position}</TableCell>
                          </TableRow>
                        ))}
                        {selectedAttendees.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-sm text-muted-foreground">
                              No attendees for this meeting.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reports & settings</CardTitle>

              <div className="flex flex-col sm:flex-row gap-2 pt-3">
                <Select
                  value={meetingDateFilter}
                  onValueChange={(v: "all" | "today" | "yesterday" | "custom") => {
                    setMeetingDateFilter(v);
                    if (v === "custom") setMeetingCustomDate("");
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today's meetings</SelectItem>
                    <SelectItem value="yesterday">Yesterday's meetings</SelectItem>
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

                <div className="flex-1 flex gap-2 justify-end">
                  <Button variant="outline" className="gap-2" disabled>
                    <Download size={16} /> CSV
                  </Button>
                  <Button variant="outline" className="gap-2" disabled>
                    <Download size={16} /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>

      {tab === "manage" && isAdmin && (
        <>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Meetings</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">Available meeting titles created by the Meeting Leader.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    void loadMeetingTitle();
                  }}
                >
                  Reload
                </Button>
                <div className="flex items-center gap-2 px-2">
                  <Switch checked={includeBrand} onCheckedChange={setIncludeBrand} />
                  <span className="text-xs text-muted-foreground">Include brand</span>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/40">
                  <p className="text-sm font-medium">
                    Meetings for {meetingDate || "—"}
                  </p>
                </div>
                {!meetingDate ? (
                  <div className="px-4 py-4 text-sm text-muted-foreground">Select a date first.</div>
                ) : adminMeetingTitles.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-muted-foreground">No meeting titles yet for today.</div>
                ) : (
                  <div className="divide-y divide-border">
                    <div className="px-4 py-3 border-b border-border bg-background">
                      <Input
                        placeholder="Filter meetings..."
                        value={manageSearch}
                        onChange={(e) => setManageSearch(e.target.value)}
                      />
                    </div>
                    {filteredAdminMeetingTitles.map((t) => (
                      <div
                        key={t.meetingTitle}
                        className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between ${
                          t.isActive ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {t.meetingTitle} {t.isActive ? <span className="text-xs text-primary font-medium">(Active)</span> : null}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() =>
                              void downloadProtectedReport(
                                `/admin/exports/meeting-attendance.csv?eventDate=${encodeURIComponent(meetingDate)}&meetingTitle=${encodeURIComponent(t.meetingTitle)}`,
                                `meeting-attendance-${meetingDate}-${t.meetingTitle}.csv`
                              )
                            }
                          >
                            <Download size={16} /> CSV
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() =>
                              void downloadProtectedReport(
                                `/admin/exports/meeting-attendance.pdf?eventDate=${encodeURIComponent(meetingDate)}&meetingTitle=${encodeURIComponent(t.meetingTitle)}&includeBrand=${includeBrand ? "1" : "0"}`,
                                `meeting-attendance-${meetingDate}-${t.meetingTitle}.pdf`
                              )
                            }
                          >
                            <Download size={16} /> PDF
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredAdminMeetingTitles.length === 0 && (
                      <div className="px-4 py-4 text-sm text-muted-foreground">No meetings match your filter.</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Brand mark for exports</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">This image will be placed on exported meeting PDFs.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="file" accept="image/*" onChange={(e) => void onBrandFile(e.target.files?.[0] || null)} />
              {brandMarkDataUrl && (
                <div className="rounded-md border border-border p-3 bg-background">
                  <img src={brandMarkDataUrl} alt="Brand mark preview" className="h-20 w-auto object-contain" />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => void saveBranding()} loading={savingBrand}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  disabled={!brandMarkDataUrl}
                  onClick={() => {
                    setBrandMarkDataUrl("");
                    toast.message("Cleared (click Save to apply)");
                  }}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}

