import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, ListChecks, MoreHorizontal, Pencil, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";
import {
  OPTION_LETTERS,
  canPublishTest,
  sectionFill,
  sectionTotals,
  type FillStatus,
} from "@/lib/admin/exam-rules";
import { apiError, isNotFound } from "@/lib/admin/ui-helpers";
import { cn } from "@/lib/utils";
import * as categoryService from "@/services/categoryService";
import * as questionService from "@/services/questionService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";
import { PageHeader } from "@/components/admin/PageHeader";
import { useBreadcrumbs } from "@/components/admin/breadcrumbs";
import { DataCard, SearchInput } from "@/components/admin/DataCard";
import { FilterChips } from "@/components/admin/FilterChips";
import { EmptyState } from "@/components/admin/EmptyState";
import { NotFoundState } from "@/components/admin/NotFoundState";
import { PublishBadge, StatusBadge, type Tone } from "@/components/admin/StatusBadge";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { AdminPager } from "@/components/admin/AdminPager";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { TestDrawer } from "@/components/admin/exams/TestDrawer";
import { QuestionDrawer, type QuestionDrawerMode } from "@/components/admin/exams/QuestionDrawer";
import { BulkUploadDialog } from "@/components/admin/exams/BulkUploadDialog";
import type { AdminQuestion, AdminTest, TestSection } from "@/components/admin/exams/types";

export const Route = createFileRoute("/admin-dashboard/exams/$categoryId/$seriesId/$testId")({
  component: TestPage,
});

type View = "active" | "archived";
const ALL = "all";

const FILL_TONE: Record<FillStatus, Tone> = {
  empty: "warning",
  partial: "warning",
  full: "success",
  over: "danger",
};

function TestPage() {
  const { categoryId, seriesId, testId } = Route.useParams();
  const qc = useQueryClient();

  const category = unwrapItem<{ name: string }>(
    useQuery({
      queryKey: ["admin", "category", categoryId],
      queryFn: () => categoryService.getCategoryById(categoryId),
    }).data,
  );
  const series = unwrapItem<{ name: string }>(
    useQuery({
      queryKey: ["admin", "seriesItem", seriesId],
      queryFn: () => testSeriesService.getTestSeriesById(seriesId),
    }).data,
  );
  const testQuery = useQuery({
    queryKey: ["admin", "test", testId],
    queryFn: () => testService.getTestById(testId),
    retry: (count, e) => !isNotFound(e) && count < 2,
  });
  const test = unwrapItem<AdminTest>(testQuery.data);

  const questionsQuery = useQuery({
    queryKey: ["admin", "questions", { testId }],
    queryFn: () => questionService.getQuestionsAdmin(testId),
  });
  const questions = useMemo(
    () =>
      unwrapList<AdminQuestion>(questionsQuery.data)
        .map((q) => ({ ...q, section: String(q.section) }))
        .sort(
          (a, b) =>
            (a.order ?? 0) - (b.order ?? 0) ||
            String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
        ),
    [questionsQuery.data],
  );

  useBreadcrumbs([
    { label: "Exams", href: "/admin-dashboard/exams" },
    { label: category?.name ?? "…", href: `/admin-dashboard/exams/${categoryId}` },
    { label: series?.name ?? "…", href: `/admin-dashboard/exams/${categoryId}/${seriesId}` },
    { label: test?.title ?? "…" },
  ]);

  const sections: TestSection[] = useMemo(() => test?.sections ?? [], [test]);
  const sectionNames = useMemo(() => new Map(sections.map((s) => [s._id, s.name])), [sections]);
  const fill = useMemo(() => sectionFill(sections, questions), [sections, questions]);
  const publish = canPublishTest(sections, questions);
  const activeCount = questions.filter((q) => q.isActive !== false).length;
  const planned = sectionTotals(sections).questions;

  const [tab, setTab] = useState<string>(ALL);
  const [view, setView] = useState<View>("active");
  const [testDrawer, setTestDrawer] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: QuestionDrawerMode }>({
    open: false,
    mode: { kind: "create", section: "" },
  });
  const [archiveTarget, setArchiveTarget] = useState<AdminQuestion | null>(null);

  // Default to the first section once the test has loaded.
  useEffect(() => {
    if (tab === ALL && sections.length > 0 && !sections.some((s) => s._id === tab)) {
      setTab(sections[0]._id);
    }
    // Only on first load of sections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);

  const inTab = useMemo(
    () =>
      questions
        .filter((q) => (view === "active" ? q.isActive !== false : q.isActive === false))
        .filter((q) => tab === ALL || q.section === tab),
    [questions, view, tab],
  );
  const archivedCount = questions.filter((q) => q.isActive === false).length;
  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(
    inTab as unknown as Record<string, unknown>[],
    ["questionText"],
    25,
  );
  const rows = paginated as unknown as AdminQuestion[];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "questions", { testId }] });
    qc.invalidateQueries({ queryKey: ["admin", "test", testId] });
    qc.invalidateQueries({ queryKey: ["admin", "tests", { seriesId }] });
  };
  const onError = (fallback: string) => (e: unknown) => toast.error(apiError(e, fallback));

  const togglePublish = useMutation({
    mutationFn: () => testService.updateTest(testId, { isPublished: !test?.isPublished }),
    onSuccess: () => {
      toast.success(test?.isPublished ? "Test unpublished" : "Test published");
      invalidate();
    },
    onError: onError("Could not update test"),
  });
  const archive = useMutation({
    mutationFn: (id: string) => questionService.deleteQuestion(id),
    onSuccess: () => {
      toast.success("Question archived");
      invalidate();
      setArchiveTarget(null);
    },
    onError: onError("Could not archive question"),
  });
  const restore = useMutation({
    mutationFn: (id: string) => questionService.restoreQuestion(id),
    onSuccess: () => {
      toast.success("Question restored");
      invalidate();
    },
    onError: onError("Could not restore question"),
  });

  if (testQuery.isError && isNotFound(testQuery.error)) {
    return (
      <NotFoundState
        what="Test"
        backHref={`/admin-dashboard/exams/${categoryId}/${seriesId}`}
        backLabel={`Back to ${series?.name ?? "series"}`}
      />
    );
  }

  const currentSection = tab !== ALL ? tab : (sections[0]?._id ?? "");
  const openCreate = (copyFrom?: AdminQuestion) =>
    setDrawer({
      open: true,
      mode: { kind: "create", section: copyFrom?.section ?? currentSection, copyFrom },
    });
  const openEdit = (q: AdminQuestion) =>
    setDrawer({ open: true, mode: { kind: "edit", question: q } });

  const testActive = test?.isActive !== false;
  const publishButton = test?.isPublished ? (
    <Button
      variant="outline"
      onClick={() => togglePublish.mutate()}
      disabled={togglePublish.isPending}
    >
      Unpublish
    </Button>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span keeps the tooltip working while the button is disabled */}
        <span tabIndex={publish.ok ? -1 : 0}>
          <Button
            variant="outline"
            onClick={() => togglePublish.mutate()}
            disabled={!publish.ok || togglePublish.isPending}
          >
            Publish
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {publish.ok ? "Make this test visible to students" : publish.reason}
      </TooltipContent>
    </Tooltip>
  );

  const showSectionColumn = tab === ALL;
  const colSpan = showSectionColumn ? 7 : 6;
  const tabName = tab === ALL ? "this test" : (sectionNames.get(tab) ?? "this section");

  return (
    <>
      {test ? (
        <PageHeader
          title={test.title}
          meta={
            <>
              <PublishBadge isActive={testActive} isPublished={test.isPublished} />
              <StatusBadge tone="neutral" dot={false}>
                {test.paperType === "previous_year" ? "Previous year" : "Mock"}
              </StatusBadge>
              <span className="tabular-nums">
                {test.duration ?? 0} min · {activeCount}/{planned} questions ·{" "}
                {test.totalMarks ?? 0} marks · {(test.attemptsCount ?? 0).toLocaleString()} attempts
              </span>
            </>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => setTestDrawer(true)}>
                <Pencil className="size-4" /> Edit test
              </Button>
              {testActive && publishButton}
              <Button
                variant="outline"
                onClick={() => setBulkOpen(true)}
                disabled={!sections.length}
              >
                <Upload className="size-4" /> Bulk upload
              </Button>
              <Button onClick={() => openCreate()} disabled={!sections.length}>
                <Plus className="size-4" /> Add question
              </Button>
            </>
          }
        />
      ) : (
        <div className="mb-6 space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
      )}

      {sections.length > 0 && (
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          className="mb-4"
        >
          <div className="overflow-x-auto">
            <TabsList className="h-auto w-max justify-start gap-1 p-1">
              {fill.map((f) => (
                <TabsTrigger key={f.id} value={f.id} className="gap-2 px-3 py-1.5">
                  {f.name}
                  <StatusBadge tone={FILL_TONE[f.status]} dot={false} className="tabular-nums">
                    {f.filled}/{f.planned}
                  </StatusBadge>
                </TabsTrigger>
              ))}
              <TabsTrigger value={ALL} className="gap-2 px-3 py-1.5">
                All
                <StatusBadge tone="neutral" dot={false} className="tabular-nums">
                  {activeCount}
                </StatusBadge>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
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
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived", count: archivedCount },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search questions…" />
          </>
        }
        footer={
          totalPages > 1 ? (
            <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : undefined
        }
      >
        {!questionsQuery.isLoading && rows.length === 0 ? (
          <div className="p-6">
            {search ? (
              <EmptyState icon={ListChecks} title={`No questions match "${search}"`} />
            ) : view === "archived" ? (
              <EmptyState icon={ListChecks} title="No archived questions here" />
            ) : sections.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="This test has no sections"
                description="Add sections to the test before adding questions."
                actions={
                  <Button onClick={() => setTestDrawer(true)}>
                    <Pencil className="size-4" /> Edit test
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ListChecks}
                title={`No questions in ${tabName} yet`}
                description="Add them one by one, or upload many at once from a CSV file."
                actions={
                  <>
                    <Button onClick={() => openCreate()}>
                      <Plus className="size-4" /> Add question
                    </Button>
                    <Button variant="outline" onClick={() => setBulkOpen(true)}>
                      <Upload className="size-4" /> Bulk upload CSV
                    </Button>
                  </>
                }
              />
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">#</TableHead>
                <TableHead className="min-w-[280px]">Question</TableHead>
                {showSectionColumn && <TableHead>Section</TableHead>}
                <TableHead className="text-center">Answer</TableHead>
                <TableHead className="text-right">Marks</TableHead>
                <TableHead className="text-center">Explanation</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionsQuery.isLoading ? (
                <LoadingRows colSpan={colSpan} />
              ) : (
                rows.map((q) => {
                  const active = q.isActive !== false;
                  return (
                    <TableRow
                      key={q._id}
                      className={cn("cursor-pointer", !active && "opacity-60")}
                      onClick={() => openEdit(q)}
                    >
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {(q.order ?? 0) + 1}
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 max-w-2xl">{q.questionText}</p>
                      </TableCell>
                      {showSectionColumn && (
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {sectionNames.get(q.section) ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <span className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {OPTION_LETTERS[q.correctAnswer] ?? "?"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{q.marks ?? 1}</TableCell>
                      <TableCell className="text-center">
                        {q.explanation?.trim() ? (
                          <Check
                            className="mx-auto size-4 text-emerald-600"
                            aria-label="Has explanation"
                          />
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Question actions">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openEdit(q)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openCreate(q)}>
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {active ? (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setArchiveTarget(q)}
                              >
                                Archive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => restore.mutate(q._id)}>
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

      <TestDrawer
        open={testDrawer}
        onOpenChange={setTestDrawer}
        testId={testId}
        seriesId={seriesId}
        categoryId={categoryId}
      />
      {test && (
        <>
          <QuestionDrawer
            open={drawer.open}
            onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
            mode={drawer.mode}
            testId={testId}
            seriesId={seriesId}
            sections={sections}
            fill={fill}
          />
          <BulkUploadDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            testId={testId}
            testTitle={test.title}
            seriesId={seriesId}
            sections={sections}
          />
        </>
      )}
      <ConfirmDeleteDialog
        mode="archive"
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        itemLabel="this question"
        description="Archive this question? It will be removed from the test for students (past attempts are kept). You can restore it from the Archived filter."
        isPending={archive.isPending}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget._id)}
      />
    </>
  );
}
