import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarClock, ExternalLink, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  ALERT_TYPES,
  ALERT_TYPE_META,
  alertStatus,
  formatAlertDate,
  type AlertType,
  type ExamAlert,
} from "@/lib/exam-alerts";
import { cn } from "@/lib/utils";
import * as examAlertService from "@/services/examAlertService";
import * as categoryService from "@/services/categoryService";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";
import { PageHeader } from "@/components/admin/PageHeader";
import { useBreadcrumbs } from "@/components/admin/breadcrumbs";
import { DataCard, SearchInput } from "@/components/admin/DataCard";
import { FilterChips } from "@/components/admin/FilterChips";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { AdminPager } from "@/components/admin/AdminPager";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { ExamAlertDrawer } from "@/components/admin/ExamAlertDrawer";

export const Route = createFileRoute("/admin-dashboard/exam-alerts")({
  component: ExamAlertsAdminPage,
});

type View = "active" | "archived";
type TypeFilter = "all" | AlertType;

function ExamAlertsAdminPage() {
  useBreadcrumbs([{ label: "Exam Alerts" }]);
  const qc = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ["admin", "exam-alerts"],
    queryFn: () => examAlertService.adminGetExamAlerts(),
  });
  const all = unwrapList<ExamAlert>(alertsQuery.data);

  const { data: categoriesRes } = useQuery({
    queryKey: ["admin", "exam-alert-categories"],
    queryFn: () => categoryService.getCategories(),
  });
  const categories = unwrapList<{ _id: string; name: string }>(categoriesRes);

  const [view, setView] = useState<View>("active");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [drawer, setDrawer] = useState<{ open: boolean; alert: ExamAlert | null }>({
    open: false,
    alert: null,
  });
  const [archiveTarget, setArchiveTarget] = useState<ExamAlert | null>(null);

  const active = useMemo(() => all.filter((a) => a.isActive !== false), [all]);
  const archivedCount = all.length - active.length;
  const upcomingCount = active.filter((a) => alertStatus(a) === "upcoming").length;

  const inView = useMemo(
    () =>
      all.filter(
        (a) =>
          (view === "archived" ? a.isActive === false : a.isActive !== false) &&
          (typeFilter === "all" || a.type === typeFilter),
      ),
    [all, view, typeFilter],
  );
  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(
    inView as unknown as Record<string, unknown>[],
    ["title"],
  );
  const rows = paginated as unknown as ExamAlert[];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "exam-alerts"] });
    qc.invalidateQueries({ queryKey: ["exam-alerts"] });
  };
  const archive = useMutation({
    mutationFn: (id: string) => examAlertService.adminArchiveExamAlert(id),
    onSuccess: () => {
      toast.success("Alert archived");
      invalidate();
      setArchiveTarget(null);
    },
    onError: (e) => toast.error(apiError(e, "Could not archive alert")),
  });
  const restore = useMutation({
    mutationFn: (id: string) => examAlertService.adminRestoreExamAlert(id),
    onSuccess: () => {
      toast.success("Alert restored");
      invalidate();
    },
    onError: (e) => toast.error(apiError(e, "Could not restore alert")),
  });

  const openCreate = () => setDrawer({ open: true, alert: null });

  return (
    <>
      <PageHeader
        title="Exam Alerts"
        description="Exam dates, registrations, admit cards and results shown to students."
        meta={
          <span>
            {upcomingCount} upcoming · {active.length} total
          </span>
        }
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> New alert
          </Button>
        }
      />

      <DataCard
        toolbar={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <FilterChips<TypeFilter>
                value={typeFilter}
                onChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All" },
                  ...ALERT_TYPES.map((t) => ({ value: t, label: ALERT_TYPE_META[t].chip })),
                ]}
              />
              <FilterChips<View>
                value={view}
                onChange={(v) => {
                  setView(v);
                  setPage(1);
                }}
                options={[
                  { value: "active", label: "Active", count: active.length },
                  { value: "archived", label: "Archived", count: archivedCount },
                ]}
              />
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search alerts…" />
          </>
        }
        footer={
          totalPages > 1 ? (
            <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : undefined
        }
      >
        {!alertsQuery.isLoading && rows.length === 0 ? (
          <div className="p-6">
            {search ? (
              <EmptyState icon={CalendarClock} title={`No alerts match "${search}"`} />
            ) : view === "archived" || typeFilter !== "all" ? (
              <EmptyState icon={CalendarClock} title="No alerts here" />
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="No exam alerts yet"
                description="Add exam dates, registration windows, admit cards and results for students."
                actions={
                  <Button onClick={openCreate}>
                    <Plus className="size-4" /> New alert
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[260px]">Alert</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertsQuery.isLoading ? (
                <LoadingRows colSpan={6} />
              ) : (
                rows.map((a) => {
                  const meta = ALERT_TYPE_META[a.type] ?? ALERT_TYPE_META.other;
                  const upcoming = alertStatus(a) === "upcoming";
                  const isActive = a.isActive !== false;
                  return (
                    <TableRow key={a._id} className={cn(!isActive && "opacity-60")}>
                      <TableCell className="max-w-[360px]">
                        <div className="font-medium">{a.title}</div>
                        {a.description && (
                          <div className="truncate text-xs text-muted-foreground">
                            {a.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                            meta.badge,
                          )}
                        >
                          {meta.chip}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">{formatAlertDate(a.date)}</span>
                          <StatusBadge tone={upcoming ? "success" : "neutral"} dot={false}>
                            {upcoming ? "Upcoming" : "Past"}
                          </StatusBadge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.category?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {a.link ? (
                          <a
                            href={a.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open link for ${a.title}`}
                            className="text-primary"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${a.title}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setDrawer({ open: true, alert: a })}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isActive ? (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setArchiveTarget(a)}
                              >
                                Archive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => restore.mutate(a._id)}>
                                Restore
                              </DropdownMenuItem>
                            )}
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

      <ExamAlertDrawer
        open={drawer.open}
        alert={drawer.alert}
        categories={categories}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
      />
      <ConfirmDeleteDialog
        mode="archive"
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        itemLabel={`"${archiveTarget?.title ?? ""}"`}
        isPending={archive.isPending}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget._id)}
      />
    </>
  );
}
