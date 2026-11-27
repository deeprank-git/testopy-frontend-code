import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays, ChevronRight, ExternalLink, FileText, GraduationCap, Newspaper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ExamIcon } from "@/components/site/ExamIcon";
import { AppLink } from "@/components/site/AppLink";
import { unwrapList } from "@/lib/api-unwrap";
import { ALERT_TYPE_META, formatAlertDate, localYmd, type ExamAlert } from "@/lib/exam-alerts";
import { isPublishedVisible } from "@/lib/publish";
import * as examAlertService from "@/services/examAlertService";
import * as testSeriesService from "@/services/testSeriesService";
import * as mediaService from "@/services/mediaService";

// Public exam alerts page (footer "Exam Alerts"). Everything here is real
// data: upcoming alerts from GET /exam-alerts (public, auth optional) and
// published exams from GET /test-series. The full, filterable list lives at
// /dashboard/exam-alerts (login required).

const UPCOMING_LIMIT = 10;
const POPULAR_LIMIT = 6;

export const Route = createFileRoute("/exam-info")({
  head: () => ({
    meta: [
      { title: "Exam Alerts — Exam Dates, Registrations, Admit Cards & Results | Testopy" },
      {
        name: "description",
        content: "Upcoming government exam dates, registrations, admit cards and results in one place.",
      },
      { property: "og:title", content: "Exam Alerts — Testopy" },
      { property: "og:description", content: "Upcoming exam dates, registrations, admit cards and results." },
    ],
  }),
  component: ExamInfoPage,
});

type SeriesLite = { _id: string; name: string; image?: string; isPublished?: boolean; isActive?: boolean };

const QUICK_LINKS = [
  { label: "All Exams", to: "/exams", icon: GraduationCap },
  { label: "All Exam Alerts", to: "/dashboard/exam-alerts", icon: Bell },
  { label: "Previous Year Papers", to: "/dashboard/previous-year-papers", icon: FileText },
  { label: "Current Affairs", to: "/current-affairs", icon: Newspaper },
] as const;

function ExamInfoPage() {
  const today = localYmd(new Date());

  const alertsQuery = useQuery({
    queryKey: ["exam-info", "upcoming-alerts", today],
    queryFn: () =>
      examAlertService.getExamAlerts({ status: "upcoming", today, page: 1, limit: UPCOMING_LIMIT }),
  });
  const alerts = unwrapList<ExamAlert>(alertsQuery.data);

  const seriesQuery = useQuery({
    queryKey: ["exam-info", "series"],
    queryFn: () => testSeriesService.getTestSeries({ isPublished: true, isActive: true }),
  });
  const popular = unwrapList<SeriesLite>(seriesQuery.data).filter(isPublishedVisible).slice(0, POPULAR_LIMIT);

  return (
    <SiteShell>
      <section className="bg-hero-radial">
        <div className="container mx-auto px-4 lg:px-6 pt-6 pb-12">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Exam Alerts" }]} />
          <div className="mt-6 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-display font-extrabold">Exam Alerts</h1>
            <p className="mt-2 text-muted-foreground">
              Upcoming exam dates, registrations, admit cards and results — all in one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/exams" search={{ q: undefined }}>
                  Browse all exams
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/exam-alerts">See all alerts</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 lg:px-6 py-10 grid lg:grid-cols-[1fr_340px] gap-8">
        <Card className="p-5 h-fit">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Upcoming
          </h2>
          {alertsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : alertsQuery.isError ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Couldn't load exam alerts. Please try again later.</p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No upcoming exam alerts right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.map((a) => {
                const meta = ALERT_TYPE_META[a.type] ?? ALERT_TYPE_META.other;
                return (
                  <li key={a._id} className="py-3 flex items-start gap-3">
                    <span className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${meta.iconBg}`}>
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{a.title}</span>
                        <Badge className={`border-transparent text-[10px] ${meta.badge}`}>{meta.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatAlertDate(a.date)}
                        {a.category?.name ? ` · ${a.category.name}` : ""}
                      </div>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                      )}
                    </div>
                    {a.link && (
                      <AppLink
                        href={a.link}
                        className="text-xs text-primary font-medium flex items-center gap-1 shrink-0 hover:underline"
                        aria-label={`Details: ${a.title}`}
                      >
                        Details <ExternalLink className="h-3 w-3" />
                      </AppLink>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <aside className="space-y-6">
          {popular.length > 0 && (
            <Card className="p-5">
              <h3 className="font-display font-bold mb-3">Exams</h3>
              <ul className="space-y-2">
                {popular.map((s) => {
                  const logoUrl = s.image ? mediaService.resolveMediaUrl(s.image) : undefined;
                  return (
                    <li key={s._id}>
                      <Link
                        to="/exams/$id"
                        params={{ id: s._id }}
                        search={{ name: s.name }}
                        className="flex items-center gap-3 rounded-md px-1 py-1.5 text-sm hover:bg-muted transition-colors"
                      >
                        {logoUrl ? (
                          <img src={logoUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <ExamIcon name={s.name} />
                        )}
                        <span className="flex-1 truncate font-medium">{s.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          <Card className="p-5">
            <h3 className="font-display font-bold mb-3">Quick Links</h3>
            <ul className="space-y-1 text-sm">
              {QUICK_LINKS.map(({ label, to, icon: Icon }) => (
                <li key={label}>
                  <Link
                    to={to as never}
                    className="flex items-center justify-between rounded-md px-1 py-1.5 hover:text-primary hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      {label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </SiteShell>
  );
}
