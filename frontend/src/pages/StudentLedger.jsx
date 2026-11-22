/**
 * Student Transport Ledger Directory Screen for Accounts Officers.
 * Route: /accounts/students
 * Features:
 *   - Comprehensive directory of all registered students with route assignments and fee status.
 *   - Quick KPI metric cards (Total Commuters, Verified/Paid, Pending Audit, Unpaid/Rejected).
 *   - Multi-criteria filtering by search term (name/roll no/email), fee status, route, and student category.
 *   - Direct navigation to individual Student Financial Dossier & Audit Timeline (/accounts/students/:id).
 *   - Wrapped in the unified role-aware Layout component.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Bus,
  ChevronRight,
  UserCheck,
  CreditCard,
  MapPin,
  ExternalLink,
} from "lucide-react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import API from "../api/client";

export const StudentLedger = () => {
  const [students, setStudents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch all students in the ledger
  const fetchLedgerData = async () => {
    try {
      setRefreshing(true);
      const [studentsRes, routesRes] = await Promise.all([
        API.get("/accounts/students"),
        API.get("/routes"),
      ]);
      setStudents(studentsRes.data || []);
      setRoutes(routesRes.data || []);
    } catch (err) {
      console.error("Failed to load student ledger:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, []);

  // Filter logic
  const filteredStudents = students.filter((s) => {
    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.full_name?.toLowerCase().includes(q);
      const matchReg = s.reg_no?.toLowerCase().includes(q);
      const matchEmail = s.email?.toLowerCase().includes(q);
      const matchRoute = s.route_name?.toLowerCase().includes(q);
      if (!matchName && !matchReg && !matchEmail && !matchRoute) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      if (s.fee_status !== statusFilter) return false;
    }

    // Route filter
    if (routeFilter !== "all") {
      if (String(s.route_id) !== String(routeFilter)) return false;
    }

    // Student type filter
    if (typeFilter !== "all") {
      if (s.student_type?.toLowerCase() !== typeFilter) return false;
    }

    return true;
  });

  // Calculate top KPI statistics
  const totalStudents = students.length;
  const paidCount = students.filter((s) => s.fee_status === "paid").length;
  const pendingCount = students.filter((s) => s.fee_status === "pending").length;
  const unpaidCount = students.filter((s) => s.fee_status === "unpaid" || s.fee_status === "rejected").length;

  return (
    <Layout>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem" }}>
        {/* =====================================================================
            1. Header Section
        ===================================================================== */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  display: "flex",
                }}
              >
                <Users size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#0f172a" }}>
                  Student Transport Ledger
                </h1>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                  Directory of enrolled commuter students, assigned routes, fee status, and audit dossiers.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchLedgerData}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 0.875rem",
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: "600",
              color: "#374151",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* =====================================================================
            2. Executive Metric Cards
        ===================================================================== */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: "1.125rem 1.25rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                Total Commuters
              </span>
              <Users size={18} color="#3b82f6" />
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: "800", color: "#0f172a", marginTop: "0.25rem" }}>
              {totalStudents}
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Registered in university transport</span>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: "1.125rem 1.25rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>
                Fees Paid (Seats Confirmed)
              </span>
              <CheckCircle size={18} color="#16a34a" />
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: "800", color: "#166534", marginTop: "0.25rem" }}>
              {paidCount}
            </div>
            <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>Verified by accounts</span>
          </div>

          <div
            style={{
              backgroundColor: pendingCount > 0 ? "#fefce8" : "#ffffff",
              borderRadius: "0.75rem",
              padding: "1.125rem 1.25rem",
              border: pendingCount > 0 ? "1px solid #fef08a" : "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: pendingCount > 0 ? "#854d0e" : "#64748b", textTransform: "uppercase" }}>
                Pending Audit
              </span>
              <Clock size={18} color="#ca8a04" />
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: "800", color: pendingCount > 0 ? "#a16207" : "#0f172a", marginTop: "0.25rem" }}>
              {pendingCount}
            </div>
            <span style={{ fontSize: "0.75rem", color: pendingCount > 0 ? "#854d0e" : "#64748b" }}>
              Awaiting slip verification
            </span>
          </div>

          <div
            style={{
              backgroundColor: unpaidCount > 0 ? "#fff1f2" : "#ffffff",
              borderRadius: "0.75rem",
              padding: "1.125rem 1.25rem",
              border: unpaidCount > 0 ? "1px solid #fecdd3" : "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: unpaidCount > 0 ? "#9f1239" : "#64748b", textTransform: "uppercase" }}>
                Unpaid / Action Needed
              </span>
              <AlertTriangle size={18} color="#e11d48" />
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: "800", color: unpaidCount > 0 ? "#be123c" : "#0f172a", marginTop: "0.25rem" }}>
              {unpaidCount}
            </div>
            <span style={{ fontSize: "0.75rem", color: unpaidCount > 0 ? "#9f1239" : "#64748b" }}>
              Unpaid vouchers or rejected slips
            </span>
          </div>
        </div>

        {/* =====================================================================
            3. Search & Multi-Filter Control Bar
        ===================================================================== */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            padding: "1rem",
            border: "1px solid #e2e8f0",
            marginBottom: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.875rem",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
            <Search
              size={17}
              style={{
                position: "absolute",
                left: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll no, or route..."
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem 0.625rem 2.375rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
                outline: "none",
                backgroundColor: "#f8fafc",
              }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", alignItems: "center" }}>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "0.5625rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
                fontSize: "0.8125rem",
                backgroundColor: "#ffffff",
                color: "#374151",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <option value="all">All Fee Statuses</option>
              <option value="paid">Paid (Confirmed)</option>
              <option value="pending">Pending Verification</option>
              <option value="unpaid">Unpaid</option>
              <option value="rejected">Rejected Slip</option>
              <option value="not_enrolled">Not Enrolled</option>
            </select>

            {/* Route Filter */}
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              style={{
                padding: "0.5625rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
                fontSize: "0.8125rem",
                backgroundColor: "#ffffff",
                color: "#374151",
                fontWeight: "600",
                cursor: "pointer",
                maxWidth: "200px",
              }}
            >
              <option value="all">All Transport Routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Student Category Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: "0.5625rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
                fontSize: "0.8125rem",
                backgroundColor: "#ffffff",
                color: "#374151",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <option value="all">All Categories</option>
              <option value="day_scholar">Day Scholar</option>
              <option value="hostelite">Hostelite</option>
            </select>

            {(searchQuery || statusFilter !== "all" || routeFilter !== "all" || typeFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setRouteFilter("all");
                  setTypeFilter("all");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ef4444",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  padding: "0.25rem 0.5rem",
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* =====================================================================
            4. Student Ledger Directory Table
        ===================================================================== */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 0.5rem auto" }} />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>Loading student ledger directory...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ padding: "3.5rem 1.5rem", textAlign: "center", color: "#64748b" }}>
              <Users size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem auto" }} />
              <h4 style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontSize: "1.0625rem", fontWeight: "700" }}>
                No students match your filter
              </h4>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
                Try adjusting your search query or reset the filters above.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      color: "#475569",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "0.875rem 1.25rem" }}>Student</th>
                    <th style={{ padding: "0.875rem 1.25rem" }}>Category</th>
                    <th style={{ padding: "0.875rem 1.25rem" }}>Enrolled Route</th>
                    <th style={{ padding: "0.875rem 1.25rem" }}>Commute Type</th>
                    <th style={{ padding: "0.875rem 1.25rem" }}>Fee Amount</th>
                    <th style={{ padding: "0.875rem 1.25rem" }}>Fee Status</th>
                    <th style={{ padding: "0.875rem 1.25rem", textAlign: "right" }}>Financial Dossier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => {
                    const isDayScholar = s.student_type?.toLowerCase() === "day_scholar";

                    return (
                      <tr
                        key={s.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Student Name & Roll No */}
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                backgroundColor: isDayScholar ? "#dbeafe" : "#fef3c7",
                                color: isDayScholar ? "#1e40af" : "#92400e",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "800",
                                fontSize: "0.875rem",
                                flexShrink: 0,
                              }}
                            >
                              {s.full_name ? s.full_name.charAt(0).toUpperCase() : "S"}
                            </div>
                            <div>
                              <Link
                                to={`/accounts/students/${s.id}`}
                                style={{
                                  fontWeight: "700",
                                  color: "#1e40af",
                                  textDecoration: "none",
                                  display: "inline-block",
                                  fontSize: "0.9375rem",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                              >
                                {s.full_name}
                              </Link>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {s.reg_no || s.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.25rem 0.625rem",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              backgroundColor: isDayScholar ? "#eff6ff" : "#fef3c7",
                              color: isDayScholar ? "#1d4ed8" : "#b45309",
                              border: isDayScholar ? "1px solid #bfdbfe" : "1px solid #fde68a",
                            }}
                          >
                            {isDayScholar ? "Day Scholar" : "Hostelite"}
                          </span>
                        </td>

                        {/* Enrolled Bus Route */}
                        <td style={{ padding: "1rem 1.25rem" }}>
                          {s.route_name ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#1e293b", fontWeight: "600" }}>
                              <Bus size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: "0.8125rem" }}>{s.route_name}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.8125rem", color: "#94a3b8", fontStyle: "italic" }}>
                              Not Enrolled
                            </span>
                          )}
                        </td>

                        {/* Commute Type */}
                        <td style={{ padding: "1rem 1.25rem", fontSize: "0.8125rem", color: "#475569" }}>
                          {s.trip_type === "one_way"
                            ? "One-Way Commute"
                            : s.trip_type === "two_way"
                            ? "Two-Way Commute"
                            : "—"}
                        </td>

                        {/* Fee Amount */}
                        <td style={{ padding: "1rem 1.25rem", fontWeight: "700", color: "#0f172a" }}>
                          {s.fee_amount ? `PKR ${s.fee_amount.toLocaleString()}` : "—"}
                        </td>

                        {/* Fee Status Badge */}
                        <td style={{ padding: "1rem 1.25rem" }}>
                          {s.fee_status === "not_enrolled" ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "0.375rem",
                                fontSize: "0.6875rem",
                                fontWeight: "700",
                                backgroundColor: "#f1f5f9",
                                color: "#64748b",
                              }}
                            >
                              NOT ENROLLED
                            </span>
                          ) : (
                            <StatusBadge status={s.fee_status} />
                          )}
                          {s.receipts_count > 0 && (
                            <div style={{ fontSize: "0.6875rem", color: "#94a3b8", marginTop: "2px" }}>
                              {s.receipts_count} {s.receipts_count === 1 ? "slip uploaded" : "slips uploaded"}
                            </div>
                          )}
                        </td>

                        {/* Action CTA */}
                        <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                          <Link
                            to={`/accounts/students/${s.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.45rem 0.875rem",
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              borderRadius: "0.5rem",
                              fontSize: "0.8125rem",
                              fontWeight: "700",
                              textDecoration: "none",
                              boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1d4ed8")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
                          >
                            <span>Dossier & History</span>
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StudentLedger;

