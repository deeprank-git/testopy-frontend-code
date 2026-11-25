import axiosClient from "@/api/axiosClient";
import type { AlertStatus, AlertType, ExamAlert } from "@/lib/exam-alerts";

export type ExamAlertInput = {
  title: string;
  description?: string;
  type: AlertType;
  date: string; // YYYY-MM-DD
  category?: string | null;
  link?: string;
};

/** Without `page`, every match is returned; with it, one page plus total/totalPages. */
export async function getExamAlerts(params?: {
  type?: AlertType;
  category?: string;
  month?: string; // YYYY-MM
  monthOfYear?: string; // MM, any year
  status?: AlertStatus;
  today?: string; // YYYY-MM-DD, the viewer's day; used with status
  page?: number;
  limit?: number;
}) {
  const res = await axiosClient.get("/exam-alerts", { params });
  return res.data as {
    success: boolean;
    data: ExamAlert[];
    total?: number;
    page?: number;
    totalPages?: number;
  };
}

export type ExamAlertSummary = {
  total: number;
  upcomingExams: number;
  newThisWeek: number;
  /** Categories used by active alerts, archived ones included. */
  categories: { _id: string; name: string; slug?: string }[];
};

/** Header counts and filter categories for the student page. `today` = YYYY-MM-DD. */
export async function getExamAlertSummary(today: string) {
  const res = await axiosClient.get("/exam-alerts/summary", { params: { today } });
  return res.data.data as ExamAlertSummary;
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
