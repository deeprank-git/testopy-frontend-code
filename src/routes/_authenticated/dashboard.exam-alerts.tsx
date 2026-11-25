import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  IdCard,
  Megaphone,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { unwrapList } from "@/lib/api-unwrap";
import {
  ALERT_TYPE_META,
  alertListParams,
  alertStatus,
  formatAlertDate,
  localYmd,
  withAlertCategories,
  type AlertFilters,
  type AlertType,
  type ExamAlert,
} from "@/lib/exam-alerts";
import { isExternalLink } from "@/lib/notifications";
import { AppLink } from "@/components/site/AppLink";
import * as examAlertService from "@/services/examAlertService";
import * as categoryService from "@/services/categoryService";

export const Route = createFileRoute("/_authenticated/dashboard/exam-alerts")({
  component: AlertsPage,
});

const TABS: { id: AlertFilters["tab"]; label: string }[] = [
  { id: "all", label: "All Alerts" },
  { id: "exam_date", label: "Upcoming Exams" },
  { id: "registration", label: "Registrations Open" },
  { id: "admit_card", label: "Admit Card" },
  { id: "result", label: "Results" },
  { id: "other", label: "Others" },
];

const ALERT_ICONS: Record<AlertType, LucideIcon> = {
  exam_date: Calendar,
  registration: Edit3,
  admit_card: IdCard,
  result: Megaphone,
  other: AlertTriangle,
};

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

type SideFilters = Omit<AlertFilters, "tab">;
const EMPTY_FILTERS: SideFilters = { category: "all", type: "all", month: "all", status: "all" };

const PAGE_SIZE = 7;

function AlertsPage() {
  const [tab, setTab] = useState<AlertFilters["tab"]>("all");
  const [filters, setFilters] = useState<SideFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  // The viewer's local day: "upcoming"/"past" and the header counts are relative to it.
  const today = localYmd(new Date());

  // One page at a time, filtered on the server. Null params = tab and type disagree.
  const params = alertListParams({ tab, ...filters }, today);
  const alertsQuery = useQuery({
    queryKey: ["exam-alerts", "list", params, page],
    queryFn: () => examAlertService.getExamAlerts({ ...params, page, limit: PAGE_SIZE }),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  });
  const pageRows = params === null ? [] : unwrapList<ExamAlert>(alertsQuery.data);
  const total = params === null ? 0 : (alertsQuery.data?.total ?? 0);
  const totalPages = params === null ? 1 : (alertsQuery.data?.totalPages ?? 1);
  const listLoaded = params === null || alertsQuery.isSuccess;
  // Alerts archived while viewing the last page can leave us past the end: step back.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summaryQuery = useQuery({
    queryKey: ["exam-alerts", "summary", today],
    queryFn: () => examAlertService.getExamAlertSummary(today),
  });
  const stats = summaryQuery.data;

  const { data: categoriesRes } = useQuery({
    queryKey: ["exam-alerts", "categories"],
    queryFn: () => categoryService.getCategories(),
  });
  const categories = unwrapList<{ _id: string; name: string }>(categoriesRes);
  // Archived categories still on an alert stay filterable.
  const categoryOptions = useMemo(
    () =>
      withAlertCategories(
        categories,
        (stats?.categories ?? []).map((category) => ({ category })),
      ),
    [categories, stats],
  );

  const setFilter = <K extends keyof SideFilters>(key: K, value: SideFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const STATS = [
    { icon: CalendarDays, value: stats?.upcomingExams, label: "Upcoming Exams", tint: "bg-blue-50 text-blue-600" },
    { icon: Sparkles, value: stats?.newThisWeek, label: "New This Week", tint: "bg-emerald-50 text-emerald-600" },
    { icon: CheckCircle2, value: stats?.total, label: "Total Alerts", tint: "bg-violet-50 text-violet-600" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold flex items-center gap-2">
            Exam Alerts <Bell className="h-5 w-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Exam dates, registrations, admit cards, results and important updates in one place.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 xl:w-[480px]">
          {STATS.map((s, i) => (
            <motion.div key={s.label} whileHover={{ y: -2 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                <div className={`h-10 w-10 rounded-lg grid place-items-center ${s.tint}`}><s.icon className="h-5 w-5" /></div>
                <div>
                  <div className="font-display font-extrabold text-lg leading-none">
                    {s.value ?? "–"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{s.label}</div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <div className="space-y-5">
          <Card className="p-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <FilterField label="Exam Category">
                <Select value={filters.category} onValueChange={(v) => setFilter("category", v)}>
                  <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Notification Type">
                <Select value={filters.type} onValueChange={(v) => setFilter("type", v as SideFilters["type"])}>
                  <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {(Object.keys(ALERT_TYPE_META) as AlertType[]).map((t) => (
                      <SelectItem key={t} value={t}>{ALERT_TYPE_META[t].chip}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Exam Month">
                <Select value={filters.month} onValueChange={(v) => setFilter("month", v)}>
                  <SelectTrigger><SelectValue placeholder="All Months" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m}>{new Date(2025, +m - 1).toLocaleString("en", { month: "long" })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Status">
                <Select value={filters.status} onValueChange={(v) => setFilter("status", v as SideFilters["status"])}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <Button variant="outline" onClick={reset} className="text-primary border-primary/30">
                <RotateCcw className="h-4 w-4 mr-2" /> Reset Filters
              </Button>
            </div>
          </Card>

          <Card>
            <div className="border-b border-border px-4">
              <div className="flex items-center gap-6 overflow-x-auto">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setTab(t.id); setPage(1); }}
                      className={`relative py-3 text-sm whitespace-nowrap transition-colors ${active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t.label}
                      {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="divide-y divide-border">
              {alertsQuery.isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-4 py-4 flex items-center gap-4">
                    <Skeleton className="h-11 w-11 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}

              {alertsQuery.isError && (
                <div className="p-12 text-center text-sm text-muted-foreground space-y-3">
                  <div>Couldn't load alerts</div>
                  <Button size="sm" variant="outline" onClick={() => alertsQuery.refetch()}>Retry</Button>
                </div>
              )}

              {listLoaded && pageRows.length === 0 && stats?.total === 0 && (
                <div className="p-12 text-center text-sm text-muted-foreground">No alerts yet — check back soon.</div>
              )}
              {listLoaded &&
                pageRows.length === 0 &&
                ((stats !== undefined && stats.total > 0) || summaryQuery.isError) && (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    No alerts match these filters.
                  </div>
                )}

              {pageRows.map((a) => {
                const meta = ALERT_TYPE_META[a.type] ?? ALERT_TYPE_META.other;
                const Icon = ALERT_ICONS[a.type] ?? AlertTriangle;
                const isUpcoming = alertStatus(a) === "upcoming";
                return (
                  <motion.div
                    key={a._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
                    className="px-4 py-4 flex items-center gap-4"
                  >
                    <div className={`h-11 w-11 rounded-lg grid place-items-center shrink-0 ${meta.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{a.title}</div>
                      {a.description && <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>}
                      {a.category && <div className="text-[11px] text-muted-foreground mt-0.5">{a.category.name}</div>}
                    </div>
                    <Badge className={`${meta.badge} border-0`}>{meta.label}</Badge>
                    <div className="text-right text-xs">
                      <div className="font-medium">{formatAlertDate(a.date)}</div>
                      <div className={isUpcoming ? "text-emerald-600" : "text-muted-foreground"}>
                        {isUpcoming ? "Upcoming" : "Past"}
                      </div>
                    </div>
                    {a.link && (
                      <Button asChild size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/5">
                        <AppLink href={a.link}>
                          View details
                          {isExternalLink(a.link) && (
                            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                          )}
                        </AppLink>
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} alerts
                </span>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((n) => (
                    <Button key={n} size="icon" variant={n === page ? "default" : "ghost"} className="h-8 w-8 text-xs" onClick={() => setPage(n)}>{n}</Button>
                  ))}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}
