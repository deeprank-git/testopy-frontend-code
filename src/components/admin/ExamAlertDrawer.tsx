import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError, FormDrawer } from "@/components/admin/FormDrawer";
import { apiError } from "@/lib/admin/ui-helpers";
import {
  ALERT_TYPES,
  ALERT_TYPE_META,
  alertDay,
  type AlertType,
  type ExamAlert,
} from "@/lib/exam-alerts";
import { isValidLink } from "@/lib/notifications";
import * as examAlertService from "@/services/examAlertService";

const NO_CATEGORY = "none"; // Radix Select can't use "" as an item value

type Form = {
  title: string;
  description: string;
  type: AlertType | "";
  date: string;
  category: string;
  link: string;
  notify: boolean;
};

const EMPTY: Form = {
  title: "",
  description: "",
  type: "",
  date: "",
  category: NO_CATEGORY,
  link: "",
  notify: true,
};

const fromAlert = (a: ExamAlert): Form => ({
  title: a.title,
  description: a.description ?? "",
  type: a.type,
  date: alertDay(a),
  category: a.category?._id ?? NO_CATEGORY,
  link: a.link ?? "",
  notify: false,
});

export function ExamAlertDrawer({
  open,
  onOpenChange,
  alert,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: ExamAlert | null;
  categories: { _id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const isEdit = !!alert;
  const [form, setForm] = useState<Form>(EMPTY);
  const [initial, setInitial] = useState<Form>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = alert ? fromAlert(alert) : EMPTY;
    setForm(next);
    setInitial(next);
    setSubmitted(false);
  }, [open, alert]);

  // Keep an alert's current category selectable even if it is archived.
  const categoryOptions =
    alert?.category && !categories.some((c) => c._id === alert.category!._id)
      ? [...categories, alert.category]
      : categories;

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const errors = {
    title: form.title.trim() ? undefined : "Title is required",
    type: form.type ? undefined : "Pick a type",
    date: form.date ? undefined : "Date is required",
    link: isValidLink(form.link.trim())
      ? undefined
      : "Use a full https:// URL or a path starting with /",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type as AlertType,
        date: form.date,
        category: form.category === NO_CATEGORY ? null : form.category,
        link: form.link.trim(),
      };
      if (isEdit) {
        await examAlertService.adminUpdateExamAlert(alert!._id, payload);
        return { notified: false };
      }
      return examAlertService.adminCreateExamAlert({ ...payload, notify: form.notify });
    },
    onSuccess: (res) => {
      if (isEdit) toast.success("Alert updated");
      else if (!form.notify) toast.success("Alert created");
      else if (res.notified) toast.success("Alert created and students notified");
      else toast.warning("Alert created, but the notification could not be sent");
      qc.invalidateQueries({ queryKey: ["admin", "exam-alerts"] });
      qc.invalidateQueries({ queryKey: ["exam-alerts"] });
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiError(e, "Could not save alert")),
  });

  const submit = () => {
    setSubmitted(true);
    if (!hasErrors) save.mutate();
  };
  const show = (msg?: string) => (submitted ? msg : undefined);

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit alert" : "New exam alert"}
      description="Shown to students on the Exam Alerts page."
      dirty={dirty && !save.isPending}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create alert"}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="ea-title">Title *</Label>
        <Input
          id="ea-title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="SSC CGL Tier 1 exam"
        />
        <FieldError>{show(errors.title)}</FieldError>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ea-desc">Description</Label>
        <Textarea
          id="ea-desc"
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v as AlertType)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose type" />
            </SelectTrigger>
            <SelectContent>
              {ALERT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ALERT_TYPE_META[t].chip}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{show(errors.type)}</FieldError>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ea-date">Date *</Label>
          <Input
            id="ea-date"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
          <FieldError>{show(errors.date)}</FieldError>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={(v) => set("category", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY}>No category</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ea-link">Link</Label>
        <Input
          id="ea-link"
          value={form.link}
          onChange={(e) => set("link", e.target.value)}
          placeholder="https://… or /exams/…"
        />
        <FieldError>{show(errors.link)}</FieldError>
      </div>

      {!isEdit && (
        <div className="flex items-start gap-3 rounded-lg border border-border p-3">
          <Checkbox
            id="ea-notify"
            checked={form.notify}
            onCheckedChange={(v) => set("notify", v === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="ea-notify">Also notify all students</Label>
            <p className="text-xs text-muted-foreground">
              Sends a bell notification linking to Exam Alerts.
            </p>
          </div>
        </div>
      )}
    </FormDrawer>
  );
}
