import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sectionTotals, type SectionDraft } from "@/lib/admin/exam-rules";

const GRID = "grid grid-cols-[minmax(0,1fr)_64px_64px_64px_36px] gap-2";

/**
 * Editable list of test sections. `lockedIds` are sections that already have
 * questions — they can be renamed/resized but not removed (questions point at
 * the section's _id).
 */
export function SectionBuilder({
  value,
  onChange,
  lockedIds = [],
}: {
  value: SectionDraft[];
  onChange: (v: SectionDraft[]) => void;
  lockedIds?: string[];
}) {
  const update = (i: number, patch: Partial<SectionDraft>) =>
    onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const numberValue = (n: number) => (Number.isFinite(n) && n !== 0 ? n : "");
  const totals = sectionTotals(value);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className={`${GRID} px-1 text-xs font-medium text-muted-foreground`}>
          <span>Section</span>
          <span>Qs</span>
          <span>Marks</span>
          <span>Min</span>
          <span />
        </div>
      )}
      {value.map((s, i) => {
        const locked = !!s._id && lockedIds.includes(s._id);
        return (
          <div key={s._id ?? `new-${i}`} className={GRID}>
            <Input
              aria-label={`Section ${i + 1} name`}
              value={s.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="e.g. Reasoning"
            />
            <Input
              aria-label={`Section ${i + 1} questions`}
              type="number"
              min={1}
              value={numberValue(s.no_of_questions)}
              onChange={(e) => update(i, { no_of_questions: e.target.valueAsNumber })}
              className="px-2"
            />
            <Input
              aria-label={`Section ${i + 1} marks`}
              type="number"
              min={1}
              value={numberValue(s.no_of_marks)}
              onChange={(e) => update(i, { no_of_marks: e.target.valueAsNumber })}
              className="px-2"
            />
            <Input
              aria-label={`Section ${i + 1} minutes`}
              type="number"
              min={1}
              value={numberValue(s.duration)}
              onChange={(e) => update(i, { duration: e.target.valueAsNumber })}
              className="px-2"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={locked}
              title={locked ? "This section has questions — archive them first" : "Remove section"}
              aria-label={`Remove section ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...value, { name: "", no_of_questions: 0, no_of_marks: 0, duration: 0 }])
          }
        >
          <Plus className="size-4" /> Add section
        </Button>
        <p className="text-sm text-muted-foreground tabular-nums">
          Total <span className="font-medium text-foreground">{totals.questions}</span> Qs ·{" "}
          <span className="font-medium text-foreground">{totals.marks}</span> marks ·{" "}
          <span className="font-medium text-foreground">{totals.duration}</span> min
        </p>
      </div>
    </div>
  );
}
