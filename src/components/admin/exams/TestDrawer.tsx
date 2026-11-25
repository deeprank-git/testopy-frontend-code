import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { FieldError, FieldGroup, FormDrawer } from "@/components/admin/FormDrawer";
import { unwrapItem, unwrapList } from "@/lib/api-unwrap";
import { validateSections, type SectionDraft } from "@/lib/admin/exam-rules";
import { apiError } from "@/lib/admin/ui-helpers";
import * as questionService from "@/services/questionService";
import * as testService from "@/services/testService";
import { SectionBuilder } from "./SectionBuilder";
import type { AdminQuestion, AdminTest } from "./types";

type FormState = {
  title: string;
  paperType: "mock" | "previous_year";
  examDate: string;
  isPaid: boolean;
  maxPauses: string;
  maxPauseMinutes: string;
  sections: SectionDraft[];
};

const NEW_SECTION: SectionDraft = { name: "", no_of_questions: 0, no_of_marks: 0, duration: 0 };

function toForm(t?: AdminTest | null): FormState {
  return {
    title: t?.title ?? "",
    paperType: t?.paperType ?? "mock",
    examDate: t?.examDate ? t.examDate.slice(0, 10) : "",
    isPaid: !!t?.isPaid,
    maxPauses: t?.maxPauses == null ? "" : String(t.maxPauses),
    maxPauseMinutes: t?.maxPauseDurationMs == null ? "" : String(t.maxPauseDurationMs / 60000),
    sections: t?.sections?.length ? t.sections.map((s) => ({ ...s })) : [{ ...NEW_SECTION }],
  };
}

export function TestDrawer({
  open,
  onOpenChange,
  seriesId,
  categoryId,
  testId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
  categoryId: string;
  /** Set to edit an existing test; omit to create. */
  testId?: string;
}) {
  const qc = useQueryClient();
  const editing = !!testId;

  // The list payload lacks pause limits, so edit mode loads the full test.
  const testQuery = useQuery({
    queryKey: ["admin", "test", testId],
    queryFn: () => testService.getTestById(testId!),
    enabled: open && editing,
  });
  const test = unwrapItem<AdminTest>(testQuery.data);

  const questionsQuery = useQuery({
    queryKey: ["admin", "questions", { testId }],
    queryFn: () => questionService.getQuestionsAdmin(testId),
    enabled: open && editing,
  });
  // Any question (even archived) still points at its section, so lock those sections.
  const lockedIds = useMemo(
    () => [
      ...new Set(unwrapList<AdminQuestion>(questionsQuery.data).map((q) => String(q.section))),
    ],
    [questionsQuery.data],
  );

  const [form, setForm] = useState<FormState>(() => toForm());
  const [initial, setInitial] = useState<FormState>(() => toForm());
  const [sectionError, setSectionError] = useState<string | null>(null);
  const ready = !editing || !!test;

  useEffect(() => {
    if (!open || !ready) return;
    const f = toForm(editing ? test : null);
    setForm(f);
    setInitial(f);
    setSectionError(null);
  }, [open, ready, editing, test]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        paperType: form.paperType,
        examDate: form.paperType === "previous_year" && form.examDate ? form.examDate : null,
        isPaid: form.isPaid,
        testSeries: seriesId,
        maxPauses: form.maxPauses === "" ? null : Number(form.maxPauses),
        maxPauseDurationMs:
          form.maxPauseMinutes === "" ? null : Math.round(Number(form.maxPauseMinutes) * 60000),
        // Keep _id on existing sections — questions reference Test.sections[]._id.
        // Duration is derived from sections on the backend.
        sections: form.sections.map(({ _id, name, no_of_questions, no_of_marks, duration }) => ({
          ...(_id ? { _id } : {}),
          name: name.trim(),
          no_of_questions,
          no_of_marks,
          duration,
        })),
      };
      return editing ? testService.updateTest(testId!, payload) : testService.createTest(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Test updated" : "Test created");
      qc.invalidateQueries({ queryKey: ["admin", "tests", { seriesId }] });
      qc.invalidateQueries({ queryKey: ["admin", "series", { categoryId }] });
      qc.invalidateQueries({ queryKey: ["admin", "seriesItem", seriesId] });
      if (testId) qc.invalidateQueries({ queryKey: ["admin", "test", testId] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiError(e, "Could not save test")),
  });

  const submit = () => {
    if (!form.title.trim()) return;
    const err = validateSections(form.sections);
    setSectionError(err);
    if (!err) save.mutate();
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty && !save.isPending}
      title={editing ? "Edit test" : "New test"}
      description="Sections define how many questions, marks and minutes each part of the paper has."
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!ready || !form.title.trim() || save.isPending}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Create test"}
          </Button>
        </>
      }
    >
      {!ready ? (
        <p className="text-sm text-muted-foreground">Loading test…</p>
      ) : (
        <>
          <FieldGroup title="Details">
            <div className="space-y-2">
              <Label htmlFor="test-title">Title</Label>
              <Input
                id="test-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Full Mock Test 01"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Paper type</Label>
                <Select
                  value={form.paperType}
                  onValueChange={(v) => set("paperType", v as FormState["paperType"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mock">Mock test</SelectItem>
                    <SelectItem value="previous_year">Previous year paper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.paperType === "previous_year" && (
                <div className="space-y-2">
                  <Label htmlFor="test-exam-date">Exam date</Label>
                  <Input
                    id="test-exam-date"
                    type="date"
                    value={form.examDate}
                    onChange={(e) => set("examDate", e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="test-paid">Paid test</Label>
                <p className="text-sm text-muted-foreground">
                  Only students with access can start it.
                </p>
              </div>
              <Switch
                id="test-paid"
                checked={form.isPaid}
                onCheckedChange={(v) => set("isPaid", v)}
              />
            </div>
          </FieldGroup>

          <Separator />

          <FieldGroup title="Sections">
            <SectionBuilder
              value={form.sections}
              onChange={(v) => set("sections", v)}
              lockedIds={lockedIds}
            />
            <FieldError>{sectionError}</FieldError>
          </FieldGroup>

          <Separator />

          <Collapsible
            defaultOpen={form.maxPauses !== "" || form.maxPauseMinutes !== ""}
            className="space-y-4"
          >
            <CollapsibleTrigger className="group flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pause limits (optional)
              <ChevronDown className="size-4 transition group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Leave blank for unlimited.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="test-max-pauses">Max pauses per attempt</Label>
                  <Input
                    id="test-max-pauses"
                    type="number"
                    min={0}
                    value={form.maxPauses}
                    onChange={(e) => set("maxPauses", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-max-pause-min">Max total pause (minutes)</Label>
                  <Input
                    id="test-max-pause-min"
                    type="number"
                    min={0}
                    value={form.maxPauseMinutes}
                    onChange={(e) => set("maxPauseMinutes", e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </FormDrawer>
  );
}
