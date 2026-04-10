import { useMemo, useState } from "react";
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

const services = [
  "MININFRA",
  "Prime Minister Head Office",
  "Rwanda Law Reform Commission",
  "MINIJUST",
  "Affiliated Regulatory Bodies"
] as const;

type Nationality = "rwandan" | "foreign" | "";

function publicUrl(path: string) {
  const base = window.location.origin;
  return `${base}${path}`;
}

export default function VisitorForm() {
  const navigate = useNavigate();
  const formUrl = useMemo(() => publicUrl("/visitor"), []);

  const [nationality, setNationality] = useState<Nationality>("");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");

  const [passportNumber, setPassportNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const validatePersonalInfo = () => {
    if (!nationality) return "Select nationality";
    if (!fullName.trim() || !email.trim()) return "Please fill all required fields";
    if (nationality === "rwandan" && !contactNumber.trim()) return "Contact number is required for Rwandan visitors";
    if (nationality === "foreign" && !passportNumber.trim()) return "Passport number is required for foreign visitors";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationality) return toast.error("Select nationality");
    if (!service) return toast.error("Select service");

    if (!fullName.trim() || !email.trim()) {
      return toast.error("Please fill all required fields");
    }
    if (nationality === "rwandan" && !contactNumber.trim()) {
      return toast.error("Contact number is required for Rwandan visitors");
    }
    if (nationality === "foreign" && !passportNumber.trim()) {
      return toast.error("Passport number is required for foreign visitors");
    }

    setSubmitting(true);
    try {
      const res = await api.post("/visitor-requests", {
        nationality,
        passportNumber: passportNumber.trim(),
        fullName: fullName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        service,
        message: message.trim()
      });
      toast.success("Submitted successfully");
      const requestId = String(res.data?.id || "").trim();
      navigate(requestId ? `/request-status/${encodeURIComponent(requestId)}` : "/submission-success", {
        state: requestId ? undefined : { type: "Visitor Form", name: fullName.trim() }
      });
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
            <form onSubmit={handleSubmit} className="space-y-5">
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
                      Rwandan
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
                      Foreign
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Selected:</span>{" "}
                      <span className="font-medium">{nationality === "rwandan" ? "Rwandan" : "Foreign"}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStep(1);
                        setNationality("");
                      }}
                    >
                      Change
                    </Button>
                  </div>

                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <Label className="text-sm">2. Your information</Label>
                    {nationality === "foreign" && (
                      <div className="space-y-2">
                        <Label htmlFor="passportNumber">Passport number *</Label>
                        <Input
                          id="passportNumber"
                          value={passportNumber}
                          onChange={(e) => setPassportNumber(e.target.value)}
                          placeholder="Enter passport number"
                          className={nationality === "foreign" && !passportNumber.trim() ? "border-destructive" : ""}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter full name"
                        className={!fullName.trim() ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact number {nationality === "foreign" ? "(optional)" : "*"}</Label>
                      <Input
                        id="contactNumber"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="Enter contact number"
                        className={nationality === "rwandan" && !contactNumber.trim() ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email"
                        className={!email.trim() ? "border-destructive" : ""}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-sm">3. Service You want</Label>
                    <p className="text-sm text-muted-foreground">Choose the service and optionally leave a message.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Service *</Label>
                    <Select value={service} onValueChange={setService}>
                      <SelectTrigger className={!service ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message (optional)</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Write your message (optional)"
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-sm">4. Review before submit</Label>
                    <p className="text-sm text-muted-foreground">Please confirm your details before sending.</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <p><span className="text-muted-foreground">Nationality:</span> {nationality === "rwandan" ? "Rwandan" : "Foreign"}</p>
                      <p><span className="text-muted-foreground">Full name:</span> {fullName}</p>
                      <p><span className="text-muted-foreground">Contact:</span> {contactNumber || "-"}</p>
                      <p><span className="text-muted-foreground">Email:</span> {email}</p>
                      {nationality === "foreign" && <p><span className="text-muted-foreground">Passport:</span> {passportNumber}</p>}
                      <p><span className="text-muted-foreground">Service:</span> {service}</p>
                    </div>
                    {message.trim() && (
                      <p><span className="text-muted-foreground">Message:</span> {message.trim()}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-card/95 backdrop-blur border-t border-border flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev))}
                  disabled={step === 1 || submitting}
                >
                  Back
                </Button>
                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (step === 1 && !nationality) return toast.error("Select nationality");
                      if (step === 2) {
                        const err = validatePersonalInfo();
                        if (err) return toast.error(err);
                      }
                      if (step === 3 && !service) return toast.error("Select service");
                      setStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
                    }}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" size="lg" loading={submitting}>
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

