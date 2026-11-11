/**
 * Accounts Officer Portal Dashboard for UniGo.
 * Equips the Accounts department with real-time KPI metrics,
 * the live in-app NotificationBell, and an interactive Pending Review Queue
 * with PDF slip inspection, Approve actions, and Reject-with-reason modals.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  ExternalLink,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  Eye,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/client";
import NotificationBell from "../components/NotificationBell";
import StatusBadge from "../components/StatusBadge";
import Layout from "../components/Layout";

export const AccountsDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  // In-App PDF Preview Modal State (bypasses browser download managers like IDM)
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pdfRenderError, setPdfRenderError] = useState(null);

  // Fetch KPI Stats and Pending Queue
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, receiptsRes] = await Promise.all([
        API.get("/accounts/stats"),
        API.get("/accounts/receipts?status=pending"),
      ]);
      setStats(statsRes.data);
      setReceipts(receiptsRes.data || []);
    } catch (err) {
      console.error("Failed to load Accounts dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Approve Action
  const handleApprove = async (receiptId) => {
    if (!window.confirm("Are you sure you want to approve this fee receipt and confirm the student's seat?")) {
      return;
    }
    try {
      setActionLoading(true);
      await API.post(`/accounts/receipts/${receiptId}/approve`);
      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to approve receipt:", err);
      alert(err.response?.data?.detail || "Failed to approve receipt");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reject Modal
  const openRejectModal = (receipt) => {
    setSelectedReceipt(receipt);
    setRejectReason("");
    setRejectError("");
    setRejectModalOpen(true);
  };

  // Handle Reject Submit
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim() || rejectReason.trim().length < 3) {
      setRejectError("Please provide a descriptive reason (minimum 3 characters).");
      return;
    }

    try {
      setActionLoading(true);
      await API.post(`/accounts/receipts/${selectedReceipt.id}/reject`, {
        reason: rejectReason.trim(),
      });
      setRejectModalOpen(false);
      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to reject receipt:", err);
      setRejectError(err.response?.data?.detail || "Failed to reject receipt");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Inspection Modal: Renders student's actual uploaded PDF via PDF.js on HTML5 <canvas>
  const handleViewPdf = async (item) => {
    const receipt = typeof item === "object" ? item : receipts.find((x) => x.id === item);
    setPreviewReceipt(receipt || null);
    setPdfModalOpen(true);
    setPdfRendering(true);
    setPdfRenderError(null);

    const receiptId = receipt ? receipt.id : item;

    try {
      // 1. Fetch document encoded as base64 (Pure JSON request: 100% immune to IDM interceptors)
      const res = await API.get(`/accounts/receipts/${receiptId}/preview`);
      const base64Data = res.data.base64;

      // 2. Decode base64 to binary Uint8Array
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 3. Ensure Mozilla PDF.js library is loaded
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

      // 4. Render PDF page 1 directly onto the canvas
      const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      // Scale to fit modal width comfortably with crisp high resolution
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = Math.min(840, window.innerWidth - 60);
      const scale = (containerWidth / unscaledViewport.width) * 1.3;
      const viewport = page.getViewport({ scale });

      let canvas = document.getElementById("challan-pdf-canvas");
      for (let attempt = 0; attempt < 10 && !canvas; attempt++) {
        await new Promise((r) => setTimeout(r, 50));
        canvas = document.getElementById("challan-pdf-canvas");
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
      console.error("Failed to render PDF with PDF.js:", err);
      setPdfRenderError(err.response?.data?.detail || "Could not render physical PDF document.");
    } finally {
      setPdfRendering(false);
    }
  };

  const closePdfModal = () => {
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl);
    }
    setPdfBlobUrl(null);
    setPreviewReceipt(null);
    setPdfModalOpen(false);
  };

  // Filter receipts by search query
  const filteredReceipts = receipts.filter((r) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.student_name?.toLowerCase().includes(query) ||
      r.student_reg_no?.toLowerCase().includes(query) ||
      r.route_name?.toLowerCase().includes(query)
    );
  });

  return (
    <Layout>
      <div style={{ maxWidth: "1240px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
        {/* Title & Refresh */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.75rem", fontWeight: "800", color: "#0f172a" }}>
              Fee Verification Dashboard
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
              Audit incoming student bank slips, inspect PDF receipts, and confirm fee payments.
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
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
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* 4 KPI Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {/* Card 1: Pending */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#92400e", fontWeight: "700", textTransform: "uppercase" }}>
                Pending Review
              </span>
              <div style={{ backgroundColor: "#fef3c7", color: "#d97706", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <Clock size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {stats?.pending_count ?? 0}
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Requires verification action</span>
          </div>

          {/* Card 2: Approved Today */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#065f46", fontWeight: "700", textTransform: "uppercase" }}>
                Approved Today
              </span>
              <div style={{ backgroundColor: "#ecfdf5", color: "#059669", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <CheckCircle size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {stats?.approved_today_count ?? 0}
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Vouchers confirmed today</span>
          </div>

          {/* Card 3: Rejected Total */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#991b1b", fontWeight: "700", textTransform: "uppercase" }}>
                Rejected Slips
              </span>
              <div style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <XCircle size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              {stats?.rejected_count ?? 0}
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Flagged for re-upload</span>
          </div>

          {/* Card 4: Total Revenue */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "#1e40af", fontWeight: "700", textTransform: "uppercase" }}>
                Total Verified Fee
              </span>
              <div style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "0.375rem", borderRadius: "0.375rem" }}>
                <DollarSign size={18} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "1.875rem", fontWeight: "800", color: "#0f172a" }}>
              Rs. {(stats?.total_collected_amount ?? 0).toLocaleString()}
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Confirmed collected revenue</span>
          </div>
        </div>

        {/* =====================================================================
            Pending Review Table Section
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
                Pending Challan Verification Queue
              </h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                Review student submitted PDF documents, verify bank stamp, and approve or reject.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Link
                to="/accounts/receipts"
                title="View full dedicated queue"
                style={{
                  fontSize: "0.8125rem",
                  color: "#2563eb",
                  fontWeight: "700",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                View Full Queue ({receipts.length}) →
              </Link>

              {/* Search Bar */}
              <div style={{ position: "relative", minWidth: "240px" }}>
                <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#9ca3af" }} />
                <input
                  type="text"
                  placeholder="Search by student name or roll no..."
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
          </div>

          {/* Table */}
          {loading && receipts.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
              Loading verification queue...
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div style={{ padding: "3.5rem 1rem", textAlign: "center" }}>
              <CheckCircle size={36} style={{ color: "#10b981", margin: "0 auto 0.75rem auto" }} />
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "#0f172a" }}>
                All Caught Up!
              </h4>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>
                There are no pending fee receipts waiting for verification.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "0.75rem 1.5rem" }}>Student</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Route</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Amount</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Uploaded At</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                    <th style={{ padding: "0.75rem 1.5rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map((r) => (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Student */}
                      <td style={{ padding: "1rem 1.5rem" }}>
                        {r.student_id ? (
                          <Link
                            to={`/accounts/students/${r.student_id}`}
                            title="View student payment history & audit timeline"
                            style={{
                              fontWeight: "700",
                              color: "#1e40af",
                              textDecoration: "none",
                              display: "inline-block",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                          >
                            {r.student_name}
                          </Link>
                        ) : (
                          <div style={{ fontWeight: "700", color: "#0f172a" }}>{r.student_name}</div>
                        )}
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.student_reg_no}</div>
                      </td>

                      {/* Route */}
                      <td style={{ padding: "1rem 1rem", color: "#334155", fontWeight: "600" }}>
                        {r.route_name}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: "1rem 1rem", fontWeight: "700", color: "#0f172a" }}>
                        Rs. {Number(r.amount).toLocaleString()}
                      </td>

                      {/* Uploaded Time */}
                      <td style={{ padding: "1rem 1rem", color: "#64748b", fontSize: "0.8125rem" }}>
                        {new Date(r.uploaded_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {r.is_late && (
                          <span style={{ display: "block", color: "#dc2626", fontSize: "0.6875rem", fontWeight: "700" }}>
                            ⚠️ LATE SUBMISSION
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "1rem 1rem" }}>
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem" }}>
                          <Link
                            to={`/accounts/receipts/${r.id}`}
                            title="Open full dedicated verification dossier screen"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.375rem 0.75rem",
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "0.375rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              textDecoration: "none",
                              cursor: "pointer",
                              boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
                            }}
                          >
                            <FileText size={13} />
                            Review
                          </Link>

                          <button
                            onClick={() => handleViewPdf(r)}
                            title="Inspect physical PDF challan in quick modal"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.375rem 0.625rem",
                              backgroundColor: "#f8fafc",
                              color: "#475569",
                              border: "1px solid #cbd5e1",
                              borderRadius: "0.375rem",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            <Eye size={13} />
                            Quick Preview
                          </button>

                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={actionLoading}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.375rem 0.75rem",
                              backgroundColor: "#059669",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "0.375rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            <CheckCircle size={13} />
                            Approve
                          </button>

                          <button
                            onClick={() => openRejectModal(r)}
                            disabled={actionLoading}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.375rem 0.75rem",
                              backgroundColor: "#dc2626",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "0.375rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            <XCircle size={13} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          Rejection Modal with Mandatory Reason
      ========================================================================= */}
      {rejectModalOpen && selectedReceipt && (
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
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                padding: "1.25rem 1.5rem",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldAlert size={20} />
                <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "700" }}>
                  Reject Fee Slip Submission
                </h3>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} style={{ padding: "1.5rem" }}>
              <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "#475569", lineHeight: "1.4" }}>
                Rejecting receipt for <strong>{selectedReceipt.student_name}</strong> ({selectedReceipt.student_reg_no}).
                Please specify why the slip was rejected so the student can fix it:
              </p>

              {rejectError && (
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
                  {rejectError}
                </div>
              )}

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#374151", marginBottom: "0.375rem" }}>
                  Formal Rejection Reason:
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Bank branch stamp is missing or blurry; please upload a clear stamped copy."
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#ffffff",
                    borderRadius: "0.375rem",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: "0.5rem 1.25rem",
                    backgroundColor: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "0.8125rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          In-App PDF Challan Inspection Modal (IDM-Proof Embedded Viewer)
      ========================================================================= */}
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
            {/* Modal Header */}
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
                    Challan Verification: {previewReceipt?.student_name || "Student Document"}
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#93c5fd" }}>
                    {previewReceipt?.student_reg_no} • {previewReceipt?.route_name} • Rs. {Number(previewReceipt?.amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action buttons inside the modal for instant audit */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                {previewReceipt && (
                  <>
                    <button
                      onClick={() => {
                        const id = previewReceipt.id;
                        closePdfModal();
                        handleApprove(id);
                      }}
                      disabled={actionLoading}
                      style={{
                        padding: "0.375rem 0.75rem",
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <CheckCircle size={13} />
                      Approve Slip
                    </button>

                    <button
                      onClick={() => {
                        const r = previewReceipt;
                        closePdfModal();
                        openRejectModal(r);
                      }}
                      disabled={actionLoading}
                      style={{
                        padding: "0.375rem 0.75rem",
                        backgroundColor: "#dc2626",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <XCircle size={13} />
                      Reject Slip
                    </button>
                  </>
                )}

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
                id="challan-pdf-canvas"
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

export default AccountsDashboard;
