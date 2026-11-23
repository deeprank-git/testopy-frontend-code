import { useEffect, useState, type DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildQuestionCsvTemplate } from "@/lib/admin/exam-rules";
import { apiError } from "@/lib/admin/ui-helpers";
import { cn } from "@/lib/utils";
import * as questionService from "@/services/questionService";
import type { TestSection } from "./types";

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

export function BulkUploadDialog({
  open,
  onOpenChange,
  testId,
  testTitle,
  seriesId,
  sections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  testTitle: string;
  seriesId: string;
  sections: TestSection[];
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = useMutation({
    mutationFn: (f: File) => questionService.uploadQuestionsCsv(f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "questions", { testId }] });
      qc.invalidateQueries({ queryKey: ["admin", "test", testId] });
      qc.invalidateQueries({ queryKey: ["admin", "tests", { seriesId }] });
    },
  });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setDragging(false);
    upload.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const downloadTemplate = () => {
    const csv = buildQuestionCsvTemplate(testId, sections);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `questions-${testTitle.replace(/[^\w-]+/g, "-").toLowerCase() || testId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    setFile(f);
    upload.reset();
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const done = upload.isSuccess;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk upload questions</DialogTitle>
          <DialogDescription>
            Add many questions to “{testTitle}” from a CSV file.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 text-sm">
          <li className="space-y-2">
            <p className="font-medium">1. Download the template for this test</p>
            <p className="text-muted-foreground">
              It’s pre-filled with this test’s ID and one example row per section. Section names
              must match exactly. <code>correctAnswer</code> is 1–5, <code>option5</code> is
              optional, and leaving <code>order</code> blank adds questions at the end.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="size-4" /> Download template
            </Button>
          </li>
          <li className="space-y-2">
            <p className="font-medium">2. Upload the filled CSV</p>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="size-8 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatSize(file.size)} · click to choose another file
                  </span>
                </>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <span>
                    <span className="font-medium text-primary">Choose a CSV file</span> or drag it
                    here
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </li>
        </ol>

        {upload.isSuccess && (
          <Alert className="border-emerald-500/40 text-emerald-800 dark:text-emerald-300 [&>svg]:text-emerald-600">
            <CheckCircle2 className="size-4" />
            <AlertTitle>Upload complete</AlertTitle>
            <AlertDescription>
              {(upload.data as { message?: string })?.message ?? "Questions uploaded."}
            </AlertDescription>
          </Alert>
        )}
        {upload.isError && (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertTitle>Nothing was uploaded</AlertTitle>
            <AlertDescription>
              {apiError(upload.error, "The file could not be processed.")} Fix the file and upload
              it again.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {done ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!file || upload.isPending}
                onClick={() => file && upload.mutate(file)}
              >
                {upload.isPending ? "Uploading…" : "Upload"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
