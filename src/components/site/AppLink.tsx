import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { isExternalLink, splitInAppLink } from "@/lib/notifications";

/** A notification/exam-alert link: http(s) opens a new tab, in-app paths use the router. */
export function AppLink({
  href,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  if (isExternalLink(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }
  const { to, search, hash } = splitInAppLink(href);
  return (
    <Link
      to={to as never}
      search={search as never}
      hash={hash}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
