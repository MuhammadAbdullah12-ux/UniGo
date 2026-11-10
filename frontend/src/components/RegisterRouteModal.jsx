/**
 * Route registration and bus seat enrollment modal component for students.
 * Fetches available university bus routes, enforces student-type pricing policies
 * (Day Scholar full-semester commute vs Hostelite weekend rates),
 * and creates the active fee voucher upon submission.
 */

import React, { useState, useEffect } from "react";
import { Bus, MapPin, Users, AlertCircle, X, Check } from "lucide-react";
import API from "../api/client";

export const RegisterRouteModal = ({ isOpen, onClose, onSuccess, studentType = "day_scholar" }) => {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [tripType, setTripType] = useState("two_way");
  const [semester] = useState("Fall 2026");
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isDayScholar = studentType.toLowerCase() === "day_scholar";

  // Fetch all active campus bus routes when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoadingRoutes(true);
      API.get("/routes")
        .then((res) => {
          setRoutes(res.data || []);
          if (res.data && res.data.length > 0) {
            setSelectedRouteId(String(res.data[0].id));
          }
        })
        .catch((err) => {
          console.error("Failed to load transport routes:", err);
          setError("Failed to load available bus routes. Please verify server connection.");
        })
        .finally(() => {
          setLoadingRoutes(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedRoute = routes.find((r) => String(r.id) === String(selectedRouteId));

  // Compute live price preview based on user selection
  const calculateEstimatedFee = () => {
    if (!selectedRoute) return 0;
    if (isDayScholar) {
      return Number(selectedRoute.fee_amount) || 36000;
    }
    return tripType === "one_way" ? 500 : 1000;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRouteId) {
      setError("Please select a bus route to continue.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        route_id: Number(selectedRouteId),
        trip_type: isDayScholar ? "two_way" : tripType,
        semester: semester,
      };

      const res = await API.post("/registrations", payload);
      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      console.error("Route registration error:", err);
      const msg = err.response?.data?.detail || "Failed to register for route. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
          maxWidth: "540px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        {/* Header */}
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
            <Bus size={22} />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700" }}>
                Select Campus Bus Route
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.85 }}>
                {semester} Transport Enrollment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "0.25rem",
              borderRadius: "0.375rem",
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          {error && (
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
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {loadingRoutes ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              Loading official bus routes...
            </div>
          ) : (
            <>
              {/* Route Dropdown */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: "700",
                    color: "#374151",
                    marginBottom: "0.375rem",
                  }}
                >
                  Choose Your Campus Route:
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
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
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      Route {r.id}: {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Route Inspection Card */}
              {selectedRoute && (
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.625rem",
                    padding: "0.875rem 1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <MapPin size={16} style={{ color: "#2563eb", marginTop: "2px", flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                        Scheduled Pickup Points:
                      </span>
                      <p style={{ margin: "0.125rem 0 0 0", fontSize: "0.8125rem", color: "#1e293b", lineHeight: "1.4" }}>
                        {selectedRoute.pickup_points || "All standard university bus stops"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#64748b" }}>
                    <Users size={14} />
                    <span>
                      Seat Occupancy: <strong>{selectedRoute.seats_taken || 0}</strong> / {selectedRoute.seats_total || 55} seats reserved
                    </span>
                  </div>
                </div>
              )}

              {/* Trip Type Selector */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: "700",
                    color: "#374151",
                    marginBottom: "0.375rem",
                  }}
                >
                  Commute Category:
                </label>

                {isDayScholar ? (
                  <div
                    style={{
                      backgroundColor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      padding: "0.625rem 0.875rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.8125rem",
                      color: "#1e40af",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Check size={16} />
                    <span>Two-Way Semester Pass (Mandatory for Day Scholars)</span>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.625rem",
                        border: `1px solid ${tripType === "two_way" ? "#2563eb" : "#d1d5db"}`,
                        borderRadius: "0.5rem",
                        backgroundColor: tripType === "two_way" ? "#eff6ff" : "#ffffff",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <input
                        type="radio"
                        name="tripType"
                        value="two_way"
                        checked={tripType === "two_way"}
                        onChange={() => setTripType("two_way")}
                      />
                      <span>Weekend Two-Way (Rs. 1,000)</span>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.625rem",
                        border: `1px solid ${tripType === "one_way" ? "#2563eb" : "#d1d5db"}`,
                        borderRadius: "0.5rem",
                        backgroundColor: tripType === "one_way" ? "#eff6ff" : "#ffffff",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <input
                        type="radio"
                        name="tripType"
                        value="one_way"
                        checked={tripType === "one_way"}
                        onChange={() => setTripType("one_way")}
                      />
                      <span>Weekend One-Way (Rs. 500)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Fee Summary Banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.875rem 1rem",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "0.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: "600", textTransform: "uppercase" }}>
                    Challan Voucher Amount:
                  </span>
                  <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800", color: "#14532d" }}>
                    Rs. {calculateEstimatedFee().toLocaleString()}
                  </p>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#15803d", backgroundColor: "#dcfce7", padding: "0.25rem 0.5rem", borderRadius: "9999px" }}>
                  14 Days Due Date
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={onClose}
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
                  disabled={submitting || loadingRoutes}
                  style={{
                    padding: "0.625rem 1.25rem",
                    border: "none",
                    backgroundColor: "#1e3a8a",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#ffffff",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Generating Voucher..." : "Confirm & Generate Fee Slip"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default RegisterRouteModal;

