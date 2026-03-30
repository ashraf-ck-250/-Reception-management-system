import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, RefreshCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPublicStatusDesktopEnabled,
  setPublicStatusDesktopEnabled,
  requestNotificationPermission,
  isDesktopNotificationSupported,
  tryShowDesktopNotification
} from "@/lib/desktopNotifications";

export default function RequestStatus() {
  const { id } = useParams();
  const [data, setData] = useState<{ fullName: string; service: string; status: string; updatedAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusAlerts, setStatusAlerts] = useState(() => getPublicStatusDesktopEnabled());
  const prevStatusRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    prevStatusRef.current = undefined;
  }, [id]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await api.get(`/public/service-requests/${id}`);
        setData(response.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const s = data.status;
    const prev = prevStatusRef.current;
    if (prev === undefined) {
      prevStatusRef.current = s;
      return;
    }
    if (prev === "Pending" && (s === "Completed" || s === "Rejected")) {
      if (getPublicStatusDesktopEnabled() && isDesktopNotificationSupported() && Notification.permission === "granted") {
        const title = s === "Completed" ? "Service request accepted" : "Service request update";
        const body =
          s === "Completed"
            ? `Your request for "${data.service}" was accepted.`
            : `Your request for "${data.service}" was not accepted.`;
        tryShowDesktopNotification(title, { body, tag: `public-status-${id}` });
      }
    }
    prevStatusRef.current = s;
  }, [data, id]);

  useEffect(() => {
    if (!id || data?.status !== "Pending") return;
    const t = setInterval(() => {
      void load(true);
    }, 20000);
    return () => clearInterval(t);
  }, [id, data?.status, load]);

  const status = data?.status;
  const accepted = status === "Completed";
  const rejected = status === "Rejected";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-border shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Service Request Status</CardTitle>
          <CardDescription>Check the latest decision for your request</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm">Loading request status…</p>
            </div>
          ) : !data ? (
            <p className="text-sm text-muted-foreground text-center">Request not found.</p>
          ) : (
            <>
              {data.status === "Pending" && (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-left">
                  <Switch
                    id="status-desktop"
                    checked={statusAlerts}
                    onCheckedChange={async (on) => {
                      if (on) {
                        if (!isDesktopNotificationSupported()) {
                          toast.error("This browser does not support desktop notifications.");
                          return;
                        }
                        const p = await requestNotificationPermission();
                        if (p !== "granted") {
                          toast.error("Notifications were blocked. You can allow them in your browser settings.");
                          return;
                        }
                        setPublicStatusDesktopEnabled(true);
                        setStatusAlerts(true);
                        toast.success("We will notify this device when your request is reviewed.");
                      } else {
                        setPublicStatusDesktopEnabled(false);
                        setStatusAlerts(false);
                      }
                    }}
                  />
                  <Label htmlFor="status-desktop" className="text-sm font-normal leading-snug cursor-pointer">
                    Desktop alert when my request is accepted or rejected (works if you keep this site open or minimized)
                  </Label>
                </div>
              )}

              <div className="flex items-center justify-center">
                {accepted ? (
                  <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle className="text-success" size={32} />
                  </div>
                ) : rejected ? (
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="text-destructive" size={32} />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <RefreshCcw className="text-muted-foreground" size={28} />
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{data.fullName}</p>
                <p className="text-sm text-muted-foreground mt-2">Service</p>
                <p className="font-medium">{data.service}</p>
                <p className="text-sm text-muted-foreground mt-2">Status</p>
                <p className={`font-semibold ${accepted ? "text-success" : rejected ? "text-destructive" : "text-muted-foreground"}`}>
                  {data.status}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Updated: {new Date(data.updatedAt).toLocaleString()}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="flex-1" onClick={() => void load(true)} loading={refreshing}>
                  Refresh
                </Button>
                <Button variant="outline" className="flex-1 transition-opacity active:opacity-80" asChild>
                  <Link to="/service-request" className="transition-opacity active:opacity-80">
                    Submit again
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}