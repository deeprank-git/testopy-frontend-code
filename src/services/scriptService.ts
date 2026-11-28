import axiosClient from "@/api/axiosClient";
import type { AdminScript, ScriptRun } from "@/lib/scripts";

/** Every script with its last run (without the log). */
export async function getScripts() {
  const res = await axiosClient.get("/admin/scripts");
  return res.data.data as AdminScript[];
}

/** A script's latest runs, newest first (without logs). */
export async function getScriptRuns(key: string, limit = 10) {
  const res = await axiosClient.get(`/admin/scripts/${key}/runs`, { params: { limit } });
  return res.data.data as ScriptRun[];
}

/** One run, with its log. */
export async function getScriptRun(id: string) {
  const res = await axiosClient.get(`/admin/scripts/runs/${id}`);
  return res.data.data as ScriptRun;
}

/** Starts a run; files (if any) are sent as multipart. 409 = already running. */
export async function runScript(key: string, options: Record<string, unknown>, files: File[] = []) {
  if (files.length) {
    const fd = new FormData();
    fd.append("options", JSON.stringify(options));
    for (const f of files) fd.append("files", f);
    const res = await axiosClient.post(`/admin/scripts/${key}/run`, fd);
    return res.data.data as ScriptRun;
  }
  const res = await axiosClient.post(`/admin/scripts/${key}/run`, { options });
  return res.data.data as ScriptRun;
}

export async function stopScriptRun(id: string) {
  const res = await axiosClient.post(`/admin/scripts/runs/${id}/stop`);
  return res.data;
}
