import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BellRing, Check, ChevronsUpDown, MoreHorizontal, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { unwrapList } from "@/lib/api-unwrap";
import { apiError } from "@/lib/admin/ui-helpers";
import { isValidLink, type NotificationSource, type NotificationType } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import * as notificationService from "@/services/notificationService";
import * as userService from "@/services/userService";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";
import { PageHeader } from "@/components/admin/PageHeader";
import { useBreadcrumbs } from "@/components/admin/breadcrumbs";
import { DataCard, SearchInput } from "@/components/admin/DataCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge, type Tone } from "@/components/admin/StatusBadge";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { AdminPager } from "@/components/admin/AdminPager";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { FieldError } from "@/components/admin/FormDrawer";

export const Route = createFileRoute("/admin-dashboard/notifications")({
  component: NotificationsPage,
});

type Student = { _id: string; name?: string; email: string };
type SentNotification = {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  user: Student | null;
  audience: "all" | "student";
  source: NotificationSource;
  readCount?: number;
  createdAt: string;
};

const TYPES: { value: NotificationType; label: string; tone: Tone }[] = [
  { value: "info", label: "Info", tone: "info" },
  { value: "reminder", label: "Reminder", tone: "warning" },
  { value: "result", label: "Result", tone: "success" },
  { value: "offer", label: "Offer", tone: "info" },
  { value: "system", label: "System", tone: "neutral" },
];
const TYPE_BY_VALUE = Object.fromEntries(TYPES.map((t) => [t.value, t])) as Record<
  NotificationType,
  (typeof TYPES)[number]
>;

type Form = {
  title: string;
  message: string;
  type: NotificationType;
  recipient: Student | null;
  link: string;
};
const EMPTY: Form = { title: "", message: "", type: "info", recipient: null, link: "" };

const studentLabel = (s: Student) => (s.name ? `${s.name} (${s.email})` : s.email);

function NotificationsPage() {
  useBreadcrumbs([{ label: "Notifications" }]);
  const qc = useQueryClient();

  const [form, setForm] = useState<Form>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SentNotification | null>(null);
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { data: usersRes } = useQuery({
    queryKey: ["admin", "notify-students"],
    queryFn: () => userService.getAllUsers({ role: "student" }),
  });
  const students = unwrapList<Student>(usersRes);

  const sentQuery = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => notificationService.adminGetNotifications({ limit: 100 }),
  });
  const sent = unwrapList<SentNotification>(sentQuery.data);
  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(
    sent as unknown as Record<string, unknown>[],
    ["title", "message"],
  );
  const rows = paginated as unknown as SentNotification[];

  const errors = {
    title: form.title.trim() ? undefined : "Title is required",
    message: form.message.trim() ? undefined : "Message is required",
    link: isValidLink(form.link.trim())
      ? undefined
      : "Use a full https:// URL or a path starting with /",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (msg?: string) => (submitted ? msg : undefined);

  const sendMut = useMutation({
    mutationFn: () =>
      notificationService.adminSendNotification({
        userId: form.recipient?._id,
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        link: form.link.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(form.recipient ? "Notification sent" : "Notification sent to all students");
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setForm(EMPTY);
      setSubmitted(false);
    },
    onError: (e) => toast.error(apiError(e, "Could not send notification")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => notificationService.adminDeleteNotification(id),
    onSuccess: () => {
      toast.success("Notification deleted");
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(apiError(e, "Could not delete notification")),
  });

  const send = () => {
    setSubmitted(true);
    if (!hasErrors) sendMut.mutate();
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Send bell notifications to students and manage what has been sent."
      />

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="self-start rounded-xl border border-border bg-card p-5 shadow lg:sticky lg:top-20">
          <h2 className="text-base font-semibold">Compose</h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="n-title">Title *</Label>
              <Input
                id="n-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
              <FieldError>{show(errors.title)}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-message">Message *</Label>
              <Textarea
                id="n-message"
                rows={4}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
              />
              <FieldError>{show(errors.message)}</FieldError>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as NotificationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {form.recipient ? studentLabel(form.recipient) : "All students"}
                    </span>
                    <ChevronsUpDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search students…" />
                    <CommandList>
                      <CommandEmpty>No students found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__all__ all students"
                          onSelect={() => {
                            set("recipient", null);
                            setPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn("size-4", form.recipient ? "opacity-0" : "opacity-100")}
                          />
                          All students
                        </CommandItem>
                        {students.map((s) => (
                          <CommandItem
                            key={s._id}
                            value={`${s.name ?? ""} ${s.email} ${s._id}`}
                            onSelect={() => {
                              set("recipient", s);
                              setPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "size-4",
                                form.recipient?._id === s._id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="truncate">{studentLabel(s)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-link">Link (optional)</Label>
              <Input
                id="n-link"
                value={form.link}
                onChange={(e) => set("link", e.target.value)}
                placeholder="https://… or /dashboard/…"
              />
              <FieldError>{show(errors.link)}</FieldError>
            </div>
            <Button type="submit" className="w-full" disabled={sendMut.isPending}>
              <Send className="size-4" /> {sendMut.isPending ? "Sending…" : "Send notification"}
            </Button>
          </form>
        </section>

        <DataCard
          toolbar={
            <>
              <h2 className="text-base font-semibold">Sent</h2>
              <SearchInput value={search} onChange={setSearch} placeholder="Search sent…" />
            </>
          }
          footer={
            totalPages > 1 ? (
              <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />
            ) : undefined
          }
        >
          {!sentQuery.isLoading && rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={BellRing}
                title={search ? `No notifications match "${search}"` : "Nothing sent yet"}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Notification</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Read</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentQuery.isLoading ? (
                  <LoadingRows colSpan={6} />
                ) : (
                  rows.map((n) => {
                    const type = TYPE_BY_VALUE[n.type] ?? TYPE_BY_VALUE.info;
                    return (
                      <TableRow key={n._id}>
                        <TableCell className="max-w-[360px]">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{n.title}</span>
                            {n.source === "exam_alert" && (
                              <StatusBadge tone="neutral" dot={false}>
                                From exam alert
                              </StatusBadge>
                            )}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{n.message}</div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={type.tone}>{type.label}</StatusBadge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {n.user ? (
                            studentLabel(n.user)
                          ) : (
                            <span className="text-muted-foreground">All students</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                          {n.user ? "—" : `Read by ${n.readCount ?? 0}`}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${n.title}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setDeleteTarget(n)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </DataCard>
      </div>

      <ConfirmDeleteDialog
        mode="delete"
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        description="Delete this notification? It will disappear from every student's bell. This can't be undone."
        isPending={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget._id)}
      />
    </>
  );
}
