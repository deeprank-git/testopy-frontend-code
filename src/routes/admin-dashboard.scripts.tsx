import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { FileText, Info, Loader2, Play, Square, TerminalSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { useBreadcrumbs } from "@/components/admin/breadcrumbs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { apiError } from "@/lib/admin/ui-helpers";
import {
  RUN_STATUS_META,
  describeRunOptions,
  formatDuration,
  formatRunTime,
  timeAgo,
  toRunOptions,
  type AdminScript,
  type ScriptFormValues,
  type ScriptOption,
  type ScriptRun,
} from "@/lib/scripts";
import * as scriptService from "@/services/scriptService";

export const Route = createFileRoute("/admin-dashboard/scripts")({
  component: ScriptsAdminPage,
});

const SCRIPTS_KEY = ["admin", "scripts"] as const;

function ScriptsAdminPage() {
  useBreadcrumbs([{ label: "Scripts" }]);
  const [logRun, setLogRun] = useState<{ script: AdminScript; runId: string } | null>(null);

  const scriptsQuery = useQuery({
    queryKey: SCRIPTS_KEY,
    queryFn: scriptService.getScripts,
    // Poll while anything runs, so status and "last run" stay current.
    refetchInterval: (q) =>
      q.state.data?.some((s) => s.lastRun?.status === "running") ? 3000 : false,
  });
  const scripts = scriptsQuery.data ?? [];
  const groups = [...new Set(scripts.map((s) => s.group))];

  return (
    <TooltipProvider delayDuration={150}>
      <PageHeader
        title="Scripts"
        description="Run the import, sync and scraper scripts on the server. Hover the i icons for what each one does. Each script can run once at a time; its output is kept in the log."
      />

      {scriptsQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading scripts…
        </div>
      )}
      {scriptsQuery.isError && (
        <EmptyState
          icon={TerminalSquare}
          title="Couldn't load scripts"
          description={apiError(scriptsQuery.error, "Please try again.")}
        />
      )}

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {scripts
                .filter((s) => s.group === group)
                .map((s) => (
                  <ScriptCard
                    key={s.key}
                    script={s}
                    onShowLog={(runId) => setLogRun({ script: s, runId })}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>

      <RunLogDialog
        script={logRun?.script ?? null}
        runId={logRun?.runId ?? null}
        onRunChange={(runId) => logRun && setLogRun({ ...logRun, runId })}
        onClose={() => setLogRun(null)}
      />
    </TooltipProvider>
  );
}

function InfoTip({ label, text }: { label: string; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`About ${label}`}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm leading-snug">{text}</TooltipContent>
    </Tooltip>
  );
}

function LastRun({ script }: { script: AdminScript }) {
  const run = script.lastRun;
  if (!run) return <p className="text-sm text-muted-foreground">Never run</p>;
  const meta = RUN_STATUS_META[run.status];
  const ticked = describeRunOptions(script.options, run.options ?? {});
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
        <span className="text-foreground">Last run {formatRunTime(run.startedAt)}</span>
        <span className="text-muted-foreground">({timeAgo(run.startedAt)})</span>
      </div>
      <p className="text-muted-foreground">
        {run.finishedAt ? `Took ${formatDuration(run.startedAt, run.finishedAt)}` : "Still running"}
        {run.startedBy && ` · by ${run.startedBy.name || run.startedBy.email}`}
        {ticked.length > 0 && ` · ${ticked.join(", ")}`}
      </p>
    </div>
  );
}

function OptionField({
  option,
  value,
  files,
  disabled,
  onChange,
  onFiles,
  idPrefix,
}: {
  option: ScriptOption;
  value: boolean | string | undefined;
  files: File[];
  disabled: boolean;
  onChange: (v: boolean | string) => void;
  onFiles: (f: File[]) => void;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${option.key}`;
  const tip = <InfoTip label={option.label} text={option.description} />;

  if (option.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={value === true}
          disabled={disabled}
          onCheckedChange={(c) => onChange(c === true)}
        />
        <Label htmlFor={id} className="cursor-pointer font-normal">
          {option.label}
        </Label>
        {tip}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>
          {option.label}
          {option.required && <span className="text-destructive"> *</span>}
        </Label>
        {tip}
      </div>
      {option.type === "files" ? (
        <>
          <Input
            id={id}
            type="file"
            multiple
            accept={option.accept?.join(",")}
            disabled={disabled}
            onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <p className="text-xs text-muted-foreground">{files.length} file(s) selected</p>
          )}
        </>
      ) : (
        <Input
          id={id}
          type={option.type === "number" ? "number" : "date"}
          min={option.type === "number" ? option.min : undefined}
          placeholder={option.type === "number" ? "All" : undefined}
          className="max-w-48"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function ScriptCard({
  script,
  onShowLog,
}: {
  script: AdminScript;
  onShowLog: (runId: string) => void;
}) {
  const qc = useQueryClient();
  const [values, setValues] = useState<ScriptFormValues>({});
  const [files, setFiles] = useState<File[]>([]);
  const [confirming, setConfirming] = useState(false);
  const running = script.lastRun?.status === "running";
  const fileOption = script.options.find((o) => o.type === "files");
  const isDryRun = values.dryRun === true;

  const runMutation = useMutation({
    mutationFn: () =>
      scriptService.runScript(script.key, toRunOptions(script.options, values), files),
    onSuccess: (run) => {
      toast.success(`${script.name} started`);
      qc.invalidateQueries({ queryKey: SCRIPTS_KEY });
      onShowLog(run._id);
    },
    onError: (e) => toast.error(apiError(e, "Couldn't start the script")),
  });
  const stopMutation = useMutation({
    mutationFn: () => scriptService.stopScriptRun(script.lastRun!._id),
    onSuccess: () => {
      toast.success("Stopping…");
      qc.invalidateQueries({ queryKey: SCRIPTS_KEY });
    },
    onError: (e) => toast.error(apiError(e, "Couldn't stop the script")),
  });

  const missingFiles = fileOption?.required && files.length === 0;
  const ticked = describeRunOptions(script.options, toRunOptions(script.options, values));

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="font-display text-base font-bold text-foreground">{script.name}</h3>
          <InfoTip label={script.name} text={script.description} />
        </div>
      </div>

      <LastRun script={script} />

      {script.options.length > 0 && (
        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          {script.options.map((o) => (
            <div key={o.key} className={o.type === "files" ? "sm:col-span-2" : undefined}>
              <OptionField
                option={o}
                idPrefix={script.key}
                value={values[o.key]}
                files={files}
                disabled={running || runMutation.isPending}
                onChange={(v) => setValues((prev) => ({ ...prev, [o.key]: v }))}
                onFiles={setFiles}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {running ? (
          <>
            <Button
              variant="destructive"
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
            >
              <Square className="size-4" /> Stop
            </Button>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Running…
            </span>
          </>
        ) : (
          <Button
            onClick={() => setConfirming(true)}
            disabled={runMutation.isPending || missingFiles}
          >
            {runMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {isDryRun ? "Run dry run" : "Run"}
          </Button>
        )}
        {script.lastRun && (
          <Button variant="outline" onClick={() => onShowLog(script.lastRun!._id)}>
            <FileText className="size-4" /> {running ? "Live log" : "View log"}
          </Button>
        )}
        {missingFiles && !running && (
          <span className="text-xs text-muted-foreground">
            Choose {fileOption!.label.toLowerCase()} first
          </span>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run “{script.name}”?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {isDryRun
                    ? "Dry run: it shows what would change and saves nothing."
                    : "This runs on the server and can change live data. It keeps running if you leave this page."}
                </p>
                <p>
                  {ticked.length ? `Options: ${ticked.join(", ")}.` : "No options ticked."}
                  {files.length > 0 && ` ${files.length} file(s).`}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => runMutation.mutate()}>Run</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RunLogDialog({
  script,
  runId,
  onRunChange,
  onClose,
}: {
  script: AdminScript | null;
  runId: string | null;
  onRunChange: (runId: string) => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const logRef = useRef<HTMLPreElement>(null);

  const runQuery = useQuery({
    queryKey: ["admin", "scripts", "run", runId],
    queryFn: () => scriptService.getScriptRun(runId!),
    enabled: !!runId,
    refetchInterval: (q) => (q.state.data?.status === "running" ? 2000 : false),
  });
  const historyQuery = useQuery({
    queryKey: ["admin", "scripts", script?.key, "runs"],
    queryFn: () => scriptService.getScriptRuns(script!.key),
    enabled: !!script,
  });
  const run: ScriptRun | undefined = runQuery.data;

  // When the run finishes, refresh the cards and the history.
  const status = run?.status;
  useEffect(() => {
    if (status && status !== "running") {
      qc.invalidateQueries({ queryKey: SCRIPTS_KEY });
      qc.invalidateQueries({ queryKey: ["admin", "scripts", script?.key, "runs"] });
    }
  }, [status, qc, script?.key]);

  // Follow the end of the log while it grows.
  useEffect(() => {
    const el = logRef.current;
    if (el && status === "running") el.scrollTop = el.scrollHeight;
  }, [run?.log, status]);

  return (
    <Dialog open={!!runId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{script?.name ?? "Script"} — log</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              {run && (
                <>
                  <StatusBadge tone={RUN_STATUS_META[run.status].tone}>
                    {RUN_STATUS_META[run.status].label}
                  </StatusBadge>
                  <span>Started {formatRunTime(run.startedAt)}</span>
                  {run.finishedAt && (
                    <span>· took {formatDuration(run.startedAt, run.finishedAt)}</span>
                  )}
                  {run.files?.length > 0 && <span>· {run.files.length} file(s)</span>}
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {runQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading log…
          </div>
        ) : (
          <pre
            ref={logRef}
            className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono text-xs text-foreground"
          >
            {run?.logTruncated && "… (earlier output trimmed)\n"}
            {run?.log || (run?.status === "running" ? "Waiting for output…" : "No output.")}
          </pre>
        )}

        {(historyQuery.data?.length ?? 0) > 1 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Recent runs</p>
            <div className="flex flex-wrap gap-1.5">
              {historyQuery.data!.map((r) => (
                <Button
                  key={r._id}
                  size="sm"
                  variant={r._id === runId ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => onRunChange(r._id)}
                >
                  {formatRunTime(r.startedAt)} · {RUN_STATUS_META[r.status].label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
