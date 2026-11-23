import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronsUpDown,
  FileText,
  Flag,
  GraduationCap,
  Image as ImageIcon,
  LogOut,
  Moon,
  Newspaper,
  Settings,
  Sun,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/lib/auth-store";
import * as authService from "@/services/authService";
import { useAdminTheme } from "@/hooks/use-admin-theme";
import { AdminBreadcrumbs, BreadcrumbsProvider } from "./breadcrumbs";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/admin-dashboard", label: "Dashboard", icon: BarChart3, exact: true }],
  },
  {
    label: "Content",
    items: [
      { to: "/admin-dashboard/exams", label: "Exams", icon: BookOpen },
      { to: "/admin-dashboard/current-affairs", label: "Current Affairs", icon: Newspaper },
      { to: "/admin-dashboard/pages", label: "Pages", icon: FileText },
      { to: "/admin-dashboard/media", label: "Media", icon: ImageIcon },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/admin-dashboard/users", label: "Users", icon: Users },
      { to: "/admin-dashboard/reports", label: "Reports", icon: Flag },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin-dashboard/notifications", label: "Notifications", icon: Bell },
      { to: "/admin-dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

const initials = (s: string) =>
  s
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "A";

export function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { theme, toggle } = useAdminTheme();
  const user = getUser();
  const displayName = user?.name || user?.email || "Admin";

  const logOut = () => {
    authService.logout();
    navigate({ to: "/admin-login" });
  };

  const isActive = (to: string, exact?: boolean) =>
    exact
      ? pathname === to || pathname === `${to}/`
      : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/admin-dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <GraduationCap className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="font-display font-semibold">GovtPrep</span>
                    <span className="text-xs text-muted-foreground">Admin console</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {NAV.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.to, item.exact)}
                        tooltip={item.label}
                      >
                        <Link to={item.to as never}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        {initials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">Administrator</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                    {user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/admin-dashboard/profile" })}>
                    <User className="size-4" /> My profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={toggle}>
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={logOut}>
                    <LogOut className="size-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-muted/40">
        <BreadcrumbsProvider>
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="min-w-0 flex-1">
              <AdminBreadcrumbs />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </BreadcrumbsProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
