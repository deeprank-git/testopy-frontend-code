import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { unwrapItem } from "@/lib/api-unwrap";
import { getUser } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import * as analyticsService from "@/services/analyticsService";
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

/** Single-series horizontal bars: one hue, value + share as text, tooltip on hover. */
function AttemptsByStatus({ attempts }: { attempts: NonNullable<Overview["attempts"]> }) {
  const rows = [
    { label: "Completed", value: attempts.completed ?? 0 },
    { label: "Auto-submitted (time ran out)", value: attempts.autoSubmitted ?? 0 },
    { label: "In progress", value: attempts.inProgress ?? 0 },
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="font-display font-bold">Test attempts by status</h3>
        <span className="text-sm text-muted-foreground tabular-nums">{fmt(total)} total</span>
      </div>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No test attempts yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const share = total ? Math.round((r.value / total) * 100) : 0;
            return (
              <li key={r.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                  <span>{r.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    <span className="font-medium text-foreground">{fmt(r.value)}</span> · {share}%
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Hit target is the full track, taller than the bar itself. */}
                    <div
                      className="flex h-5 items-center"
                      tabIndex={0}
                      aria-label={`${r.label}: ${fmt(r.value)} (${share}%)`}
                    >
                      <div className="h-2.5 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${r.value === 0 ? 0 : Math.max(2, (r.value / max) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {r.label}: {fmt(r.value)} of {fmt(total)} attempts ({share}%)
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      )}
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
            <AttemptsByStatus attempts={attempts} />
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
