import { Link } from "@tanstack/react-router";
import { CalendarDays, Eye, ExternalLink, Sparkles, PenLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleImage } from "@/components/site/ArticleImage";
import { ArticleBody } from "@/components/site/ArticleBody";
import { ARTICLE_LINK_CLASS } from "@/lib/articleContent";
import { cn } from "@/lib/utils";

type Variant = "public" | "dashboard";

// Magazine-style Current Affairs article detail — shared between the public
// route (/current-affairs/$id) and the authenticated dashboard route
// (/dashboard/current-affairs/$id), which fetch and render the exact same
// API response (GET /api/current-affairs/:id is public/optionalAuth and
// identical for anonymous vs. logged-in non-admin callers), so there's no
// auth-based branching here — only which internal route "More in <category>"
// and "Browse All" link back into.
export function ArticleDetail({ article, more, variant }: { article: any; more: any[]; variant: Variant }) {
  const hasAttribution = !!(article.source || article.source_link || article.url);
  const tags: string[] = Array.isArray(article.tags) ? article.tags.filter(Boolean) : [];

  return (
    <div className="grid xl:grid-cols-[1fr_320px] gap-5 items-start">
      <Card className="overflow-hidden min-w-0">
        <div className="px-6 pt-7 lg:px-10 lg:pt-9">
          {article.category_link ? (
            <a href={article.category_link} target="_blank" rel="noopener noreferrer">
              <Badge className="bg-primary/10 text-primary border-transparent font-semibold uppercase tracking-wide text-[11px] hover:bg-primary/20 transition-colors cursor-pointer">
                {article.category}
              </Badge>
            </a>
          ) : (
            <Badge className="bg-primary/10 text-primary border-transparent font-semibold uppercase tracking-wide text-[11px]">
              {article.category}
            </Badge>
          )}

          <h1 className="mt-4 max-w-[760px] font-display text-[28px] font-extrabold leading-[1.2] tracking-tight text-foreground text-balance md:text-[38px]">
            {article.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {new Date(article.date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </span>
            {article.source && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="text-border">•</span>
                Source: <span className="font-medium text-foreground/80">{article.source}</span>
              </span>
            )}
            {typeof article.views === "number" && article.views > 0 && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="text-border">•</span>
                <Eye className="h-4 w-4" />
                {article.views.toLocaleString()} view{article.views === 1 ? "" : "s"}
              </span>
            )}
            {/* createdBy is absent for every scraper-sourced article, so its
                absence is a reasonable (not guaranteed) signal the piece is
                curated rather than staff-written. */}
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="text-border">•</span>
              {article.createdBy ? <PenLine className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {article.createdBy ? "Staff-written" : "Curated"}
            </span>
          </div>
        </div>

        {/* No image: the article starts straight with its text (no placeholder). */}
        <ArticleImage
          image={article.image}
          alt={article.title}
          fit="contain"
          hideWhenMissing
          className="mx-6 mt-6 max-h-[440px] rounded-xl border border-border lg:mx-10 [&_img]:max-h-[440px]"
        />

        <div className="px-6 pb-8 pt-7 lg:px-10 lg:pb-10">
          {article.summary && (
            <p className="mb-6 max-w-[720px] border-l-4 border-primary/60 pl-4 text-lg leading-relaxed text-foreground/80">
              {article.summary}
            </p>
          )}

          <ArticleBody content={article.content} title={article.title} />

          {tags.length > 0 && (
            <div className="mt-10 flex max-w-[720px] flex-wrap items-center gap-2 border-t border-border pt-5">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topics</span>
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {hasAttribution && (
            <div className={cn("max-w-[720px] text-sm", tags.length > 0 ? "mt-4" : "mt-10 border-t border-border pt-5")}>
              {article.source || article.source_link ? (
                <p className="text-muted-foreground">
                  Originally published by{" "}
                  <a
                    href={article.source_link || article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(ARTICLE_LINK_CLASS, "font-medium")}
                  >
                    {article.source || "original source"}
                  </a>
                </p>
              ) : (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(ARTICLE_LINK_CLASS, "font-medium inline-flex items-center gap-1")}
                >
                  Read original article <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </Card>

      <aside className="space-y-4">
        <Card className="p-4">
          <h3 className="font-display font-bold text-sm mb-3">More in {article.category}</h3>
          {more.length > 0 ? (
            <div className="space-y-3">
              {more.map((a: any) =>
                variant === "dashboard" ? (
                  <MoreItem key={a._id} article={a} to="/dashboard/current-affairs/$id" />
                ) : (
                  <MoreItem key={a._id} article={a} to="/current-affairs/$id" />
                ),
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No other articles in this category yet.</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-display font-bold text-sm mb-1">Explore Current Affairs</h3>
          <p className="text-xs text-muted-foreground">Browse every category and catch up on the latest updates.</p>
          <Button asChild className="w-full mt-3" size="sm">
            {variant === "dashboard" ? (
              <Link to="/dashboard/current-affairs">Browse All</Link>
            ) : (
              <Link to="/current-affairs">Browse All</Link>
            )}
          </Button>
        </Card>
      </aside>
    </div>
  );
}

function MoreItem({ article: a, to }: { article: any; to: "/current-affairs/$id" | "/dashboard/current-affairs/$id" }) {
  return (
    <Link to={to} params={{ id: a._id }} className="flex gap-3 group">
      <ArticleImage image={a.image} alt={a.title} className="h-14 w-14 rounded-md" />
      <div className="min-w-0">
        <div className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {a.title}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {new Date(a.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>
    </Link>
  );
}
