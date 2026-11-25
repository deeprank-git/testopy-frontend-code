import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Layers, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";
import { apiError, isNotFound } from "@/lib/admin/ui-helpers";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import { HeaderMedia, PageHeader } from "@/components/admin/PageHeader";
import { useBreadcrumbs } from "@/components/admin/breadcrumbs";
import { CardGridSkeleton, EntityCard, NewEntityCard } from "@/components/admin/EntityCard";
import { FilterChips } from "@/components/admin/FilterChips";
import { SearchInput } from "@/components/admin/DataCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { NotFoundState } from "@/components/admin/NotFoundState";
import { PublishBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { CategoryDialog } from "@/components/admin/exams/CategoryDialog";
import { SeriesDrawer, type Series } from "@/components/admin/exams/SeriesDrawer";

export const Route = createFileRoute("/admin-dashboard/exams/$categoryId/")({
  component: CategoryPage,
});

type View = "all" | "published" | "draft" | "archived";

const matchesView = (s: Series, view: View) => {
  const active = s.isActive !== false;
  if (view === "archived") return !active;
  if (!active) return false;
  if (view === "published") return !!s.isPublished;
  if (view === "draft") return !s.isPublished;
  return true;
};

function CategoryPage() {
  const { categoryId } = Route.useParams();
  const qc = useQueryClient();

  const categoryQuery = useQuery({
    queryKey: ["admin", "category", categoryId],
    queryFn: () => categoryService.getCategoryById(categoryId),
    retry: (count, e) => !isNotFound(e) && count < 2,
  });
  const category = unwrapItem<{
    _id: string;
    name: string;
    description?: string;
    image?: string;
    isActive?: boolean;
  }>(categoryQuery.data);

  const seriesQuery = useQuery({
    queryKey: ["admin", "series", { categoryId }],
    queryFn: () => testSeriesService.getTestSeries({ category: categoryId }),
  });
  const allSeries = unwrapList<Series>(seriesQuery.data);

  useBreadcrumbs([
    { label: "Exams", href: "/admin-dashboard/exams" },
    { label: category?.name ?? "…" },
  ]);

  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; series?: Series }>({ open: false });
  const [archiveTarget, setArchiveTarget] = useState<Series | null>(null);

  const counts = useMemo(
    () => ({
      all: allSeries.filter((s) => matchesView(s, "all")).length,
      published: allSeries.filter((s) => matchesView(s, "published")).length,
      draft: allSeries.filter((s) => matchesView(s, "draft")).length,
      archived: allSeries.filter((s) => matchesView(s, "archived")).length,
    }),
    [allSeries],
  );
  const totalTests = allSeries
    .filter((s) => s.isActive !== false)
    .reduce((sum, s) => sum + (s.totalTests ?? 0), 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSeries
      .filter((s) => matchesView(s, view))
      .filter((s) => s.name.toLowerCase().includes(q));
  }, [allSeries, view, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "series", { categoryId }] });
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
  };
  const onError = (fallback: string) => (e: unknown) => toast.error(apiError(e, fallback));

  const togglePublish = useMutation({
    mutationFn: (s: Series) =>
      testSeriesService.updateTestSeries(s._id, { isPublished: !s.isPublished }),
    onSuccess: (_d, s) => {
      toast.success(s.isPublished ? "Series unpublished" : "Series published");
      invalidate();
    },
    onError: onError("Could not update series"),
  });
  const archive = useMutation({
    mutationFn: (id: string) => testSeriesService.deleteTestSeries(id),
    onSuccess: () => {
      toast.success("Series archived");
      invalidate();
      setArchiveTarget(null);
    },
    onError: onError("Could not archive series"),
  });
  const restore = useMutation({
    mutationFn: (id: string) => testSeriesService.restoreTestSeries(id),
    onSuccess: () => {
      toast.success("Series restored — it stays unpublished until you publish it");
      invalidate();
    },
    onError: onError("Could not restore series"),
  });

  if (categoryQuery.isError && isNotFound(categoryQuery.error)) {
    return (
      <NotFoundState what="Category" backHref="/admin-dashboard/exams" backLabel="Back to Exams" />
    );
  }

  const openCreate = () => setDrawer({ open: true });

  return (
    <>
      {category ? (
        <PageHeader
          media={<HeaderMedia image={category.image} name={category.name} />}
          title={category.name}
          description={category.description}
          meta={
            <>
              {category.isActive === false && <StatusBadge tone="neutral">Archived</StatusBadge>}
              <span>
                {counts.all} test series · {totalTests} tests
              </span>
            </>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => setCategoryDialog(true)}>
                <Pencil className="size-4" /> Edit category
              </Button>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New test series
              </Button>
            </>
          }
        />
      ) : (
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="size-14 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips<View>
          value={view}
          onChange={setView}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "published", label: "Published", count: counts.published },
            { value: "draft", label: "Draft", count: counts.draft },
            { value: "archived", label: "Archived", count: counts.archived },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search test series…" />
      </div>

      {seriesQuery.isLoading ? (
        <CardGridSkeleton />
      ) : visible.length === 0 ? (
        search ? (
          <EmptyState icon={Layers} title={`No test series match "${search}"`} />
        ) : view !== "all" ? (
          <EmptyState icon={Layers} title={`No ${view} test series`} />
        ) : (
          <EmptyState
            icon={Layers}
            title={`No test series in ${category?.name ?? "this category"} yet`}
            description="A test series holds the mock tests and previous-year papers for one exam."
            actions={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New test series
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((s) => {
            const active = s.isActive !== false;
            return (
              <EntityCard
                key={s._id}
                href={`/admin-dashboard/exams/${categoryId}/${s._id}`}
                title={s.name}
                image={s.image}
                muted={!active}
                subtitle={`${s.totalTests ?? 0} tests`}
                badges={
                  <>
                    <PublishBadge isActive={active} isPublished={s.isPublished} />
                    <StatusBadge tone={s.isPaid ? "info" : "neutral"} dot={false}>
                      {s.isPaid ? `₹${s.price ?? 0}` : "Free"}
                    </StatusBadge>
                  </>
                }
                actions={
                  active
                    ? [
                        { label: "Edit", onSelect: () => setDrawer({ open: true, series: s }) },
                        {
                          label: s.isPublished ? "Unpublish" : "Publish",
                          onSelect: () => togglePublish.mutate(s),
                        },
                        {
                          label: "Archive",
                          onSelect: () => setArchiveTarget(s),
                          destructive: true,
                        },
                      ]
                    : [
                        { label: "Edit", onSelect: () => setDrawer({ open: true, series: s }) },
                        { label: "Restore", onSelect: () => restore.mutate(s._id) },
                      ]
                }
              />
            );
          })}
          {view === "all" && !search && (
            <NewEntityCard label="New test series" onClick={openCreate} />
          )}
        </div>
      )}

      {category && (
        <CategoryDialog
          open={categoryDialog}
          onOpenChange={setCategoryDialog}
          category={category}
        />
      )}
      <SeriesDrawer
        open={drawer.open}
        series={drawer.series}
        categoryId={categoryId}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
      />
      <ConfirmDeleteDialog
        mode="archive"
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        itemLabel={`"${archiveTarget?.name ?? ""}"`}
        description={`Archive "${archiveTarget?.name ?? ""}"? It will be unpublished and hidden from students. You can restore it from the Archived filter.`}
        isPending={archive.isPending}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget._id)}
      />
    </>
  );
}
