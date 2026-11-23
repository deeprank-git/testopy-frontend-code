import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Flag,
  LayoutDashboard,
  LogOut,
  Newspaper,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
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
import { Logo } from "@/components/site/Logo";
import { getUser } from "@/lib/auth-store";
import * as authService from "@/services/authService";
import { AdminBreadcrumbs, BreadcrumbsProvider } from "./breadcrumbs";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

// Same flat list style as the student DashboardSidebar. Pages, Media and
// Settings are left out: nothing on the student site reads them yet (their
// routes still exist under /admin-dashboard/*).
const NAV: NavItem[] = [
  { to: "/admin-dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin-dashboard/exams", label: "Exams", icon: BookOpen },
  { to: "/admin-dashboard/current-affairs", label: "Current Affairs", icon: Newspaper },
  { to: "/admin-dashboard/users", label: "Users", icon: Users },
  { to: "/admin-dashboard/reports", label: "Reports", icon: Flag },
  { to: "/admin-dashboard/notifications", label: "Notifications", icon: Bell },
];

export function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const user = getUser();
  const name = user?.name || user?.email?.split("@")[0] || "Admin";
  const initials = name.slice(0, 2).toUpperCase();

  const logOut = () => {
    authService.logout();
    navigate({ to: "/admin-login" });
  };

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.to || pathname === `${item.to}/`
      : pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-surface-muted">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.label}>
                        <Link to={item.to as never} className="flex items-center gap-2.5">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <BreadcrumbsProvider>
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
              <SidebarTrigger />
              <div className="min-w-0 flex-1">
                <AdminBreadcrumbs />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-muted">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline">
                      {name.split(" ")[0]}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/admin-dashboard/profile" })}>
                    <User className="mr-2 h-4 w-4" /> My profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={logOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>
            <main className="w-full flex-1 p-4 lg:p-6">
              <Outlet />
            </main>
          </BreadcrumbsProvider>
        </div>
      </div>
    </SidebarProvider>
  );
}
