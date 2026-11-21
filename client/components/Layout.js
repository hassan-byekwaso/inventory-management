import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell, Box, ChartNoAxesCombined, ChevronDown, Command, LayoutDashboard,
  LogOut, Menu, Moon, PackagePlus, PanelLeftClose, PanelLeftOpen, Settings2,
  ShoppingBag, ShoppingCart, Sun, Truck, Users, X
} from "lucide-react";
import { useAuth } from "../services/auth.js";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Box },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/purchases", label: "Purchases", icon: ShoppingBag, roles: ["ADMIN", "INVENTORY_MANAGER"] },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/users", label: "Team", icon: Users, roles: ["ADMIN"] }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("inventory-theme") === "dark");

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("inventory-theme", next ? "dark" : "light");
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className={`mobile-scrim ${menuOpen ? "show" : ""}`} onClick={() => setMenuOpen(false)} />
      <aside className={`sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Command size={19} /></span>
          <span className="brand-text">stockroom<span>.</span></span>
          <button className="sidebar-collapse icon-button" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse navigation">
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-picker">
          <span className="workspace-avatar">S</span>
          <span className="workspace-copy"><b>Stockroom HQ</b><small>Main warehouse</small></span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="main-nav">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Notifications" && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="nav-section-label">PREFERENCES</div>
          <button className="nav-link" onClick={toggleTheme}><span className="nav-icon">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</span><span>{darkMode ? "Light mode" : "Dark mode"}</span></button>
          <button className="nav-link" onClick={() => navigate("/reports")}><span className="nav-icon"><Settings2 size={18} /></span><span>Settings</span></button>
          <div className="profile-card">
            <span className="profile-avatar">{user?.name?.slice(0, 1).toUpperCase()}</span>
            <span className="profile-copy"><b>{user?.name}</b><small>{user?.role?.replaceAll("_", " ")}</small></span>
            <button className="icon-button logout-button" onClick={handleLogout} aria-label="Log out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>Inventory</strong></div>
          <div className="topbar-actions">
            <div className="topbar-date"><PackagePlus size={15} /> Inventory workspace</div>
            <NavLink to="/notifications" className="topbar-bell" aria-label="Notifications"><Bell size={18} /><i /></NavLink>
            <button className="topbar-user" onClick={handleLogout} title="Sign out"><span>{user?.name?.slice(0, 1).toUpperCase()}</span><ChevronDown size={14} /></button>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}
