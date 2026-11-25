import { createFileRoute, redirect } from "@tanstack/react-router";

// Replaced by the Exams drill-down. Kept so old bookmarks still work.
export const Route = createFileRoute("/admin-dashboard/questions")({
  beforeLoad: () => {
    throw redirect({ to: "/admin-dashboard/exams" });
  },
});
