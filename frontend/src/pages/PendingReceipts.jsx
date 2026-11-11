/**
 * Dedicated Pending Receipts Queue Screen for Accounts Officers (Day 16).
 * Route: /accounts/receipts
 * Features:
 *   - Comprehensive review table for all pending student fee submissions.
 *   - Integrated search filtering by student name, roll number, and route.
 *   - Full action workflow: direct Review navigation, inline Approve, Reject modal, and quick PDF inspection.
 *   - Wrapped in the shared role-aware Layout component.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
  X,
} from "lucide-react";
import Layout from "../components/Layout";
import ReceiptsTable from "../components/ReceiptsTable";
import API from "../api/client";

export const PendingReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  // Quick PDF View Modal State
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pdfRenderError, setPdfRenderError] = useState(null);

  // Fetch all pending receipts from the review queue
  const fetchPendingReceipts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/accounts/receipts?status=pending");
      setReceipts(res.data || []);
    } catch (err) {
      console.error("Failed to load pending receipts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReceipts();
  }, []);

  // Quick Approve Handler
  const handleApprove = async (receiptId) => {
    if (!window.confirm("Are you sure you want to approve this fee receipt and confirm the bus seat?")) {
      return;
    }

    try {
      setActionLoading(true);
      await API.post(`/accounts/receipts/${receiptId}/approve`);
      await fetchPendingReceipts();
    } catch (err) {
      console.error("Failed to approve receipt:", err);
      alert(err.response?.data?.detail || "Failed to approve receipt");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Modal Handlers
  const openRejectModal = (receipt) => {
    setSelectedReceipt(receipt);
    setRejectReason("Wrong fee amount deposited");
    setRejectError("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectError("A formal rejection reason is required.");
      return;
    }

    try {
      setActionLoading(true);
      await API.post(`/accounts/receipts/${selectedReceipt.id}/reject`, {
        reason: rejectReason.trim(),
      });
      setRejectModalOpen(false);
      await fetchPendingReceipts();
    } catch (err) {
      console.error("Failed to reject receipt:", err);
      setRejectError(err.response?.data?.detail || "Failed to reject receipt");
    } finally {
      setActionLoading(false);
    }
  };

  // PDF Preview Modal
  const handleViewPdf = async (receipt) => {
    setPreviewReceipt(receipt);
    setPdfModalOpen(true);
    setPdfRendering(true);
    setPdfRenderError(null);

    try {
      const res = await API.get(`/accounts/receipts/${receipt.id}/preview`);
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

      let canvas = document.getElementById("pending-pdf-canvas");
      for (let attempt = 0; attempt < 10 && !canvas; attempt++) {
        await new Promise((r) => setTimeout(r, 50));
        canvas = document.getElementById("pending-pdf-canvas");
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
      setPdfRenderError("Could not render uploaded document preview.");
    } finally {
      setPdfRendering(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: "1240px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
        {/* Header & Refresh */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800", color: "#0f172a" }}>
                Pending Receipts Queue
              </h2>
              <span
                style={{
                  backgroundColor: "#fef3c7",
                  color: "#92400e",
                  padding: "0.25rem 0.625rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: "800",
                }}
              >
                {receipts.length} Waiting
              </span>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
              Review all incoming bank challans, inspect stamps on the PDF canvas, and issue transport passes.
            </p>
          </div>

          <button
            onClick={fetchPendingReceipts}
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
            <span>Refresh List</span>
          </button>
        </div>

        {/* Reusable Table Component */}
        <ReceiptsTable
          receipts={receipts}
          loading={loading}
          onApprove={handleApprove}
          onReject={openRejectModal}
          onViewPdf={handleViewPdf}
          actionLoading={actionLoading}
          title="All Pending Challans"
          subtitle="Showing all student fee submissions currently waiting for Accounts audit."
        />

        {/* =====================================================================
            Quick Rejection Modal
        ===================================================================== */}
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
              }}
            >
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700", color: "#dc2626" }}>
                  Reject Fee Receipt
                </h3>
                <button onClick={() => setRejectModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRejectSubmit} style={{ padding: "1.5rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "#475569" }}>
                  Rejecting slip for <strong>{selectedReceipt.student_name}</strong>. An in-app alert will be dispatched instructing the student to re-upload.
                </p>

                {rejectError && (
                  <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "0.75rem", borderRadius: "0.375rem", fontSize: "0.8125rem", marginBottom: "1rem" }}>
                    {rejectError}
                  </div>
                )}

                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "600", color: "#334155", marginBottom: "0.375rem" }}>
                    Formal Rejection Reason:
                  </label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1", fontSize: "0.8125rem", marginBottom: "0.5rem" }}
                  >
                    <option value="Wrong fee amount deposited">Wrong fee amount deposited</option>
                    <option value="Unreadable or blurry bank stamp / signature">Unreadable or blurry bank stamp / signature</option>
                    <option value="Challan belongs to another student">Challan belongs to another student</option>
                    <option value="Voucher reference number already used">Voucher reference number already used</option>
                    <option value="Invalid bank / transaction details">Invalid bank / transaction details</option>
                  </select>

                  <textarea
                    rows={3}
                    placeholder="Enter additional details for student guidance..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1", fontSize: "0.8125rem", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(false)}
                    style={{ padding: "0.5rem 1rem", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", borderRadius: "0.375rem", fontSize: "0.8125rem", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{ padding: "0.5rem 1.25rem", backgroundColor: "#dc2626", color: "#ffffff", border: "none", borderRadius: "0.375rem", fontSize: "0.8125rem", fontWeight: "700", cursor: "pointer" }}
                  >
                    {actionLoading ? "Submitting..." : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================================
            Quick PDF Modal
        ===================================================================== */}
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
                overflow: "hidden",
                border: "1px solid #cbd5e1",
              }}
            >
              <div style={{ padding: "0.875rem 1.5rem", backgroundColor: "#1e3a8a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "800" }}>
                    Challan Verification: {previewReceipt?.student_name}
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#93c5fd" }}>
                    {previewReceipt?.student_reg_no} • {previewReceipt?.route_name} • Rs. {previewReceipt?.amount}
                  </span>
                </div>
                <button
                  onClick={() => setPdfModalOpen(false)}
                  style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#ffffff", borderRadius: "0.375rem", cursor: "pointer", padding: "0.375rem" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, backgroundColor: "#334155", overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {pdfRendering && (
                  <div style={{ color: "#ffffff", padding: "4rem 1rem", textAlign: "center" }}>
                    <RefreshCw size={28} className="spin" style={{ margin: "0 auto 0.75rem auto", display: "block" }} />
                    <p style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>Loading uploaded PDF...</p>
                  </div>
                )}
                <canvas
                  id="pending-pdf-canvas"
                  style={{ display: pdfRendering || pdfRenderError ? "none" : "block", boxShadow: "0 10px 25px rgba(0,0,0,0.4)", borderRadius: "0.375rem", backgroundColor: "#ffffff", maxWidth: "100%" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PendingReceipts;

