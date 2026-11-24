import { useNavigate } from "@tanstack/react-router";
import { isExternalLink, splitInAppLink } from "@/lib/notifications";

/** Imperative twin of <AppLink> for click handlers (bell, Notifications page). */
export function useOpenLink() {
  const navigate = useNavigate();
  return (link?: string) => {
    if (!link) return;
    if (isExternalLink(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    const { to, search, hash } = splitInAppLink(link);
    navigate({ to: to as never, search: search as never, hash });
  };
}
