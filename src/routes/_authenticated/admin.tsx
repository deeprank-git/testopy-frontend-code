import { createFileRoute, redirect } from "@tanstack/react-router";

// The old all-in-one admin panel was replaced by /admin-dashboard.
// Kept as a redirect so existing links and bookmarks still work.
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/admin-dashboard" });
  },
});
