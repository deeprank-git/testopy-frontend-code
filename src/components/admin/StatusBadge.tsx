import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-400",
  info: "bg-primary/10 text-primary ring-primary/20",
  neutral: "bg-muted text-muted-foreground ring-border",
} as const;

export type Tone = keyof typeof TONES;

export function StatusBadge({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Published / Draft / Archived in one place so every level reads the same. */
export function PublishBadge({
  isActive = true,
  isPublished,
}: {
  isActive?: boolean;
  isPublished?: boolean;
}) {
  if (!isActive) return <StatusBadge tone="neutral">Archived</StatusBadge>;
  if (isPublished === undefined) return <StatusBadge tone="success">Active</StatusBadge>;
  return isPublished ? (
    <StatusBadge tone="success">Published</StatusBadge>
  ) : (
    <StatusBadge tone="warning">Draft</StatusBadge>
  );
}
