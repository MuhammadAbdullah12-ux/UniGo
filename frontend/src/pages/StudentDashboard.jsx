/**
 * Primary Student Portal Dashboard for UniGo.
 * Integrates bus route discovery, context-aware fee voucher presentation,
 * interactive PDF challan upload workflows, prominent rejection feedback banners,
 * and real-time in-app notification bell alerts.
 */

import React, { useState, useEffect } from "react";
import {
  Bus,
  CreditCard,
  Calendar,
  Clock,
  AlertTriangle,
  UploadCloud,
  FileCheck,
  ExternalLink,
  LogOut,
  User,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/client";
import StatusBadge from "../components/StatusBadge";
import NotificationBell from "../components/NotificationBell";
import RegisterRouteModal from "../components/RegisterRouteModal";
import UploadReceiptModal from "../components/UploadReceiptModal";

export const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Fetch the active transport fee voucher for the logged-in student
  const fetchMyFee = async () => {
    try {
      setLoading(true);
      const res = await API.get("/fees/my");
      setFee(res.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // 404 indicates student has not enrolled in a route yet
        setFee(null);
      } else {
        console.error("Failed to retrieve fee voucher:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyFee();
  }, []);

  const handleOpenReceiptFile = () => {
    if (!fee) return;
    const token = localStorage.getItem("unigo_token");
    // Open the PDF stream endpoint in a secure new browser tab
    window.open(`http://localhost:8000/fees/${fee.id}/receipt/file?token=${token}`, "_blank");
  };

  const isDayScholar = user?.student_type?.toLowerCase() !== "hostelite";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#1e293b", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* =========================================================================
          Top Navigation Header
      ========================================================================= */}
      <header
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0.875rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              backgroundColor: "#1e3a8a",
              color: "#ffffff",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bus size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "800", color: "#1e3a8a", letterSpacing: "-0.01em" }}>
              UniGo Transport
            </h1>
            <p style={{ margin: 0, fontSize: "0.6875rem", color: "#64748b", fontWeight: "500" }}>
              FAST-NUCES CFD Campus
            </p>
          </div>
        </div>

        {/* User Identity & Top Actions */}
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
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: "700",
              }}
            >
              {user?.full_name?.charAt(0) || "S"}
            </div>
            <div style={{ lineHeight: "1.2" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "#1e293b", display: "block" }}>
                {user?.full_name}
              </span>
              <span style={{ fontSize: "0.6875rem", color: "#64748b" }}>
                {user?.reg_no || user?.email} • {isDayScholar ? "Day Scholar" : "Hostelite"}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign out of your account"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 0.875rem",
              backgroundColor: "#ffffff",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          Main Dashboard Container
      ========================================================================= */}
      <main style={{ maxWidth: "1080px", margin: "2rem auto", padding: "0 1.5rem" }}>
        {/* Welcome Intro Header */}
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h2 style={{ margin: "0 0 0.375rem 0", fontSize: "1.75rem", fontWeight: "800", color: "#0f172a" }}>
              Student Transport Portal
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
              Manage your semester commute, bus pass verification, and challan submissions.
            </p>
          </div>
          <button
            onClick={fetchMyFee}
            title="Refresh dashboard data"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 0.75rem",
              backgroundColor: "#ffffff",
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Loading State */}
        {loading && !fee && (
          <div style={{ padding: "4rem 1rem", textAlign: "center", color: "#64748b" }}>
            <Bus size={36} style={{ color: "#2563eb", marginBottom: "0.75rem" }} />
            <p style={{ margin: 0, fontWeight: "600" }}>Loading transport records...</p>
          </div>
        )}

        {/* =====================================================================
            STATE 1: No Route Enrolled Yet
        ===================================================================== */}
        {!loading && !fee && (
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "1rem",
              padding: "3.5rem 2rem",
              textAlign: "center",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem auto",
              }}
            >
              <Bus size={32} />
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.375rem", fontWeight: "800", color: "#0f172a" }}>
              No Bus Route Registered for Fall 2026
            </h3>
            <p style={{ margin: "0 auto 1.75rem auto", color: "#64748b", maxWidth: "480px", lineHeight: "1.5", fontSize: "0.9375rem" }}>
              You are not currently enrolled in campus transport. Browse official FAST-NUCES bus routes (Chenab Garden, Nishatabad, Millat Town, Samundari Rd) to reserve your seat.
            </p>
            <button
              onClick={() => setRegisterModalOpen(true)}
              style={{
                padding: "0.75rem 1.75rem",
                backgroundColor: "#1e3a8a",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.625rem",
                fontSize: "0.9375rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 6px -1px rgba(30, 58, 138, 0.3)",
              }}
            >
              Enroll in Campus Bus Route
            </button>
          </div>
        )}

        {/* =====================================================================
            STATE 2: Route Enrolled (Active Voucher)
        ===================================================================== */}
        {fee && (
          <>
            {/* Prominent Red Rejection Alert Banner */}
            {fee.status === "rejected" && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "2px solid #ef4444",
                  borderRadius: "0.875rem",
                  padding: "1.25rem 1.5rem",
                  marginBottom: "2rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.12)",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    padding: "0.5rem",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.0625rem", fontWeight: "800", color: "#991b1b" }}>
                    Action Required: Your Fee Challan Was Rejected by Accounts
                  </h4>
                  <p style={{ margin: "0 0 0.75rem 0", color: "#7f1d1d", fontSize: "0.875rem", lineHeight: "1.4" }}>
                    The Accounts Officer reviewed your submitted slip and marked it invalid with the following reason:
                  </p>
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #fca5a5",
                      borderRadius: "0.5rem",
                      padding: "0.75rem 1rem",
                      fontStyle: "italic",
                      color: "#991b1b",
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                    }}
                  >
                    "{fee.last_reject_reason || "Challan scan is unreadable or bank stamp is missing."}"
                  </div>
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.625rem 1.25rem",
                      backgroundColor: "#b91c1c",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontWeight: "700",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    <UploadCloud size={16} />
                    <span>Re-Upload Corrected Bank Slip</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2-Column Responsive Card Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
              {/* Card 1: Route & Schedule */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  padding: "1.5rem",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
                  <div style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "0.5rem", borderRadius: "0.5rem" }}>
                    <Bus size={20} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700", color: "#0f172a" }}>
                    Enrolled Campus Route
                  </h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                      Official Route Name:
                    </span>
                    <p style={{ margin: "0.125rem 0 0 0", fontSize: "1.0625rem", fontWeight: "700", color: "#1e3a8a" }}>
                      {fee.route_name || "Assigned Bus Route"}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                      Commute Category:
                    </span>
                    <p style={{ margin: "0.125rem 0 0 0", fontSize: "0.875rem", color: "#334155", fontWeight: "600" }}>
                      {fee.trip_type === "one_way" ? "One-Way Commute" : "Two-Way Full Semester Commute"}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                      Academic Semester:
                    </span>
                    <p style={{ margin: "0.125rem 0 0 0", fontSize: "0.875rem", color: "#334155" }}>
                      {fee.semester || "Fall 2026"}
                    </p>
                  </div>

                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.75rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: "0.5rem",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.75rem",
                      color: "#475569",
                      lineHeight: "1.4",
                    }}
                  >
                    🕒 <strong>Campus Departure Timing:</strong> Regular departures leave campus at 4:30 PM. Special Friday and examination departures leave at 2:00 PM.
                  </div>
                </div>
              </div>

              {/* Card 2: Fee Voucher & Payment Action */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  padding: "1.5rem",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <div style={{ backgroundColor: "#ecfdf5", color: "#059669", padding: "0.5rem", borderRadius: "0.5rem" }}>
                        <CreditCard size={20} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700", color: "#0f172a" }}>
                        Transport Fee Voucher
                      </h3>
                    </div>
                    <StatusBadge status={fee.status} />
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                      Total Payable Amount:
                    </span>
                    <p style={{ margin: "0.125rem 0 0 0", fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
                      Rs. {Number(fee.amount).toLocaleString()}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "#64748b", marginBottom: "1.5rem" }}>
                    <Calendar size={15} />
                    <span>
                      Payment Due Date:{" "}
                      <strong>
                        {fee.due_date ? new Date(fee.due_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "14 Days from Enrollment"}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Status-Aware Action Trigger */}
                <div>
                  {fee.status === "unpaid" && (
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        backgroundColor: "#1e3a8a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "0.5rem",
                        fontWeight: "700",
                        fontSize: "0.875rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <UploadCloud size={16} />
                      <span>Upload Paid Bank Challan</span>
                    </button>
                  )}

                  {fee.status === "pending" && (
                    <div
                      style={{
                        backgroundColor: "#fffbeb",
                        border: "1px solid #fef3c7",
                        padding: "0.875rem",
                        borderRadius: "0.5rem",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8125rem", color: "#92400e", fontWeight: "600" }}>
                        ⏳ Challan under review by Accounts Officer.
                      </p>
                      <button
                        onClick={handleOpenReceiptFile}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#2563eb",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <ExternalLink size={13} />
                        View Uploaded PDF Slip
                      </button>
                    </div>
                  )}

                  {fee.status === "paid" && (
                    <div
                      style={{
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        padding: "0.875rem",
                        borderRadius: "0.5rem",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", color: "#065f46", fontWeight: "700", fontSize: "0.875rem" }}>
                        <ShieldCheck size={18} />
                        <span>Seat Confirmed • Pass Active</span>
                      </div>
                      <button
                        onClick={handleOpenReceiptFile}
                        style={{
                          marginTop: "0.5rem",
                          background: "transparent",
                          border: "none",
                          color: "#059669",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <FileCheck size={14} />
                        View Verified Slip
                      </button>
                    </div>
                  )}

                  {fee.status === "rejected" && (
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        backgroundColor: "#dc2626",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "0.5rem",
                        fontWeight: "700",
                        fontSize: "0.875rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <UploadCloud size={16} />
                      <span>Re-Upload Bank Challan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* =========================================================================
          Interactive Modals
      ========================================================================= */}
      {/* Route Registration Modal */}
      <RegisterRouteModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={(newFee) => {
          setFee(newFee);
        }}
        studentType={user?.student_type || "day_scholar"}
      />

      {/* PDF Upload Modal */}
      {fee && (
        <UploadReceiptModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          feeId={fee.id}
          amount={fee.amount}
          isReupload={fee.status === "rejected"}
          lastRejectReason={fee.last_reject_reason}
          onSuccess={() => {
            fetchMyFee();
          }}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
