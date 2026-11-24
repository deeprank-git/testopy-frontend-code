import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpenLink } from "@/hooks/use-open-link";
import { isNotFound } from "@/lib/admin/ui-helpers";
import {
  NOTIFICATION_FILTERS,
  filterToParams,
  notificationsSearchSchema,
  timeAgo,
  type MyNotification,
  type NotificationsFilter,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import * as notificationService from "@/services/notificationService";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  validateSearch: (s) => notificationsSearchSchema.parse(s),
  component: NotificationsPage,
});

const PAGE_SIZE = 20;
const TYPE_LABEL: Record<string, string> = {
  info: "Info",
  reminder: "Reminder",
  result: "Result",
  offer: "Offer",
  system: "System",
};

function NotificationsPage() {
  const { filter = "all", unread = false } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const openLink = useOpenLink();

  const setSearch = (next: { filter: NotificationsFilter; unread: boolean }) =>
    navigate({
      search: {
        filter: next.filter === "all" ? undefined : next.filter,
        unread: next.unread ? true : undefined,
      },
      replace: true,
    });

  const query = useInfiniteQuery({
    // Shares the "my-notifications" prefix with the bell, so invalidating it refreshes both.
    queryKey: ["my-notifications", "page", filter, unread],
    queryFn: ({ pageParam }) =>
      notificationService.getMyNotifications({
        ...filterToParams(filter, unread),
        limit: PAGE_SIZE,
        before: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.data.at(-1)?._id : undefined),
  });
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["my-notifications"] });
  const markOne = useMutation({
    mutationFn: (id: string) => notificationService.markNotificationRead(id),
    onError: (err) => {
      if (!isNotFound(err)) toast.error("Couldn't update notifications");
    },
    onSettled: invalidate,
  });
  const markAll = useMutation({
    mutationFn: () => notificationService.markAllNotificationsRead(),
    onError: () => toast.error("Couldn't update notifications"),
    onSettled: invalidate,
  });

  const open = (n: MyNotification) => {
    if (!n.isRead) markOne.mutate(n._id);
    openLink(n.link);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          Notifications <Bell className="h-5 w-5 text-primary" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything we've sent you, newest first.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter by type" className="flex flex-wrap gap-1.5">
          {NOTIFICATION_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setSearch({ filter: f.value, unread })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-1">
            {[false, true].map((u) => (
              <button
                key={String(u)}
                type="button"
                aria-pressed={unread === u}
                onClick={() => setSearch({ filter, unread: u })}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium",
                  unread === u ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {u ? "Unread" : "All"}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all as read
          </Button>
        </div>
      </div>

      <Card className="divide-y divide-border overflow-hidden">
        {query.isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}

        {query.isError && (
          <div className="space-y-3 p-12 text-center text-sm text-muted-foreground">
            <div>Couldn't load notifications</div>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {query.isSuccess && items.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {unread ? "You're all caught up" : "No notifications of this type"}
          </div>
        )}

        {items.map((n) => (
          <button
            key={n._id}
            type="button"
            onClick={() => open(n)}
            className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40"
          >
            <span
              aria-hidden
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", !n.isRead && "bg-primary")}
            />
            <div className="min-w-0 flex-1">
              <div className={cn("text-sm", !n.isRead && "font-semibold")}>{n.title}</div>
              <div className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{n.message}</div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">
                  {n.source === "exam_alert" ? "Exam alert" : (TYPE_LABEL[n.type] ?? "Info")}
                </Badge>
                {timeAgo(n.createdAt)}
              </div>
            </div>
          </button>
        ))}
      </Card>

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
