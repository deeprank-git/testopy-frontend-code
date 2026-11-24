// Pure helpers for the student notification bell and the admin notification
// pages. Kept out of .tsx files so they can be unit-tested and so React fast
// refresh keeps working.

export type NotificationType = "info" | "reminder" | "result" | "offer" | "system";

export type MyNotification = {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

/** Shape of GET /notifications/me. `unreadCount` covers all notifications, not just `data`. */
export type MyNotificationsPayload = {
  success?: boolean;
  count?: number;
  unreadCount: number;
  data: MyNotification[];
};

/** Where exam-alert broadcasts point; the admin list tags rows with this link. */
export const EXAM_ALERTS_PATH = "/dashboard/exam-alerts";

/** Bell badge text: null hides the badge. */
export function badgeText(unread: number): string | null {
  if (!unread || unread <= 0) return null;
  return unread > 9 ? "9+" : String(unread);
}

export function isExternalLink(link?: string | null): boolean {
  return !!link && /^https?:\/\//i.test(link);
}

/** Same rule as the backend's utils/isValidLink.js. */
export function isValidLink(link?: string | null): boolean {
  if (!link) return true;
  if (/^https?:\/\/\S+$/i.test(link)) return true;
  return link.startsWith("/") && !link.startsWith("//");
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Optimistic update for the cached /notifications/me payload.
 * With `id`: mark that one read. Without: mark everything read.
 */
export function markReadInPayload(
  payload: MyNotificationsPayload | undefined,
  id?: string,
): MyNotificationsPayload | undefined {
  if (!payload) return payload;
  let changed = 0;
  const data = payload.data.map((n) => {
    if (n.isRead || (id !== undefined && n._id !== id)) return n;
    changed += 1;
    return { ...n, isRead: true };
  });
  const unreadCount = id === undefined ? 0 : Math.max(0, payload.unreadCount - changed);
  return { ...payload, data, unreadCount };
}
