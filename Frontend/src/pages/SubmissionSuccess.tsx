import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import gov from "@/assets/gov.png";

export default function SubmissionSuccess() {
  const location = useLocation();
  const state = location.state as { type?: string; name?: string } | null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center">
            <img src={gov} alt="RWANDA Goverment Logo" width={80} height={80} className="rounded-xl" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">ReceptionMS</h1>
            <p className="text-xs text-muted-foreground">Reception Management System</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-border shadow-sm text-center">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle size={36} className="text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Submission Successful!</h2>
            <p className="text-muted-foreground">
              {state?.name ? `Thank you, ${state.name}.` : "Thank you."}{" "}
              {state?.type === "Meeting Attendance"
                ? "Your attendance has been submitted."
                : (
                    <>
                      Your <span className="font-medium text-foreground">{state?.type || "form"}</span> has been submitted successfully.
                    </>
                  )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
