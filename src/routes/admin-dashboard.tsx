import { createFileRoute, redirect } from "@tanstack/react-router";
import { getToken, getUser } from "@/lib/auth-store";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin-dashboard")({
  ssr: false,
  beforeLoad: () => {
    const token = getToken();
    const user = getUser();
    if (!token || user?.role !== "admin") {
      throw redirect({ to: "/admin-login" });
    }
  },
  component: AdminShell,
});
