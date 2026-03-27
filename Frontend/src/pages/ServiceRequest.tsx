import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import qrcode from "@/assets/qrcode.png";
import { api } from "@/lib/api";

const services = [
  "Rwanda Law Reform Commission",
  "Prime Minister Head Office",
  "MININFRA",
  "MINIJUST",
];

export default function ServiceRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    passportNumber: "",
    email: "",
    service: "",
    eventDate: "",
    message: "",
  });

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.service) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await api.post("/service-requests", form);
      toast.success("Service request submitted successfully!");
      navigate("/submission-success", { state: { type: "Service Request", name: form.fullName } });
    } catch {
      toast.error("Failed to submit service request");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-border shadow-sm">
        <CardHeader className="text-center border-b border-border">
          <img src={qrcode} alt="QR Code" width={80} height={80} className="mx-auto mb-3" />
          <p className="text-xs text-muted-foreground mb-2">Scan to open this form</p>
          <CardTitle className="text-xl">Service Request Form</CardTitle>
          <CardDescription>Submit your service request below</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" placeholder="Enter full name" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" placeholder="Enter phone number" value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passportNumber">Passport Number</Label>
              <Input id="passportNumber" placeholder="Enter passport number" value={form.passportNumber} onChange={(e) => update("passportNumber", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email address" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Service *</Label>
              <Select value={form.service} onValueChange={(v) => update("service", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <Input id="eventDate" type="date" value={form.eventDate} onChange={(e) => update("eventDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Enter your message" rows={4} value={form.message} onChange={(e) => update("message", e.target.value)} />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
