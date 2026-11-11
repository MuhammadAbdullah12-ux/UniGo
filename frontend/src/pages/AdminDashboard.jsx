/**
 * Transport Administration Portal Dashboard for UniGo.
 * Equips Transport Admins with fleet oversight, real-time bus route occupancy analytics,
 * dynamic seat capacity bars, new route creation workflows,
 * Friday/Exam early departure schedules, and live notification bell alerts.
 */

import React, { useState, useEffect } from "react";
import {
  Bus,
  MapPin,
  Users,
  PlusCircle,
  Clock,
  DollarSign,
  AlertCircle,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle,
  Calendar,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/client";
import NotificationBell from "../components/NotificationBell";
import Layout from "../components/Layout";

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Route Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoute, setNewRoute] = useState({
    name: "",
    pickup_points: "",
    fee_amount: 36000,
    seats_total: 55,
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Fetch all transport routes with real-time seat occupancy counts
  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await API.get("/routes");
      setRoutes(res.data || []);
    } catch (err) {
      console.error("Failed to load transport fleet:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  // Compute fleet KPI statistics
  const totalRoutes = routes.length;
  const totalCapacity = routes.reduce((acc, r) => acc + (r.seats_total || 55), 0);
  const totalReserved = routes.reduce((acc, r) => acc + (r.seats_taken || 0), 0);
  const overallOccupancyPct = totalCapacity > 0 ? Math.round((totalReserved / totalCapacity) * 100) : 0;

  // Filter routes by search query
  const filteredRoutes = routes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(query) ||
      r.pickup_points?.toLowerCase().includes(query) ||
      String(r.id).includes(query)
    );
  });

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
      setIsModalOpen(false);
      setNewRoute({ name: "", pickup_points: "", fee_amount: 36000, seats_total: 55 });
      await fetchRoutes();
    } catch (err) {
      console.error("Failed to create route:", err);
      setModalError(err.response?.data?.detail || "Failed to create route");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: "1240px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
        {/* Title & Refresh */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.75rem", fontWeight: "800", color: "#0f172a" }}>
              Campus Fleet Operations
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
              Oversee official bus routes, seat capacity breakdown, and special departure schedules.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={fetchRoutes}
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
              onClick={() => setIsModalOpen(true)}
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
              }}
            >
              <PlusCircle size={15} />
              <span>Add New Route</span>
            </button>
          </div>
        </div>

        {/* 4 Fleet Overview KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {/* Card 1: Total Routes */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#1e40af", fontWeight: "700", textTransform: "uppercase" }}>
                Active Campus Routes
              </span>
              <div style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <Bus size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {totalRoutes}
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Covering all campus sectors</span>
          </div>

          {/* Card 2: Total Seats */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#065f46", fontWeight: "700", textTransform: "uppercase" }}>
                Total Fleet Capacity
              </span>
              <div style={{ backgroundColor: "#ecfdf5", color: "#059669", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <Users size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {totalCapacity} Seats
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Across 55-seater university buses</span>
          </div>

          {/* Card 3: Reserved Seats */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#92400e", fontWeight: "700", textTransform: "uppercase" }}>
                Enrolled Students
              </span>
              <div style={{ backgroundColor: "#fef3c7", color: "#d97706", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <CheckCircle size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {totalReserved} Seats
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Confirmed student registrations</span>
          </div>

          {/* Card 4: Occupancy % */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#6b21a8", fontWeight: "700", textTransform: "uppercase" }}>
                Overall Occupancy
              </span>
              <div style={{ backgroundColor: "#f3e8ff", color: "#9333ea", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <Users size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {overallOccupancyPct}%
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Fleet capacity utilization</span>
          </div>
        </div>

        {/* Special Departure Schedule Banner (FAST-NUCES Requirement) */}
        <div
          style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "0.75rem",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", padding: "0.5rem", borderRadius: "0.5rem" }}>
              <Clock size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "700", color: "#1e40af" }}>
                Campus Bus Departure Protocols (Fall 2026)
              </h4>
              <p style={{ margin: "0.125rem 0 0 0", fontSize: "0.8125rem", color: "#3b82f6" }}>
                Regular Mon–Thu departures leave at <strong>4:30 PM</strong>. Special Friday & examination departures leave early at <strong>2:00 PM</strong>.
              </p>
            </div>
          </div>
          <span
            style={{
              backgroundColor: "#dcfce7",
              color: "#15803d",
              padding: "0.25rem 0.625rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: "700",
              border: "1px solid #86efac",
            }}
          >
            ✓ Early Protocol Enforced
          </span>
        </div>

        {/* =====================================================================
            Routes Fleet Table
        ===================================================================== */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          {/* Table Controls */}
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
                Campus Bus Fleet & Seat Allocation
              </h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                Real-time seat occupancy breakdown for each official bus route (Faculty 12%, Female 30%, Male 58%).
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
                }}
              />
            </div>
          </div>

          {/* Table */}
          {loading && routes.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
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
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "0.75rem 1.5rem" }}>Route ID & Title</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Scheduled Stops / Pickup Points</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Semester Fee</th>
                    <th style={{ padding: "0.75rem 1.5rem", minWidth: "200px" }}>Seat Occupancy (55-Seater)</th>
                    <th style={{ padding: "0.75rem 1.5rem", textAlign: "right" }}>Status</th>
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
                          transition: "background 0.15s",
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
                        <td style={{ padding: "1rem 1rem", color: "#475569", fontSize: "0.8125rem", maxWidth: "340px", lineHeight: "1.4" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.375rem" }}>
                            <MapPin size={14} style={{ color: "#2563eb", marginTop: "2px", flexShrink: 0 }} />
                            <span>{r.pickup_points || "Standard scheduled stops"}</span>
                          </div>
                        </td>

                        {/* Fee */}
                        <td style={{ padding: "1rem 1rem", fontWeight: "700", color: "#0f172a" }}>
                          Rs. {Number(r.fee_amount).toLocaleString()}
                        </td>

                        {/* Seat Occupancy Bar */}
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                            <span style={{ fontWeight: "700", color: "#1e293b" }}>
                              {taken} / {capacity} seats
                            </span>
                            <span style={{ color: percent > 85 ? "#dc2626" : "#475569", fontWeight: "600" }}>
                              {percent}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "9999px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${percent}%`,
                                height: "100%",
                                backgroundColor: percent > 85 ? "#ef4444" : percent > 50 ? "#f59e0b" : "#2563eb",
                                borderRadius: "9999px",
                                transition: "width 0.3s",
                              }}
                            />
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.25rem 0.625rem",
                              backgroundColor: "#ecfdf5",
                              color: "#065f46",
                              border: "1px solid #a7f3d0",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                            }}
                          >
                            Active
                          </span>
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
      {isModalOpen && (
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
                onClick={() => setIsModalOpen(false)}
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
                  Route Title (e.g. Sargodha Road / Canal Road):
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
                  onClick={() => setIsModalOpen(false)}
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
    </Layout>
  );
};

export default AdminDashboard;
