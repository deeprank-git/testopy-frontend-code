import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FormDrawer } from "@/components/admin/FormDrawer";
import {
  OPTION_LETTERS,
  emptyQuestionForm,
  marksPerQuestionFor,
  validateQuestionForm,
  type QuestionForm,
  type SectionFill,
} from "@/lib/admin/exam-rules";
import { apiError } from "@/lib/admin/ui-helpers";
import { cn } from "@/lib/utils";
import * as questionService from "@/services/questionService";
import type { AdminQuestion, TestSection } from "./types";

export type QuestionDrawerMode =
  | { kind: "create"; section: string; copyFrom?: AdminQuestion }
  | { kind: "edit"; question: AdminQuestion };

const fromQuestion = (q: AdminQuestion, section = q.section): QuestionForm => ({
  section,
  questionText: q.questionText,
  options: q.options.map((o) => o.text),
  correctAnswer: q.correctAnswer,
  explanation: q.explanation ?? "",
  marks: q.marks ?? 1,
});

export function QuestionDrawer({
  open,
  onOpenChange,
  mode,
  testId,
  seriesId,
  sections,
  fill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: QuestionDrawerMode;
  testId: string;
  seriesId: string;
  sections: TestSection[];
  fill: SectionFill[];
}) {
  const qc = useQueryClient();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const editing = mode.kind === "edit";

  const sectionById = useMemo(() => new Map(sections.map((s) => [s._id, s])), [sections]);
  const blankFor = (sectionId: string) => {
    const s = sectionById.get(sectionId);
    return emptyQuestionForm(sectionId, s ? marksPerQuestionFor(s) : 1);
  };
  const initialForm = (): QuestionForm =>
    mode.kind === "edit"
      ? fromQuestion(mode.question)
      : mode.copyFrom
        ? fromQuestion(mode.copyFrom, mode.section)
        : blankFor(mode.section);

  const [form, setForm] = useState<QuestionForm>(initialForm);
  const [initial, setInitial] = useState<QuestionForm>(initialForm);
  const [errors, setErrors] = useState<ReturnType<typeof validateQuestionForm>>({});
  const [preview, setPreview] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    const f = initialForm();
    setForm(f);
    setInitial(f);
    setErrors({});
    setPreview(false);
    setAddedCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = <K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const sectionFill = fill.find((f) => f.id === form.section);
  const sectionFull =
    !editing && sectionFill && (sectionFill.status === "full" || sectionFill.status === "over");

  const save = useMutation({
    mutationFn: (_next: boolean) => {
      const payload = {
        test: testId,
        section: form.section,
        questionText: form.questionText.trim(),
        options: form.options.map((text) => ({ text: text.trim() })),
        correctAnswer: form.correctAnswer,
        explanation: form.explanation.trim(),
        marks: Number(form.marks),
      };
      return mode.kind === "edit"
        ? questionService.updateQuestion(mode.question._id, payload)
        : questionService.createQuestion(payload);
    },
    onSuccess: (_d, next) => {
      qc.invalidateQueries({ queryKey: ["admin", "questions", { testId }] });
      qc.invalidateQueries({ queryKey: ["admin", "test", testId] });
      qc.invalidateQueries({ queryKey: ["admin", "tests", { seriesId }] });
      if (next) {
        toast.success("Question saved — ready for the next one");
        const blank = blankFor(form.section);
        setForm(blank);
        setInitial(blank);
        setErrors({});
        setPreview(false);
        setAddedCount((n) => n + 1);
        requestAnimationFrame(() => textRef.current?.focus());
      } else {
        toast.success(editing ? "Question updated" : "Question added");
        onOpenChange(false);
      }
    },
    onError: (e) => toast.error(apiError(e, "Could not save question")),
  });

  const submit = (next: boolean) => {
    const errs = validateQuestionForm(form);
    setErrors(errs);
    if (Object.keys(errs).length === 0) save.mutate(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit(!editing);
      return;
    }
    // Alt+1..5 marks the correct option (e.code so it works across keyboard layouts).
    const digit = /^Digit([1-5])$/.exec(e.code);
    if (e.altKey && digit) {
      const idx = Number(digit[1]) - 1;
      if (idx < form.options.length) {
        e.preventDefault();
        set("correctAnswer", idx);
      }
    }
  };

  const setOption = (i: number, text: string) =>
    set(
      "options",
      form.options.map((o, j) => (j === i ? text : o)),
    );
  const removeOptionE = () =>
    setForm((f) => ({
      ...f,
      options: f.options.slice(0, 4),
      correctAnswer: f.correctAnswer === 4 ? 0 : f.correctAnswer,
    }));

  const sectionName = sectionById.get(form.section)?.name ?? "";

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty && !save.isPending}
      width="sm:max-w-2xl"
      title={editing ? "Edit question" : "New question"}
      description={
        addedCount > 0
          ? `${sectionName} · ${addedCount} added in this session`
          : sectionName || undefined
      }
      onSubmit={() => submit(!editing)}
      onKeyDown={onKeyDown}
      footer={
        <>
          <p className="mr-auto hidden text-xs text-muted-foreground md:block">
            <kbd className="rounded border px-1">Ctrl</kbd>+
            <kbd className="rounded border px-1">Enter</kbd> {editing ? "save" : "save & next"} ·{" "}
            <kbd className="rounded border px-1">Alt</kbd>+
            <kbd className="rounded border px-1">1–5</kbd> mark answer
          </p>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {editing ? (
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => submit(false)}
              >
                Save
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save & add next"}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label>Section</Label>
          <Select
            value={form.section}
            onValueChange={(v) =>
              setForm((f) => {
                // If marks still equal the old section's default, switch to the new
                // section's default; keep a value the admin typed themselves.
                const oldSection = sectionById.get(f.section);
                const newSection = sectionById.get(v);
                const usingDefault = !oldSection || f.marks === marksPerQuestionFor(oldSection);
                return {
                  ...f,
                  section: v,
                  marks: usingDefault && newSection ? marksPerQuestionFor(newSection) : f.marks,
                };
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => {
                const f = fill.find((x) => x.id === s._id);
                return (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                    {f ? ` (${f.filled}/${f.planned})` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <FieldError>{errors.section}</FieldError>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="question-preview" checked={preview} onCheckedChange={setPreview} />
          <Label htmlFor="question-preview">Preview</Label>
        </div>
      </div>

      {sectionFull && sectionFill && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          This section already has {sectionFill.filled}/{sectionFill.planned} questions. You can
          still add more, but the test will have more questions than planned.
        </div>
      )}

      {preview ? (
        <QuestionPreview form={form} />
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="question-text">Question</Label>
            <Textarea
              id="question-text"
              ref={textRef}
              value={form.questionText}
              onChange={(e) => set("questionText", e.target.value)}
              rows={4}
              placeholder="Type the question…"
              autoFocus
            />
            <FieldError>{errors.questionText}</FieldError>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <span className="text-xs text-muted-foreground">Select the correct answer</span>
            </div>
            <RadioGroup
              value={String(form.correctAnswer)}
              onValueChange={(v) => set("correctAnswer", Number(v))}
              className="gap-2"
            >
              {form.options.map((opt, i) => {
                const correct = form.correctAnswer === i;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-2 pl-3 transition",
                      correct ? "border-emerald-500/50 bg-emerald-500/5" : "border-border",
                    )}
                  >
                    <RadioGroupItem
                      value={String(i)}
                      id={`option-${i}`}
                      aria-label={`Mark option ${OPTION_LETTERS[i]} correct`}
                    />
                    <Label
                      htmlFor={`option-${i}`}
                      className={cn(
                        "w-4 text-sm font-semibold",
                        correct ? "text-emerald-600" : "text-muted-foreground",
                      )}
                    >
                      {OPTION_LETTERS[i]}
                    </Label>
                    <Input
                      aria-label={`Option ${OPTION_LETTERS[i]}`}
                      value={opt}
                      onChange={(e) => setOption(i, e.target.value)}
                      className="flex-1"
                    />
                    {i === 4 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove option E"
                        onClick={removeOptionE}
                      >
                        <X className="size-4" />
                      </Button>
                    ) : (
                      <span className="w-9" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>
            <FieldError>{errors.options ?? errors.correctAnswer}</FieldError>
            {form.options.length === 4 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => set("options", [...form.options, ""])}
              >
                <Plus className="size-4" /> Add option E
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-explanation">
              Explanation <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="question-explanation"
              value={form.explanation}
              onChange={(e) => set("explanation", e.target.value)}
              rows={3}
              placeholder="Shown to students after they submit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-marks">Marks</Label>
            <Input
              id="question-marks"
              type="number"
              min={0.25}
              step={0.25}
              value={Number.isFinite(form.marks) ? form.marks : ""}
              onChange={(e) => set("marks", e.target.valueAsNumber)}
              className="max-w-32"
            />
            <FieldError>{errors.marks}</FieldError>
          </div>
        </>
      )}
    </FormDrawer>
  );
}

/** Student-style rendering of the question being edited. */
function QuestionPreview({ form }: { form: QuestionForm }) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
      <p className="whitespace-pre-wrap text-base font-medium">
        {form.questionText || <span className="text-muted-foreground">No question text yet</span>}
      </p>
      <div className="space-y-2">
        {form.options.map((opt, i) => {
          const correct = form.correctAnswer === i;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-background p-3",
                correct ? "border-emerald-500 ring-1 ring-emerald-500/30" : "border-border",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  correct ? "border-emerald-500 bg-emerald-500 text-white" : "border-border",
                )}
              >
                {OPTION_LETTERS[i]}
              </span>
              <span className="text-sm">{opt || "—"}</span>
            </div>
          );
        })}
      </div>
      {form.explanation.trim() && (
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="mb-1 font-medium">Explanation</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{form.explanation}</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Marks: {form.marks}</p>
    </div>
  );
}
