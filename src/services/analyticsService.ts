import axiosClient from "@/api/axiosClient";

export async function getOverview() {
  const res = await axiosClient.get("/admin/analytics/overview");
  return res.data;
}

export type TrendRange = "7d" | "30d" | "all";

/** Attempts started per day (7d/30d) or per month (all), zero-filled, oldest first. */
export async function getAttemptsTrend(range: TrendRange) {
  const res = await axiosClient.get("/admin/analytics/attempts-trend", { params: { range } });
  return res.data;
}
