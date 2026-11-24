import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useOpenLink } from "@/hooks/use-open-link";
import { isNotFound } from "@/lib/admin/ui-helpers";
import {
  badgeText,
  markReadInPayload,
  timeAgo,
  type MyNotification,
  type MyNotificationsPayload,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import * as notificationService from "@/services/notificationService";

// The Notifications page shares the "my-notifications" prefix; invalidating it refreshes both.
const QUERY_KEY = ["my-notifications", "bell"] as const;
const PREFIX = ["my-notifications"] as const;
type Ctx = { previous?: MyNotificationsPayload };

/** Bell + dropdown used by the public navbar and the student dashboard header. */
export function NotificationBell() {
  const { user } = useAuth();
  const openLink = useOpenLink();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationService.getMyNotifications({ limit: 10 }),
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000,
  });

  // Optimistic update shared by "mark one" (id) and "mark all" (no id).
  const applyOptimistic = async (id?: string): Promise<Ctx> => {
    await qc.cancelQueries({ queryKey: QUERY_KEY });
    const previous = qc.getQueryData<MyNotificationsPayload>(QUERY_KEY);
    qc.setQueryData(QUERY_KEY, markReadInPayload(previous, id));
    return { previous };
  };
  const rollback = (err: unknown, ctx?: Ctx) => {
    // Admin deleted it meanwhile — keep it looking read; the refetch drops it.
    if (isNotFound(err)) return;
    qc.setQueryData(QUERY_KEY, ctx?.previous);
    toast.error("Couldn't update notifications");
  };
  const refetch = () => qc.invalidateQueries({ queryKey: PREFIX });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationService.markNotificationRead(id),
    onMutate: (id) => applyOptimistic(id),
    onError: (err, _id, ctx) => rollback(err, ctx),
    onSettled: refetch,
  });
  const markAll = useMutation({
    mutationFn: () => notificationService.markAllNotificationsRead(),
    onMutate: () => applyOptimistic(),
    onError: (err, _v, ctx) => rollback(err, ctx),
    onSettled: refetch,
  });

  if (!user) return null;

  const notifications = query.data?.data ?? [];
  const unread = query.data?.unreadCount ?? 0;
  const badge = query.isError ? null : badgeText(unread);

  const openNotification = (n: MyNotification) => {
    if (!n.isRead) markOne.mutate(n._id);
    openLink(n.link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative"
          aria-label={badge ? `Notifications, ${badge} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {badge && (
            <span className="absolute right-1 top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-white">
              {badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span>Notifications</span>
          <div className="flex items-center gap-1">
            <Link
              to="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="rounded px-2 text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={unread === 0 || markAll.isPending}
              onClick={(e) => {
                e.preventDefault();
                markAll.mutate();
              }}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all as read
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-96 overflow-y-auto py-1">
          {query.isLoading && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</div>
          )}
          {query.isError && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Couldn't load notifications
            </div>
          )}
          {query.isSuccess && notifications.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              You're all caught up
            </div>
          )}
          {notifications.map((n) => (
            <DropdownMenuItem
              key={n._id}
              onSelect={() => openNotification(n)}
              className="mx-1 flex items-start gap-2 whitespace-normal py-2"
            >
              <span
                aria-hidden
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", !n.isRead && "bg-primary")}
              />
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm", !n.isRead && "font-semibold")}>{n.title}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{n.message}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {timeAgo(n.createdAt)}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
