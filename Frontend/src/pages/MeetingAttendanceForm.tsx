import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import gov from "@/assets/gov.png";
import { QrCode } from "@/components/QrCode";

function publicUrl(path: string) {
  const base = window.location.origin;
  return `${base}${path}`;
}

export default function MeetingAttendanceForm() {
  const navigate = useNavigate();
  const formUrl = useMemo(() => publicUrl("/meeting"), []);
  const eventDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    institution: "",
    position: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phoneNumber.trim() || !form.institution.trim() || !form.position.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/meeting-attendance", {
        eventDate,
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        institution: form.institution.trim(),
        position: form.position.trim()
      });
      toast.success("Submitted successfully");
      navigate("/submission-success", { state: { type: "Meeting Attendance", name: form.fullName.trim(), email: form.email.trim() || undefined } });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to submit";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

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

