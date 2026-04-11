import { useState } from "react";
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
  const formUrl = "https://reception-management-system.vercel.app/visitor";

  const [nationality, setNationality] = useState<Nationality>("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

    if (step === 1) {
      if (!nationality) return toast.error("Select nationality");
      setStep(2);
      return;
    }

    if (step === 2) {
      const err = validatePersonalInfo();
      if (err) return toast.error(err);
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!service) return toast.error("Select service");
      // Submit form after step 3
    }

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
        <Card className="border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="border-b border-border bg-gradient-to-r from-muted to-muted/10">
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary text-sm font-bold">{step}</span>
              </div>
              Visitor Survey
            </CardTitle>
            <CardDescription className="text-muted-foreground">Step {step} of 3</CardDescription>
          </CardHeader>
          <div className="px-6 pt-5">
            <div className="flex items-center gap-2">
              {[
                { step: 1, label: "Type" },
                { step: 2, label: "Info" },
                { step: 3, label: "Service" }
              ].map(({ step: s, label }, idx) => {
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
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-center">
              {[
                { step: 1, label: "Type" },
                { step: 2, label: "Info" },
                { step: 3, label: "Service" }
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">1. Rwandan or foreign?</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={nationality === "rwandan" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNationality("rwandan")}
                          className="px-4 py-2"
                        >
                          🇷🇼 Rwandan
                        </Button>
                        <Button
                          type="button"
                          variant={nationality === "foreign" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNationality("foreign")}
                          className="px-4 py-2"
                        >
                          🌍 Foreign
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Select your nationality to continue</p>
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
                          className={`border-slate-400 focus:border-primary focus:ring-primary/30 ${
                            nationality === "foreign" && !passportNumber.trim() ? "border-destructive" : ""
                          }`}
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
                        className={`border-slate-400 focus:border-primary focus:ring-primary/30 ${
                          !fullName.trim() ? "border-destructive" : ""
                        }`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact number {nationality === "foreign" ? "(optional)" : "*"}</Label>
                      <Input
                        id="contactNumber"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="Enter contact number"
                        className={`border-slate-400 focus:border-primary focus:ring-primary/30 ${
                          nationality === "rwandan" && !contactNumber.trim() ? "border-destructive" : ""
                        }`}
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
                        className={`border-slate-400 focus:border-primary focus:ring-primary/30 ${
                          !email.trim() ? "border-destructive" : ""
                        }`}
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
                      <SelectTrigger className={`border-slate-400 focus:border-primary focus:ring-primary/30 ${
                        !service ? "border-destructive" : ""
                      }`}>
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
                      className="border-slate-400 focus:border-primary focus:ring-primary/30"
                    />
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
                      if (step === 1 && !nationality) return toast.error("Select nationality");
                      if (step === 2) {
                        const err = validatePersonalInfo();
                        if (err) return toast.error(err);
                      }
                      if (step === 3 && !service) return toast.error("Select service");
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

