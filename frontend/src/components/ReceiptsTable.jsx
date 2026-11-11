/**
 * Reusable Receipts Table component for Accounts Officer portals (Day 15 & Day 16).
 * Used across:
 *   - Accounts Dashboard (/accounts) - 10 newest pending receipts
 *   - Dedicated Pending Receipts Queue (/accounts/receipts) - Full audit queue
 *   - Audit History (/accounts/history) - Searchable historical ledger
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  Clock,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

export const ReceiptsTable = ({
  receipts = [],
  loading = false,
  onApprove,
  onReject,
  onViewPdf,
  actionLoading = false,
  title = "Pending Challan Verification Queue",
  subtitle = "Review student submitted PDF documents, verify bank stamp, and approve or reject.",
  showSearch = true,
  maxRows,
  pageSize = 10,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const displayReceipts = maxRows
    ? filteredReceipts.slice(0, maxRows)
    : filteredReceipts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "1rem",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
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
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#9ca3af" }} />
            <input
              type="text"
              placeholder="Search student or route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem 0.5rem 2.125rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5e1",
                fontSize: "0.8125rem",
                outline: "none",
                boxSizing: "border-box",
                transition: "border 0.2s",
              }}
            />
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          <div className="spin" style={{ display: "inline-block", marginBottom: "0.5rem" }}>
            ⏳
          </div>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>Loading verification records...</p>
        </div>
      ) : displayReceipts.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          <CheckCircle size={36} color="#059669" style={{ margin: "0 auto 0.75rem auto" }} />
          <h4 style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontSize: "1rem" }}>
            All Clear! No Pending Receipts
          </h4>
          <p style={{ margin: 0, fontSize: "0.8125rem" }}>
            {searchQuery
              ? "No receipts match your search filter."
              : "There are no student fee receipts waiting for accounts audit."}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: "0.75rem 1.5rem" }}>Student</th>
                <th style={{ padding: "0.75rem 1.5rem" }}>Route</th>
                <th style={{ padding: "0.75rem 1.5rem" }}>Amount</th>
                <th style={{ padding: "0.75rem 1.5rem" }}>Uploaded At</th>
                <th style={{ padding: "0.75rem 1.5rem" }}>Status</th>
                <th style={{ padding: "0.75rem 1.5rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayReceipts.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {/* Student Identity */}
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
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.student_reg_no || "N/A"}</div>
                  </td>

                  {/* Route */}
                  <td style={{ padding: "1rem 1.5rem", color: "#334155" }}>
                    {r.route_name}
                  </td>

                  {/* Amount */}
                  <td style={{ padding: "1rem 1.5rem", fontWeight: "700", color: "#1e3a8a" }}>
                    Rs. {Number(r.amount).toLocaleString()}
                  </td>

                  {/* Timestamp & Late Check */}
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.8125rem", color: "#64748b" }}>
                    <div>
                      {new Date(r.uploaded_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {r.is_late && (
                      <span style={{ fontSize: "0.6875rem", color: "#dc2626", fontWeight: "700" }}>
                        ⚠️ Late Upload
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <StatusBadge status={r.status} />
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem" }}>
                      {/* Review Link to Dedicated Screen (/accounts/receipts/:id) */}
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

                      {/* View PDF Quick Modal */}
                      {onViewPdf && (
                        <button
                          onClick={() => onViewPdf(r)}
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
                      )}

                      {/* Inline Approve Action */}
                      {onApprove && r.status === "pending" && (
                        <button
                          onClick={() => onApprove(r.id)}
                          disabled={actionLoading}
                          title="Approve slip directly"
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
                      )}

                      {/* Inline Reject Action */}
                      {onReject && r.status === "pending" && (
                        <button
                          onClick={() => onReject(r)}
                          disabled={actionLoading}
                          title="Reject slip with formal feedback"
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
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 10-Row Pagination Footer (Day 17) */}
      {!maxRows && filteredReceipts.length > pageSize && (
        <div
          style={{
            padding: "0.875rem 1.5rem",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            fontSize: "0.8125rem",
            color: "#64748b",
          }}
        >
          <div>
            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{" "}
            <strong>{Math.min(currentPage * pageSize, filteredReceipts.length)}</strong> of{" "}
            <strong>{filteredReceipts.length}</strong> receipts
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.375rem 0.75rem",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "0.375rem",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: currentPage === 1 ? "#94a3b8" : "#334155",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <span style={{ padding: "0 0.5rem", fontWeight: "700", color: "#1e293b", fontSize: "0.75rem" }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.375rem 0.75rem",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "0.375rem",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: currentPage === totalPages ? "#94a3b8" : "#334155",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptsTable;

