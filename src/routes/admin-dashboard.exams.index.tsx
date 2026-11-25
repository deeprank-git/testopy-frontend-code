import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, GripVertical, Plus } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unwrapList } from "@/lib/api-unwrap";
import { apiError } from "@/lib/admin/ui-helpers";
import { reorderById } from "@/lib/admin/reorder";
import { cn } from "@/lib/utils";
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
  order?: number;
};

const QUERY_KEY = ["admin", "categories"];

function ExamsIndex() {
  useBreadcrumbs([{ label: "Exams" }]);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
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

  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  // Drag-to-reorder only makes sense on the full, unfiltered active list.
  const canReorder = view === "active" && !search.trim();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const reorder = useMutation({
    mutationFn: (ids: string[]) => categoryService.reorderCategories(ids),
    onError: (e) => toast.error(apiError(e, "Could not save the new order")),
    onSettled: invalidate,
  });
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const next = reorderById(
      all,
      visible.map((c) => c._id),
      String(active.id),
      String(over.id),
    );
    if (!next) return;
    // Optimistic: show the new order now; onSettled refetches (and so reverts on error).
    qc.setQueryData(QUERY_KEY, (old: unknown) =>
      old && typeof old === "object" && !Array.isArray(old) ? { ...old, data: next } : next,
    );
    reorder.mutate(next.map((c) => c._id));
  };
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((c) => c._id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((c) => (
                <SortableCategoryCard key={c._id} id={c._id} title={c.name} enabled={canReorder}>
                  {(dragHandle) => (
                    <EntityCard
                      dragHandle={dragHandle}
                      href={`/admin-dashboard/exams/${c._id}`}
                      title={c.name}
                      image={c.image}
                      muted={!c.isActive}
                      subtitle={`${c.seriesCount ?? 0} test series`}
                      badges={
                        !c.isActive ? <StatusBadge tone="neutral">Archived</StatusBadge> : undefined
                      }
                      actions={[
                        { label: "Edit", onSelect: () => setDialog({ open: true, category: c }) },
                        c.isActive
                          ? {
                              label: "Archive",
                              onSelect: () => setArchiveTarget(c),
                              destructive: true,
                            }
                          : { label: "Restore", onSelect: () => restore.mutate(c._id) },
                      ]}
                    />
                  )}
                </SortableCategoryCard>
              ))}
              {view === "active" && !search && (
                <NewEntityCard label="New category" onClick={openCreate} />
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {view === "active" && counts.active > 1 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {canReorder
            ? "Drag the handle on a card to change the order students see."
            : "Clear the search to reorder categories."}
        </p>
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

/** Wraps a card so it can be dragged by its grip handle (the card link stays clickable). */
function SortableCategoryCard({
  id,
  title,
  enabled,
  children,
}: {
  id: string;
  title: string;
  enabled: boolean;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !enabled });

  const handle = enabled ? (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Reorder ${title}`}
      className="absolute left-2 top-2 flex size-8 cursor-grab touch-none items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
    >
      <GripVertical className="size-4" />
    </button>
  ) : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 opacity-80")}
    >
      {children(handle)}
    </div>
  );
}
