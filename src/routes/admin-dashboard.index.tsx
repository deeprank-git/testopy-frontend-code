import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Flag,
  Layers,
  ListChecks,
  Newspaper,
  Bell,
  Plus,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { unwrapItem } from "@/lib/api-unwrap";
import { getUser } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import * as analyticsService from "@/services/analyticsService";
import type { TrendRange } from "@/services/analyticsService";
import { FilterChips } from "@/components/admin/FilterChips";
import { PageHeader } from "@/components/admin/PageHeader";
import { useBreadcrumbs } from "@/components/admin/breadcrumbs";

export const Route = createFileRoute("/admin-dashboard/")({
  component: AdminDashboardHome,
});

type Overview = {
  users?: { total?: number; newLast7Days?: number; blocked?: number };
  content?: {
    categories?: number;
    testSeries?: number;
    tests?: number;
    publishedTests?: number;
    questions?: number;
    currentAffairs?: number;
  };
  attempts?: {
    total?: number;
    inProgress?: number;
    completed?: number;
    autoSubmitted?: number;
    last7Days?: number;
    avgScorePercentage?: number;
  };
  moderation?: { pendingReports?: number };
};

// Static class names so Tailwind picks them up (no `bg-${tone}` interpolation).
const TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
} as const;

const fmt = (n?: number) => (n ?? 0).toLocaleString();

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: keyof typeof TONES;
  to?: string;
}) {
  const body = (
    <div className="flex items-center gap-3">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", TONES[tone])}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-display text-xl font-bold leading-tight tabular-nums">{value}</div>
        {sub && <div className="truncate text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
  return to ? (
    <Link
      to={to as never}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="p-4 transition hover:border-primary/40 hover:shadow-md">{body}</Card>
    </Link>
  ) : (
    <Card className="p-4">{body}</Card>
  );
}

// Categorical slots 1–3 of the dataviz reference palette, fixed order, one per
// status (validated with scripts/validate_palette.js on the light surface:
// all checks pass; aqua is < 3:1 vs the surface, so the legend always names it).
const STATUS_SERIES = [
  { key: "completed", label: "Completed", color: "#2a78d6" },
  { key: "autoSubmitted", label: "Auto-submitted", color: "#eb6834" },
  { key: "inProgress", label: "In progress", color: "#1baf7a" },
] as const;

// Slate grey for the total: a neutral backdrop series that never reads as a
// status. (No 4th hue passes the all-pairs colour checks next to blue/orange/aqua,
// and the series overlap, so every pair must be distinguishable.)
const TOTAL_COLOR = "#64748b";

const trendConfig = {
  count: { label: "Total", color: TOTAL_COLOR },
  ...Object.fromEntries(STATUS_SERIES.map((s) => [s.key, { label: s.label, color: s.color }])),
} satisfies ChartConfig;

type TrendPoint = {
  date: string;
  count: number;
  completed: number;
  autoSubmitted: number;
  inProgress: number;
};
type Trend = {
  range: TrendRange;
  granularity: "day" | "month";
  total: number;
  points: TrendPoint[];
};

const RANGE_OPTIONS: { value: TrendRange; label: string; caption: string }[] = [
  { value: "7d", label: "7 days", caption: "Attempts started per day, last 7 days" },
  { value: "30d", label: "30 days", caption: "Attempts started per day, last 30 days" },
  { value: "all", label: "All time", caption: "Attempts started per month, all time" },
];

// Buckets are UTC days ("YYYY-MM-DD") or months ("YYYY-MM"); format in UTC so
// the label matches the bucket.
const bucketLabel = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date.length === 7 ? `${date}-01` : date}T00:00:00Z`).toLocaleDateString(undefined, {
    ...opts,
    timeZone: "UTC",
  });

type SeriesKey = "count" | (typeof STATUS_SERIES)[number]["key"];

/**
 * Attempts started over time with a range toggle. Each status is a filled area
 * at its OWN value (not stacked — stacking made each outline show a running
 * sum), so a status at 0 is a line on the baseline. The total is a dark solid
 * outline with a light grey fill. Each series can be shown/hidden from the legend.
 */
function AttemptsTrend({ attempts }: { attempts: NonNullable<Overview["attempts"]> }) {
  const [range, setRange] = useState<TrendRange>("30d");
  const [hidden, setHidden] = useState<Set<SeriesKey>>(() => new Set());
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "attempts-trend", range],
    queryFn: () => analyticsService.getAttemptsTrend(range),
    placeholderData: keepPreviousData,
  });
  const trend = unwrapItem<Trend>(data);
  const points = trend?.points ?? [];
  const monthly = trend?.granularity === "month";
  const option = RANGE_OPTIONS.find((o) => o.value === range)!;

  const shownStatuses = STATUS_SERIES.filter((s) => !hidden.has(s.key));
  const showTotal = !hidden.has("count");

  const toggle = (key: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      // Keep at least one series visible.
      else if (next.size < STATUS_SERIES.length) next.add(key);
      return next;
    });

  const legend: { key: SeriesKey; label: string; color: string; value?: number }[] = [
    { key: "count", label: "Total", color: TOTAL_COLOR, value: attempts.total },
    ...STATUS_SERIES.map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
      value: attempts[s.key],
    })),
  ];

  const tickFormat: Intl.DateTimeFormatOptions = monthly
    ? { month: "short", year: "2-digit" }
    : { month: "short", day: "numeric" };
  const tooltipFormat: Intl.DateTimeFormatOptions = monthly
    ? { month: "long", year: "numeric" }
    : { weekday: "short", month: "short", day: "numeric" };
  const dot = points.length <= 12;

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold">Test attempts</h3>
          <p className="text-sm text-muted-foreground">{option.caption}</p>
        </div>
        <FilterChips<TrendRange>
          value={range}
          onChange={setRange}
          options={RANGE_OPTIONS.map(({ value, label }) => ({ value, label }))}
        />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold leading-none">
          {trend ? fmt(trend.total) : "—"}
        </span>
        <span className="text-sm text-muted-foreground">
          attempts {range === "all" ? "in total" : `in the last ${option.label}`}
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-56 w-full rounded-lg" />
      ) : (trend?.total ?? 0) === 0 ? (
        <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          No test attempts in this period.
        </p>
      ) : (
        <ChartContainer
          config={trendConfig}
          className={cn(
            "mt-4 aspect-auto h-56 w-full transition-opacity",
            isFetching && "opacity-60",
          )}
        >
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="fill-total" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.03} />
              </linearGradient>
              {STATUS_SERIES.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={`var(--color-${s.key})`} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={`var(--color-${s.key})`} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(v: string) => bucketLabel(v, tickFormat)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
              tickFormatter={(v: number) => v.toLocaleString()}
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, payload) => {
                    const date = payload?.[0]?.payload?.date as string | undefined;
                    return date ? bucketLabel(date, tooltipFormat) : "";
                  }}
                />
              }
            />
            {/* Total first so the status fills draw on top of its grey fill. */}
            {showTotal && (
              <Area
                dataKey="count"
                type="monotone"
                stroke="var(--color-count)"
                strokeWidth={2}
                fill="url(#fill-total)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
              />
            )}
            {shownStatuses.map((s) => (
              <Area
                key={s.key}
                dataKey={s.key}
                type="monotone"
                stroke={`var(--color-${s.key})`}
                strokeWidth={2}
                fill={`url(#fill-${s.key})`}
                dot={dot ? { r: 3, strokeWidth: 0, fill: s.color } : false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)", fill: s.color }}
              />
            ))}
          </ComposedChart>
        </ChartContainer>
      )}

      {/* Legend doubles as the series picker. Counts are all time. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {legend.map((s) => {
          const on = !hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.key)}
              title={on ? `Hide ${s.label}` : `Show ${s.label}`}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition",
                on
                  ? "border-border bg-background hover:bg-muted"
                  : "border-dashed border-border text-muted-foreground opacity-60 hover:opacity-100",
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: on ? s.color : "transparent",
                  boxShadow: `inset 0 0 0 2px ${s.color}`,
                }}
                aria-hidden
              />
              <span className={on ? "text-foreground" : undefined}>{s.label}</span>
              <span className="font-medium">{fmt(s.value)}</span>
            </button>
          );
        })}
        <span className="text-xs text-muted-foreground sm:ml-auto">
          Click to show or hide · counts are all time
        </span>
      </div>
    </Card>
  );
}

function ContentCard({ content }: { content: NonNullable<Overview["content"]> }) {
  const unpublished = (content.tests ?? 0) - (content.publishedTests ?? 0);
  const rows: { icon: LucideIcon; label: string; value?: number }[] = [
    { icon: BookOpen, label: "Categories", value: content.categories },
    { icon: Layers, label: "Test series", value: content.testSeries },
    { icon: ClipboardCheck, label: "Tests", value: content.tests },
    { icon: ListChecks, label: "Questions", value: content.questions },
    { icon: Newspaper, label: "Current affairs", value: content.currentAffairs },
  ];
  return (
    <Card className="flex flex-col p-5">
      <h3 className="mb-3 font-display font-bold">Content</h3>
      <ul className="flex-1 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <r.icon className="size-4" /> {r.label}
            </span>
            <span className="font-medium tabular-nums">{fmt(r.value)}</span>
          </li>
        ))}
      </ul>
      {unpublished > 0 && (
        <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-foreground">
          {fmt(unpublished)} test{unpublished === 1 ? " is" : "s are"} not published yet.
        </p>
      )}
      <Button asChild variant="ghost" size="sm" className="mt-3 justify-between">
        <Link to="/admin-dashboard/exams">
          Manage exams <ArrowRight className="size-4" />
        </Link>
      </Button>
    </Card>
  );
}

const QUICK_ACTIONS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/admin-dashboard/exams", label: "Add a test", icon: Plus },
  { to: "/admin-dashboard/current-affairs", label: "Post current affairs", icon: Newspaper },
  { to: "/admin-dashboard/notifications", label: "Send a notification", icon: Bell },
  { to: "/admin-dashboard/reports", label: "Review reports", icon: Flag },
];

function AdminDashboardHome() {
  useBreadcrumbs([{ label: "Dashboard" }]);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "analytics-overview"],
    queryFn: () => analyticsService.getOverview(),
  });
  const overview = unwrapItem<Overview>(data) ?? {};
  const users = overview.users ?? {};
  const content = overview.content ?? {};
  const attempts = overview.attempts ?? {};
  const pendingReports = overview.moderation?.pendingReports ?? 0;
  const firstName = (getUser()?.name || "").split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}! 👋` : "Dashboard"}
        description="Here's what's happening on GovtPrep."
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat
            icon={Users}
            label="Users"
            value={fmt(users.total)}
            sub={`+${fmt(users.newLast7Days)} this week`}
            to="/admin-dashboard/users"
          />
          <Stat
            icon={ClipboardCheck}
            label="Published tests"
            value={`${fmt(content.publishedTests)} / ${fmt(content.tests)}`}
            sub="of all active tests"
            tone="success"
            to="/admin-dashboard/exams"
          />
          <Stat
            icon={ListChecks}
            label="Test attempts"
            value={fmt(attempts.total)}
            sub={`+${fmt(attempts.last7Days)} this week`}
          />
          <Stat
            icon={Target}
            label="Average score"
            value={`${attempts.avgScorePercentage ?? 0}%`}
            sub="across submitted attempts"
            tone="warning"
          />
          <Stat
            icon={Flag}
            label="Pending reports"
            value={fmt(pendingReports)}
            sub={pendingReports > 0 ? "Needs review" : "All clear"}
            tone={pendingReports > 0 ? "danger" : "success"}
            to="/admin-dashboard/reports"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-64 rounded-xl lg:col-span-2" />
            <Skeleton className="h-64 rounded-xl" />
          </>
        ) : (
          <>
            <AttemptsTrend attempts={attempts} />
            <ContentCard content={content} />
          </>
        )}
      </div>

      <Card className="p-5">
        <h3 className="mb-3 font-display font-bold">Quick actions</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <Button key={a.label} asChild variant="outline" className="justify-start">
              <Link to={a.to as never}>
                <a.icon className="size-4" /> {a.label}
              </Link>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
