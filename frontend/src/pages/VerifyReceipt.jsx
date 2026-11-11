/**
 * Dedicated Receipt Verification Screen for Accounts Officers (Day 16).
 * Route: /accounts/receipts/:id
 * Features:
 *   - Split-screen layout: In-browser PDF document viewer on the left,
 *     detailed student verification dossier on the right.
 *   - Fetches receipt audit details and base64-encoded PDF from the backend.
 *   - Provides zoom controls (+, -, reset) and direct slip download.
 *   - Wrapped in the shared role-aware Layout component.
 */

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Clock,
  ShieldCheck,
  User,
  Calendar,
  MapPin,
  DollarSign,
  Mail,
  Phone,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import API from "../api/client";

export const VerifyReceipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Receipt & Dossier State
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // PDF Rendering State
  const [pdfRendering, setPdfRendering] = useState(true);
  const [pdfRenderError, setPdfRenderError] = useState(null);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [pdfFilename, setPdfFilename] = useState("challan_slip.pdf");
  const [zoomScale, setZoomScale] = useState(1.15);

  // Approval & Rejection Modal State (Day 16 Steps 2 & 3)
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectCategory, setRejectCategory] = useState("Wrong fee amount deposited");
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Reset PDF document cache when ID changes
  useEffect(() => {
    pdfDocRef.current = null;
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // ignore cancellation
      }
      renderTaskRef.current = null;
    }
  }, [id]);

  // =========================================================================
  // 1. Fetch Receipt Dossier & PDF Stream from FastAPI
  // =========================================================================
  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch detailed student audit specifications
        const detailsRes = await API.get(`/accounts/receipts/${id}`);
        setReceipt(detailsRes.data);

        // Fetch physical PDF receipt encoded in base64 (IDM-proof JSON API)
        const previewRes = await API.get(`/accounts/receipts/${id}/preview`);
        setPdfFilename(previewRes.data.filename || `challan_${id}.pdf`);
        setPdfBase64(previewRes.data.base64);
      } catch (err) {
        console.error("Failed to load receipt verification record:", err);
        setError(err.response?.data?.detail || "Could not load receipt record from server.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReceiptData();
    }
  }, [id]);

  // =========================================================================
  // 2. Render PDF on HTML5 Canvas using Mozilla PDF.js
  // =========================================================================
  const renderPdfPage = async () => {
    if (!pdfBase64) return;

    // Cancel any in-flight rendering task before starting a new one
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // ignore cancellation
      }
      renderTaskRef.current = null;
    }

    try {
      setPdfRendering(true);
      setPdfRenderError(null);

      // Ensure PDF.js is loaded in the browser window
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

      // Load document if not already parsed (create fresh binary array from base64)
      if (!pdfDocRef.current) {
        const binaryString = window.atob(pdfBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
        pdfDocRef.current = await loadingTask.promise;
      }

      const pdf = pdfDocRef.current;
      const page = await pdf.getPage(1);

      // Calculate viewport scaled to zoom level
      const viewport = page.getViewport({ scale: zoomScale });

      // Retry loop to ensure canvas is ready in DOM
      let canvas = canvasRef.current || document.getElementById("verify-pdf-canvas");
      for (let i = 0; i < 20 && !canvas; i++) {
        await new Promise((r) => setTimeout(r, 50));
        canvas = canvasRef.current || document.getElementById("verify-pdf-canvas");
      }

      if (canvas) {
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      }
    } catch (err) {
      if (err?.name === "RenderingCancelledException") {
        // Render was cancelled by a zoom change or unmount, this is expected
        return;
      }
      console.error("PDF.js render error:", err);
      setPdfRenderError(err?.message || "Unable to render PDF document preview on canvas.");
    } finally {
      setPdfRendering(false);
    }
  };

  useEffect(() => {
    if (pdfBase64 && !loading) {
      renderPdfPage();
    }
  }, [pdfBase64, zoomScale, loading]);

  // =========================================================================
  // 3. User Controls (Zoom In/Out, Reset, Direct Download)
  // =========================================================================
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleZoomReset = () => {
    setZoomScale(1.15);
  };

  const handleDownloadPdf = () => {
    if (!pdfBase64) return;
    const binaryString = window.atob(pdfBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = pdfFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // =========================================================================
  // 4. Action Handlers: Approve & Reject Workflows (Day 16 Steps 2 & 3)
  // =========================================================================
  const handleConfirmApprove = async () => {
    try {
      setActionLoading(true);
      const res = await API.post(`/accounts/receipts/${id}/approve`);
      setReceipt((prev) => ({ ...prev, status: "approved" }));
      setApproveModalOpen(false);
      setActionFeedback({
        type: "success",
        title: "Fee Receipt Approved!",
        message: `Slip successfully verified. ${receipt?.student_name}'s transport voucher is marked as paid and their seat is officially confirmed. Returning to queue...`,
      });
      setTimeout(() => {
        navigate("/accounts");
      }, 2200);
    } catch (err) {
      console.error("Approve error:", err);
      setActionFeedback({
        type: "error",
        title: "Approval Failed",
        message: err.response?.data?.detail || "Could not approve receipt. Please check permissions.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (rejectCategory === "Other reason" && !rejectNote.trim()) {
      alert("Please provide an explanatory note when selecting 'Other reason'.");
      return;
    }

    const finalReason = rejectNote.trim()
      ? `${rejectCategory}: ${rejectNote.trim()}`
      : rejectCategory;

    try {
      setActionLoading(true);
      const res = await API.post(`/accounts/receipts/${id}/reject`, { reason: finalReason });
      setReceipt((prev) => ({ ...prev, status: "rejected", reject_reason: finalReason }));
      setRejectModalOpen(false);
      setActionFeedback({
        type: "warning",
        title: "Fee Receipt Rejected",
        message: `Notification dispatched to ${receipt?.student_name} with formal feedback. Their re-upload button has been unlocked. Returning to queue...`,
      });
      setTimeout(() => {
        navigate("/accounts");
      }, 2200);
    } catch (err) {
      console.error("Reject error:", err);
      setActionFeedback({
        type: "error",
        title: "Rejection Failed",
        message: err.response?.data?.detail || "Could not reject receipt. Please try again.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: "1400px", margin: "1.25rem auto", padding: "0 1.5rem" }}>
        {/* Navigation Breadcrumb Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              to="/accounts"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.4rem 0.75rem",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "0.5rem",
                color: "#475569",
                textDecoration: "none",
                fontSize: "0.8125rem",
                fontWeight: "600",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
            >
              <ArrowLeft size={15} />
              <span>Back to Queue</span>
            </Link>

            <div>
              <h2 style={{ margin: 0, fontSize: "1.375rem", fontWeight: "800", color: "#0f172a" }}>
                Receipt Inspection #{id}
              </h2>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Official FAST-NUCES Transport Challan Audit
              </span>
            </div>
          </div>

          {receipt && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <StatusBadge status={receipt.status} />
              {receipt.is_late && (
                <span
                  style={{
                    backgroundColor: "#fef2f2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                    padding: "0.25rem 0.625rem",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                  }}
                >
                  ⚠️ Late Submission
                </span>
              )}
            </div>
          )}
        </div>

        {/* Global Loading / Error State */}
        {loading && (
          <div style={{ padding: "4rem 1rem", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
            <RefreshCw size={32} className="spin" style={{ margin: "0 auto 1rem auto", color: "#2563eb", display: "block" }} />
            <p style={{ margin: 0, fontSize: "1rem", fontWeight: "600", color: "#1e293b" }}>
              Loading student financial dossier & PDF challan...
            </p>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#991b1b", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid #fecaca", margin: "2rem auto", maxWidth: "600px", textAlign: "center" }}>
            <AlertTriangle size={28} style={{ margin: "0 auto 0.5rem auto", color: "#dc2626" }} />
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: "700" }}>Failed to Load Record</h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem" }}>{error}</p>
            <Link to="/accounts" style={{ color: "#2563eb", fontWeight: "700", textDecoration: "underline", fontSize: "0.875rem" }}>
              Return to Verification Dashboard
            </Link>
          </div>
        )}

        {/* =====================================================================
            Split Layout: Left = Document Viewer (60%), Right = Student Dossier (40%)
        ===================================================================== */}
        {!loading && !error && receipt && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 0.9fr",
              gap: "1.5rem",
              alignItems: "start",
            }}
          >
            {/* -----------------------------------------------------------------
                Left Panel: In-Browser PDF Document Canvas & Zoom Controls
            ----------------------------------------------------------------- */}
            <div
              style={{
                backgroundColor: "#334155",
                borderRadius: "0.75rem",
                overflow: "hidden",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                display: "flex",
                flexDirection: "column",
                border: "1px solid #475569",
              }}
            >
              {/* Document Header Controls Toolbar */}
              <div
                style={{
                  backgroundColor: "#1e293b",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #475569",
                  color: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileText size={17} color="#93c5fd" />
                  <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "260px" }}>
                    {pdfFilename}
                  </span>
                </div>

                {/* Zoom & Download Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <button
                    onClick={handleZoomOut}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "0.375rem",
                      padding: "0.375rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={15} />
                  </button>

                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#cbd5e1", minWidth: "40px", textAlign: "center" }}>
                    {Math.round(zoomScale * 100)}%
                  </span>

                  <button
                    onClick={handleZoomIn}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "0.375rem",
                      padding: "0.375rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Zoom In"
                  >
                    <ZoomIn size={15} />
                  </button>

                  <button
                    onClick={handleZoomReset}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "0.375rem",
                      padding: "0.375rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Reset Zoom"
                  >
                    <RotateCcw size={14} />
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    style={{
                      backgroundColor: "#2563eb",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "0.375rem",
                      padding: "0.35rem 0.625rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      marginLeft: "0.5rem",
                    }}
                    title="Download Authentic Slip"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Canvas Viewport Area */}
              <div
                style={{
                  padding: "1.25rem",
                  overflowY: "auto",
                  maxHeight: "78vh",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  backgroundColor: "#334155",
                }}
              >
                {pdfRendering && !pdfDocRef.current && (
                  <div style={{ color: "#ffffff", padding: "5rem 1rem", textAlign: "center" }}>
                    <RefreshCw size={30} className="spin" style={{ margin: "0 auto 0.75rem auto", display: "block" }} />
                    <p style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "600" }}>
                      Rendering official bank copy challan...
                    </p>
                  </div>
                )}

                {pdfRenderError && (
                  <div style={{ backgroundColor: "#fef2f2", color: "#991b1b", padding: "1.5rem", borderRadius: "0.5rem", maxWidth: "420px", textAlign: "center", margin: "2rem auto" }}>
                    <AlertTriangle size={24} style={{ margin: "0 auto 0.5rem auto", color: "#dc2626" }} />
                    <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: "600" }}>{pdfRenderError}</p>
                  </div>
                )}

                <canvas
                  id="verify-pdf-canvas"
                  ref={canvasRef}
                  style={{
                    display: pdfRenderError || (pdfRendering && !pdfDocRef.current) ? "none" : "block",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                    borderRadius: "0.375rem",
                    backgroundColor: "#ffffff",
                    maxWidth: "100%",
                  }}
                />
              </div>
            </div>

            {/* -----------------------------------------------------------------
                Right Panel: Student Dossier & Verification Card
            ----------------------------------------------------------------- */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Card 1: Student Particulars */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", border: "1px solid #e2e8f0", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  <User size={18} color="#2563eb" />
                  <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "700", color: "#0f172a" }}>
                    Student Identification
                  </h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8125rem" }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Full Legal Name</span>
                    <strong style={{ color: "#0f172a", fontSize: "0.9375rem" }}>{receipt.student_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Roll / Reg Number</span>
                    <strong style={{ color: "#0f172a", fontSize: "0.9375rem" }}>{receipt.student_reg_no || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Student Category</span>
                    <span style={{ fontWeight: "700", color: receipt.student_type?.toLowerCase() === "hostelite" ? "#d97706" : "#2563eb" }}>
                      {receipt.student_type?.toLowerCase() === "hostelite" ? "Hostelite (Weekend)" : "Day Scholar (Semester)"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Email Contact</span>
                    <span style={{ color: "#334155" }}>{receipt.student_email}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Transport & Route Details */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", border: "1px solid #e2e8f0", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  <MapPin size={18} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "700", color: "#0f172a" }}>
                    Commute & Service Schedule
                  </h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", fontSize: "0.8125rem" }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Enrolled Bus Route</span>
                    <strong style={{ color: "#0f172a" }}>{receipt.route_name}</strong>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Academic Term</span>
                      <span style={{ fontWeight: "600", color: "#1e293b" }}>{receipt.semester}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Trip Type</span>
                      <span style={{ fontWeight: "600", color: "#1e293b", textTransform: "capitalize" }}>
                        {receipt.trip_type?.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Fee & Compliance Audit */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", border: "1px solid #e2e8f0", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  <DollarSign size={18} color="#d97706" />
                  <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "700", color: "#0f172a" }}>
                    Fee Audit & Timing Compliance
                  </h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8125rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#64748b" }}>Required Fee Voucher:</span>
                    <strong style={{ fontSize: "1.125rem", color: "#1e3a8a", fontWeight: "800" }}>
                      PKR {Number(receipt.amount || 0).toLocaleString()}
                    </strong>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Due Date</span>
                      <span style={{ fontWeight: "600", color: "#0f172a" }}>
                        {receipt.due_date ? new Date(receipt.due_date).toLocaleDateString() : "No due date"}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Submitted At</span>
                      <span style={{ fontWeight: "600", color: "#0f172a" }}>
                        {new Date(receipt.uploaded_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Submission Timing Check</span>
                    {receipt.is_late ? (
                      <span style={{ color: "#b91c1c", fontWeight: "700" }}>
                        ⚠️ Uploaded after voucher due date (Late payment penalty may apply)
                      </span>
                    ) : (
                      <span style={{ color: "#059669", fontWeight: "700" }}>
                        ✓ On-time submission within scheduled payment window
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Feedback Alert Toast (After Approve / Reject) */}
              {actionFeedback && (
                <div
                  style={{
                    backgroundColor: actionFeedback.type === "success" ? "#ecfdf5" : actionFeedback.type === "warning" ? "#fffbeb" : "#fef2f2",
                    border: `1px solid ${actionFeedback.type === "success" ? "#a7f3d0" : actionFeedback.type === "warning" ? "#fde68a" : "#fecaca"}`,
                    color: actionFeedback.type === "success" ? "#065f46" : actionFeedback.type === "warning" ? "#92400e" : "#991b1b",
                    borderRadius: "0.75rem",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  {actionFeedback.type === "success" ? (
                    <CheckCircle size={20} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
                  ) : (
                    <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: "0.875rem", display: "block" }}>{actionFeedback.title}</strong>
                    <p style={{ margin: "0.25rem 0 0.5rem 0", fontSize: "0.8125rem" }}>{actionFeedback.message}</p>
                    <Link
                      to="/accounts"
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        color: actionFeedback.type === "success" ? "#059669" : "#dc2626",
                        textDecoration: "underline",
                      }}
                    >
                      ← Return to Verification Queue
                    </Link>
                  </div>
                </div>
              )}

              {/* Card 4: Audit Decision Controls (Day 16 Steps 2 & 3) */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  padding: "1.25rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  <ShieldCheck size={18} color="#1e3a8a" />
                  <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "700", color: "#0f172a" }}>
                    Accounts Verification Decision
                  </h3>
                </div>

                {receipt.status === "pending" ? (
                  <div>
                    <p style={{ margin: "0 0 1rem 0", fontSize: "0.8125rem", color: "#64748b" }}>
                      Inspect the bank stamp, teller verification signature, and deposited amount before taking action.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <button
                        onClick={() => setApproveModalOpen(true)}
                        disabled={actionLoading}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.375rem",
                          padding: "0.625rem 1rem",
                          backgroundColor: "#059669",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                          boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#047857")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#059669")}
                      >
                        <CheckCircle size={16} />
                        <span>Approve Slip</span>
                      </button>

                      <button
                        onClick={() => setRejectModalOpen(true)}
                        disabled={actionLoading}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.375rem",
                          padding: "0.625rem 1rem",
                          backgroundColor: "#dc2626",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                          boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#b91c1c")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
                      >
                        <XCircle size={16} />
                        <span>Reject Slip</span>
                      </button>
                    </div>
                  </div>
                ) : receipt.status === "approved" || receipt.status === "paid" ? (
                  <div
                    style={{
                      backgroundColor: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      borderRadius: "0.5rem",
                      padding: "1.25rem",
                      textAlign: "center",
                    }}
                  >
                    <CheckCircle size={28} color="#059669" style={{ margin: "0 auto 0.5rem auto", display: "block" }} />
                    <strong style={{ color: "#065f46", fontSize: "1rem", display: "block" }}>
                      Challan Formally Approved & Paid
                    </strong>
                    <p style={{ margin: "0.375rem 0", fontSize: "0.8125rem", color: "#047857" }}>
                      Transport pass active and seat confirmed for <strong>{receipt.student_name}</strong>.
                    </p>
                    {receipt.verified_at && (
                      <span style={{ fontSize: "0.6875rem", color: "#065f46", display: "block", marginTop: "0.5rem", borderTop: "1px dashed #a7f3d0", paddingTop: "0.5rem" }}>
                        Verified by {receipt.verified_by_name || "Accounts Officer"} on {new Date(receipt.verified_at).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span style={{ display: "inline-block", marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                      🔒 Actions are locked (Idempotency Guard Enforced)
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "0.5rem",
                      padding: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <XCircle size={20} color="#dc2626" />
                      <strong style={{ color: "#991b1b", fontSize: "0.9375rem" }}>
                        Challan Flagged & Rejected
                      </strong>
                    </div>
                    <p style={{ margin: "0.375rem 0", fontSize: "0.8125rem", color: "#7f1d1d", lineHeight: "1.4" }}>
                      <strong>Reason Feedback:</strong> "{receipt.reject_reason || "Invalid document"}"
                    </p>
                    {receipt.verified_at && (
                      <span style={{ fontSize: "0.6875rem", color: "#991b1b", display: "block", marginTop: "0.5rem", borderTop: "1px dashed #fecaca", paddingTop: "0.5rem" }}>
                        Flagged by {receipt.verified_by_name || "Accounts Officer"} on {new Date(receipt.verified_at).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span style={{ display: "inline-block", marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                      🔒 Actions are locked (Student re-upload pending)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            5. Approve Confirmation Modal Dialog (Step 3)
        ===================================================================== */}
        {approveModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(2px)",
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
                maxWidth: "460px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
              }}
            >
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ backgroundColor: "#ecfdf5", color: "#059669", padding: "0.5rem", borderRadius: "0.5rem" }}>
                  <CheckCircle size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "800", color: "#0f172a" }}>
                    Confirm Challan Approval
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Receipt Reference #{id}
                  </span>
                </div>
              </div>

              <div style={{ padding: "1.5rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "#334155", lineHeight: "1.5" }}>
                  Are you sure you want to approve this fee receipt for <strong>{receipt?.student_name}</strong> (Roll: <strong>{receipt?.student_reg_no}</strong>)?
                </p>

                <div style={{ backgroundColor: "#f8fafc", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8125rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                    <span style={{ color: "#64748b" }}>Verified Amount:</span>
                    <strong style={{ color: "#0f172a" }}>PKR {Number(receipt?.amount || 0).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Assigned Route:</span>
                    <strong style={{ color: "#0f172a" }}>{receipt?.route_name}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setApproveModalOpen(false)}
                    disabled={actionLoading}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.5rem",
                      color: "#475569",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmApprove}
                    disabled={actionLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      padding: "0.5rem 1.25rem",
                      backgroundColor: "#059669",
                      border: "none",
                      borderRadius: "0.5rem",
                      color: "#ffffff",
                      fontSize: "0.8125rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
                    }}
                  >
                    {actionLoading && <RefreshCw size={14} className="spin" />}
                    <span>{actionLoading ? "Approving..." : "Confirm & Approve"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            6. Reject Modal with Reason Dropdown (Step 3 & 4)
        ===================================================================== */}
        {rejectModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(2px)",
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
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
              }}
            >
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "0.5rem", borderRadius: "0.5rem" }}>
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "800", color: "#0f172a" }}>
                    Reject Fee Challan Slip
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    An automated alert with feedback will be dispatched to {receipt?.student_name}.
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmReject} style={{ padding: "1.5rem" }}>
                {/* Standardized Reason Category Dropdown */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#334155", marginBottom: "0.375rem" }}>
                    Primary Rejection Reason (Required)
                  </label>
                  <select
                    value={rejectCategory}
                    onChange={(e) => setRejectCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8125rem",
                      color: "#0f172a",
                      backgroundColor: "#ffffff",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="Wrong fee amount deposited">Wrong fee amount deposited</option>
                    <option value="Unreadable or blurry bank stamp / branch signature">Unreadable or blurry bank stamp / branch signature</option>
                    <option value="Challan belongs to another student / incorrect roll number">Challan belongs to another student / incorrect roll number</option>
                    <option value="Voucher reference number already used">Voucher reference number already used</option>
                    <option value="Invalid bank / Kuickpay transaction ID">Invalid bank / Kuickpay transaction ID</option>
                    <option value="Incomplete bank copy / missing teller stamp">Incomplete bank copy / missing teller stamp</option>
                    <option value="Other reason">Other reason</option>
                  </select>
                </div>

                {/* Additional Specific Notes */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: "700", color: "#334155", marginBottom: "0.375rem" }}>
                    Additional Auditor Notes / Correction Guidance (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Provide specific instructions (e.g. please visit Faysal Bank campus branch to obtain an authorized teller stamp)..."
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8125rem",
                      color: "#0f172a",
                      boxSizing: "border-box",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(false)}
                    disabled={actionLoading}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.5rem",
                      color: "#475569",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      padding: "0.5rem 1.25rem",
                      backgroundColor: "#dc2626",
                      border: "none",
                      borderRadius: "0.5rem",
                      color: "#ffffff",
                      fontSize: "0.8125rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
                    }}
                  >
                    {actionLoading && <RefreshCw size={14} className="spin" />}
                    <span>{actionLoading ? "Rejecting..." : "Submit Rejection"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VerifyReceipt;

