import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import gov from "@/assets/gov.png";
import { QrCode } from "@/components/QrCode";
import type { AxiosError } from "axios";

function publicUrl(path: string) {
  const base = window.location.origin;
  return `${base}${path}`;
}

export default function MeetingAttendanceForm() {
  const navigate = useNavigate();
  const formUrl = useMemo(() => publicUrl("/meeting"), []);
  const eventDate = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [loadingTitle, setLoadingTitle] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    institution: "",
    position: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const signatureDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    if (!hasSignature) return "";
    return canvas.toDataURL("image/png");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Make canvas crisp on high DPI screens
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const cssW = canvas.clientWidth || 520;
    const cssH = canvas.clientHeight || 160;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.2;
    clearSignature();
  }, [clearSignature]);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = pointFromEvent(e);
    if (!p) return;
    lastPointRef.current = p;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const p = pointFromEvent(e);
    const last = lastPointRef.current;
    if (!p || !last) return;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    setHasSignature(true);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !meetingTitle.trim() ||
      !form.fullName.trim() ||
      !form.phoneNumber.trim() ||
      !form.institution.trim() ||
      !form.position.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!hasSignature) {
      toast.error("Please sign before submitting");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/meeting-attendance", {
        eventDate,
        meetingTitle: meetingTitle.trim(),
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        institution: form.institution.trim(),
        position: form.position.trim(),
        signatureDataUrl: signatureDataUrl()
      });
      toast.success("Submitted successfully");
      navigate("/submission-success", { state: { type: "Meeting Attendance", name: form.fullName.trim(), email: form.email.trim() || undefined } });
    } catch (err: unknown) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || "Failed to submit";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let first = true;

    const loadActiveTitle = async (opts?: { silent?: boolean }) => {
      try {
        if (!opts?.silent) setLoadingTitle(true);
        const res = await api.get("/public/active-meeting-title", { params: { eventDate } });
        const title = String(res.data?.meetingTitle || "").trim();
        if (!mounted) return;
        setMeetingTitle(title);
      } catch (err: unknown) {
        if (!mounted) return;
        setMeetingTitle("");
      } finally {
        if (mounted && !opts?.silent) setLoadingTitle(false);
        first = false;
      }
    };

    const onFocus = () => void loadActiveTitle({ silent: true });
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadActiveTitle({ silent: true });
    };

    void loadActiveTitle();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      // Keep the title list synced while the form is open
      void loadActiveTitle({ silent: !first });
    }, 8000);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [eventDate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={gov} alt="RWANDA Goverment Logo" width={56} height={56} className="rounded-xl" />
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">ReceptionMS</h1>
              <p className="text-xs text-muted-foreground">Meeting Attendance</p>
            </div>
          </div>
          <QrCode value={formUrl} size={72} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl">Meeting Attendance</CardTitle>
            <CardDescription>Submit once only.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Event date</Label>
                <Input id="eventDate" type="date" value={eventDate} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingTitle">Meeting title *</Label>
                <Input id="meetingTitle" value={loadingTitle ? "Loading..." : meetingTitle} readOnly />
                {!loadingTitle && !meetingTitle && (
                  <p className="text-xs text-destructive">
                    No active meeting title set for today. Please contact the meeting leader.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Enter full name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input id="phoneNumber" value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} placeholder="Enter phone number" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Enter email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Institution *</Label>
                <Input id="institution" value={form.institution} onChange={(e) => update("institution", e.target.value)} placeholder="Enter institution" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input id="position" value={form.position} onChange={(e) => update("position", e.target.value)} placeholder="Enter position" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Signature *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                    Clear
                  </Button>
                </div>
                <div className="rounded-md border border-border bg-background">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-40 touch-none"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Sign using your finger or mouse.</p>
              </div>
              <Button type="submit" className="w-full" size="lg" loading={submitting}>
                Submit
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

