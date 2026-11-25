import { Link } from "@tanstack/react-router";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";

export function NotFoundState({
  what,
  backHref,
  backLabel,
}: {
  what: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <EmptyState
      icon={SearchX}
      title={`${what} not found`}
      description="It may have been removed, or the link is wrong."
      actions={
        <Button asChild variant="outline">
          <Link to={backHref as never}>
            <ArrowLeft className="size-4" /> {backLabel}
          </Link>
        </Button>
      }
    />
  );
}
