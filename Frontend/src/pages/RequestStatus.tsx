import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import gov from "@/assets/gov.png";

type RequestStatusResponse = {
  id: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt?: string;
  decidedAt?: string | null;
};

function statusBadge(status: RequestStatusResponse["status"]) {
  switch (status) {
    case "Approved":
      return (
        <Badge className="bg-success/10 text-success border-0 hover:bg-success/20 inline-flex items-center gap-2 px-3 py-1">
          <CheckCircle size={16} />
          Approved
        </Badge>
      );
    case "Rejected":
      return (
        <Badge className="bg-destructive/10 text-destructive border-0 hover:bg-destructive/20 inline-flex items-center gap-2 px-3 py-1">
          <XCircle size={16} />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-warning/10 text-warning border-0 hover:bg-warning/20 inline-flex items-center gap-2 px-3 py-1">
          <Clock size={16} />
          Pending
        </Badge>
      );
  }
}

export default function RequestStatus() {
  const { id = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RequestStatusResponse | null>(null);
  const [error, setError] = useState<string>("");

  const safeId = useMemo(() => String(id || "").trim(), [id]);

  useEffect(() => {
    if (!safeId) {
      setError("Missing request id.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/visitor-requests/${encodeURIComponent(safeId)}/status`);
        if (cancelled) return;
        setData(res.data as RequestStatusResponse);
      } catch (e) {
        if (cancelled) return;
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Could not load your request status. Please check the link and try again.";
        setError(msg);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [safeId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center">
            <img src={gov} alt="RWANDA Goverment Logo" width={80} height={80} className="rounded-xl" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">ReceptionMS</h1>
            <p className="text-xs text-muted-foreground">Visitor Request Status</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-xl w-full border-border shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Your request status</CardTitle>
            <CardDescription className="space-y-2">
              <div className="text-sm">
                Request ID: <span className="font-mono text-foreground">{safeId || "-"}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                You might need this page later — take a screenshot and keep it for reference.
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading status…</div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive flex gap-3">
                <AlertCircle className="mt-0.5" size={18} />
                <div className="text-sm">{error}</div>
              </div>
            ) : data ? (
              <div className="flex flex-col items-center gap-3">
                {statusBadge(data.status)}
                <div className="text-sm text-muted-foreground text-center">
                  {data.status === "Pending"
                    ? "Your request has been submitted and is waiting for reception approval."
                    : data.status === "Approved"
                      ? "Your request has been approved. Please proceed as instructed by the reception staff."
                      : "Your request has been rejected. If you believe this is a mistake, please contact reception."}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">No data.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

