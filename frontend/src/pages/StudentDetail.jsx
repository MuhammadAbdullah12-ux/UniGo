/**
 * Student Financial Dossier & Audit Timeline Screen (Day 17).
 * Route: /accounts/students/:id
 * Features:
 *   - Student Profile & Transport particulars (name, reg no, category, email, phone, route).
 *   - Current Active Fee Voucher Summary (required amount, due date, status).
 *   - Chronological Visual Audit Timeline tracking every receipt upload attempt:
 *       uploaded -> rejected with formal reason -> re-uploaded -> approved with audit stamp.
 *   - Quick PDF Challan preview & direct navigation to /accounts/receipts/:id.
 *   - Wrapped in the unified Layout component.
 */

import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import API from "../api/client";

export const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick PDF Preview Modal
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pdfRenderError, setPdfRenderError] = useState(null);
  const pdfDocRef = useRef(null);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get(`/accounts/students/${id}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load student dossier:", err);
      setError(err.response?.data?.detail || "Could not load student financial dossier.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchStudentData();
    }
  }, [id]);

  // Quick PDF Inspection Modal Handler
  const handleViewPdf = async (receipt) => {
    try {
      setPreviewReceipt(receipt);
      setPdfModalOpen(true);
      setPdfRendering(true);
      setPdfRenderError(null);
      pdfDocRef.current = null;

      const res = await API.get(`/accounts/receipts/${receipt.id}/preview`);
      const { base64 } = res.data;

      const binaryString = window.atob(base64);
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
      pdfDocRef.current = pdf;
      const page = await pdf.getPage(1);

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = Math.min(840, window.innerWidth - 60);
      const scale = (containerWidth / unscaledViewport.width) * 1.3;
      const viewport = page.getViewport({ scale });

      let canvas = document.getElementById("student-timeline-pdf-canvas");
      for (let i = 0; i < 20 && !canvas; i++) {
        await new Promise((r) => setTimeout(r, 50));
        canvas = document.getElementById("student-timeline-pdf-canvas");
      }

      if (canvas) {
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
      }
    } catch (err) {
      console.error("PDF Preview Error:", err);
      setPdfRenderError("Unable to render document preview.");
    } finally {
      setPdfRendering(false);
    }
  };

  const student = data?.student;
  const fee = data?.fee;
  // Sort chronological oldest to newest for the visual lifecycle story
  const receipts = data?.receipts ? [...data.receipts].reverse() : [];

  return (
    <Layout>
      <div style={{ maxWidth: "1140px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: "1.25rem" }}>
          <Link
            to="/accounts/history"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              color: "#64748b",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: "600",
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Audit History</span>
          </Link>
        </div>

        {/* Global Loading / Error State */}
        {loading && (
          <div style={{ padding: "4rem 1rem", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
            <RefreshCw size={32} className="spin" style={{ margin: "0 auto 1rem auto", color: "#2563eb", display: "block" }} />
            <p style={{ margin: 0, fontSize: "1rem", fontWeight: "600", color: "#1e293b" }}>
              Loading student financial history & audit ledger...
            </p>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#991b1b", padding: "2rem", borderRadius: "1rem", border: "1px solid #fecaca", textAlign: "center" }}>
            <AlertTriangle size={32} style={{ margin: "0 auto 0.75rem auto", color: "#dc2626" }} />
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: "700" }}>Student Record Not Found</h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem" }}>{error}</p>
            <Link to="/accounts/history" style={{ color: "#2563eb", fontWeight: "700", textDecoration: "underline" }}>
              Return to Audit History
            </Link>
          </div>
        )}

        {!loading && !error && student && (
          <div>
            {/* Header Profile Banner */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "1rem",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "1.25rem",
                    border: "2px solid #bfdbfe",
                  }}
                >
                  {student.full_name ? student.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#0f172a" }}>
                      {student.full_name}
                    </h2>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        fontFamily: "monospace",
                      }}
                    >
                      {student.reg_no || "N/A"}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
                    FAST-NUCES CFD Campus • Transport Management Dossier
                  </p>
                </div>
              </div>

              {fee && (
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}>
                    Current Fee Status
                  </span>
                  <StatusBadge status={fee.status} />
                </div>
              )}
            </div>

            {/* Profile & Voucher Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
              {/* Card 1: Student Particulars */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  <User size={18} color="#2563eb" />
                  <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "700", color: "#0f172a" }}>
                    Student Identification & Contact
                  </h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", fontSize: "0.8125rem" }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Student Category</span>
                    <strong style={{ color: student.student_type === "hostelite" ? "#d97706" : "#2563eb" }}>
                      {student.student_type === "hostelite" ? "Hostelite (Weekend)" : "Day Scholar (Semester)"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>System Role</span>
                    <span style={{ fontWeight: "600", textTransform: "capitalize", color: "#334155" }}>
                      {student.role}
                    </span>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Official University Email</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#1e293b", fontWeight: "600" }}>
                      <Mail size={13} color="#64748b" />
                      <span>{student.email}</span>
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#64748b", display: "block" }}>Phone Number</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#1e293b", fontWeight: "600" }}>
                      <Phone size={13} color="#64748b" />
                      <span>{student.phone || "Not provided"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Transport & Fee Voucher */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  <MapPin size={18} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "700", color: "#0f172a" }}>
                    Active Route & Fee Voucher
                  </h3>
                </div>

                {fee ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", fontSize: "0.8125rem" }}>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Enrolled Transport Route</span>
                      <strong style={{ color: "#0f172a", fontSize: "0.9375rem" }}>{fee.route_name || "Assigned Route"}</strong>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div>
                        <span style={{ color: "#64748b", display: "block" }}>Academic Term</span>
                        <span style={{ fontWeight: "600", color: "#1e293b" }}>{fee.semester || "Current"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", display: "block" }}>Trip Schedule</span>
                        <span style={{ fontWeight: "600", color: "#1e293b", textTransform: "capitalize" }}>
                          {fee.trip_type ? fee.trip_type.replace("_", " ") : "Two Way"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                      <div>
                        <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Expected Fee</span>
                        <strong style={{ fontSize: "1.125rem", color: "#1e3a8a", fontWeight: "800" }}>
                          PKR {Number(fee.amount || 0).toLocaleString()}
                        </strong>
                      </div>
                      {fee.due_date && (
                        <div style={{ textAlign: "right" }}>
                          <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Due Date</span>
                          <span style={{ fontWeight: "600", color: "#334155" }}>
                            {new Date(fee.due_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
                    Student has not registered for a transport route yet.
                  </p>
                )}
              </div>
            </div>

            {/* =====================================================================
                Card 3: Chronological Audit Timeline of Receipt Attempts
            ===================================================================== */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "1rem",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "800", color: "#0f172a" }}>
                    Challan Verification Audit Timeline
                  </h3>
                  <p style={{ margin: "0.25rem 0 0 0", color: "#64748b", fontSize: "0.8125rem" }}>
                    Full milestone history of student submission attempts, officer rejections, reasons, and approvals.
                  </p>
                </div>
                <span
                  style={{
                    padding: "0.375rem 0.75rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    color: "#475569",
                  }}
                >
                  {receipts.length} Submission Attempt{receipts.length === 1 ? "" : "s"}
                </span>
              </div>

              {receipts.length === 0 ? (
                <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
                  <Clock size={36} style={{ color: "#94a3b8", margin: "0 auto 0.75rem auto" }} />
                  <h4 style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontSize: "1rem" }}>No Upload Records Yet</h4>
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>
                    This student has not submitted any bank payment challans for verification.
                  </p>
                </div>
              ) : (
                <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
                  {/* Vertical Timeline Guide Line */}
                  <div
                    style={{
                      position: "absolute",
                      left: "11px",
                      top: "14px",
                      bottom: "20px",
                      width: "2px",
                      backgroundColor: "#e2e8f0",
                    }}
                  />

                  {receipts.map((r, index) => {
                    const isApproved = r.status === "approved";
                    const isRejected = r.status === "rejected";
                    const isPending = r.status === "pending";

                    const badgeColor = isApproved ? "#059669" : isRejected ? "#dc2626" : "#d97706";
                    const badgeBg = isApproved ? "#d1fae5" : isRejected ? "#fee2e2" : "#fef3c7";
                    const iconColor = isApproved ? "#059669" : isRejected ? "#dc2626" : "#d97706";

                    return (
                      <div
                        key={r.id}
                        style={{
                          position: "relative",
                          marginBottom: index === receipts.length - 1 ? 0 : "2rem",
                        }}
                      >
                        {/* Timeline Node Dot */}
                        <div
                          style={{
                            position: "absolute",
                            left: "-1.5rem",
                            top: "4px",
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            backgroundColor: "#ffffff",
                            border: `3px solid ${badgeColor}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            zIndex: 1,
                          }}
                        />

                        {/* Timeline Card */}
                        <div
                          style={{
                            backgroundColor: "#f8fafc",
                            borderRadius: "0.75rem",
                            border: `1px solid ${isApproved ? "#a7f3d0" : isRejected ? "#fecaca" : "#e2e8f0"}`,
                            padding: "1.25rem",
                            transition: "box-shadow 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
                                Attempt #{index + 1}
                              </span>
                              <span
                                style={{
                                  padding: "0.2rem 0.625rem",
                                  borderRadius: "9999px",
                                  fontSize: "0.6875rem",
                                  fontWeight: "800",
                                  textTransform: "uppercase",
                                  backgroundColor: badgeBg,
                                  color: badgeColor,
                                }}
                              >
                                {r.status}
                              </span>
                            </div>

                            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Clock size={12} />
                              {new Date(r.uploaded_at).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Document Details & Quick Actions */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <FileText size={18} color="#2563eb" />
                              <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#1e293b" }}>
                                {r.original_name || `challan_receipt_${r.id}.pdf`}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <button
                                onClick={() => handleViewPdf(r)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  padding: "0.375rem 0.625rem",
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "0.375rem",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  color: "#334155",
                                  cursor: "pointer",
                                }}
                              >
                                <Eye size={13} />
                                Quick View
                              </button>

                              <Link
                                to={`/accounts/receipts/${r.id}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  padding: "0.375rem 0.75rem",
                                  backgroundColor: "#2563eb",
                                  color: "#ffffff",
                                  borderRadius: "0.375rem",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  textDecoration: "none",
                                }}
                              >
                                <span>Inspect Slip</span>
                                <ChevronRight size={13} />
                              </Link>
                            </div>
                          </div>

                          {/* Lifecycle Callout Box */}
                          {isRejected && (
                            <div
                              style={{
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fecaca",
                                borderRadius: "0.5rem",
                                padding: "0.75rem 1rem",
                                marginTop: "0.5rem",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#dc2626", fontWeight: "700", fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                                <XCircle size={15} />
                                <span>Formal Rejection Feedback Dispatched:</span>
                              </div>
                              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#991b1b", fontStyle: "italic" }}>
                                "{r.reject_reason || "Challan rejected by Accounts Officer. Please upload clear stamped copy."}"
                              </p>
                              <span style={{ fontSize: "0.6875rem", color: "#b91c1c", display: "block", marginTop: "0.25rem" }}>
                                Student received automated alert to rectify and re-upload slip.
                              </span>
                            </div>
                          )}

                          {isApproved && (
                            <div
                              style={{
                                backgroundColor: "#ecfdf5",
                                border: "1px solid #a7f3d0",
                                borderRadius: "0.5rem",
                                padding: "0.75rem 1rem",
                                marginTop: "0.5rem",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#059669", fontWeight: "700", fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                                <ShieldCheck size={16} />
                                <span>Officially Audited & Approved:</span>
                              </div>
                              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#065f46" }}>
                                Verified by <strong>{r.verified_by_name || "Accounts Officer"}</strong>
                                {r.verified_at && ` on ${new Date(r.verified_at).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}.
                              </p>
                              <span style={{ fontSize: "0.6875rem", color: "#047857", display: "block", marginTop: "0.25rem" }}>
                                Transport seat officially confirmed for the semester.
                              </span>
                            </div>
                          )}

                          {isPending && (
                            <div
                              style={{
                                backgroundColor: "#fffbeb",
                                border: "1px solid #fde68a",
                                borderRadius: "0.5rem",
                                padding: "0.75rem 1rem",
                                marginTop: "0.5rem",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#d97706", fontWeight: "700", fontSize: "0.8125rem" }}>
                                <Clock size={15} />
                                <span>Currently Awaiting Officer Verification</span>
                              </div>
                              <span style={{ fontSize: "0.6875rem", color: "#b45309", display: "block", marginTop: "0.25rem" }}>
                                Use the Inspect Slip button above to open the split-screen verification canvas and approve or reject.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick View PDF Modal */}
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
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <FileText size={20} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: "700" }}>
                      Challan Preview: {student?.full_name}
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "#93c5fd" }}>
                      {student?.reg_no} • {previewReceipt?.original_name || "Bank Copy Challan"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setPdfModalOpen(false)}
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
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  backgroundColor: "#334155",
                  overflowY: "auto",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {pdfRendering && (
                  <div style={{ color: "#ffffff", padding: "4rem 1rem", textAlign: "center" }}>
                    <RefreshCw size={28} className="spin" style={{ margin: "0 auto 0.75rem auto", display: "block" }} />
                    <p style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>Loading physical challan...</p>
                  </div>
                )}
                {pdfRenderError && (
                  <div style={{ backgroundColor: "#fef2f2", color: "#991b1b", padding: "1.25rem", borderRadius: "0.5rem", maxWidth: "480px", textAlign: "center", margin: "2rem auto" }}>
                    <AlertTriangle size={24} style={{ margin: "0 auto 0.5rem auto", color: "#dc2626" }} />
                    <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: "600" }}>{pdfRenderError}</p>
                  </div>
                )}
                <canvas
                  id="student-timeline-pdf-canvas"
                  style={{
                    display: pdfRendering || pdfRenderError ? "none" : "block",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                    borderRadius: "0.375rem",
                    backgroundColor: "#ffffff",
                    maxWidth: "100%",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentDetail;
