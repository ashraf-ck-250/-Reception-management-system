import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { AxiosError } from "axios";

type MeetingTitleRow = {
  meetingTitle: string;
  isActive?: boolean;
};

export default function MeetingLeaderDashboard() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [eventDate, setEventDate] = useState(today);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<MeetingTitleRow[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/meeting-titles", { params: { eventDate } });
      const rows = Array.isArray(res.data?.meetingTitles) ? (res.data.meetingTitles as MeetingTitleRow[]) : [];
      setMeetings(rows);
    } catch (err: unknown) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(ax?.response?.data?.message || "Failed to load meetings");
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDate]);

  const addTitle = async () => {
    const title = meetingTitle.trim();
    if (!title) return toast.error("Enter meeting title");
    try {
      setSaving(true);
      const res = await api.put("/admin/meeting-titles", { eventDate, meetingTitle: title });
      const rows = Array.isArray(res.data?.meetingTitles) ? (res.data.meetingTitles as MeetingTitleRow[]) : [];
      setMeetings(rows);
      setMeetingTitle("");
      toast.success("Meeting added");
    } catch (err: unknown) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(ax?.response?.data?.message || "Failed to add meeting");
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (title: string) => {
    try {
      setSaving(true);
      await api.post("/admin/meeting-titles/activate", { eventDate, meetingTitle: title });
      await load();
      toast.success("Active meeting updated");
    } catch (err: unknown) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(ax?.response?.data?.message || "Failed to set active meeting");
    } finally {
      setSaving(false);
    }
  };

  const deactivateActive = async () => {
    try {
      setSaving(true);
      await api.post("/admin/meeting-titles/deactivate", { eventDate });
      await load();
      toast.success("Active meeting stopped");
    } catch (err: unknown) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(ax?.response?.data?.message || "Failed to deactivate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meeting Leader</h1>
        <p className="text-muted-foreground text-sm mt-1">Add meeting titles for attendance submission</p>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Create meeting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventDate">Meeting date</Label>
            <Input id="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meetingTitle">Meeting title</Label>
            <Input
              id="meetingTitle"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g. Leadership weekly meeting"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void addTitle()} loading={saving}>
              Add
            </Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading || saving}>
              Reload
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Meetings for {eventDate}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meetings.some((m) => m.isActive) && (
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="destructive" disabled={saving || loading} onClick={() => void deactivateActive()}>
                Deactivate
              </Button>
            </div>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meetings for this date yet.</p>
          ) : (
            <div className="space-y-2">
              {meetings.map((m) => (
                <div
                  key={m.meetingTitle}
                  className={`rounded-md border px-3 py-2 text-sm flex items-center justify-between gap-2 ${
                    m.isActive ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="font-medium">{m.meetingTitle}</div>
                  <div className="flex items-center gap-2">
                    {m.isActive ? (
                      <span className="text-xs font-medium text-primary">Active</span>
                    ) : (
                      <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void setActive(m.meetingTitle)}>
                        Set active
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

