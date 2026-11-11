/**
 * Shared Layout component for UniGo application portals (Student, Accounts, Admin).
 * Features:
 *   - Dynamic role-aware sidebar navigation (Accounts, Student, Admin).
 *   - Responsive top header bar with live NotificationBell, user profile badge, and Sign Out.
 *   - Clean layout container wrapping child views or nested router outlets.
 */

import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Bus,
  LayoutDashboard,
  FileCheck,
  History,
  Users,
  Clock,
  MapPin,
  LogOut,
  Menu,
  X,
  CreditCard,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Role-specific navigation links
  const getNavItems = () => {
    const role = user?.role || "student";

    if (role === "accounts") {
      return [
        {
          name: "Dashboard Overview",
          path: "/accounts",
          icon: LayoutDashboard,
          description: "Financial KPIs & daily metrics",
        },
        {
          name: "Pending Receipts",
          path: "/accounts/receipts",
          icon: FileCheck,
          description: "Active review & verification queue",
        },
        {
          name: "Audit History",
          path: "/accounts/history",
          icon: History,
          description: "Approved & rejected slips ledger",
        },
        {
          name: "Student Ledger",
          path: "/accounts/students",
          icon: Users,
          description: "Financial dossiers & audit trails",
        },
      ];
    }

    if (role === "admin") {
      return [
        {
          name: "Fleet & Routes",
          path: "/admin",
          icon: Bus,
          description: "Bus routes, seats & fares",
        },
        {
          name: "Student Registrations",
          path: "/admin/registrations",
          icon: Users,
          description: "Semester route enrollment list",
        },
        {
          name: "Schedules & Friday",
          path: "/admin/schedules",
          icon: Clock,
          description: "Exam & Friday early departure",
        },
      ];
    }

    // Default: Student Portal
    return [
      {
        name: "My Commute & Fee",
        path: "/student",
        icon: Bus,
        description: "Assigned route & challan upload",
      },
      {
        name: "Route Enrollment",
        path: "/student",
        icon: MapPin,
        description: "Browse bus routes & stops",
      },
    ];
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case "accounts":
        return "Accounts Officer (Auditor)";
      case "admin":
        return "Transport Administrator";
      default:
        return "Student (Commuter)";
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", color: "#1e293b", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* =====================================================================
          1. Sidebar Navigation (Desktop + Mobile Drawer)
      ===================================================================== */}
      <aside
        style={{
          width: sidebarCollapsed ? "76px" : "260px",
          backgroundColor: "#1e293b",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease-in-out",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 110,
          borderRight: "1px solid #334155",
          boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: "1.25rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            borderBottom: "1px solid #334155",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden" }}>
            <div
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Bus size={20} />
            </div>
            {!sidebarCollapsed && (
              <div style={{ whiteSpace: "nowrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.01em" }}>
                  UniGo
                </h2>
                <span style={{ fontSize: "0.6875rem", color: "#94a3b8", fontWeight: "500", display: "block" }}>
                  FAST-NUCES CFD
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "0.25rem",
              display: sidebarCollapsed ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: "1rem 0.75rem", overflowY: "auto" }}>
          {!sidebarCollapsed && (
            <p style={{ margin: "0 0 0.5rem 0.5rem", fontSize: "0.6875rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Main Navigation
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={idx}
                  to={item.path}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: sidebarCollapsed ? "0.625rem" : "0.625rem 0.75rem",
                    borderRadius: "0.5rem",
                    backgroundColor: isActive ? "#2563eb" : "transparent",
                    color: isActive ? "#ffffff" : "#cbd5e1",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                    fontWeight: isActive ? "700" : "500",
                    transition: "all 0.15s ease",
                    justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {!sidebarCollapsed && (
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span>{item.name}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Role Identity Pill at Bottom of Sidebar */}
        <div style={{ padding: "1rem 0.75rem", borderTop: "1px solid #334155", backgroundColor: "rgba(15, 23, 42, 0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: user?.role === "accounts" ? "#059669" : user?.role === "admin" ? "#d97706" : "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8125rem",
                fontWeight: "700",
                flexShrink: 0,
              }}
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            {!sidebarCollapsed && (
              <div style={{ overflow: "hidden" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "#ffffff", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.full_name || "User"}
                </span>
                <span style={{ fontSize: "0.6875rem", color: "#94a3b8", display: "block" }}>
                  {getRoleLabel()}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          2. Right Body Container: Top Bar + Content
      ===================================================================== */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "0.75rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Breadcrumb / Current View */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: "500" }}>Portal</span>
            <ChevronRight size={14} color="#94a3b8" />
            <span style={{ fontSize: "0.8125rem", color: "#0f172a", fontWeight: "700" }}>
              {user?.role === "accounts" ? "Accounts Officer Verification" : user?.role === "admin" ? "Transport Administration" : "Student Commute"}
            </span>
          </div>

          {/* Top Actions: Notification Bell + Profile + Sign Out */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <NotificationBell />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.375rem 0.75rem",
                backgroundColor: "#f1f5f9",
                borderRadius: "9999px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  backgroundColor: user?.role === "accounts" ? "#059669" : user?.role === "admin" ? "#d97706" : "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                }}
              >
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
              </div>
              <div style={{ lineHeight: "1.2" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "#1e293b", display: "block" }}>
                  {user?.full_name}
                </span>
                <span style={{ fontSize: "0.6875rem", color: "#64748b" }}>
                  {user?.reg_no || user?.email}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.45rem 0.875rem",
                backgroundColor: "#ffffff",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
              title="Sign out of system"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: "0 0 2rem 0" }}>
          {children ? children : <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;

