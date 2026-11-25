import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Right-side drawer for create/edit forms: fixed header, scrolling body,
 * sticky footer. Asks before discarding unsaved changes when `dirty`.
 */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  dirty = false,
  onSubmit,
  onKeyDown,
  footer,
  children,
  width = "sm:max-w-xl",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  dirty?: boolean;
  onSubmit: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLFormElement>) => void;
  footer: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  const requestClose = (next: boolean) => {
    if (!next && dirty && !window.confirm("Discard unsaved changes?")) return;
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent className={cn("flex w-full flex-col gap-0 p-0", width)}>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onKeyDown={onKeyDown}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <SheetHeader className="border-b border-border px-6 py-4 text-left">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-6 py-3">
            {footer}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** Small uppercase heading used to group fields inside a drawer. */
export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-destructive">{children}</p>;
}
