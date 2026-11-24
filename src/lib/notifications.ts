// Pure helpers for the student notification bell and the admin notification
// pages. Kept out of .tsx files so they can be unit-tested and so React fast
// refresh keeps working.

import { z } from "zod";

export const NOTIFICATION_TYPES = ["info", "reminder", "result", "offer", "system"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationSource = "manual" | "exam_alert";

export type MyNotification = {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  source?: NotificationSource;
  createdAt: string;
};

/** Shape of GET /notifications/me. `unreadCount` covers all notifications, not just `data`. */
export type MyNotificationsPayload = {
  success?: boolean;
  count?: number;
  unreadCount: number;
  hasMore?: boolean;
  data: MyNotification[];
};

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

/** "/x?y=1#h" → router-ready parts, so in-app links keep their query string. */
export function splitInAppLink(link: string): {
  to: string;
  search: Record<string, string>;
  hash: string | undefined;
} {
  const url = new URL(link, "http://in-app.local");
  return {
    to: url.pathname,
    search: Object.fromEntries(url.searchParams),
    hash: url.hash ? url.hash.slice(1) : undefined,
  };
}

/** Chips on the student Notifications page. "exam_alert" is a source, the rest are types. */
export type NotificationsFilter = "all" | NotificationType | "exam_alert";

export const NOTIFICATION_FILTERS: { value: NotificationsFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "info", label: "Info" },
  { value: "reminder", label: "Reminder" },
  { value: "result", label: "Result" },
  { value: "offer", label: "Offer" },
  { value: "system", label: "System" },
  { value: "exam_alert", label: "Exam alert" },
];

export const notificationsSearchSchema = z.object({
  filter: z.enum([...NOTIFICATION_TYPES, "exam_alert"]).optional().catch(undefined),
  unread: z.literal(true).optional().catch(undefined),
});

export function filterToParams(
  filter: NotificationsFilter,
  unread: boolean,
): { type?: NotificationType; source?: NotificationSource; unread?: 1 } {
  return {
    ...(filter === "exam_alert" ? { source: "exam_alert" as const } : {}),
    ...(filter !== "all" && filter !== "exam_alert" ? { type: filter } : {}),
    ...(unread ? { unread: 1 as const } : {}),
  };
}
