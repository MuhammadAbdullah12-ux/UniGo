/**
 * Student Route Change & Transfer Request Screen.
 * Route: /student/change-route
 * Features:
 *   - Overview of student's current assigned bus route.
 *   - Live pending request status tracker with cancellation option.
 *   - Interactive request form to select target route with live seat capacity preview.
 *   - Detailed reason submission for Transport Administrator review.
 *   - Historical audit trail of all previous route change requests with admin notes.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightLeft,
  Bus,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  MapPin,
  Send,
  Users,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Info,
  Calendar,
} from "lucide-react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import API from "../api/client";

export const StudentRouteChange = () => {
  const { user } = useAuth();
  const [fee, setFee] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [feeRes, routesRes, reqsRes] = await Promise.allSettled([
        API.get("/fees/my"),
        API.get("/routes"),
        API.get("/routes/change-requests/my"),
      ]);

      if (feeRes.status === "fulfilled") {
        setFee(feeRes.value.data);
      } else {
        setFee(null);
      }

      if (routesRes.status === "fulfilled") {
        setRoutes(routesRes.value.data || []);
      }

      if (reqsRes.status === "fulfilled") {
        setMyRequests(reqsRes.value.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch route change data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingRequest = myRequests.find((r) => r.status === "pending");

  // Filter available routes (exclude current enrolled route)
  const availableRoutes = routes.filter((r) => {
    if (!fee) return true;
    return r.id !== fee.route_id;
  });

  const selectedRouteObj = routes.find((r) => String(r.id) === String(selectedRouteId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRouteId) {
      setErrorMsg("Please select the bus route you wish to transfer to.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg("Please provide a valid explanation for why you need to switch routes (min 5 characters).");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      setSuccessMsg("");

      await API.post("/routes/change-requests", {
        requested_route_id: Number(selectedRouteId),
        reason: reason.trim(),
      });

      setSuccessMsg("Route transfer request submitted successfully to Transport Administration.");
      setReason("");
      setSelectedRouteId("");
      fetchData();
    } catch (err) {
      console.error("Failed to submit route change request:", err);
      const detail = err.response?.data?.detail || "Failed to submit request. Please try again.";
      setErrorMsg(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to cancel your pending route transfer request?")) {
      return;
    }
    try {
      await API.delete(`/routes/change-requests/${requestId}`);
      fetchData();
    } catch (err) {
      console.error("Failed to cancel request:", err);
      alert(err.response?.data?.detail || "Could not cancel request.");
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: "1080px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
        {/* =====================================================================
            1. Header Section
        ===================================================================== */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.75rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowRightLeft size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800", color: "#0f172a" }}>
                Route Change Request
              </h2>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
              Submit an official request to switch your registered campus bus route for Transport Admin authorization.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1rem",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "0.5rem",
              color: "#334155",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: refreshing ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* =====================================================================
            CASE A: Student Not Enrolled in Any Route
        ===================================================================== */}
        {!fee && !loading && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "1rem",
              border: "1px solid #e2e8f0",
              padding: "3rem 2rem",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem auto",
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", fontWeight: "800", color: "#0f172a" }}>
              No Active Bus Enrollment Found
            </h3>
            <p style={{ margin: "0 auto 1.5rem auto", color: "#64748b", maxWidth: "440px", fontSize: "0.9375rem" }}>
              You must be registered in a campus bus route before you can request a transfer. Browse our routes to pick your initial route.
            </p>
            <Link
              to="/student/routes"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#1e3a8a",
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "0.5rem",
                fontWeight: "700",
                fontSize: "0.875rem",
              }}
            >
              <Bus size={18} />
              <span>Browse Campus Bus Routes</span>
            </Link>
          </div>
        )}

        {/* =====================================================================
            CASE B: Student Enrolled (Active Route Available)
        ===================================================================== */}
        {fee && (
          <>
            {/* Top Grid: Current Route Overview */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.25rem",
                marginBottom: "1.75rem",
              }}
            >
              {/* Current Route Card */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.875rem",
                  border: "1px solid #e2e8f0",
                  padding: "1.25rem 1.5rem",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Your Current Bus Route
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.2rem 0.625rem",
                      backgroundColor: "#ecfdf5",
                      color: "#059669",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                    }}
                  >
                    <CheckCircle size={13} />
                    <span>Active Pass</span>
                  </span>
                </div>
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.25rem", fontWeight: "800", color: "#1e3a8a" }}>
                  {fee.route_name || "Assigned Bus Route"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#475569" }}>
                  {fee.trip_type === "one_way" ? "One-Way Commute" : "Two-Way Full Semester Commute"} • {fee.semester || "Fall 2026"}
                </p>
              </div>

              {/* Policy Bounding Notice Card */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.875rem",
                  border: "1px solid #e2e8f0",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  gap: "0.875rem",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ color: "#2563eb", marginTop: "0.125rem" }}>
                  <Info size={20} />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", fontWeight: "700", color: "#0f172a" }}>
                    Single-Route Enrollment Policy
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b", lineHeight: "1.4" }}>
                    FAST-NUCES strictly restricts students to one bus seat at a time. Once submitted, your transfer request is routed to the Transport Office for seat capacity verification.
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================================
                2. Active Pending Request Banner (if any)
            ================================================================= */}
            {pendingRequest && (
              <div
                style={{
                  backgroundColor: "#fffbeb",
                  border: "2px solid #f59e0b",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  marginBottom: "2rem",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.12)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div
                      style={{
                        backgroundColor: "#fef3c7",
                        color: "#b45309",
                        padding: "0.625rem",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <Clock size={24} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.625rem",
                            backgroundColor: "#fef3c7",
                            color: "#b45309",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: "800",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Transfer Request Under Review
                        </span>
                        <span style={{ fontSize: "0.8125rem", color: "#92400e" }}>
                          Submitted {new Date(pendingRequest.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 style={{ margin: "0.375rem 0", fontSize: "1.125rem", fontWeight: "800", color: "#78350f" }}>
                        Requested Switch to: {pendingRequest.requested_route_name}
                      </h4>
                      <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", color: "#92400e", fontStyle: "italic" }}>
                        "{pendingRequest.reason}"
                      </p>
                      <p style={{ margin: 0, fontSize: "0.8125rem", color: "#b45309" }}>
                        The Transport Administrator will review seat availability on this route. You will receive an in-app alert upon approval.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelRequest(pendingRequest.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#ffffff",
                      border: "1px solid #f59e0b",
                      borderRadius: "0.5rem",
                      color: "#b45309",
                      fontSize: "0.8125rem",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Withdraw Request
                  </button>
                </div>
              </div>
            )}

            {/* =================================================================
                3. Route Transfer Form (Only shown when no pending request)
            ================================================================= */}
            {!pendingRequest && (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  padding: "1.75rem",
                  marginBottom: "2.5rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ margin: "0 0 0.375rem 0", fontSize: "1.25rem", fontWeight: "800", color: "#0f172a" }}>
                    Request Route Transfer
                  </h3>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
                    Select your desired destination route and state your reason for relocating or switching.
                  </p>
                </div>

                {errorMsg && (
                  <div
                    style={{
                      padding: "0.875rem 1rem",
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "0.5rem",
                      color: "#b91c1c",
                      fontSize: "0.875rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div
                    style={{
                      padding: "0.875rem 1rem",
                      backgroundColor: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      borderRadius: "0.5rem",
                      color: "#047857",
                      fontSize: "0.875rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {successMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Select Target Route */}
                  <div style={{ marginBottom: "1.25rem" }}>
                    <label
                      htmlFor="target-route-select"
                      style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "700", color: "#334155" }}
                    >
                      Desired Bus Route *
                    </label>
                    <select
                      id="target-route-select"
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        fontSize: "0.9375rem",
                        color: "#0f172a",
                        outline: "none",
                      }}
                    >
                      <option value="">-- Choose destination route --</option>
                      {availableRoutes.map((r) => {
                        const availableSeats = Math.max(0, r.seats_total - (r.seats_taken || 0));
                        return (
                          <option key={r.id} value={r.id} disabled={availableSeats <= 0}>
                            {r.name} {availableSeats > 0 ? `(${availableSeats} seats available)` : `(Route Full)`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Route Preview Card when selected */}
                  {selectedRouteObj && (
                    <div
                      style={{
                        backgroundColor: "#f1f5f9",
                        borderRadius: "0.75rem",
                        padding: "1rem 1.25rem",
                        marginBottom: "1.25rem",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.9375rem", fontWeight: "700", color: "#1e3a8a" }}>
                          {selectedRouteObj.name}
                        </span>
                        <span style={{ fontSize: "0.8125rem", fontWeight: "600", color: "#047857" }}>
                          Rs. {Number(selectedRouteObj.fee_amount).toLocaleString()} / semester
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "#475569", lineHeight: "1.4" }}>
                        <strong>Stops:</strong> {selectedRouteObj.pickup_points || "Standard campus stops"}
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "0.25rem" }}>
                        <strong>Seat Availability:</strong> {selectedRouteObj.seats_total - (selectedRouteObj.seats_taken || 0)} / {selectedRouteObj.seats_total} seats remaining
                      </div>
                    </div>
                  )}

                  {/* Reason Textarea */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label
                      htmlFor="reason-input"
                      style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "700", color: "#334155" }}
                    >
                      Reason for Route Change *
                    </label>
                    <textarea
                      id="reason-input"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why you need to switch routes (e.g. Relocated residence to West Canal Road, change in class schedule, shifted hostel)..."
                      rows={3}
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        fontSize: "0.9375rem",
                        color: "#0f172a",
                        outline: "none",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      Clear, valid reasons help Transport Administration expedite approvals.
                    </span>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem 1.75rem",
                      backgroundColor: "#1e3a8a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontSize: "0.9375rem",
                      fontWeight: "700",
                      cursor: submitting ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 6px -1px rgba(30, 58, 138, 0.25)",
                    }}
                  >
                    <Send size={16} />
                    <span>{submitting ? "Submitting Request..." : "Submit Route Transfer Request"}</span>
                  </button>
                </form>
              </div>
            )}

            {/* =================================================================
                4. Request History Ledger
            ================================================================= */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "1rem",
                border: "1px solid #e2e8f0",
                padding: "1.75rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ marginBottom: "1.25rem" }}>
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.125rem", fontWeight: "700", color: "#0f172a" }}>
                  Your Route Change History
                </h3>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.8125rem" }}>
                  Audit log of all route transfer requests submitted for your student account.
                </p>
              </div>

              {myRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#94a3b8", fontSize: "0.875rem" }}>
                  No previous route transfer requests recorded.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: "600" }}>Requested Route</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: "600" }}>Submission Date</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: "600" }}>Reason</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: "600" }}>Status</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: "600" }}>Admin Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRequests.map((req) => (
                        <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.875rem 1rem", fontWeight: "700", color: "#1e3a8a" }}>
                            {req.requested_route_name}
                          </td>
                          <td style={{ padding: "0.875rem 1rem", color: "#64748b" }}>
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: "0.875rem 1rem", color: "#334155", maxWidth: "260px" }}>
                            {req.reason}
                          </td>
                          <td style={{ padding: "0.875rem 1rem" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
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
                          <td style={{ padding: "0.875rem 1rem", color: "#475569", fontSize: "0.8125rem" }}>
                            {req.admin_notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default StudentRouteChange;

