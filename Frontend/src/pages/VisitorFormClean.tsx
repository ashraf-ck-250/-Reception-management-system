import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import gov from "@/assets/gov.png";
import { QrCode } from "@/components/QrCode";
import type { AxiosError } from "axios";

type Nationality = "rwandan" | "foreign";

function publicUrl(path: string) {
  const base = window.location.origin;
  return `${base}${path}`;
}

export default function VisitorForm() {
  const navigate = useNavigate();
  const formUrl = "https://reception-management-system.vercel.app/visitor";

  const [nationality, setNationality] = useState<Nationality>("");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");

  const [passportNumber, setPassportNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !nationality ||
      !fullName.trim() ||
      !contactNumber.trim() ||
      !email.trim() ||
      !service.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post("/visitor-requests", {
        nationality,
        passportNumber: passportNumber.trim(),
        fullName: fullName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        service,
        message: message.trim()
      });
      toast.success("Submitted successfully");
      const requestId = String(response.data?.id || "").trim();
      if (requestId) {
        navigate(`/request-status/${encodeURIComponent(requestId)}`);
      } else {
        navigate("/submission-success", {
          state: { type: "Visitor Form", name: fullName.trim() }
        });
      }
    } catch (err: unknown) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg = ax?.response?.data?.message || "Failed to submit";
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
              <p className="text-xs text-muted-foreground">Visitor Form</p>
            </div>
          </div>
          <QrCode value={formUrl} size={72} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl">Visitor Survey</CardTitle>
            <CardDescription>Step {step} of 4</CardDescription>
          </CardHeader>
          <div className="px-6 pt-5">
            <div className="flex items-center gap-2">
              {[
                { step: 1, label: "Type" },
                { step: 2, label: "Info" },
                { step: 3, label: "Service" },
                { step: 4, label: "Review" }
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
                    {idx < 3 && (
                      <div className={`mx-2 h-1 flex-1 rounded ${step > s ? "bg-primary/80" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-center">
              {[
                { step: 1, label: "Type" },
                { step: 2, label: "Info" },
                { step: 3, label: "Service" },
                { step: 4, label: "Review" }
              ].map(({ step: s, label }) => (
                <span key={s} className={step >= s ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <CardContent className="pt-6 pb-24">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              {step === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>1. Rwandan or foreign? *</Label>
                    <p className="text-sm text-muted-foreground">Choose one to continue.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={nationality === "rwandan" ? "default" : "outline"}
                      className="h-14 justify-start"
                      onClick={() => {
                        setNationality("rwandan");
                        setStep(2);
                      }}
                    >
                      🇷🇼 Rwandan
                    </Button>
                    <Button
                      type="button"
                      variant={nationality === "foreign" ? "default" : "outline"}
                      className="h-14 justify-start"
                      onClick={() => {
                        setNationality("foreign");
                        setStep(2);
                      }}
                    >
                      🌍 Foreign
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => update("fullName", e.target.value)}
                        placeholder="Enter full name"
                        className={!fullName.trim() ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number *</Label>
                      <Input
                        id="contactNumber"
                        value={contactNumber}
                        onChange={(e) => update("contactNumber", e.target.value)}
                        placeholder="Enter contact number"
                        className={!contactNumber.trim() ? "border-destructive" : ""}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passportNumber">Passport Number</Label>
                      <Input
                        id="passportNumber"
                        value={passportNumber}
                        onChange={(e) => update("passportNumber", e.target.value)}
                        placeholder="Enter passport number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="service">Service *</Label>
                    <Select value={service} onValueChange={(v) => setService(v)}>
                      <SelectTrigger id="service" className={!service ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MININFRA">MININFRA</SelectItem>
                        <SelectItem value="Prime Minister Head Office">Prime Minister Head Office</SelectItem>
                        <SelectItem value="Rwanda Law Reform Commission">Rwanda Law Reform Commission</SelectItem>
                        <SelectItem value="MINIJUST">MINIJUST</SelectItem>
                        <SelectItem value="Affiliated Regulatory Bodies">Affiliated Regulatory Bodies</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="Enter your message"
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
                  <p className="font-medium">Review before submit</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <p><span className="text-muted-foreground">Date:</span> {new Date().toISOString().split("T")[0]}</p>
                    <p><span className="text-muted-foreground">Type:</span> {nationality === "rwandan" ? "Rwandan" : "Foreign"}</p>
                    <p><span className="text-muted-foreground">Full Name:</span> {fullName}</p>
                    <p><span className="text-muted-foreground">Contact:</span> {contactNumber}</p>
                    <p><span className="text-muted-foreground">Email:</span> {email || "-"}</p>
                    <p><span className="text-muted-foreground">Service:</span> {service}</p>
                    <p><span className="text-muted-foreground">Message:</span> {message}</p>
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-card/95 backdrop-blur border-t border-border flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((prev) => (prev > 1 ? (prev - 1) as 1 | 2 | 3 | 4 : prev))}
                  disabled={step === 1 || submitting}
                >
                  Back
                </Button>
                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (step === 1) {
                        const err = validateDetailsStep();
                        if (err) return toast.error(err);
                      }
                      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
                    }
                    }}
                    disabled={submitting}
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
