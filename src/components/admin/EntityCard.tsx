import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { colorFor } from "@/lib/admin/ui-helpers";
import { resolveMediaUrl } from "@/services/mediaService";

export type CardAction = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

/** Image card used for categories and test series in the Exams drill-down. */
export function EntityCard({
  href,
  title,
  image,
  subtitle,
  badges,
  actions,
  muted,
}: {
  href: string;
  title: string;
  image?: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: CardAction[];
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card shadow transition hover:-translate-y-0.5 hover:shadow-md",
        muted && "opacity-70",
      )}
    >
      <Link
        to={href as never}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          {image ? (
            <img
              src={resolveMediaUrl(image)}
              alt=""
              className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className={cn(
                "flex size-full items-center justify-center text-4xl font-semibold text-white",
                colorFor(title),
              )}
            >
              {title.trim().charAt(0).toUpperCase() || "?"}
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="truncate pr-6 font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          {badges && <div className="mt-3 flex flex-wrap gap-1.5">{badges}</div>}
        </div>
      </Link>
      {actions && actions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 size-8 bg-background/90 shadow-sm backdrop-blur"
              aria-label={`Actions for ${title}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((a) => (
              <DropdownMenuItem
                key={a.label}
                onSelect={a.onSelect}
                disabled={a.disabled}
                className={a.destructive ? "text-destructive focus:text-destructive" : undefined}
              >
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function NewEntityCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
    >
      <Plus className="size-7" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="aspect-[16/9] animate-pulse bg-muted" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
