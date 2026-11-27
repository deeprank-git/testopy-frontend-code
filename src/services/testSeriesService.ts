import axiosClient from "@/api/axiosClient";
import type { ImportantDates } from "@/lib/important-dates";

export async function getTestSeries(params?: {
  category?: string;
  isActive?: boolean;
  isPublished?: boolean;
}) {
  const res = await axiosClient.get("/test-series", { params });
  return res.data;
}

export async function getTestSeriesById(id: string) {
  const res = await axiosClient.get(`/test-series/${id}`);
  return res.data;
}

// Entries are exact { from, to }, { text }, or both — see lib/important-dates.ts.
export type { ImportantDates };

export type TestSeriesInput = {
  name: string;
  description: string;
  category: string;
  isPaid: boolean;
  price: number;
  marksPerQuestion: number;
  negativeMarking: boolean;
  negativeMarksPerQuestion: number;
  officialWebsite: string;
  applyLink: string;
  importantDates: ImportantDates;
  order?: number;
  imageFile?: File | null;
  notificationPdfFile?: File | null;
};

// Admin create/update are multipart (routes/testSeriesAdminRoutes.js reads
// `image` and `notificationPdf` files); importantDates travels as a JSON string.
function toSeriesFormData(input: Partial<TestSeriesInput> & { isPublished?: boolean }) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (
      value === undefined ||
      value === null ||
      key === "imageFile" ||
      key === "notificationPdfFile"
    )
      continue;
    fd.append(key, key === "importantDates" ? JSON.stringify(value) : String(value));
  }
  if (input.imageFile) fd.append("image", input.imageFile);
  if (input.notificationPdfFile) fd.append("notificationPdf", input.notificationPdfFile);
  return fd;
}

export async function createTestSeries(input: TestSeriesInput) {
  const res = await axiosClient.post("/admin/test-series", toSeriesFormData(input));
  return res.data;
}

export async function updateTestSeries(
  id: string,
  input: Partial<TestSeriesInput> & { isPublished?: boolean },
) {
  const res = await axiosClient.patch(`/admin/test-series/${id}`, toSeriesFormData(input));
  return res.data;
}

export async function restoreTestSeries(id: string) {
  const res = await axiosClient.patch(`/admin/test-series/${id}`, { isActive: true });
  return res.data;
}

export async function deleteTestSeries(id: string) {
  const res = await axiosClient.delete(`/admin/test-series/${id}`);
  return res.data;
}
