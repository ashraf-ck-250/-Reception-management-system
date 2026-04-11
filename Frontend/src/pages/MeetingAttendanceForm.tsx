import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import gov from "@/assets/gov.png";
import { QrCode } from "@/components/QrCode";
import MeetingSignaturePad from "@/components/MeetingSignaturePad";
import type { AxiosError } from "axios";

function publicUrl(path: string) {
  const base = window.location.origin;
  return `${base}${path}`;
}

export default function MeetingAttendanceForm() {
  const navigate = useNavigate();
  const formUrl = "https://reception-management-system.vercel.app/meeting";
  const eventDate = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [loadingTitle, setLoadingTitle] = useState(true);
  const [meetingTitles, setMeetingTitles] = useState<string[]>([]);

  const [signature, setSignature] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    institution: "",
    position: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const validateDetailsStep = () => {
    if (!meetingTitle.trim()) return "Please select a meeting title";
    if (!form.fullName.trim() || !form.phoneNumber.trim() || !form.institution.trim() || !form.position.trim()) {
      return "Please fill all required fields";
    }
    return null;
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
    if (!signature) {
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
        signatureDataUrl: signature
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

    const loadTitles = async (opts?: { silent?: boolean }) => {
      try {
        if (!opts?.silent) setLoadingTitle(true);
        const [activeRes, listRes] = await Promise.all([
          api.get("/public/active-meeting-title", { params: { eventDate } }),
          api.get("/public/meeting-titles", { params: { eventDate } })
        ]);
        const active = String(activeRes.data?.meetingTitle || "").trim();
        const list = Array.isArray(listRes.data?.meetingTitles) ? (listRes.data.meetingTitles as unknown[]) : [];
        const titles = Array.from(
          new Set(
            list
              .map((t) => String(t || "").trim())
              .filter(Boolean)
          )
        );
        if (!mounted) return;
        setMeetingTitles(titles);

        // Auto-populate meeting title when activated, preserve user selection
        setMeetingTitle((prev) => {
          const prevTrim = String(prev || "").trim();
          
          // If meeting leader just activated a meeting, auto-populate it
          if (active && !prevTrim && titles.includes(active)) {
            return active;
          }
          
          // Preserve user selection if still valid
          if (prevTrim && titles.includes(prevTrim)) return prevTrim;
          
          // Prefer active title if available
          if (active && titles.includes(active)) return active;
          
          // Fallback to first available title
          return titles[0] || active || "";
        });
      } catch (err: unknown) {
        if (!mounted) return;
        setMeetingTitles([]);
        setMeetingTitle("");
      } finally {
        if (mounted && !opts?.silent) setLoadingTitle(false);
        first = false;
      }
    };

    const onFocus = () => void loadTitles({ silent: true });
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadTitles({ silent: true });
    };

    void loadTitles();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      // Keep the title list synced while the form is open
      void loadTitles({ silent: !first });
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
      <header className="border-b border-border bg-gradient-to-r from-primary/5 via-primary to-card shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={gov} alt="RWANDA Goverment Logo" width={64} height={64} className="rounded-xl shadow-lg ring-2 ring-primary/20" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground leading-tight">ReceptionMS</h1>
                <p className="text-sm text-muted-foreground font-medium">Meeting Attendance System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Secure Check-in Portal</p>
                <QrCode value={formUrl} size={64} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl">Meeting Attendance</CardTitle>
            <CardDescription>Step {step} of 3</CardDescription>
          </CardHeader>
          <div className="px-6 pt-5">
            <div className="flex items-center gap-2">
              {[
                { step: 1, label: "Details" },
                { step: 2, label: "Sign" },
                { step: 3, label: "Review" }
              ].map(({ step: s }, idx) => {
                const isDone = step > s;
                const isCurrent = step === s;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div
                      className={`h-7 w-7 rounded-full border text-xs font-semibold flex items-center justify-center transition-colors ${
                        isDone || isCurrent
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border"
                      }`}
                    >
                      {isDone ? "✓" : s}
                    </div>
                    {idx < 2 && (
                      <div className={`mx-2 h-1 flex-1 rounded ${step > s ? "bg-primary/80" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-center">
              {[
                { step: 1, label: "Details" },
                { step: 2, label: "Sign" },
                { step: 3, label: "Review" }
              ].map(({ step: s, label }) => (
                <span key={s} className={step >= s ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <CardContent className="pt-6 pb-24">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="eventDate">Event date</Label>
                    <Input id="eventDate" type="date" value={eventDate} readOnly />
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="meetingTitle">Meeting title</Label>
                    {meetingTitles && meetingTitles.length > 0 ? (
                      <div className="space-y-2">
                        <Input 
                          id="meetingTitle" 
                          value={meetingTitle} 
                          readOnly
                          className="bg-muted border-muted-foreground/20"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Active meeting: {meetingTitle}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input 
                          id="meetingTitle" 
                          value={loadingTitle ? "Loading..." : meetingTitle} 
                          readOnly
                          placeholder="No active meeting"
                          className="bg-muted border-muted-foreground/20"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          No active meeting set. Contact meeting leader to activate a meeting.
                        </p>
                      </div>
                    )}
                    {!loadingTitle && !meetingTitle && (
                      <p className="text-xs text-destructive">No meeting title set for today. Please contact the meeting leader.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      placeholder="Enter full name"
                      className={!form.fullName.trim() ? "border-destructive" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      value={form.phoneNumber}
                      onChange={(e) => update("phoneNumber", e.target.value)}
                      placeholder="Enter phone number"
                      className={!form.phoneNumber.trim() ? "border-destructive" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Enter email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution *</Label>
                    <Input
                      id="institution"
                      value={form.institution}
                      onChange={(e) => update("institution", e.target.value)}
                      placeholder="Enter institution"
                      className={!form.institution.trim() ? "border-destructive" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      value={form.position}
                      onChange={(e) => update("position", e.target.value)}
                      placeholder="Enter position"
                      className={!form.position.trim() ? "border-destructive" : ""}
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Signature *</Label>
                    <p className="text-sm text-muted-foreground">Please sign your name below to confirm your attendance</p>
                  </div>
                  <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-1 bg-muted/5">
                    <MeetingSignaturePad
                      onSignatureChange={setSignature}
                      width={520}
                      height={180}
                      className="w-full bg-white rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>✓ Draw your signature using mouse or touch</span>
                    <span className={signature ? "text-green-600 font-medium" : "text-muted-foreground"}>
                      {signature ? "✓ Signature captured" : "○ Signature required"}
                    </span>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
                  <p className="font-medium">Review before submit</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <p><span className="text-muted-foreground">Date:</span> {eventDate}</p>
                    <p><span className="text-muted-foreground">Meeting:</span> {meetingTitle}</p>
                    <p><span className="text-muted-foreground">Full name:</span> {form.fullName}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {form.phoneNumber}</p>
                    <p><span className="text-muted-foreground">Email:</span> {form.email || "-"}</p>
                    <p><span className="text-muted-foreground">Institution:</span> {form.institution}</p>
                    <p><span className="text-muted-foreground">Position:</span> {form.position}</p>
                    <p><span className="text-muted-foreground">Signature:</span> {signature ? "Added" : "Missing"}</p>
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-card/95 backdrop-blur border-t border-border flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))}
                  disabled={step === 1 || submitting}
                >
                  Back
                </Button>
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (step === 1) {
                        const err = validateDetailsStep();
                        if (err) return toast.error(err);
                      }
                      if (step === 2 && !signature) return toast.error("Please sign before continuing");
                      setStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
                    }}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button type="button" size="lg" loading={submitting} onClick={handleSubmit}>
                    Submit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

