import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClipboardList, ExternalLink, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";
import { sectionTotals } from "@/lib/admin/exam-rules";
import { apiError, isNotFound } from "@/lib/admin/ui-helpers";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";
import { HeaderMedia, PageHeader } from "@/components/admin/PageHeader";
import { useBreadcrumbs } from "@/components/admin/breadcrumbs";
import { DataCard, SearchInput } from "@/components/admin/DataCard";
import { FilterChips } from "@/components/admin/FilterChips";
import { EmptyState } from "@/components/admin/EmptyState";
import { NotFoundState } from "@/components/admin/NotFoundState";
import { PublishBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { AdminPager } from "@/components/admin/AdminPager";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { SeriesDrawer, type Series } from "@/components/admin/exams/SeriesDrawer";
import { TestDrawer } from "@/components/admin/exams/TestDrawer";
import type { AdminTest } from "@/components/admin/exams/types";

export const Route = createFileRoute("/admin-dashboard/exams/$categoryId/$seriesId/")({
  component: SeriesPage,
});

type View = "all" | "published" | "draft" | "archived";

const matchesView = (t: AdminTest, view: View) => {
  const active = t.isActive !== false;
  if (view === "archived") return !active;
  if (!active) return false;
  if (view === "published") return !!t.isPublished;
  if (view === "draft") return !t.isPublished;
  return true;
};

const plannedQuestions = (t: AdminTest) => sectionTotals(t.sections ?? []).questions;
const isComplete = (t: AdminTest) =>
  (t.totalQuestions ?? 0) >= plannedQuestions(t) && plannedQuestions(t) > 0;

const formatMonthYear = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";

function SeriesPage() {
  const { categoryId, seriesId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const categoryQuery = useQuery({
    queryKey: ["admin", "category", categoryId],
    queryFn: () => categoryService.getCategoryById(categoryId),
  });
  const category = unwrapItem<{ name: string }>(categoryQuery.data);

  const seriesQuery = useQuery({
    queryKey: ["admin", "seriesItem", seriesId],
    queryFn: () => testSeriesService.getTestSeriesById(seriesId),
    retry: (count, e) => !isNotFound(e) && count < 2,
  });
  const series = unwrapItem<Series>(seriesQuery.data);

  const testsQuery = useQuery({
    queryKey: ["admin", "tests", { seriesId }],
    queryFn: () => testService.getTests({ testSeries: seriesId }),
  });
  const allTests = unwrapList<AdminTest>(testsQuery.data);

  useBreadcrumbs([
    { label: "Exams", href: "/admin-dashboard/exams" },
    { label: category?.name ?? "…", href: `/admin-dashboard/exams/${categoryId}` },
    { label: series?.name ?? "…" },
  ]);

  const [view, setView] = useState<View>("all");
  const [seriesDrawer, setSeriesDrawer] = useState(false);
  const [testDrawer, setTestDrawer] = useState<{ open: boolean; testId?: string }>({ open: false });
  const [archiveTarget, setArchiveTarget] = useState<AdminTest | null>(null);

  const counts = useMemo(
    () => ({
      all: allTests.filter((t) => matchesView(t, "all")).length,
      published: allTests.filter((t) => matchesView(t, "published")).length,
      draft: allTests.filter((t) => matchesView(t, "draft")).length,
      archived: allTests.filter((t) => matchesView(t, "archived")).length,
    }),
    [allTests],
  );
  const inView = useMemo(() => allTests.filter((t) => matchesView(t, view)), [allTests, view]);
  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(
    inView as unknown as Record<string, unknown>[],
    ["title"],
  );
  const rows = paginated as unknown as AdminTest[];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "tests", { seriesId }] });
    qc.invalidateQueries({ queryKey: ["admin", "series", { categoryId }] });
    qc.invalidateQueries({ queryKey: ["admin", "seriesItem", seriesId] });
  };
  const onError = (fallback: string) => (e: unknown) => toast.error(apiError(e, fallback));

  const toggleSeriesPublish = useMutation({
    mutationFn: () =>
      testSeriesService.updateTestSeries(seriesId, { isPublished: !series?.isPublished }),
    onSuccess: () => {
      toast.success(series?.isPublished ? "Series unpublished" : "Series published");
      invalidate();
    },
    onError: onError("Could not update series"),
  });
  const toggleTestPublish = useMutation({
    mutationFn: (t: AdminTest) => testService.updateTest(t._id, { isPublished: !t.isPublished }),
    onSuccess: (_d, t) => {
      toast.success(t.isPublished ? "Test unpublished" : "Test published");
      invalidate();
      qc.invalidateQueries({ queryKey: ["admin", "test", t._id] });
    },
    onError: onError("Could not update test"),
  });
  const archive = useMutation({
    mutationFn: (id: string) => testService.deleteTest(id),
    onSuccess: () => {
      toast.success("Test archived");
      invalidate();
      setArchiveTarget(null);
    },
    onError: onError("Could not archive test"),
  });
  const restore = useMutation({
    mutationFn: (id: string) => testService.restoreTest(id),
    onSuccess: () => {
      toast.success("Test restored — it stays unpublished until you publish it");
      invalidate();
    },
    onError: onError("Could not restore test"),
  });

  if (seriesQuery.isError && isNotFound(seriesQuery.error)) {
    return (
      <NotFoundState
        what="Test series"
        backHref={`/admin-dashboard/exams/${categoryId}`}
        backLabel={`Back to ${category?.name ?? "category"}`}
      />
    );
  }

  const openTest = (t: AdminTest) =>
    navigate({
      to: "/admin-dashboard/exams/$categoryId/$seriesId/$testId",
      params: { categoryId, seriesId, testId: t._id },
    });

  const links = [
    { href: series?.officialWebsite, label: "Website" },
    { href: series?.applyLink, label: "Apply" },
    { href: series?.notificationPdf, label: "Notification PDF" },
  ].filter((l) => !!l.href);

  return (
    <>
      {series ? (
        <PageHeader
          media={<HeaderMedia image={series.image} name={series.name} />}
          title={series.name}
          description={series.description}
          meta={
            <>
              <PublishBadge isActive={series.isActive !== false} isPublished={series.isPublished} />
              <StatusBadge tone={series.isPaid ? "info" : "neutral"} dot={false}>
                {series.isPaid ? `₹${series.price ?? 0}` : "Free"}
              </StatusBadge>
              <StatusBadge tone="neutral" dot={false}>
                +{series.marksPerQuestion ?? 1} / −
                {series.negativeMarking ? (series.negativeMarksPerQuestion ?? 0) : 0} per question
              </StatusBadge>
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {l.label} <ExternalLink className="size-3" />
                </a>
              ))}
            </>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => setSeriesDrawer(true)}>
                <Pencil className="size-4" /> Edit series
              </Button>
              {series.isActive !== false && (
                <Button
                  variant="outline"
                  onClick={() => toggleSeriesPublish.mutate()}
                  disabled={toggleSeriesPublish.isPending}
                >
                  {series.isPublished ? "Unpublish" : "Publish"}
                </Button>
              )}
              <Button onClick={() => setTestDrawer({ open: true })}>
                <Plus className="size-4" /> New test
              </Button>
            </>
          }
        />
      ) : (
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="size-14 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      )}

      <DataCard
        toolbar={
          <>
            <FilterChips<View>
              value={view}
              onChange={(v) => {
                setView(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "published", label: "Published", count: counts.published },
                { value: "draft", label: "Draft", count: counts.draft },
                { value: "archived", label: "Archived", count: counts.archived },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search tests…" />
          </>
        }
        footer={
          totalPages > 1 ? (
            <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : undefined
        }
      >
        {!testsQuery.isLoading && rows.length === 0 ? (
          <div className="p-6">
            {search ? (
              <EmptyState icon={ClipboardList} title={`No tests match "${search}"`} />
            ) : view !== "all" ? (
              <EmptyState icon={ClipboardList} title={`No ${view} tests`} />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No tests in this series yet"
                description="Add a mock test or previous-year paper, then fill its sections with questions."
                actions={
                  <Button onClick={() => setTestDrawer({ open: true })}>
                    <Plus className="size-4" /> New test
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Test</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Sections</TableHead>
                <TableHead className="min-w-[150px]">Questions</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testsQuery.isLoading ? (
                <LoadingRows colSpan={8} />
              ) : (
                rows.map((t) => {
                  const planned = plannedQuestions(t);
                  const filled = t.totalQuestions ?? 0;
                  const active = t.isActive !== false;
                  return (
                    <TableRow key={t._id} className="cursor-pointer" onClick={() => openTest(t)}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {t.paperType === "previous_year"
                          ? `PYQ${t.examDate ? ` · ${formatMonthYear(t.examDate)}` : ""}`
                          : "Mock"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.sections?.length ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-sm tabular-nums">
                            {filled}/{planned}
                          </span>
                          <Progress
                            value={planned ? Math.min(100, (filled / planned) * 100) : 0}
                            className="h-1.5 w-20"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {t.duration ?? 0} min
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(t.attemptsCount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <PublishBadge isActive={active} isPublished={t.isPublished} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${t.title}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openTest(t)}>
                              Manage questions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setTestDrawer({ open: true, testId: t._id })}
                            >
                              Edit details
                            </DropdownMenuItem>
                            {active && (
                              <DropdownMenuItem
                                disabled={!t.isPublished && !isComplete(t)}
                                onSelect={() => toggleTestPublish.mutate(t)}
                              >
                                {t.isPublished
                                  ? "Unpublish"
                                  : isComplete(t)
                                    ? "Publish"
                                    : "Publish (incomplete)"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {active ? (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setArchiveTarget(t)}
                              >
                                Archive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => restore.mutate(t._id)}>
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

      {series && (
        <SeriesDrawer
          open={seriesDrawer}
          onOpenChange={setSeriesDrawer}
          categoryId={categoryId}
          series={series}
        />
      )}
      <TestDrawer
        open={testDrawer.open}
        testId={testDrawer.testId}
        seriesId={seriesId}
        categoryId={categoryId}
        onOpenChange={(open) => setTestDrawer((d) => ({ ...d, open }))}
      />
      <ConfirmDeleteDialog
        mode="archive"
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        itemLabel={`"${archiveTarget?.title ?? ""}"`}
        description={`Archive "${archiveTarget?.title ?? ""}"? It will be unpublished and hidden from students. Past attempts are kept. You can restore it from the Archived filter.`}
        isPending={archive.isPending}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget._id)}
      />
    </>
  );
}
