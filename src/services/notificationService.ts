import axiosClient from "@/api/axiosClient";
import type { MyNotificationsPayload, NotificationType } from "@/lib/notifications";

export async function getMyNotifications(params?: {
  limit?: number;
}): Promise<MyNotificationsPayload> {
  const res = await axiosClient.get("/notifications/me", { params });
  return res.data;
}

export async function markNotificationRead(id: string) {
  const res = await axiosClient.patch(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await axiosClient.patch("/notifications/read-all");
  return res.data;
}

export async function adminSendNotification(data: {
  userId?: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}) {
  const res = await axiosClient.post("/admin/notifications", data);
  return res.data;
}

export async function adminGetNotifications(params?: { limit?: number }) {
  const res = await axiosClient.get("/admin/notifications", { params });
  return res.data;
}

export async function adminDeleteNotification(id: string) {
  const res = await axiosClient.delete(`/admin/notifications/${id}`);
  return res.data;
}
