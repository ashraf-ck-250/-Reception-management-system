const STAFF_PREF_KEY = "receptionms:staffDesktopNotifications";
const PUBLIC_STATUS_PREF_KEY = "receptionms:publicStatusDesktop";

export const STAFF_DESKTOP_ENABLED_EVENT = "receptionms:staff-desktop-enabled";

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getStaffDesktopNotificationsEnabled(): boolean {
  try {
    return localStorage.getItem(STAFF_PREF_KEY) === "true";
  } catch {
    return false;
  }
}

export function setStaffDesktopNotificationsEnabled(value: boolean): void {
  try {
    if (value) localStorage.setItem(STAFF_PREF_KEY, "true");
    else localStorage.removeItem(STAFF_PREF_KEY);
  } catch {
    /* private mode */
  }
}

export function getPublicStatusDesktopEnabled(): boolean {
  try {
    return localStorage.getItem(PUBLIC_STATUS_PREF_KEY) === "true";
  } catch {
    return false;
  }
}

export function setPublicStatusDesktopEnabled(value: boolean): void {
  try {
    if (value) localStorage.setItem(PUBLIC_STATUS_PREF_KEY, "true");
    else localStorage.removeItem(PUBLIC_STATUS_PREF_KEY);
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return "denied";
  return Notification.requestPermission();
}

export function hasNotificationPermission(): boolean {
  return isDesktopNotificationSupported() && Notification.permission === "granted";
}

export function tryShowDesktopNotification(title: string, options?: NotificationOptions): void {
  if (!hasNotificationPermission()) return;
  try {
    new Notification(title, { silent: false, ...options });
  } catch {
    /* blocked or unsupported options */
  }
}
