import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import logo from "@/assets/logo.jpeg";
import qrcode from "@/assets/qrcode.png";
import { api } from "@/lib/api";

export default function VisitorAttendance() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    fullName: "",
    position: "",
    institution: "",
    contactType: "",
    phonePassport: "",
    email: "",
  });

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.contactType || !form.phonePassport) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await api.post("/attendance", form);
      toast.success("Attendance recorded successfully!");
      navigate("/submission-success", { state: { type: "Visitor Attendance", name: form.fullName } });
    } catch {
      toast.error("Failed to submit attendance");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-border shadow-sm">
        <CardHeader className="text-center border-b border-border">
          <div className="mx-auto flex items-center gap-4">
            <img src={logo} alt="MININFRA Logo" width={80} height={80} className="rounded-xl" />
            <img src={qrcode} alt="QR Code" width={80} height={80} className="rounded-xl" />
          </div>
          <p className="text-xs text-muted-foreground mb-2">Scan to open this form</p>
          <CardTitle className="text-xl">Visitor Attendance List</CardTitle>
          <CardDescription>Location: Kigali</CardDescription>
          <p className="text-sm text-muted-foreground mt-1">Date: {today}</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" placeholder="Enter full name" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" placeholder="Enter position" value={form.position} onChange={(e) => update("position", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input id="institution" placeholder="Enter institution" value={form.institution} onChange={(e) => update("institution", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contact Type *</Label>
              <Select value={form.contactType} onValueChange={(v) => update("contactType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phonePassport">Phone / Passport *</Label>
              <Input
                id="phonePassport"
                placeholder={form.contactType === "passport" ? "Enter passport number" : "Enter phone number"}
                value={form.phonePassport}
                onChange={(e) => update("phonePassport", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email address" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Submit Attendance
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
