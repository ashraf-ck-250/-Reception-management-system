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

const services = ["MININFRA", "Prime Minister Head Office", "Rwanda Law Reform Commission", "MINIJUST"] as const;

type Nationality = "rwandan" | "foreign" | "";

function publicUrl(path: string) {
  const base = window.location.origin;
  return `${base}${path}`;
}

export default function VisitorForm() {
  const navigate = useNavigate();
  const formUrl = useMemo(() => publicUrl("/visitor"), []);

  const [nationality, setNationality] = useState<Nationality>("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [fetchedProfile, setFetchedProfile] = useState<any>(null);

  const [passportNumber, setPassportNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const doLookup = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Enter a phone number first");
      return;
    }
    setLookupLoading(true);
    try {
      const res = await api.get("/public/rwanda/lookup", { params: { phone: phoneNumber.trim() } });
      setFetchedProfile(res.data?.data ?? null);
      toast.success("Information fetched");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Could not fetch information";
      toast.error(msg);
      setFetchedProfile(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationality) return toast.error("Select nationality");
    if (!service) return toast.error("Select service");

    if (nationality === "rwandan") {
      if (!phoneNumber.trim()) return toast.error("Phone number is required");
    } else {
      if (!passportNumber.trim() || !fullName.trim() || !contactNumber.trim() || !email.trim()) {
        return toast.error("Please fill all foreign visitor fields");
      }
    }

    setSubmitting(true);
    try {
      await api.post("/visitor-requests", {
        nationality,
        phoneNumber: phoneNumber.trim(),
        fetchedProfile,
        passportNumber: passportNumber.trim(),
        fullName: fullName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        service,
        message: message.trim()
      });
      toast.success("Submitted successfully");
      navigate("/submission-success", {
        state: { type: "Visitor Form", name: nationality === "foreign" ? fullName.trim() : phoneNumber.trim() }
      });
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
              <p className="text-xs text-muted-foreground">Visitor Form</p>
            </div>
          </div>
          <QrCode value={formUrl} size={72} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl">Visitor Form</CardTitle>
            <CardDescription>Fill the short form based on your selection.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Are you Rwandan or foreign? *</Label>
                <Select
                  value={nationality}
                  onValueChange={(v: Nationality) => {
                    setNationality(v);
                    setFetchedProfile(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rwandan">Rwandan</SelectItem>
                    <SelectItem value="foreign">Foreign</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {nationality === "rwandan" && (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Enter phone number" />
                  </div>
                  <Button type="button" variant="outline" onClick={() => void doLookup()} loading={lookupLoading}>
                    Fetch information
                  </Button>
                  {fetchedProfile && (
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Fetched</p>
                      <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">{JSON.stringify(fetchedProfile, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {nationality === "foreign" && (
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="passportNumber">Passport number *</Label>
                    <Input id="passportNumber" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} placeholder="Enter passport number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name *</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact number *</Label>
                    <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Enter contact number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Service *</Label>
                <Select value={service} onValueChange={setService}>
                  <SelectTrigger>
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
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Write your message (optional)" />
              </div>

              <Button type="submit" className="w-full" size="lg" loading={submitting} disabled={!nationality}>
                Submit
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

