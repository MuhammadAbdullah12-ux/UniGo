/**
 * Transport Administration: Fleet Schedules & Friday Departure Protocols Screen.
 * Route: /admin/schedules
 * Features:
 *   - Comprehensive visual timetables for regular weekdays, Friday early departures, and exam shifts.
 *   - Bus Terminal Bay allocation table (Bay 1 through 15) across all campus routes.
 *   - Operational guidelines and transport emergency dispatch hotline.
 *   - Wrapped in the unified role-aware Layout component.
 */

import React, { useState, useEffect } from "react";
import {
  Clock,
  Bus,
  Calendar,
  AlertCircle,
  MapPin,
  CheckCircle,
  Phone,
  ShieldCheck,
  RefreshCw,
  Info,
} from "lucide-react";
import Layout from "../components/Layout";
import API from "../api/client";

export const AdminSchedules = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await API.get("/routes");
      setRoutes(res.data || []);
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

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
                <Clock size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#0f172a" }}>
                  Campus Fleet Schedules & Friday Protocols
                </h1>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                  Official departure schedules, early Friday timetable protocols, and bus terminal bay assignments.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchRoutes}
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
            <RefreshCw size={14} />
            <span>Refresh Schedules</span>
          </button>
        </div>

        {/* =====================================================================
            2. Three Timetable Mode Cards
        ===================================================================== */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
            marginBottom: "1.75rem",
          }}
        >
          {/* Card 1: Regular Weekdays */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.875rem",
              padding: "1.25rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "0.45rem", borderRadius: "0.5rem" }}>
                <Calendar size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "800", color: "#0f172a" }}>
                  Regular Weekday Commute
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Monday through Thursday</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.375rem" }}>
                <span style={{ color: "#64748b" }}>Morning Campus Arrival:</span>
                <strong style={{ color: "#0f172a" }}>8:25 AM</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.375rem" }}>
                <span style={{ color: "#64748b" }}>Evening Departure:</span>
                <strong style={{ color: "#2563eb", fontSize: "0.9375rem" }}>4:30 PM Sharp</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                <span style={{ color: "#64748b" }}>Departure Point:</span>
                <strong style={{ color: "#0f172a" }}>Main Transport Terminal</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Friday Special Protocol */}
          <div
            style={{
              backgroundColor: "#f0fdf4",
              borderRadius: "0.875rem",
              padding: "1.25rem",
              border: "1px solid #bbf7d0",
              boxShadow: "0 1px 3px rgba(16, 185, 129, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div style={{ backgroundColor: "#dcfce7", color: "#16a34a", padding: "0.45rem", borderRadius: "0.5rem" }}>
                <Clock size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "800", color: "#166534" }}>
                  Friday Early Departure Protocol
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#15803d" }}>Jumu'ah Prayer & Weekend Travel</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", borderBottom: "1px solid #dcfce7", paddingBottom: "0.375rem" }}>
                <span style={{ color: "#166534" }}>Morning Campus Arrival:</span>
                <strong style={{ color: "#0f172a" }}>8:25 AM</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", borderBottom: "1px solid #dcfce7", paddingBottom: "0.375rem" }}>
                <span style={{ color: "#166534" }}>Early Friday Departure:</span>
                <strong style={{ color: "#15803d", fontSize: "0.9375rem" }}>2:00 PM Sharp</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                <span style={{ color: "#166534" }}>Hostelite Commute:</span>
                <strong style={{ color: "#047857" }}>Weekend Express Buses Active</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Exam Schedules */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.875rem",
              padding: "1.25rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div style={{ backgroundColor: "#fef3c7", color: "#b45309", padding: "0.45rem", borderRadius: "0.5rem" }}>
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "800", color: "#0f172a" }}>
                  Examination Shift Departures
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Midterm & Final Exam Weeks</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.375rem" }}>
                <span style={{ color: "#64748b" }}>Shift 1 Departure:</span>
                <strong style={{ color: "#0f172a" }}>1:30 PM (Post-Morning Exam)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.375rem" }}>
                <span style={{ color: "#64748b" }}>Shift 2 Departure:</span>
                <strong style={{ color: "#0f172a" }}>5:00 PM (Post-Evening Exam)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                <span style={{ color: "#64748b" }}>Advisory:</span>
                <span style={{ color: "#b45309", fontSize: "0.75rem", fontWeight: "600" }}>Check date sheet schedule</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. Bus Terminal Bay Allocation Table
        ===================================================================== */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.875rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ padding: "1.125rem 1.25rem", borderBottom: "1px solid #e2e8f0", backgroundColor: "#fafafa" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "800", color: "#0f172a" }}>
              Bus Terminal Bay Assignments & Operational Timetable
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Allocated parking bays at the FAST-NUCES CFD Campus Transit Terminal.
            </span>
          </div>

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
                  <th style={{ padding: "0.875rem 1.25rem" }}>Assigned Terminal Bay</th>
                  <th style={{ padding: "0.875rem 1.25rem" }}>Route & Destination</th>
                  <th style={{ padding: "0.875rem 1.25rem" }}>Regular Departure</th>
                  <th style={{ padding: "0.875rem 1.25rem" }}>Friday Departure</th>
                  <th style={{ padding: "0.875rem 1.25rem" }}>Bus Capacity</th>
                  <th style={{ padding: "0.875rem 1.25rem" }}>Fleet Status</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route, idx) => {
                  const bayNumber = `Bay ${idx + 1}`;

                  return (
                    <tr
                      key={route.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Terminal Bay */}
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.25rem 0.625rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.75rem",
                            fontWeight: "800",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                          }}
                        >
                          <MapPin size={12} />
                          {bayNumber}
                        </span>
                      </td>

                      {/* Route Name */}
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{route.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          Arrival: 8:25 AM at Campus
                        </div>
                      </td>

                      {/* Regular Departure */}
                      <td style={{ padding: "1rem 1.25rem", fontWeight: "700", color: "#1e3a8a" }}>
                        4:30 PM
                      </td>

                      {/* Friday Departure */}
                      <td style={{ padding: "1rem 1.25rem", fontWeight: "700", color: "#15803d" }}>
                        2:00 PM
                      </td>

                      {/* Capacity */}
                      <td style={{ padding: "1rem 1.25rem", fontSize: "0.8125rem", color: "#475569" }}>
                        {route.seats_total || 55} Seater
                      </td>

                      {/* Status */}
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "9999px",
                            fontSize: "0.6875rem",
                            fontWeight: "700",
                            backgroundColor: route.is_active ? "#dcfce7" : "#f1f5f9",
                            color: route.is_active ? "#166534" : "#64748b",
                          }}
                        >
                          <CheckCircle size={12} />
                          {route.is_active ? "Operational" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================================
            4. Emergency Dispatch Hotline Box
        ===================================================================== */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "0.5rem", borderRadius: "0.5rem", display: "flex" }}>
              <Phone size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "700", color: "#0f172a" }}>
                Campus Transport Dispatch & Emergency Coordination
              </h4>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
                For breakdown notifications, route re-routing, or driver coordination: (041) 111-128-128 Ext: 142
              </p>
            </div>
          </div>

          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
            FAST-NUCES CFD Transport Office
          </span>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSchedules;

