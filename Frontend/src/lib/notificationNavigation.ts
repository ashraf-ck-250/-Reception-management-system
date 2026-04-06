export type NotificationPayload = {
  type: string;
  metadata?: Record<string, unknown>;
};

const SERVICE_STATUSES = new Set(["Pending", "Completed", "Rejected"]);

function recordsServicePath(serviceStatus: string | undefined, highlightId: string) {
  const params = new URLSearchParams();
  params.set("tab", "visitors");
  if (highlightId) params.set("highlight", highlightId);
  const q = params.toString();
  return q ? `/records?${q}` : "/records";
}

/** Legacy attendance notifications (old /attendance form); highlight id is an Attendance doc, not VisitorRequest. */
function recordsVisitorsTodayPath() {
  const params = new URLSearchParams();
  params.set("tab", "visitors");
  params.set("visitorPeriod", "today");
  return `/records?${params.toString()}`;
}

export function getNotificationNavigatePath(
  n: NotificationPayload,
  role: "admin" | "receptionist" | undefined
): string | null {
  const meta = n.metadata || {};
  const requestId = meta.requestId != null ? String(meta.requestId) : "";
  const userId = meta.userId != null ? String(meta.userId) : "";
  const svcStatusRaw = meta.status != null ? String(meta.status) : "";

  switch (n.type) {
    case "visitor_request_submitted":
    case "visitor_request_status":
      if (!role) return null;
      return recordsServicePath(svcStatusRaw || "Pending", requestId);
    case "new_service_request":
      if (!role) return null;
      return recordsServicePath(svcStatusRaw || "Pending", requestId);
    case "service_request_status":
      if (!role) return null;
      return recordsServicePath(SERVICE_STATUSES.has(svcStatusRaw) ? svcStatusRaw : undefined, requestId);
    case "visitor_check_in":
      if (!role) return null;
      return recordsVisitorsTodayPath();
    case "user_pending_approval":
      if (role !== "admin") return "/dashboard";
      if (userId) return `/user-management?highlight=${encodeURIComponent(userId)}`;
      return "/user-management";
    default:
      if (requestId && role) {
        return recordsServicePath(SERVICE_STATUSES.has(svcStatusRaw) ? svcStatusRaw : undefined, requestId);
      }
      return role ? "/dashboard" : null;
  }
}
