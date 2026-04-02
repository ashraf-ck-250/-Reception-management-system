import { Link } from "react-router-dom";
import gov from "@/assets/gov.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/QrCode";

function publicUrl(path: string) {
  const base = window.location.origin;
  return `${base}${path}`;
}

export default function PublicHome() {
  const visitorUrl = publicUrl("/visitor");
  const meetingUrl = publicUrl("/meeting");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              <img src={gov} alt="RWANDA Goverment Logo" width={80} height={80} className="rounded-xl" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">ReceptionMS</h1>
              <p className="text-xs text-muted-foreground">Reception Management System</p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-xs text-muted-foreground hover:text-primary transition-all duration-150 active:opacity-70 outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            Staff Login →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Public Forms</h2>
          <p className="text-sm text-muted-foreground mt-1">Scan the correct QR Code to open the form.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visitor Form</CardTitle>
              <CardDescription>Submit visitor details for reception approval.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground break-all">{visitorUrl}</p>
                <Button asChild>
                  <Link to="/visitor">Open Visitor Form</Link>
                </Button>
              </div>
              <QrCode value={visitorUrl} size={110} />
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Meeting Attendance</CardTitle>
              <CardDescription>Submit attendance (one submission per attendee).</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground break-all">{meetingUrl}</p>
                <Button asChild>
                  <Link to="/meeting">Open Meeting Attendance</Link>
                </Button>
              </div>
              <QrCode value={meetingUrl} size={110} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

