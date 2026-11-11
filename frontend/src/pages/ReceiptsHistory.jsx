/**
 * Receipts Audit History & Search Screen for Accounts Officers (Day 17).
 * Route: /accounts/history
 * Features:
 *   - Status Filter Tabs: All, Pending, Approved, Rejected with live counter badges.
 *   - Route Filter Dropdown: Filter receipts by university bus route.
 *   - Debounced Search: 400 ms debounce for roll number or student name querying without spamming the backend API.
 *   - 10-Row Pagination: Clean navigation through large historical ledgers.
 *   - Clickable Student Links: Instant navigation to student payment timeline (/accounts/students/:id).
 *   - Quick PDF Preview Modal & Review Navigation.
 *   - Wrapped in the unified Layout component.
 */

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  X,
  AlertTriangle,
} from "lucide-react";
import Layout from "../components/Layout";
import ReceiptsTable from "../components/ReceiptsTable";
import { useDebounce } from "../hooks/useDebounce";
import API from "../api/client";

export const ReceiptsHistory = () => {
  // Filter States
  const [statusTab, setStatusTab] = useState("all"); // 'all' | 'pending' | 'approved' | 'rejected'
  const [selectedRoute, setSelectedRoute] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  // Data States
  const [receipts, setReceipts] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  // Quick PDF View Modal State
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pdfRenderError, setPdfRenderError] = useState(null);
  const pdfDocRef = useRef(null);

  // Fetch routes list for the dropdown
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await API.get("/routes");
        setRoutes(res.data || []);
      } catch (err) {
        console.error("Failed to load routes list:", err);
      }
    };
    fetchRoutes();
  }, []);

  // Fetch receipts filtered by status, route, and debounced search keyword
  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusTab !== "all") {
        params.status = statusTab;
      }
      if (selectedRoute) {
        params.route_id = selectedRoute;
      }
      if (debouncedSearch.trim()) {
        params.q = debouncedSearch.trim();
      }

      const res = await API.get("/accounts/receipts", { params });
      setReceipts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch receipt history:", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch receipts whenever filters change (debouncedSearch waits 400ms after user stops typing)
  useEffect(() => {
    fetchReceipts();
  }, [statusTab, selectedRoute, debouncedSearch]);

  // Fetch stats for the tab badges
  const fetchStats = async () => {
    try {
      const res = await API.get("/accounts/stats");
      const d = res.data;
      setStats({
        pending: d.pending_count || 0,
        approved: d.approved_today_count || 0,
        rejected: d.rejected_count || 0,
        total: (d.pending_count || 0) + (d.approved_today_count || 0) + (d.rejected_count || 0),
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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

      // Decode base64 to Uint8Array
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Ensure PDF.js is loaded
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

      let canvas = document.getElementById("history-pdf-canvas");
      for (let i = 0; i < 20 && !canvas; i++) {
        await new Promise((r) => setTimeout(r, 50));
        canvas = document.getElementById("history-pdf-canvas");
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
      console.error("Quick preview error:", err);
      setPdfRenderError("Unable to render document preview.");
    } finally {
      setPdfRendering(false);
    }
  };

  const tabs = [
    { key: "all", label: "All Receipts", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending, color: "#d97706", bg: "#fef3c7" },
    { key: "approved", label: "Approved", count: stats.approved, color: "#059669", bg: "#d1fae5" },
    { key: "rejected", label: "Rejected", count: stats.rejected, color: "#dc2626", bg: "#fee2e2" },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: "1280px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
        {/* Title Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <History size={24} color="#2563eb" />
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800", color: "#0f172a" }}>
                Receipts Audit History
              </h2>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
              Complete ledger of student fee submissions with status filtering, route grouping, and 400ms debounced search.
            </p>
          </div>

          <button
            onClick={() => {
              fetchReceipts();
              fetchStats();
            }}
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
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Filter Controls Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.875rem",
            border: "1px solid #e2e8f0",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {tabs.map((t) => {
              const active = statusTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setStatusTab(t.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.875rem",
                    borderRadius: "0.5rem",
                    border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
                    backgroundColor: active ? "#eff6ff" : "#ffffff",
                    color: active ? "#1e40af" : "#475569",
                    fontWeight: active ? "700" : "600",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{t.label}</span>
                  {t.count !== undefined && (
                    <span
                      style={{
                        padding: "0.125rem 0.375rem",
                        borderRadius: "9999px",
                        fontSize: "0.6875rem",
                        fontWeight: "700",
                        backgroundColor: active ? "#2563eb" : t.bg || "#f1f5f9",
                        color: active ? "#ffffff" : t.color || "#475569",
                      }}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Route Dropdown & Debounced Search Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Route Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <MapPin size={15} color="#64748b" />
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem",
                  backgroundColor: "#ffffff",
                  color: "#1e293b",
                  fontWeight: "600",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">All Bus Routes</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 400ms Debounced Search Bar */}
            <div style={{ position: "relative", minWidth: "260px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#9ca3af" }} />
              <input
                type="text"
                placeholder="Search roll no or student (400ms debounced)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 2rem 0.5rem 2rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Table with 10-Row Pagination and Clickable Student Links */}
        <ReceiptsTable
          receipts={receipts}
          loading={loading}
          onViewPdf={handleViewPdf}
          showSearch={false}
          pageSize={10}
          title={
            statusTab === "all"
              ? "All Challan Records"
              : `${statusTab.charAt(0).toUpperCase() + statusTab.slice(1)} Receipts`
          }
          subtitle={`Displaying ${receipts.length} receipt${receipts.length === 1 ? "" : "s"} matching your filters.`}
        />

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
              {/* Modal Header */}
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
                      Challan Preview: {previewReceipt?.student_name}
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "#93c5fd" }}>
                      {previewReceipt?.student_reg_no} • {previewReceipt?.route_name} • Rs. {Number(previewReceipt?.amount || 0).toLocaleString()}
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

              {/* Modal Body */}
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
                  id="history-pdf-canvas"
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

export default ReceiptsHistory;

