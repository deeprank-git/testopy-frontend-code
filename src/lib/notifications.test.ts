import { describe, it, expect } from "vitest";
import {
  badgeText,
  isExternalLink,
  isValidLink,
  markReadInPayload,
  timeAgo,
  type MyNotificationsPayload,
} from "./notifications";

describe("badgeText", () => {
  it("hides the badge at zero or below", () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(-1)).toBeNull();
  });
  it("shows the number up to 9, then 9+", () => {
    expect(badgeText(1)).toBe("1");
    expect(badgeText(9)).toBe("9");
    expect(badgeText(10)).toBe("9+");
    expect(badgeText(250)).toBe("9+");
  });
});

describe("isExternalLink", () => {
  it("is true only for http(s) URLs", () => {
    expect(isExternalLink("https://ssc.gov.in")).toBe(true);
    expect(isExternalLink("HTTP://x.org")).toBe(true);
    expect(isExternalLink("/dashboard/exam-alerts")).toBe(false);
    expect(isExternalLink("")).toBe(false);
    expect(isExternalLink(undefined)).toBe(false);
  });
});

describe("isValidLink (mirrors backend utils/isValidLink.js)", () => {
  it.each(["", undefined, "/dashboard/exam-alerts", "https://ssc.gov.in/a?b=1"])(
    "accepts %p",
    (v) => expect(isValidLink(v)).toBe(true),
  );
  it.each([
    "//evil.example",
    "javascript:alert(1)",
    "ftp://x.org",
    "dashboard",
    "https://has space",
  ])("rejects %p", (v) => expect(isValidLink(v)).toBe(false));
});

describe("timeAgo", () => {
  const now = Date.parse("2026-11-24T12:00:00.000Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();
  it("formats recent times", () => {
    expect(timeAgo(ago(20_000), now)).toBe("just now");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5m ago");
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("3h ago");
    expect(timeAgo(ago(2 * 86_400_000), now)).toBe("2d ago");
  });
  it("falls back to a short date after a week", () => {
    expect(timeAgo("2026-11-01T12:00:00.000Z", now)).toMatch(/Nov/);
  });
  it("treats future timestamps (clock skew) as just now", () => {
    expect(timeAgo(new Date(now + 60_000).toISOString(), now)).toBe("just now");
  });
});

describe("markReadInPayload", () => {
  const payload = (): MyNotificationsPayload => ({
    success: true,
    count: 3,
    unreadCount: 5, // more unread exist beyond this page
    data: [
      { _id: "a", title: "A", message: "", type: "info", isRead: false, createdAt: "" },
      { _id: "b", title: "B", message: "", type: "info", isRead: false, createdAt: "" },
      { _id: "c", title: "C", message: "", type: "info", isRead: true, createdAt: "" },
    ],
  });

  it("marks one notification read and decrements the count", () => {
    const next = markReadInPayload(payload(), "a")!;
    expect(next.data.map((n) => n.isRead)).toEqual([true, false, true]);
    expect(next.unreadCount).toBe(4);
  });
  it("leaves the count alone when the item was already read", () => {
    expect(markReadInPayload(payload(), "c")!.unreadCount).toBe(5);
  });
  it("marks everything read and zeroes the count when no id is given", () => {
    const next = markReadInPayload(payload())!;
    expect(next.data.every((n) => n.isRead)).toBe(true);
    expect(next.unreadCount).toBe(0);
  });
  it("passes undefined through", () => {
    expect(markReadInPayload(undefined, "a")).toBeUndefined();
  });
});
