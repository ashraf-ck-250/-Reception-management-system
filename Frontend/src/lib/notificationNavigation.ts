export type NotificationPayload = {
  type: string;
  metadata?: Record<string, unknown>;
};

/** Matches dashboard stat cards: Pending / Completed / Rejected lists on Visitor Records → Service */
const SERVICE_STATUSES = new Set(["Pending", "Completed", "Rejected"]);

function recordsServicePath(serviceStatus: string | undefined, highlightId: string) {
  const params = new URLSearchParams();
  params.set("tab", "service");
  if (serviceStatus && SERVICE_STATUSES.has(serviceStatus)) {
    params.set("serviceStatus", serviceStatus);
  }
  if (highlightId) params.set("highlight", highlightId);
  const q = params.toString();
  return q ? `/records?${q}` : "/records";
}

function recordsAttendancePath(highlightId: string) {
  const params = new URLSearchParams();
  params.set("tab", "attendance");
  params.set("visitorPeriod", "today");
  if (highlightId) params.set("highlight", highlightId);
  return `/records?${params.toString()}`;
}

export function getNotificationNavigatePath(
  n: NotificationPayload,
  role: "admin" | "receptionist" | undefined
): string | null {
  const meta = n.metadata || {};
  const requestId = meta.requestId != null ? String(meta.requestId) : "";
  const attendanceId = meta.attendanceId != null ? String(meta.attendanceId) : "";
  const userId = meta.userId != null ? String(meta.userId) : "";
  const svcStatusRaw = meta.status != null ? String(meta.status) : "";

  switch (n.type) {
    case "new_service_request":
      if (!role) return null;
      return recordsServicePath(svcStatusRaw || "Pending", requestId);
    case "service_request_status":
      if (!role) return null;
      return recordsServicePath(SERVICE_STATUSES.has(svcStatusRaw) ? svcStatusRaw : undefined, requestId);
    case "visitor_check_in":
      if (!role) return null;
      return recordsAttendancePath(attendanceId);
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
