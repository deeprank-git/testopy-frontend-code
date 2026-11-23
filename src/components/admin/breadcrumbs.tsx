import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type Crumb = { label: string; href?: string };

const Ctx = createContext<{ crumbs: Crumb[]; setCrumbs: (c: Crumb[]) => void } | null>(null);

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  return <Ctx.Provider value={{ crumbs, setCrumbs }}>{children}</Ctx.Provider>;
}

/** Each admin page calls this once to set the top-bar breadcrumbs. */
export function useBreadcrumbs(crumbs: Crumb[]) {
  const ctx = useContext(Ctx);
  // Stable key so passing a fresh array literal each render doesn't loop.
  const key = crumbs.map((c) => `${c.label}|${c.href ?? ""}`).join("/");
  useEffect(() => {
    ctx?.setCrumbs(crumbs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function AdminBreadcrumbs() {
  const crumbs = useContext(Ctx)?.crumbs ?? [];
  if (crumbs.length === 0) return null;
  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          // On small screens only the last two crumbs are shown.
          const hideOnMobile = i < crumbs.length - 2 ? "hidden md:inline-flex" : undefined;
          return (
            <Fragment key={`${c.label}-${i}`}>
              <BreadcrumbItem className={hideOnMobile}>
                {last || !c.href ? (
                  <BreadcrumbPage className="max-w-[220px] truncate">{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={c.href as never} className="max-w-[180px] truncate">
                      {c.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && (
                <BreadcrumbSeparator
                  className={i < crumbs.length - 2 ? "hidden md:block" : undefined}
                />
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
