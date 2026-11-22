/**
 * Transport Administration: Student Registrations Master Directory.
 * Route: /admin/registrations
 * Features:
 *   - Master directory of all university bus seat registrations across all 15 routes.
 *   - Overview fleet registration metrics (Total Registered, Confirmed Paid, Pending, Unpaid).
 *   - Multi-criteria filtering by student name, roll number, bus route, and fee status.
 *   - Student categorization breakdown (Day Scholar vs Hostelite).
 *   - Admin Route Transfer feature: authorizes and executes route switches for students.
 *   - Wrapped in the unified role-aware Layout component.
 */

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Bus,
  Calendar,
  CreditCard,
  UserCheck,
  ArrowRightLeft,
  X,
  Check,
  XCircle,
} from "lucide-react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import API from "../api/client";

export const AdminRegistrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Tab Switcher ("passengers" or "requests")
  const [activeTab, setActiveTab] = useState("passengers");
  const [changeRequests, setChangeRequests] = useState([]);
  const [reqStatusFilter, setReqStatusFilter] = useState("all");

  // Route Transfer Modal State
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [targetRouteId, setTargetRouteId] = useState("");
  const [switchSubmitting, setSwitchSubmitting] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [switchSuccess, setSwitchSuccess] = useState("");

  // Decline Modal State
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedReqForDecline, setSelectedReqForDecline] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewAlert, setReviewAlert] = useState(null);

  const fetchRegistrations = async () => {
    try {
      setRefreshing(true);
      const [studentsRes, routesRes, reqsRes] = await Promise.allSettled([
        API.get("/accounts/students"),
        API.get("/routes"),
        API.get("/admin/route-change-requests"),
      ]);

      if (studentsRes.status === "fulfilled") {
        const enrolled = (studentsRes.value.data || []).filter((s) => s.route_id != null);
        setRegistrations(enrolled);
      }
      if (routesRes.status === "fulfilled") {
        setRoutes(routesRes.value.data || []);
      }
      if (reqsRes.status === "fulfilled") {
        setChangeRequests(reqsRes.value.data || []);
      }
    } catch (err) {
      console.error("Failed to load registrations master directory:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleApproveRequest = async (reqItem) => {
    if (!window.confirm(`Approve route transfer for ${reqItem.student_name} to "${reqItem.requested_route_name}"?`)) {
      return;
    }
    try {
      setReviewSubmitting(true);
      const res = await API.put(`/admin/route-change-requests/${reqItem.id}/review`, {
        action: "approve",
        admin_notes: "Approved by Transport Administration",
      });
      setReviewAlert({ text: res.data.message || "Route transfer approved successfully!", type: "success" });
      await fetchRegistrations();
    } catch (err) {
      console.error("Failed to approve route change request:", err);
      alert(err.response?.data?.detail || "Could not approve route transfer.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleOpenDeclineModal = (reqItem) => {
    setSelectedReqForDecline(reqItem);
    setDeclineReason("");
    setDeclineModalOpen(true);
  };

  const handleConfirmDecline = async (e) => {
    e.preventDefault();
    if (!selectedReqForDecline) return;
    try {
      setReviewSubmitting(true);
      await API.put(`/admin/route-change-requests/${selectedReqForDecline.id}/review`, {
        action: "reject",
        admin_notes: declineReason.trim() || "Declined by Transport Administration due to seating constraints.",
      });
      setDeclineModalOpen(false);
      setReviewAlert({ text: "Route change request has been declined.", type: "info" });
      await fetchRegistrations();
    } catch (err) {
      console.error("Failed to decline route change request:", err);
      alert(err.response?.data?.detail || "Could not decline request.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleOpenSwitchModal = (student) => {
    setSelectedStudent(student);
    setSwitchError("");
    setSwitchSuccess("");

    // Default to first other available route
    const firstOther = routes.find((r) => r.id !== student.route_id && (r.seats_total - r.seats_taken) > 0);
    setTargetRouteId(firstOther ? String(firstOther.id) : "");
    setSwitchModalOpen(true);
  };

  const handleExecuteSwitch = async (e) => {
    e.preventDefault();
    if (!targetRouteId) {
      setSwitchError("Please select a target bus route for the transfer.");
      return;
    }

    try {
      setSwitchSubmitting(true);
      setSwitchError("");

      const res = await API.put(`/admin/registrations/${selectedStudent.id}/switch-route`, {
        new_route_id: Number(targetRouteId),
      });

      setSwitchSuccess(res.data.message || "Route transfer authorized successfully!");
      await fetchRegistrations();

      setTimeout(() => {
        setSwitchModalOpen(false);
      }, 1200);
    } catch (err) {
      console.error("Route switch failed:", err);
      setSwitchError(err.response?.data?.detail || "Failed to execute route switch. Please try again.");
    } finally {
      setSwitchSubmitting(false);
    }
  };

  const filteredRegistrations = registrations.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.full_name?.toLowerCase().includes(q);
      const matchReg = r.reg_no?.toLowerCase().includes(q);
      const matchEmail = r.email?.toLowerCase().includes(q);
      const matchRoute = r.route_name?.toLowerCase().includes(q);
      if (!matchName && !matchReg && !matchEmail && !matchRoute) {
        return false;
      }
    }

    if (routeFilter !== "all" && String(r.route_id) !== String(routeFilter)) {
      return false;
    }

    if (statusFilter !== "all" && r.fee_status !== statusFilter) {
      return false;
    }

    if (typeFilter !== "all" && r.student_type?.toLowerCase() !== typeFilter) {
      return false;
    }

    return true;
  });

  const totalRegistered = registrations.length;
  const paidConfirmed = registrations.filter((r) => r.fee_status === "paid").length;
  const pendingCount = registrations.filter((r) => r.fee_status === "pending").length;
  const unpaidCount = registrations.filter((r) => r.fee_status === "unpaid" || r.fee_status === "rejected").length;
  const pendingRequestsCount = changeRequests.filter((r) => r.status === "pending").length;

  const filteredRequests = changeRequests.filter((req) => {
    if (reqStatusFilter !== "all" && req.status !== reqStatusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = req.student_name?.toLowerCase().includes(q);
    const regMatch = req.student_reg_no?.toLowerCase().includes(q);
    const fromMatch = req.current_route_name?.toLowerCase().includes(q);
    const toMatch = req.requested_route_name?.toLowerCase().includes(q);
    return nameMatch || regMatch || fromMatch || toMatch;
  });

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
                  Master Student Registrations
                </h1>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                  Fleet-wide passenger roster across all 15 university bus routes and sectors.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchRegistrations}
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
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            <span>Refresh Roster</span>
          </button>
        </div>

        {/* =====================================================================
            2. Fleet Registration Metrics
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
                Total Registered Passengers
              </span>
              <Bus size={18} color="#2563eb" />
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: "800", color: "#0f172a", marginTop: "0.25rem" }}>
              {totalRegistered} Seats
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Allocated across university fleet</span>
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
                Confirmed (Paid Pass)
              </span>
              <CheckCircle size={18} color="#16a34a" />
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: "800", color: "#166534", marginTop: "0.25rem" }}>
              {paidConfirmed} Seats
            </div>
            <span style={{ fontSize: "0.75rem", color: "#166534" }}>Challans approved & verified</span>
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
                Pending Fee Audit
              </span>
              <Clock size={18} color="#ca8a04" />
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: "800", color: pendingCount > 0 ? "#a16207" : "#0f172a", marginTop: "0.25rem" }}>
              {pendingCount}
            </div>
            <span style={{ fontSize: "0.75rem", color: pendingCount > 0 ? "#854d0e" : "#64748b" }}>
              Awaiting accounts review
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
                Unpaid / Rejected Slip
              </span>
              <AlertTriangle size={18} color="#e11d48" />
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: "800", color: unpaidCount > 0 ? "#be123c" : "#0f172a", marginTop: "0.25rem" }}>
              {unpaidCount}
            </div>
            <span style={{ fontSize: "0.75rem", color: unpaidCount > 0 ? "#9f1239" : "#64748b" }}>
              Seat held, pending payment
            </span>
          </div>
        </div>

        {/* Global Review Notification Banner */}
        {reviewAlert && (
          <div
            style={{
              padding: "0.875rem 1.25rem",
              borderRadius: "0.5rem",
              marginBottom: "1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: reviewAlert.type === "success" ? "#ecfdf5" : "#eff6ff",
              border: reviewAlert.type === "success" ? "1px solid #a7f3d0" : "1px solid #bfdbfe",
              color: reviewAlert.type === "success" ? "#047857" : "#1e40af",
              fontSize: "0.875rem",
              fontWeight: "600",
            }}
          >
            <span>{reviewAlert.text}</span>
            <button
              onClick={() => setReviewAlert(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* =====================================================================
            Tab Switcher: Enrolled Passengers vs Route Change Requests
        ===================================================================== */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "2px solid #e2e8f0" }}>
          <button
            onClick={() => setActiveTab("passengers")}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.9375rem",
              fontWeight: "700",
              color: activeTab === "passengers" ? "#1e3a8a" : "#64748b",
              borderBottom: activeTab === "passengers" ? "3px solid #2563eb" : "3px solid transparent",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "-2px",
            }}
          >
            <Users size={16} />
            <span>Enrolled Passengers</span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "9999px",
                backgroundColor: activeTab === "passengers" ? "#eff6ff" : "#f1f5f9",
                color: activeTab === "passengers" ? "#2563eb" : "#64748b",
              }}
            >
              {registrations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.9375rem",
              fontWeight: "700",
              color: activeTab === "requests" ? "#1e3a8a" : "#64748b",
              borderBottom: activeTab === "requests" ? "3px solid #2563eb" : "3px solid transparent",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "-2px",
            }}
          >
            <ArrowRightLeft size={16} />
            <span>Route Change Requests</span>
            {pendingRequestsCount > 0 ? (
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  backgroundColor: "#fef3c7",
                  color: "#b45309",
                  fontWeight: "800",
                }}
              >
                {pendingRequestsCount} Pending
              </span>
            ) : (
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  backgroundColor: "#f1f5f9",
                  color: "#64748b",
                }}
              >
                {changeRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* =====================================================================
            TAB 1: Enrolled Passengers Master View
        ===================================================================== */}
        {activeTab === "passengers" && (
          <>
            {/* 3. Search & Filter Bar */}
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", alignItems: "center" }}>
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
              <option value="all">All Bus Routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

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
              <option value="pending">Pending Audit</option>
              <option value="unpaid">Unpaid</option>
              <option value="rejected">Rejected Slip</option>
            </select>

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
              <option value="all">All Student Types</option>
              <option value="day_scholar">Day Scholar</option>
              <option value="hostelite">Hostelite</option>
            </select>

            {(searchQuery || routeFilter !== "all" || statusFilter !== "all" || typeFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setRouteFilter("all");
                  setStatusFilter("all");
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
                Reset
              </button>
            )}
          </div>
        </div>

        {/* =====================================================================
            4. Master Passenger Table
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
              <p style={{ margin: 0, fontSize: "0.875rem" }}>Loading master registrations...</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div style={{ padding: "3.5rem 1.5rem", textAlign: "center", color: "#64748b" }}>
              <Users size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem auto" }} />
              <h4 style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontSize: "1.0625rem", fontWeight: "700" }}>
                No registrations match your filter
              </h4>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
                Try adjusting your search criteria or resetting filters above.
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
                    <th style={{ padding: "0.875rem 1.25rem" }}>Assigned Bus Route</th>
                    <th style={{ padding: "0.875rem 1.25rem" }}>Trip Type</th>
                    <th style={{ padding: "0.875rem 1.25rem" }}>Registration Date</th>
                    <th style={{ padding: "0.875rem 1.25rem" }}>Fee Status</th>
                    <th style={{ padding: "0.875rem 1.25rem", textAlign: "right" }}>Route Management</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((r) => {
                    const isDayScholar = r.student_type?.toLowerCase() === "day_scholar";

                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Student Name & Roll No */}
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <div style={{ fontWeight: "700", color: "#0f172a" }}>{r.full_name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.reg_no || r.email}</div>
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

                        {/* Assigned Route */}
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#1e293b", fontWeight: "600" }}>
                            <Bus size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: "0.8125rem" }}>{r.route_name}</span>
                          </div>
                        </td>

                        {/* Commute Type */}
                        <td style={{ padding: "1rem 1.25rem", fontSize: "0.8125rem", color: "#475569" }}>
                          {r.trip_type === "one_way"
                            ? "One-Way Commute"
                            : r.trip_type === "two_way"
                            ? "Two-Way Full Semester"
                            : r.trip_type || "Two-Way"}
                        </td>

                        {/* Registration Date */}
                        <td style={{ padding: "1rem 1.25rem", fontSize: "0.75rem", color: "#64748b" }}>
                          {r.registered_at
                            ? new Date(r.registered_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Fall 2026"}
                        </td>

                        {/* Fee Status Badge */}
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <StatusBadge status={r.fee_status} />
                        </td>

                        {/* Admin Action: Transfer Route */}
                        <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                          <button
                            onClick={() => handleOpenSwitchModal(r)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.45rem 0.75rem",
                              backgroundColor: "#ffffff",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                              borderRadius: "0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              cursor: "pointer",
                              boxShadow: "0 1px 2px rgba(37, 99, 235, 0.1)",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#eff6ff";
                              e.currentTarget.style.borderColor = "#2563eb";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#ffffff";
                              e.currentTarget.style.borderColor = "#bfdbfe";
                            }}
                          >
                            <ArrowRightLeft size={13} />
                            <span>Transfer Route</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}

        {/* =====================================================================
            TAB 2: Route Change Requests Table
        ===================================================================== */}
        {activeTab === "requests" && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.875rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            {/* Header & Filter Controls for Requests */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f8fafc",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.0625rem", fontWeight: "700", color: "#0f172a" }}>
                  Student Route Change Requests
                </h3>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
                  Review, authorize or decline student bus route transfer requests.
                </p>
              </div>

              {/* Status Filter Chips */}
              <div style={{ display: "flex", gap: "0.375rem" }}>
                {["all", "pending", "approved", "rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setReqStatusFilter(st)}
                    style={{
                      padding: "0.35rem 0.75rem",
                      borderRadius: "0.375rem",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      textTransform: "capitalize",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: reqStatusFilter === st ? "#1e3a8a" : "#ffffff",
                      color: reqStatusFilter === st ? "#ffffff" : "#475569",
                      boxShadow: reqStatusFilter === st ? "0 1px 2px rgba(30, 58, 138, 0.2)" : "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Requests Table */}
            {filteredRequests.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#94a3b8" }}>
                <ArrowRightLeft size={32} style={{ margin: "0 auto 0.75rem auto", opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: "600", fontSize: "0.9375rem" }}>No route change requests found</p>
                <span style={{ fontSize: "0.8125rem" }}>No requests match the selected status filter.</span>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                      <th style={{ padding: "0.875rem 1.25rem", fontWeight: "700", fontSize: "0.75rem", textTransform: "uppercase" }}>Student Commuter</th>
                      <th style={{ padding: "0.875rem 1.25rem", fontWeight: "700", fontSize: "0.75rem", textTransform: "uppercase" }}>Current &rarr; Desired Route</th>
                      <th style={{ padding: "0.875rem 1.25rem", fontWeight: "700", fontSize: "0.75rem", textTransform: "uppercase" }}>Student Stated Reason</th>
                      <th style={{ padding: "0.875rem 1.25rem", fontWeight: "700", fontSize: "0.75rem", textTransform: "uppercase" }}>Date</th>
                      <th style={{ padding: "0.875rem 1.25rem", fontWeight: "700", fontSize: "0.75rem", textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "0.875rem 1.25rem", fontWeight: "700", fontSize: "0.75rem", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr
                        key={req.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <div style={{ fontWeight: "700", color: "#0f172a" }}>{req.student_name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{req.student_reg_no || req.student_email}</div>
                        </td>

                        <td style={{ padding: "1rem 1.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>{req.current_route_name}</span>
                            <ArrowRightLeft size={13} color="#2563eb" />
                            <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#1e3a8a" }}>{req.requested_route_name}</span>
                          </div>
                        </td>

                        <td style={{ padding: "1rem 1.25rem", maxWidth: "260px" }}>
                          <div style={{ fontSize: "0.8125rem", color: "#334155", fontStyle: "italic", lineHeight: "1.4" }}>
                            "{req.reason}"
                          </div>
                          {req.admin_notes && (
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                              <strong>Admin Note:</strong> {req.admin_notes}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "1rem 1.25rem", fontSize: "0.75rem", color: "#64748b" }}>
                          {new Date(req.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </td>

                        <td style={{ padding: "1rem 1.25rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.25rem 0.625rem",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              textTransform: "capitalize",
                              backgroundColor:
                                req.status === "approved"
                                  ? "#ecfdf5"
                                  : req.status === "rejected"
                                  ? "#fef2f2"
                                  : req.status === "cancelled"
                                  ? "#f1f5f9"
                                  : "#fffbeb",
                              color:
                                req.status === "approved"
                                  ? "#047857"
                                  : req.status === "rejected"
                                  ? "#b91c1c"
                                  : req.status === "cancelled"
                                  ? "#64748b"
                                  : "#b45309",
                            }}
                          >
                            {req.status === "approved" && <CheckCircle size={12} />}
                            {req.status === "rejected" && <XCircle size={12} />}
                            {req.status === "pending" && <Clock size={12} />}
                            {req.status}
                          </span>
                        </td>

                        <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                          {req.status === "pending" ? (
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                              <button
                                onClick={() => handleApproveRequest(req)}
                                disabled={reviewSubmitting}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  padding: "0.35rem 0.65rem",
                                  backgroundColor: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "0.375rem",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  cursor: reviewSubmitting ? "not-allowed" : "pointer",
                                }}
                              >
                                <Check size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleOpenDeclineModal(req)}
                                disabled={reviewSubmitting}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  padding: "0.35rem 0.65rem",
                                  backgroundColor: "#ffffff",
                                  color: "#dc2626",
                                  border: "1px solid #fca5a5",
                                  borderRadius: "0.375rem",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  cursor: reviewSubmitting ? "not-allowed" : "pointer",
                                }}
                              >
                                <X size={12} />
                                <span>Decline</span>
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                              {req.reviewer_name ? `Reviewed by ${req.reviewer_name}` : "Processed"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            5. Admin Route Transfer Modal
        ===================================================================== */}
        {switchModalOpen && selectedStudent && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1200,
              padding: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "1rem",
                width: "100%",
                maxWidth: "520px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  backgroundColor: "#1e3a8a",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <ArrowRightLeft size={20} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "700" }}>
                      Authorize Student Route Transfer
                    </h3>
                    <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>
                      Transport Administration Seat Re-Assignment
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSwitchModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    cursor: "pointer",
                    padding: "0.25rem",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleExecuteSwitch} style={{ padding: "1.5rem" }}>
                {switchError && (
                  <div
                    style={{
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#991b1b",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      marginBottom: "1.25rem",
                      fontSize: "0.8125rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{switchError}</span>
                  </div>
                )}

                {switchSuccess && (
                  <div
                    style={{
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      color: "#166534",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      marginBottom: "1.25rem",
                      fontSize: "0.8125rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <CheckCircle size={16} />
                    <span>{switchSuccess}</span>
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.625rem",
                    padding: "1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.25rem" }}>
                    Student Information
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "800", color: "#0f172a" }}>
                    {selectedStudent.full_name}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#475569" }}>
                    {selectedStudent.reg_no || "No Reg"} • {selectedStudent.email}
                  </div>
                  <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "#1e3a8a", fontWeight: "600" }}>
                    Current Route: <strong>{selectedStudent.route_name}</strong>
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8125rem",
                      fontWeight: "700",
                      color: "#374151",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Transfer to Target Route:
                  </label>
                  <select
                    value={targetRouteId}
                    onChange={(e) => setTargetRouteId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    <option value="">-- Choose New Destination Route --</option>
                    {routes.map((r) => {
                      const isCurrent = r.id === selectedStudent.route_id;
                      const seatsLeft = Math.max(0, (r.seats_total || 55) - (r.seats_taken || 0));
                      const isFull = seatsLeft <= 0;

                      return (
                        <option key={r.id} value={r.id} disabled={isCurrent || isFull}>
                          {r.name} {isCurrent ? "(Current Assigned Route)" : isFull ? "(FULL)" : `(${seatsLeft} seats open)`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setSwitchModalOpen(false)}
                    style={{
                      padding: "0.625rem 1rem",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#ffffff",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      color: "#374151",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={switchSubmitting}
                    style={{
                      padding: "0.625rem 1.25rem",
                      border: "none",
                      backgroundColor: "#1e3a8a",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: "700",
                      color: "#ffffff",
                      cursor: switchSubmitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {switchSubmitting ? "Authorizing..." : "Authorize & Transfer Seat"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================================
            6. Decline Route Transfer Request Modal
        ===================================================================== */}
        {declineModalOpen && selectedReqForDecline && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1200,
              padding: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "1rem",
                width: "100%",
                maxWidth: "480px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  backgroundColor: "#b91c1c",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <XCircle size={20} />
                  <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "700" }}>
                    Decline Route Transfer Request
                  </h3>
                </div>
                <button
                  onClick={() => setDeclineModalOpen(false)}
                  style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmDecline} style={{ padding: "1.5rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "#475569" }}>
                  Provide an administrative note explaining why <strong>{selectedReqForDecline.student_name}</strong>'s request to switch to <strong>{selectedReqForDecline.requested_route_name}</strong> is being declined. This will be sent as an in-app alert to the student.
                </p>

                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.8125rem", fontWeight: "700", color: "#334155" }}>
                    Decline Reason / Administrative Feedback
                  </label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Route seat capacity exhausted, stop conflict with university shift..."
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setDeclineModalOpen(false)}
                    style={{
                      padding: "0.625rem 1rem",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#ffffff",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      color: "#374151",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    style={{
                      padding: "0.625rem 1.25rem",
                      border: "none",
                      backgroundColor: "#b91c1c",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: "700",
                      color: "#ffffff",
                      cursor: reviewSubmitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {reviewSubmitting ? "Declining..." : "Confirm Decline"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminRegistrations;
