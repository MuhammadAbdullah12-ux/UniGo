/**
 * Transport Administration Portal Dashboard for UniGo (Day 18 & Day 19).
 * Features:
 *   - 4 Fleet KPI Overview cards connected to GET /admin/stats.
 *   - Comprehensive Fleet Routes Table with live seat occupancy progress bars.
 *   - Active/Inactive one-click toggle switch per route using PUT /routes/:id.
 *   - Add New Route Modal with field validation.
 *   - Edit Route Modal with capacity guard preventing reduction below taken seats.
 *   - Route Passenger Roster Modal (GET /routes/:id/students) with student category,
 *     trip type, and live fee verification status badges.
 *   - Wrapped in the unified role-aware Layout component.
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Bus,
  MapPin,
  Users,
  PlusCircle,
  Clock,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle,
  Calendar,
  X,
  Edit2,
  Check,
  Eye,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/client";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";

export const AdminDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Data States
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState({
    total_routes: 0,
    active_routes: 0,
    total_seats: 0,
    seats_taken: 0,
    registered_students: 0,
    occupancy_percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Route Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoute, setNewRoute] = useState({
    name: "",
    pickup_points: "",
    fee_amount: 36000,
    seats_total: 55,
  });

  // Edit Route Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    pickup_points: "",
    fee_amount: 36000,
    seats_total: 55,
    is_active: true,
  });

  // Route Passenger Roster Modal State (Day 19 Step 4)
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterRoute, setRosterRoute] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Fetch all transport routes (including inactive for admin) & fleet metrics
  const fetchFleetData = async () => {
    try {
      setLoading(true);

      // Fetch routes with seat occupancy
      const routesRes = await API.get("/routes?include_inactive=true");
      setRoutes(routesRes.data || []);

      // Fetch admin stats
      try {
        const statsRes = await API.get("/admin/stats");
        setStats(statsRes.data);
      } catch (statsErr) {
        // Fallback calculations if token permissions differ
        const list = routesRes.data || [];
        const activeCount = list.filter((r) => r.is_active).length;
        const totalCapacity = list.filter((r) => r.is_active).reduce((acc, r) => acc + (r.seats_total || 55), 0);
        const totalTaken = list.reduce((acc, r) => acc + (r.seats_taken || 0), 0);
        setStats({
          total_routes: list.length,
          active_routes: activeCount,
          total_seats: totalCapacity,
          seats_taken: totalTaken,
          registered_students: totalTaken,
          occupancy_percentage: totalCapacity > 0 ? Math.round((totalTaken / totalCapacity) * 100) : 0,
        });
      }
    } catch (err) {
      console.error("Failed to load transport fleet data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  // Filter routes by search query
  const filteredRoutes = routes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.pickup_points?.toLowerCase().includes(q) ||
      String(r.id).includes(q)
    );
  });

  // Open Edit Route Modal
  const openEditModal = (route) => {
    setEditingRoute(route);
    setEditForm({
      name: route.name,
      pickup_points: route.pickup_points || "",
      fee_amount: route.fee_amount,
      seats_total: route.seats_total,
      is_active: route.is_active,
    });
    setModalError("");
    setIsEditModalOpen(true);
  };

  // Toggle Route Active / Inactive Switch
  const handleToggleActive = async (route) => {
    try {
      await API.put(`/routes/${route.id}`, {
        is_active: !route.is_active,
      });
      await fetchFleetData();
    } catch (err) {
      console.error("Failed to toggle route status:", err);
      alert(err.response?.data?.detail || "Could not toggle route status.");
    }
  };

  // Handle Create Route Submit
  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!newRoute.name.trim()) {
      setModalError("Please provide a descriptive route name.");
      return;
    }

    try {
      setSubmitting(true);
      setModalError("");
      await API.post("/routes", {
        name: newRoute.name.trim(),
        pickup_points: newRoute.pickup_points.trim() || null,
        fee_amount: Number(newRoute.fee_amount) || 36000,
        seats_total: Number(newRoute.seats_total) || 55,
        is_active: true,
      });
      setIsAddModalOpen(false);
      setNewRoute({ name: "", pickup_points: "", fee_amount: 36000, seats_total: 55 });
      await fetchFleetData();
    } catch (err) {
      console.error("Failed to create route:", err);
      setModalError(err.response?.data?.detail || "Failed to create route");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Route Submit with Capacity Guard Validation
  const handleUpdateRoute = async (e) => {
    e.preventDefault();
    if (!editingRoute) return;

    const seatsTotal = Number(editForm.seats_total);
    const seatsTaken = editingRoute.seats_taken || 0;

    // Safety guard: refuse capacity lower than booked seats
    if (seatsTotal < seatsTaken) {
      setModalError(
        `Cannot reduce total seats to ${seatsTotal} because ${seatsTaken} students are already registered on this route.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setModalError("");
      await API.put(`/routes/${editingRoute.id}`, {
        name: editForm.name.trim(),
        pickup_points: editForm.pickup_points.trim() || null,
        fee_amount: Number(editForm.fee_amount) || 36000,
        seats_total: seatsTotal,
        is_active: editForm.is_active,
      });
      setIsEditModalOpen(false);
      setEditingRoute(null);
      await fetchFleetData();
    } catch (err) {
      console.error("Failed to update route:", err);
      setModalError(err.response?.data?.detail || "Failed to update route.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Route Passenger Roster Modal (Day 19 Step 4)
  const openRosterModal = async (route) => {
    setRosterRoute(route);
    setIsRosterModalOpen(true);
    setLoadingRoster(true);
    try {
      const res = await API.get(`/routes/${route.id}/students`);
      setRosterStudents(res.data || []);
    } catch (err) {
      console.error("Failed to fetch route students:", err);
      setRosterStudents([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: "1280px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
        {/* Title Bar & Quick Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <Bus size={24} color="#1e3a8a" />
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800", color: "#0f172a" }}>
                Campus Fleet Operations
              </h2>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
              Oversee official bus routes, seat capacity breakdown, student passenger rosters, and departure protocols.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={fetchFleetData}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 0.875rem",
                backgroundColor: "#ffffff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                setModalError("");
                setIsAddModalOpen(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#1e3a8a",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(30, 58, 138, 0.3)",
              }}
            >
              <PlusCircle size={15} />
              <span>Add New Route</span>
            </button>
          </div>
        </div>

        {/* 4 Fleet Overview KPI Cards (Day 18 / Day 19 Step 2) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {/* Card 1: Active Routes */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.875rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#1e40af", fontWeight: "700", textTransform: "uppercase" }}>
                Active Campus Routes
              </span>
              <div style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <Bus size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {stats.active_routes} <span style={{ fontSize: "1rem", color: "#64748b", fontWeight: "600" }}>/ {stats.total_routes} total</span>
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Covering all campus sectors</span>
          </div>

          {/* Card 2: Total Seats */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.875rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#065f46", fontWeight: "700", textTransform: "uppercase" }}>
                Total Fleet Capacity
              </span>
              <div style={{ backgroundColor: "#ecfdf5", color: "#059669", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <Users size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {Number(stats.total_seats).toLocaleString()} Seats
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Across operational university buses</span>
          </div>

          {/* Card 3: Enrolled Students */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.875rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#92400e", fontWeight: "700", textTransform: "uppercase" }}>
                Enrolled Students
              </span>
              <div style={{ backgroundColor: "#fef3c7", color: "#d97706", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <CheckCircle size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {stats.seats_taken} Seats
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Confirmed student registrations</span>
          </div>

          {/* Card 4: Overall Occupancy */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.875rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#6b21a8", fontWeight: "700", textTransform: "uppercase" }}>
                Overall Occupancy
              </span>
              <div style={{ backgroundColor: "#f3e8ff", color: "#9333ea", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <Users size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {stats.occupancy_percentage}%
            </p>
            <div style={{ width: "100%", height: "6px", backgroundColor: "#f1f5f9", borderRadius: "9999px", marginTop: "0.5rem", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, stats.occupancy_percentage)}%`,
                  height: "100%",
                  backgroundColor: stats.occupancy_percentage > 85 ? "#ef4444" : "#9333ea",
                  borderRadius: "9999px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Departure Protocols Alert Banner */}
        <div
          style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "0.75rem",
            padding: "0.875rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ backgroundColor: "#dbeafe", color: "#1e40af", padding: "0.5rem", borderRadius: "0.5rem" }}>
              <Clock size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "700", color: "#1e40af" }}>
                Campus Bus Departure Protocols (Fall 2026)
              </h4>
              <p style={{ margin: "0.125rem 0 0 0", fontSize: "0.8125rem", color: "#3b82f6" }}>
                Mon–Thu regular departures at <strong>4:30 PM</strong>. Special Friday & exam departures leave early at <strong>2:00 PM</strong>.
              </p>
            </div>
          </div>
          <span style={{ backgroundColor: "#dcfce7", color: "#15803d", padding: "0.25rem 0.625rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "700", border: "1px solid #86efac" }}>
            ✓ Early Protocol Active
          </span>
        </div>

        {/* =====================================================================
            Routes Fleet Table with Edit & Roster Actions (Day 19 Step 3 & 4)
        ===================================================================== */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          {/* Table Header Controls */}
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700", color: "#0f172a" }}>
                Campus Bus Fleet & Route Management
              </h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                Live seat occupancy progress, route editing, active toggles, and passenger rosters.
              </p>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "260px" }}>
              <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#9ca3af" }} />
              <input
                type="text"
                placeholder="Search routes or stops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem 0.5rem 2rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Table */}
          {loading && routes.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={24} className="spin" style={{ margin: "0 auto 0.5rem auto" }} />
              Loading route records...
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
              No routes match your search criteria.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "0.75rem 1.5rem" }}>Route ID & Title</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Pickup Points</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Semester Fee</th>
                    <th style={{ padding: "0.75rem 1.5rem", minWidth: "220px" }}>Seat Occupancy</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Active Switch</th>
                    <th style={{ padding: "0.75rem 1.5rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoutes.map((r) => {
                    const capacity = r.seats_total || 55;
                    const taken = r.seats_taken || 0;
                    const percent = Math.min(100, Math.round((taken / capacity) * 100));

                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s ease",
                          opacity: r.is_active ? 1 : 0.6,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Title */}
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <div style={{ fontWeight: "700", color: "#0f172a" }}>Route {r.id}: {r.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>FAST-NUCES Dedicated Transit</div>
                        </td>

                        {/* Stops */}
                        <td style={{ padding: "1rem 1rem", color: "#475569", fontSize: "0.8125rem", maxWidth: "300px", lineHeight: "1.4" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.375rem" }}>
                            <MapPin size={14} style={{ color: "#2563eb", marginTop: "2px", flexShrink: 0 }} />
                            <span>{r.pickup_points || "Standard scheduled stops"}</span>
                          </div>
                        </td>

                        {/* Fee */}
                        <td style={{ padding: "1rem 1rem", fontWeight: "700", color: "#0f172a" }}>
                          Rs. {Number(r.fee_amount).toLocaleString()}
                        </td>

                        {/* Seat Occupancy Progress Bar */}
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                            <span style={{ fontWeight: "700", color: "#1e293b" }}>
                              {taken} / {capacity} seats
                            </span>
                            <span style={{ color: percent > 85 ? "#dc2626" : percent > 60 ? "#d97706" : "#059669", fontWeight: "700" }}>
                              {percent}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "9999px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${percent}%`,
                                height: "100%",
                                backgroundColor: percent > 85 ? "#ef4444" : percent > 60 ? "#f59e0b" : "#10b981",
                                borderRadius: "9999px",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                        </td>

                        {/* Active / Inactive One-Click Toggle Switch */}
                        <td style={{ padding: "1rem 1rem", textAlign: "center" }}>
                          <button
                            onClick={() => handleToggleActive(r)}
                            title={r.is_active ? "Click to deactivate route" : "Click to activate route"}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.25rem 0.625rem",
                              borderRadius: "9999px",
                              border: `1px solid ${r.is_active ? "#a7f3d0" : "#cbd5e1"}`,
                              backgroundColor: r.is_active ? "#ecfdf5" : "#f1f5f9",
                              color: r.is_active ? "#065f46" : "#64748b",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                backgroundColor: r.is_active ? "#10b981" : "#94a3b8",
                              }}
                            />
                            <span>{r.is_active ? "Active" : "Inactive"}</span>
                          </button>
                        </td>

                        {/* Action Buttons: Edit & Roster */}
                        <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem" }}>
                            {/* Passenger Roster Button */}
                            <button
                              onClick={() => openRosterModal(r)}
                              title="View student passenger roster"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.375rem 0.625rem",
                                backgroundColor: "#eff6ff",
                                color: "#1e40af",
                                border: "1px solid #bfdbfe",
                                borderRadius: "0.375rem",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              <Users size={13} />
                              <span>Roster ({taken})</span>
                            </button>

                            {/* Edit Route Button */}
                            <button
                              onClick={() => openEditModal(r)}
                              title="Edit route details & capacity"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.375rem 0.625rem",
                                backgroundColor: "#ffffff",
                                color: "#334155",
                                border: "1px solid #cbd5e1",
                                borderRadius: "0.375rem",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                          </div>
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

      {/* =========================================================================
          Add Route Modal
      ========================================================================= */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "1rem",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Bus size={20} />
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700" }}>
                  Add New Campus Bus Route
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} style={{ padding: "1.5rem" }}>
              {modalError && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "0.375rem",
                    marginBottom: "1rem",
                    fontSize: "0.8125rem",
                  }}
                >
                  {modalError}
                </div>
              )}

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#374151", marginBottom: "0.375rem" }}>
                  Route Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route 18 - Sargodha Road"
                  value={newRoute.name}
                  onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                  style={{ width: "100%", padding: "0.625rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#374151", marginBottom: "0.375rem" }}>
                  Pickup Points / Scheduled Stops (comma-separated):
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Gate 1, Chowk, Bypass, Mall, Main Campus"
                  value={newRoute.pickup_points}
                  onChange={(e) => setNewRoute({ ...newRoute, pickup_points: e.target.value })}
                  style={{ width: "100%", padding: "0.625rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#374151", marginBottom: "0.375rem" }}>
                    Semester Fee (PKR):
                  </label>
                  <input
                    type="number"
                    min={1000}
                    value={newRoute.fee_amount}
                    onChange={(e) => setNewRoute({ ...newRoute, fee_amount: e.target.value })}
                    style={{ width: "100%", padding: "0.625rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#374151", marginBottom: "0.375rem" }}>
                    Bus Seating Capacity:
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={newRoute.seats_total}
                    onChange={(e) => setNewRoute({ ...newRoute, seats_total: e.target.value })}
                    style={{ width: "100%", padding: "0.625rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", backgroundColor: "#ffffff", borderRadius: "0.375rem", fontSize: "0.8125rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "0.5rem 1.25rem", backgroundColor: "#1e3a8a", color: "#ffffff", border: "none", borderRadius: "0.375rem", fontSize: "0.8125rem", fontWeight: "700", cursor: "pointer" }}
                >
                  {submitting ? "Adding Route..." : "Create Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          Edit Route Modal with Capacity Guard Validation (Day 19 Step 3)
      ========================================================================= */}
      {isEditModalOpen && editingRoute && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "1rem",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                padding: "1.25rem 1.5rem",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Edit2 size={18} color="#93c5fd" />
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700" }}>
                  Edit Route #{editingRoute.id}: {editingRoute.name}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateRoute} style={{ padding: "1.5rem" }}>
              {modalError && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    marginBottom: "1rem",
                    fontSize: "0.8125rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>{modalError}</span>
                </div>
              )}

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#374151", marginBottom: "0.375rem" }}>
                  Route Title:
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: "100%", padding: "0.625rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#374151", marginBottom: "0.375rem" }}>
                  Pickup Points / Scheduled Stops:
                </label>
                <textarea
                  rows={3}
                  value={editForm.pickup_points}
                  onChange={(e) => setEditForm({ ...editForm, pickup_points: e.target.value })}
                  style={{ width: "100%", padding: "0.625rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#374151", marginBottom: "0.375rem" }}>
                    Semester Fee (PKR):
                  </label>
                  <input
                    type="number"
                    min={1000}
                    value={editForm.fee_amount}
                    onChange={(e) => setEditForm({ ...editForm, fee_amount: e.target.value })}
                    style={{ width: "100%", padding: "0.625rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#374151", marginBottom: "0.375rem" }}>
                    Capacity (Seats):
                  </label>
                  <input
                    type="number"
                    min={editingRoute.seats_taken || 1}
                    max={120}
                    value={editForm.seats_total}
                    onChange={(e) => setEditForm({ ...editForm, seats_total: e.target.value })}
                    style={{ width: "100%", padding: "0.625rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }}
                  />
                  <span style={{ fontSize: "0.6875rem", color: "#64748b", display: "block", marginTop: "0.25rem" }}>
                    Min allowable: {editingRoute.seats_taken || 0} seats (currently booked)
                  </span>
                </div>
              </div>

              {/* Active Toggle Switch in Form */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "0.5rem", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
                <div>
                  <strong style={{ fontSize: "0.8125rem", color: "#1e293b", display: "block" }}>Route Operational Status</strong>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Inactive routes are hidden from student enrollment dropdowns.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                  style={{
                    padding: "0.375rem 0.75rem",
                    borderRadius: "9999px",
                    border: `1px solid ${editForm.is_active ? "#a7f3d0" : "#cbd5e1"}`,
                    backgroundColor: editForm.is_active ? "#ecfdf5" : "#f1f5f9",
                    color: editForm.is_active ? "#065f46" : "#64748b",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {editForm.is_active ? "✓ Active Route" : "✕ Inactive"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", backgroundColor: "#ffffff", borderRadius: "0.375rem", fontSize: "0.8125rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "0.5rem 1.25rem", backgroundColor: "#1e3a8a", color: "#ffffff", border: "none", borderRadius: "0.375rem", fontSize: "0.8125rem", fontWeight: "700", cursor: "pointer" }}
                >
                  {submitting ? "Saving Changes..." : "Save Route Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          Route Passenger Roster Modal (Day 19 Step 4)
      ========================================================================= */}
      {isRosterModalOpen && rosterRoute && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
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
              maxWidth: "880px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              overflow: "hidden",
              border: "1px solid #cbd5e1",
            }}
          >
            {/* Modal Header with Occupancy Bar */}
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
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Bus size={20} />
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700" }}>
                    Route {rosterRoute.id}: {rosterRoute.name} — Passenger Roster
                  </h3>
                </div>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#93c5fd" }}>
                  Semester Enrollment List • {rosterRoute.seats_taken || 0} confirmed passengers of {rosterRoute.seats_total || 55} total capacity
                </p>
              </div>

              <button
                onClick={() => setIsRosterModalOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  padding: "0.375rem",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Occupancy Sub-header Bar */}
            <div style={{ padding: "0.875rem 1.5rem", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.375rem" }}>
                <span style={{ fontWeight: "700", color: "#334155" }}>
                  Bus Capacity Utilization: {rosterRoute.seats_taken || 0} / {rosterRoute.seats_total || 55} seats booked
                </span>
                <span style={{ fontWeight: "800", color: "#1e3a8a" }}>
                  {Math.round(((rosterRoute.seats_taken || 0) / (rosterRoute.seats_total || 55)) * 100)}% Occupied
                </span>
              </div>
              <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "9999px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.round(((rosterRoute.seats_taken || 0) / (rosterRoute.seats_total || 55)) * 100))}%`,
                    height: "100%",
                    backgroundColor: "#2563eb",
                    borderRadius: "9999px",
                  }}
                />
              </div>
            </div>

            {/* Students Table */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
              {loadingRoster ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                  <RefreshCw size={24} className="spin" style={{ margin: "0 auto 0.5rem auto", display: "block" }} />
                  Loading route passenger list...
                </div>
              ) : rosterStudents.length === 0 ? (
                <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
                  <Users size={36} style={{ color: "#94a3b8", margin: "0 auto 0.75rem auto" }} />
                  <h4 style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontSize: "1rem" }}>No Students Registered Yet</h4>
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>
                    There are currently zero student registrations booked on Route {rosterRoute.id}.
                  </p>
                </div>
              ) : (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.75rem", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        <th style={{ padding: "0.625rem 1rem" }}>Student</th>
                        <th style={{ padding: "0.625rem 1rem" }}>Category</th>
                        <th style={{ padding: "0.625rem 1rem" }}>Trip Type</th>
                        <th style={{ padding: "0.625rem 1rem" }}>Enrollment Date</th>
                        <th style={{ padding: "0.625rem 1rem", textAlign: "right" }}>Fee Verification Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterStudents.map((s) => (
                        <tr key={s.registration_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: "700", color: "#0f172a" }}>{s.student_name}</div>
                            <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>{s.student_reg_no || "N/A"}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span style={{ fontWeight: "600", color: s.student_type === "hostelite" ? "#d97706" : "#2563eb" }}>
                              {s.student_type === "hostelite" ? "Hostelite" : "Day Scholar"}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textTransform: "capitalize", color: "#334155", fontWeight: "600" }}>
                            {s.trip_type ? s.trip_type.replace("_", " ") : "Two Way"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                            {new Date(s.registered_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                            <StatusBadge status={s.fee_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "0.875rem 1.5rem", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setIsRosterModalOpen(false)}
                style={{
                  padding: "0.5rem 1.25rem",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.375rem",
                  fontSize: "0.8125rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
