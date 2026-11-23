import type { ReactNode } from "react";
import { colorFor } from "@/lib/admin/ui-helpers";

export function PageHeader({
  title,
  description,
  meta,
  actions,
  media,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  media?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {media}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Square thumbnail for page headers: image if present, otherwise a coloured initial. */
export function HeaderMedia({ image, name }: { image?: string; name: string }) {
  return image ? (
    <img
      src={image}
      alt=""
      className="size-14 shrink-0 rounded-xl border border-border object-cover"
    />
  ) : (
    <div
      className={`flex size-14 shrink-0 items-center justify-center rounded-xl text-xl font-semibold text-white ${colorFor(name)}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}
