import axiosClient from "@/api/axiosClient";
import type { AlertType } from "@/lib/exam-alerts";

export type ExamAlertInput = {
  title: string;
  description?: string;
  type: AlertType;
  date: string; // YYYY-MM-DD
  category?: string | null;
  link?: string;
};

export async function getExamAlerts(params?: {
  type?: AlertType;
  category?: string;
  month?: string;
}) {
  const res = await axiosClient.get("/exam-alerts", { params });
  return res.data;
}

export async function adminGetExamAlerts() {
  const res = await axiosClient.get("/admin/exam-alerts");
  return res.data;
}

/** Response includes `notified: boolean`. */
export async function adminCreateExamAlert(input: ExamAlertInput & { notify: boolean }) {
  const res = await axiosClient.post("/admin/exam-alerts", input);
  return res.data as { success: boolean; data: unknown; notified: boolean };
}

export async function adminUpdateExamAlert(
  id: string,
  input: Partial<ExamAlertInput> & { notify?: boolean },
) {
  const res = await axiosClient.patch(`/admin/exam-alerts/${id}`, input);
  return res.data as { success: boolean; data: unknown; notified?: boolean };
}

export async function adminArchiveExamAlert(id: string) {
  const res = await axiosClient.delete(`/admin/exam-alerts/${id}`);
  return res.data;
}

export async function adminRestoreExamAlert(id: string) {
  const res = await axiosClient.patch(`/admin/exam-alerts/${id}`, { isActive: true });
  return res.data;
}
