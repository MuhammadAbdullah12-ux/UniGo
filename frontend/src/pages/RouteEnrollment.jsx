/**
 * Student Bus Route Discovery & Enrollment Screen.
 * Route: /student/routes
 * Features:
 *   - Visual catalog of all active university bus routes.
 *   - Real-time seat availability counters and occupancy gauges.
 *   - Detailed pickup stop timetables (e.g. 7:05 AM -> 8:25 AM arrival).
 *   - Search and filter by pickup area or bus name.
 *   - Strict 1-Route Policy: students can only enroll in 1 route at a time.
 *   - Displays lock notice on other routes explaining that route switching requires Transport Admin authorization.
 *   - Visual banner highlighting the student's current enrolled route.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  MapPin,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Lock,
  X,
  Info,
  Phone,
  Mail,
  ArrowRightLeft,
} from "lucide-react";
import Layout from "../components/Layout";
import RegisterRouteModal from "../components/RegisterRouteModal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import API from "../api/client";

export const RouteEnrollment = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [myFee, setMyFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRouteForModal, setSelectedRouteForModal] = useState(null);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [switchModalRoute, setSwitchModalRoute] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [routesRes, feeRes] = await Promise.allSettled([
        API.get("/routes"),
        API.get("/fees/my"),
      ]);

      if (routesRes.status === "fulfilled") {
        setRoutes(routesRes.value.data || []);
      }
      if (feeRes.status === "fulfilled") {
        setMyFee(feeRes.value.data);
      } else {
        setMyFee(null);
      }
    } catch (err) {
      console.error("Failed to load routes catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnrollClick = (route) => {
    setSelectedRouteForModal(route);
    setRegisterModalOpen(true);
  };

  const handleEnrollSuccess = () => {
    fetchData();
  };

  const filteredRoutes = routes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = r.name?.toLowerCase().includes(q);
    const stopsMatch = r.pickup_points?.toLowerCase().includes(q);
    return nameMatch || stopsMatch;
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
                <MapPin size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#0f172a" }}>
                  Campus Bus Routes & Seat Enrollment
                </h1>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                  Browse scheduled university routes, view seat availability, and enroll for the semester.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchData}
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
            <span>Refresh Routes</span>
          </button>
        </div>

        {/* =====================================================================
            2. Current Enrolled Route Banner (If Student is Already Registered)
        ===================================================================== */}
        {myFee && (
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #bfdbfe",
              borderRadius: "0.75rem",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              boxShadow: "0 1px 3px rgba(37, 99, 235, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                marginBottom: "0.875rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <div
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    padding: "0.625rem",
                    borderRadius: "0.5rem",
                    display: "flex",
                  }}
                >
                  <Bus size={22} />
                </div>
                <div>
                  <span style={{ fontSize: "0.6875rem", fontWeight: "700", color: "#1e40af", textTransform: "uppercase" }}>
                    Your Active Transport Pass
                  </span>
                  <h3 style={{ margin: "0.125rem 0 0 0", fontSize: "1.0625rem", fontWeight: "800", color: "#0f172a" }}>
                    {myFee.route_name || "Enrolled Route"}
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {myFee.semester || "Fall 2026"} • {myFee.trip_type === "one_way" ? "One-Way Commute" : "Two-Way Full Semester"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <StatusBadge status={myFee.status} />
                <span style={{ fontSize: "0.9375rem", fontWeight: "800", color: "#1e3a8a" }}>
                  PKR {myFee.amount?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Strict Single-Route Bounded Notice with Transfer Action */}
            <div
              style={{
                fontSize: "0.8125rem",
                color: "#1e40af",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Lock size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Single-Route Policy:</strong> You are currently enrolled in <strong>{myFee.route_name}</strong>. Commuters are restricted to 1 route at a time.
                </span>
              </div>
              <Link
                to="/student/change-route"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "0.375rem",
                  fontWeight: "700",
                  fontSize: "0.75rem",
                  textDecoration: "none",
                }}
              >
                <ArrowRightLeft size={13} />
                <span>Request Route Change &rarr;</span>
              </Link>
            </div>
          </div>
        )}

        {/* =====================================================================
            3. Search Bar
        ===================================================================== */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            padding: "0.875rem 1rem",
            border: "1px solid #e2e8f0",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={18}
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
              placeholder="Search by bus route name, stop (e.g. 'Jail Road', 'Nishatabad', 'Chenab')..."
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem 0.625rem 2.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "#f8fafc",
              }}
            />
          </div>
        </div>

        {/* =====================================================================
            4. Routes Grid Cards
        ===================================================================== */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
            <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 0.5rem auto" }} />
            <p style={{ margin: 0, fontSize: "0.875rem" }}>Loading available university bus routes...</p>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3.5rem 1.5rem",
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px dashed #cbd5e1",
            }}
          >
            <Bus size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem auto" }} />
            <h4 style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontSize: "1.0625rem", fontWeight: "700" }}>
              No routes match your search
            </h4>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
              Try searching for a different pickup sector or bus stop.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {filteredRoutes.map((route) => {
              const totalSeats = route.seats_total || 55;
              const seatsTaken = route.seats_taken || 0;
              const seatsLeft = Math.max(0, totalSeats - seatsTaken);
              const occupancyPct = Math.min(100, Math.round((seatsTaken / totalSeats) * 100));
              const isFull = seatsLeft <= 0;
              const isMyRoute = myFee && myFee.route_name === route.name;

              return (
                <div
                  key={route.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.875rem",
                    border: isMyRoute ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    padding: "1.25rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    {/* Top Route Title & Badges */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                          style={{
                            backgroundColor: isMyRoute ? "#2563eb" : "#f1f5f9",
                            color: isMyRoute ? "#ffffff" : "#475569",
                            padding: "0.45rem",
                            borderRadius: "0.5rem",
                            display: "flex",
                          }}
                        >
                          <Bus size={18} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "800", color: "#0f172a", lineHeight: "1.3" }}>
                            {route.name}
                          </h3>
                          <span style={{ fontSize: "0.6875rem", color: "#64748b" }}>55-Seater University Bus</span>
                        </div>
                      </div>

                      {isMyRoute ? (
                        <span
                          style={{
                            backgroundColor: "#dcfce7",
                            color: "#166534",
                            fontSize: "0.6875rem",
                            fontWeight: "800",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "9999px",
                            whiteSpace: "nowrap",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          Active Pass
                        </span>
                      ) : isFull ? (
                        <span
                          style={{
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                            fontSize: "0.6875rem",
                            fontWeight: "800",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "9999px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Full
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: "#f0fdf4",
                            color: "#166534",
                            fontSize: "0.6875rem",
                            fontWeight: "800",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "9999px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {seatsLeft} seats open
                        </span>
                      )}
                    </div>

                    {/* Seat Occupancy Progress Bar */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                        <span>Capacity Occupancy</span>
                        <span style={{ fontWeight: "700", color: isFull ? "#b91c1c" : "#1e293b" }}>
                          {seatsTaken} / {totalSeats} seats ({occupancyPct}%)
                        </span>
                      </div>
                      <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "9999px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${occupancyPct}%`,
                            backgroundColor: isFull ? "#ef4444" : occupancyPct > 80 ? "#f59e0b" : "#2563eb",
                            borderRadius: "9999px",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* Pickup Stops */}
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        borderRadius: "0.5rem",
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                        marginBottom: "1rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.375rem", marginBottom: "0.25rem" }}>
                        <MapPin size={14} color="#2563eb" style={{ marginTop: "2px", flexShrink: 0 }} />
                        <span style={{ fontSize: "0.6875rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                          Scheduled Pickup Stops:
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#334155", lineHeight: "1.4" }}>
                        {route.pickup_points || "All designated campus bus stops"}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Fee & Action */}
                  <div
                    style={{
                      borderTop: "1px solid #f1f5f9",
                      paddingTop: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.6875rem", color: "#64748b", display: "block" }}>
                        Semester Commute
                      </span>
                      <span style={{ fontSize: "1rem", fontWeight: "800", color: "#0f172a" }}>
                        PKR {route.fee_amount?.toLocaleString()}
                      </span>
                    </div>

                    {isMyRoute ? (
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: "700",
                          color: "#166534",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          backgroundColor: "#dcfce7",
                          padding: "0.35rem 0.65rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <CheckCircle size={15} />
                        <span>Enrolled</span>
                      </span>
                    ) : myFee ? (
                      <Link
                        to="/student/change-route"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.45rem 0.75rem",
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid #bfdbfe",
                          borderRadius: "0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          textDecoration: "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#2563eb";
                          e.currentTarget.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#eff6ff";
                          e.currentTarget.style.color = "#2563eb";
                        }}
                      >
                        <ArrowRightLeft size={13} />
                        <span>Request Transfer</span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEnrollClick(route)}
                        disabled={isFull}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.5rem 0.875rem",
                          backgroundColor: isFull ? "#94a3b8" : "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "0.5rem",
                          fontSize: "0.8125rem",
                          fontWeight: "700",
                          cursor: isFull ? "not-allowed" : "pointer",
                          boxShadow: isFull ? "none" : "0 1px 2px rgba(37, 99, 235, 0.2)",
                        }}
                      >
                        <span>{isFull ? "Route Full" : "Enroll Route"}</span>
                        {!isFull && <ArrowRight size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Route Registration Modal (For First Time Enrollment) */}
        {registerModalOpen && (
          <RegisterRouteModal
            isOpen={registerModalOpen}
            onClose={() => setRegisterModalOpen(false)}
            onSuccess={handleEnrollSuccess}
            studentType={user?.student_type || "day_scholar"}
          />
        )}

        {/* =====================================================================
            5. Route Switch Policy Modal (When Enrolled Student Tries to Enroll Again)
        ===================================================================== */}
        {switchModalRoute && (
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
                maxWidth: "500px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  backgroundColor: "#fef2f2",
                  borderBottom: "1px solid #fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <div
                    style={{
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                      padding: "0.375rem",
                      borderRadius: "0.5rem",
                      display: "flex",
                    }}
                  >
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "800", color: "#991b1b" }}>
                      Route Enrollment Bound
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "#7f1d1d" }}>
                      1-Route University Transport Policy
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSwitchModalRoute(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#991b1b",
                    cursor: "pointer",
                    padding: "0.25rem",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: "1.5rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "#334155", lineHeight: "1.5" }}>
                  You are already registered for <strong>{myFee?.route_name}</strong>. University policy strictly restricts commuters to <strong>exactly 1 bus route</strong> at a time. Multiple simultaneous route enrollments are not permitted.
                </p>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.625rem",
                    padding: "1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.8125rem", fontWeight: "700", color: "#0f172a" }}>
                    How to transfer to {switchModalRoute.name}?
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem", color: "#475569", lineHeight: "1.6" }}>
                    <li>Seat transfers must be authorized by the <strong>Transport Administrator</strong>.</li>
                    <li>The Admin will verify that the target route has open seats.</li>
                    <li>Your fee record will be transferred automatically without re-payment.</li>
                  </ul>
                </div>

                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "0.5rem",
                    padding: "0.75rem 1rem",
                    marginBottom: "1.5rem",
                    fontSize: "0.75rem",
                    color: "#1e40af",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Mail size={13} />
                    <span>Contact Admin: <strong>admin@unigo.test</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Phone size={13} />
                    <span>Transport Office Hotline: <strong>(041) 111-128-128 Ext: 142</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSwitchModalRoute(null)}
                    style={{
                      padding: "0.5rem 1.25rem",
                      backgroundColor: "#1e293b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontSize: "0.8125rem",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    I Understand
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RouteEnrollment;
