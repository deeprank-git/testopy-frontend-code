import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unwrapList } from "@/lib/api-unwrap";
import { apiError } from "@/lib/admin/ui-helpers";
import * as categoryService from "@/services/categoryService";
import { PageHeader } from "@/components/admin/PageHeader";
import { useBreadcrumbs } from "@/components/admin/breadcrumbs";
import { CardGridSkeleton, EntityCard, NewEntityCard } from "@/components/admin/EntityCard";
import { FilterChips } from "@/components/admin/FilterChips";
import { SearchInput } from "@/components/admin/DataCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { CategoryDialog } from "@/components/admin/exams/CategoryDialog";

export const Route = createFileRoute("/admin-dashboard/exams/")({ component: ExamsIndex });

type View = "active" | "archived";
type Category = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  seriesCount?: number;
};

function ExamsIndex() {
  useBreadcrumbs([{ label: "Exams" }]);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: categoryService.getAdminCategories,
  });
  const all = unwrapList<Category>(data);

  const [view, setView] = useState<View>("active");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; category?: Category }>({ open: false });
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);

  const counts = {
    active: all.filter((c) => c.isActive).length,
    archived: all.filter((c) => !c.isActive).length,
  };
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((c) => (view === "active" ? c.isActive : !c.isActive))
      .filter((c) => c.name.toLowerCase().includes(q));
  }, [all, view, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "categories"] });
  const archive = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category archived");
      invalidate();
      setArchiveTarget(null);
    },
    onError: (e) => toast.error(apiError(e, "Could not archive category")),
  });
  const restore = useMutation({
    mutationFn: (id: string) => categoryService.restoreCategory(id),
    onSuccess: () => {
      toast.success("Category restored");
      invalidate();
    },
    onError: (e) => toast.error(apiError(e, "Could not restore category")),
  });

  const openCreate = () => setDialog({ open: true });

  return (
    <>
      <PageHeader
        title="Exams"
        description="Exam categories, their test series, tests and questions."
        meta={<span>{counts.active} active categories</span>}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> New category
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips<View>
          value={view}
          onChange={setView}
          options={[
            { value: "active", label: "Active", count: counts.active },
            { value: "archived", label: "Archived", count: counts.archived },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" />
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : visible.length === 0 ? (
        search ? (
          <EmptyState icon={BookOpen} title={`No categories match "${search}"`} />
        ) : view === "archived" ? (
          <EmptyState icon={BookOpen} title="No archived categories" />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No exam categories yet"
            description="Create a category like SSC, Banking or Railways to start adding test series."
            actions={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New category
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => (
            <EntityCard
              key={c._id}
              href={`/admin-dashboard/exams/${c._id}`}
              title={c.name}
              image={c.image}
              muted={!c.isActive}
              subtitle={`${c.seriesCount ?? 0} test series`}
              badges={!c.isActive ? <StatusBadge tone="neutral">Archived</StatusBadge> : undefined}
              actions={[
                { label: "Edit", onSelect: () => setDialog({ open: true, category: c }) },
                c.isActive
                  ? { label: "Archive", onSelect: () => setArchiveTarget(c), destructive: true }
                  : { label: "Restore", onSelect: () => restore.mutate(c._id) },
              ]}
            />
          ))}
          {view === "active" && !search && (
            <NewEntityCard label="New category" onClick={openCreate} />
          )}
        </div>
      )}

      <CategoryDialog
        open={dialog.open}
        category={dialog.category}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
      <ConfirmDeleteDialog
        mode="archive"
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        itemLabel={`"${archiveTarget?.name ?? ""}"`}
        isPending={archive.isPending}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget._id)}
      />
    </>
  );
}
