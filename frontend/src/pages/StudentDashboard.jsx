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
  X,
  FileText,
  Eye,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/client";
import StatusBadge from "../components/StatusBadge";
import NotificationBell from "../components/NotificationBell";
import RegisterRouteModal from "../components/RegisterRouteModal";
import UploadReceiptModal from "../components/UploadReceiptModal";
import Layout from "../components/Layout";

export const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // In-App PDF Preview Modal State (IDM-Proof Embedded Viewer)
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pdfRenderError, setPdfRenderError] = useState(null);

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

  const handleOpenReceiptFile = async () => {
    if (!fee) return;
    setPdfModalOpen(true);
    setPdfRendering(true);
    setPdfRenderError(null);

    try {
      const res = await API.get(`/fees/${fee.id}/receipt/preview`);
      const base64Data = res.data.base64;

      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = Math.min(840, window.innerWidth - 60);
      const scale = (containerWidth / unscaledViewport.width) * 1.3;
      const viewport = page.getViewport({ scale });

      let canvas = document.getElementById("student-pdf-canvas");
      for (let attempt = 0; attempt < 10 && !canvas; attempt++) {
        await new Promise((r) => setTimeout(r, 50));
        canvas = document.getElementById("student-pdf-canvas");
      }
      if (canvas) {
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      }
    } catch (err) {
      console.error("Failed to render PDF:", err);
      setPdfRenderError("Could not render uploaded document.");
    } finally {
      setPdfRendering(false);
    }
  };

  const closePdfModal = () => {
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl);
    }
    setPdfBlobUrl(null);
    setPdfModalOpen(false);
  };

  const isDayScholar = user?.student_type?.toLowerCase() !== "hostelite";

  return (
    <Layout>
      <div style={{ maxWidth: "1080px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
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
      </div>

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

      {/* In-App PDF Challan Inspection Modal (IDM-Proof Embedded Viewer) */}
      {pdfModalOpen && (
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
              maxWidth: "960px",
              height: "88vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              overflow: "hidden",
              border: "1px solid #cbd5e1",
            }}
          >
            <div
              style={{
                padding: "0.875rem 1.5rem",
                backgroundColor: "#1e3a8a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #1e40af",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <FileText size={20} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "700" }}>
                    Uploaded Challan Slip Preview
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#93c5fd" }}>
                    {fee?.route_name} • Rs. {Number(fee?.amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={closePdfModal}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  padding: "0.375rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Close Preview"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: High-Resolution PDF.js HTML5 Canvas Rendering */}
            <div
              style={{
                flex: 1,
                backgroundColor: "#334155",
                overflowY: "auto",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
              }}
            >
              {pdfRendering && (
                <div style={{ color: "#ffffff", padding: "4rem 1rem", textAlign: "center" }}>
                  <RefreshCw size={28} className="spin" style={{ margin: "0 auto 0.75rem auto", display: "block" }} />
                  <p style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>
                    Loading & rendering uploaded PDF document...
                  </p>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Rendering original bank challan page 1
                  </span>
                </div>
              )}

              {pdfRenderError && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    color: "#991b1b",
                    padding: "1.25rem",
                    borderRadius: "0.5rem",
                    maxWidth: "500px",
                    textAlign: "center",
                    margin: "2rem auto",
                    border: "1px solid #fecaca",
                  }}
                >
                  <AlertTriangle size={24} style={{ margin: "0 auto 0.5rem auto", color: "#dc2626" }} />
                  <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9375rem", fontWeight: "700" }}>Unable to Render Document</h4>
                  <p style={{ margin: 0, fontSize: "0.8125rem" }}>{pdfRenderError}</p>
                </div>
              )}

              <canvas
                id="student-pdf-canvas"
                style={{
                  display: pdfRendering || pdfRenderError ? "none" : "block",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                  borderRadius: "0.375rem",
                  backgroundColor: "#ffffff",
                  maxWidth: "100%",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StudentDashboard;
