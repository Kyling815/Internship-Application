import { LogOut, PanelLeftClose, PanelLeftOpen, BriefcaseBusiness, Search, Inbox, Bell, Settings, CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Tooltip, TooltipTrigger } from "react-aria-components";

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

function SidebarNavItem({ item, isCollapsed }) {
  const location = useLocation();
  const isActive = isNavItemActive(item, location.pathname);

  const navLink = (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={() =>
        `app-nav-link ${isCollapsed ? "app-nav-link--compact" : ""} ${isActive ? "is-active" : ""}`
      }
      aria-current={isActive ? "page" : undefined}
    >
      <item.icon className="h-5 w-5" aria-hidden="true" />
      <span className="app-nav-link__label">{item.label}</span>
    </NavLink>
  );

  if (!isCollapsed) {
    return navLink;
  }

  return (
    <TooltipTrigger delay={0} closeDelay={0}>
      {navLink}
      <Tooltip className="app-tooltip" offset={12} placement="right">
        {item.label}
      </Tooltip>
    </TooltipTrigger>
  );
}

function SidebarNavigation({ navItems, isCollapsed }) {
  const communicationItems = [
    { to: "/inbox", label: "Inbox", icon: Inbox },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="app-sidebar__nav-section-group">
      <div className="app-sidebar__nav-section">
        <div className="app-sidebar__nav-label">Main</div>
        <nav className="app-nav" aria-label="Workspace navigation">
          {navItems.map((item) => (
            <SidebarNavItem key={item.to} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>
      </div>
      
      <div className="app-sidebar__nav-section">
        <div className="app-sidebar__nav-label">Communication</div>
        <nav className="app-nav" aria-label="Communication">
          {communicationItems.map((item) => (
            <SidebarNavItem key={item.to} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function SidebarSearch() {
  return (
    <div className="app-sidebar__search">
      <div className="app-sidebar__search-input-wrapper">
        <Search className="h-4 w-4 app-sidebar__search-icon" />
        <input 
          type="text" 
          placeholder="Search..." 
          className="app-sidebar__search-input"
        />
      </div>
    </div>
  );
}

function SidebarHeader({ appLabel, isCollapsed }) {
  return (
    <div className={`app-sidebar__top ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className={`app-brand ${isCollapsed ? "is-compact" : ""}`}>
        <span className="app-brand__mark" aria-hidden="true">
          <BriefcaseBusiness className="h-5 w-5" />
        </span>
        <div className="app-brand__text">
          <p>{appLabel}</p>
          <span>Workspace</span>
        </div>
      </div>
    </div>
  );
}

function SidebarAccount({ user, isCollapsed }) {
  if (!user) return null;
  
  return (
    <div className={`app-sidebar__account ${isCollapsed ? "is-compact" : ""}`}>
      <div className="account-avatar" aria-hidden="true">
        {user.email ? user.email.charAt(0).toUpperCase() : "U"}
      </div>
      <div className="account-info">
        <p title={user.email}>{user.email}</p>
        <span>{user.role}</span>
      </div>
    </div>
  );
}

export function AppSidebar({ user, navItems, appLabel, logout }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside 
      className={`app-sidebar hidden lg:flex ${isCollapsed ? "is-collapsed" : ""}`}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <SidebarHeader 
        appLabel={appLabel} 
        isCollapsed={isCollapsed} 
      />

      <SidebarSearch />

      <div className="app-sidebar__scroll-area">
        <SidebarNavigation navItems={navItems} isCollapsed={isCollapsed} />
      </div>

      <div className="app-sidebar__bottom">
        <nav className="app-nav app-sidebar__bottom-nav" aria-label="Settings and Help">
          <SidebarNavItem item={{ to: "/help", label: "Help", icon: CircleHelp }} isCollapsed={isCollapsed} />
          <SidebarNavItem item={{ to: "/settings", label: "Settings", icon: Settings }} isCollapsed={isCollapsed} />
        </nav>
        
        <SidebarAccount user={user} isCollapsed={isCollapsed} />
        
        {isCollapsed ? (
          <TooltipTrigger delay={0} closeDelay={0}>
            <button
              type="button"
              onClick={handleLogout}
              className="app-sidebar__logout app-sidebar__logout--compact"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
            <Tooltip className="app-tooltip" offset={12} placement="right">
              Sign out
            </Tooltip>
          </TooltipTrigger>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="app-sidebar__logout"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
