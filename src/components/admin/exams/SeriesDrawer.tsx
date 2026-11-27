import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FieldGroup, FormDrawer } from "@/components/admin/FormDrawer";
import { ImageField } from "@/components/admin/ImageField";
import { apiError } from "@/lib/admin/ui-helpers";
import * as testSeriesService from "@/services/testSeriesService";
import {
  type DateRow,
  emptyDateRow,
  fromDateRows,
  IMPORTANT_DATE_TEXT_MAX,
  toDateRows,
  validateDateRows,
} from "@/lib/important-dates";

export type Series = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isPaid?: boolean;
  price?: number;
  marksPerQuestion?: number;
  negativeMarking?: boolean;
  negativeMarksPerQuestion?: number;
  officialWebsite?: string;
  applyLink?: string;
  notificationPdf?: string;
  importantDates?: Record<string, unknown>;
  isPublished?: boolean;
  isActive?: boolean;
  totalTests?: number;
};

type FormState = {
  name: string;
  description: string;
  isPaid: boolean;
  price: number;
  marksPerQuestion: number;
  negativeMarking: boolean;
  negativeMarksPerQuestion: number;
  officialWebsite: string;
  applyLink: string;
  dates: DateRow[];
};

function toForm(s?: Series): FormState {
  return {
    name: s?.name ?? "",
    description: s?.description ?? "",
    isPaid: !!s?.isPaid,
    price: s?.price ?? 0,
    marksPerQuestion: s?.marksPerQuestion ?? 1,
    negativeMarking: !!s?.negativeMarking,
    negativeMarksPerQuestion: s?.negativeMarksPerQuestion ?? 0,
    officialWebsite: s?.officialWebsite ?? "",
    applyLink: s?.applyLink ?? "",
    // Every entry is kept (dates, text, or both) so saving never drops any.
    dates: toDateRows(s?.importantDates),
  };
}

export function SeriesDrawer({
  open,
  onOpenChange,
  categoryId,
  series,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  series?: Series;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(series));
  const [initial, setInitial] = useState<FormState>(() => toForm(series));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const f = toForm(series);
    setForm(f);
    setInitial(f);
    setImageFile(null);
    setPdfFile(null);
    setDateError(null);
  }, [open, series]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial) || !!imageFile || !!pdfFile,
    [form, initial, imageFile, pdfFile],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: () => {
      const importantDates = fromDateRows(form.dates);
      const input = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: categoryId,
        isPaid: form.isPaid,
        price: form.isPaid ? Number(form.price) || 0 : 0,
        marksPerQuestion: Number(form.marksPerQuestion) || 1,
        negativeMarking: form.negativeMarking,
        negativeMarksPerQuestion: form.negativeMarking
          ? Number(form.negativeMarksPerQuestion) || 0
          : 0,
        officialWebsite: form.officialWebsite.trim(),
        applyLink: form.applyLink.trim(),
        importantDates,
        imageFile,
        notificationPdfFile: pdfFile,
      };
      return series
        ? testSeriesService.updateTestSeries(series._id, input)
        : testSeriesService.createTestSeries(input);
    },
    onSuccess: () => {
      toast.success(series ? "Test series updated" : "Test series created");
      qc.invalidateQueries({ queryKey: ["admin", "series", { categoryId }] });
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      if (series) qc.invalidateQueries({ queryKey: ["admin", "seriesItem", series._id] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiError(e, "Could not save test series")),
  });

  const submit = () => {
    if (!form.name.trim()) return;
    const err = validateDateRows(form.dates);
    setDateError(err);
    if (!err) save.mutate();
  };

  const updateDate = (i: number, patch: Partial<DateRow>) =>
    set(
      "dates",
      form.dates.map((d, j) => (j === i ? { ...d, ...patch } : d)),
    );

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty && !save.isPending}
      title={series ? "Edit test series" : "New test series"}
      description="A test series groups the tests for one exam, e.g. SSC CGL 2026."
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!form.name.trim() || save.isPending}>
            {save.isPending ? "Saving…" : series ? "Save changes" : "Create series"}
          </Button>
        </>
      }
    >
      <FieldGroup title="Basics">
        <div className="space-y-2">
          <Label htmlFor="series-name">Name</Label>
          <Input
            id="series-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. SSC CGL 2026"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="series-description">Description</Label>
          <Textarea
            id="series-description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Image</Label>
          <ImageField currentUrl={series?.image} file={imageFile} onFileChange={setImageFile} />
        </div>
      </FieldGroup>

      <Separator />

      <FieldGroup title="Pricing">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="series-paid">Paid series</Label>
            <p className="text-sm text-muted-foreground">Students must buy access to the tests.</p>
          </div>
          <Switch
            id="series-paid"
            checked={form.isPaid}
            onCheckedChange={(v) => set("isPaid", v)}
          />
        </div>
        {form.isPaid && (
          <div className="space-y-2">
            <Label htmlFor="series-price">Price (₹)</Label>
            <Input
              id="series-price"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set("price", e.target.valueAsNumber)}
              className="max-w-40"
            />
          </div>
        )}
      </FieldGroup>

      <Separator />

      <FieldGroup title="Marking">
        <div className="space-y-2">
          <Label htmlFor="series-marks">Marks per correct answer</Label>
          <Input
            id="series-marks"
            type="number"
            min={0.25}
            step={0.25}
            value={form.marksPerQuestion}
            onChange={(e) => set("marksPerQuestion", e.target.valueAsNumber)}
            className="max-w-40"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="series-negative">Negative marking</Label>
            <p className="text-sm text-muted-foreground">Deduct marks for wrong answers.</p>
          </div>
          <Switch
            id="series-negative"
            checked={form.negativeMarking}
            onCheckedChange={(v) => set("negativeMarking", v)}
          />
        </div>
        {form.negativeMarking && (
          <div className="space-y-2">
            <Label htmlFor="series-negative-marks">Marks deducted per wrong answer</Label>
            <Input
              id="series-negative-marks"
              type="number"
              min={0}
              step={0.25}
              value={form.negativeMarksPerQuestion}
              onChange={(e) => set("negativeMarksPerQuestion", e.target.valueAsNumber)}
              className="max-w-40"
            />
          </div>
        )}
      </FieldGroup>

      <Separator />

      <FieldGroup title="Exam info">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="series-website">Official website</Label>
            <Input
              id="series-website"
              type="url"
              value={form.officialWebsite}
              onChange={(e) => set("officialWebsite", e.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="series-apply">Apply link</Label>
            <Input
              id="series-apply"
              type="url"
              value={form.applyLink}
              onChange={(e) => set("applyLink", e.target.value)}
              placeholder="https://"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="series-pdf">Notification PDF</Label>
          {series?.notificationPdf && !pdfFile && (
            <a
              href={series.notificationPdf}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View current PDF <ExternalLink className="size-3" />
            </a>
          )}
          <Input
            id="series-pdf"
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-2">
          <Label>Important dates</Label>
          {form.dates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              e.g. Application window, Admit card, Exam date. Pick dates, add text (&quot;December
              2026&quot;, &quot;TBA&quot;), or both.
            </p>
          )}
          {form.dates.map((d, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-border p-3"
            >
              <div className="space-y-2">
                <Input
                  aria-label="Date label"
                  value={d.label}
                  onChange={(e) => updateDate(i, { label: e.target.value })}
                  placeholder="Label, e.g. Exam date"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    aria-label="From"
                    type="date"
                    value={d.from}
                    onChange={(e) => updateDate(i, { from: e.target.value })}
                  />
                  <Input
                    aria-label="To"
                    type="date"
                    value={d.to}
                    onChange={(e) => updateDate(i, { to: e.target.value })}
                  />
                </div>
                <Input
                  aria-label="Date text"
                  value={d.text}
                  maxLength={IMPORTANT_DATE_TEXT_MAX}
                  onChange={(e) => updateDate(i, { text: e.target.value })}
                  placeholder={
                    d.from ? "Note (optional), e.g. Extended" : "Or text, e.g. December 2026 / TBA"
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove date"
                onClick={() =>
                  set(
                    "dates",
                    form.dates.filter((_, j) => j !== i),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <FieldError>{dateError}</FieldError>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("dates", [...form.dates, emptyDateRow()])}
          >
            <Plus className="size-4" /> Add date
          </Button>
        </div>
      </FieldGroup>
    </FormDrawer>
  );
}
