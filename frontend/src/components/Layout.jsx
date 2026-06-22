import {
  BriefcaseBusiness,
  Building2,
  FileSearch,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Send,
  UserRound
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const candidateNavItems = [
  { to: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/candidate/jobs", label: "Job Board", icon: BriefcaseBusiness },
  { to: "/candidate/job-applications", label: "Submissions", icon: Send },
  { to: "/applications", label: "Saved", icon: BriefcaseBusiness },
  { to: "/applications/ai-cv-matching", label: "AI CV Matching", icon: FileSearch },
  { to: "/candidate/profile", label: "Profile", icon: UserRound }
];

const hrNavItems = [
  { to: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hr/company", label: "Company", icon: Building2 },
  { to: "/hr/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/hr/jobs/new", label: "New Job", icon: PlusCircle }
];

function isNavItemActive(item, pathname) {
  if (item.to === "/applications") {
    return pathname === "/applications" || /^\/applications\/\d+(\/edit)?$/.test(pathname);
  }
  if (item.to === "/applications/ai-cv-matching") {
    return pathname === item.to;
  }
  if (item.to === "/hr/jobs") {
    return pathname === "/hr/jobs" || /^\/hr\/jobs\/\d+/.test(pathname);
  }
  if (item.to === "/hr/jobs/new") {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = user?.role === "hr" ? hrNavItems : candidateNavItems;
  const appLabel = user?.role === "hr" ? "Internship Platform HR" : "Internship Tracker";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-zinc-200 bg-white px-5 py-6 lg:block">
        <div className="mb-8">
          <p className="text-lg font-semibold text-zinc-950">{appLabel}</p>
          <p className="mt-1 text-sm text-zinc-500">{user?.email}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{user?.role}</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={() =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isNavItemActive(item, location.pathname)
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="absolute bottom-6 left-5 right-5 flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-zinc-950">{appLabel}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-zinc-200 p-2 text-zinc-700"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{user?.role}</p>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={() =>
                  `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    isNavItemActive(item, location.pathname) ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
