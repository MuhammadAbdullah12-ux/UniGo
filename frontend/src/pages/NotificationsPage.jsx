/**
 * Comprehensive Notifications Center page for UniGo (Day 20).
 * Accessible across all three user roles (Student, Accounts Officer, Transport Admin).
 * Features:
 *   - Overview summary metrics (Total, Unread, Action Required, Approved).
 *   - Category filter tabs (All, Unread, Action Required, Approved).
 *   - Prominent red styling and action buttons for "Wrong Fee Slip" rejection alerts.
 *   - Emerald styling for "Fee Verified" notifications.
 *   - Individual and batch "Mark as Read" actions.
 *   - Fully responsive layout wrapped in the application Layout.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Filter,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import API from "../api/client";

export const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread' | 'action_required' | 'approved'
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all user notifications from backend
  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const res = await API.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Failed to load notifications list:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await API.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await API.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  // Action CTA handler
  const handleAction = (item) => {
    if (!item.is_read) {
      handleMarkAsRead(item.id);
    }

    const titleLower = (item.title || "").toLowerCase();
    const msgLower = (item.message || "").toLowerCase();

    if (titleLower.includes("wrong") || titleLower.includes("reject") || msgLower.includes("reject")) {
      navigate("/student");
    } else if (titleLower.includes("verified") || titleLower.includes("approv")) {
      navigate("/student");
    } else if (titleLower.includes("receipt") || msgLower.includes("uploaded")) {
      if (user?.role === "accounts") {
        navigate("/accounts/receipts");
      } else {
        navigate("/admin");
      }
    } else {
      if (user?.role === "student") navigate("/student");
      else if (user?.role === "accounts") navigate("/accounts");
      else navigate("/admin");
    }
  };

  // Helper classification functions
  const isWrongSlipNotif = (item) => {
    const t = (item.title || "").toLowerCase();
    const m = (item.message || "").toLowerCase();
    return t.includes("wrong") || t.includes("reject") || m.includes("reject");
  };

  const isVerifiedNotif = (item) => {
    const t = (item.title || "").toLowerCase();
    return t.includes("verified") || t.includes("approv");
  };

  // Filtered notifications list
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "unread") return !item.is_read;
    if (activeTab === "action_required") return isWrongSlipNotif(item);
    if (activeTab === "approved") return isVerifiedNotif(item);
    return true; // 'all'
  });

  const actionRequiredCount = notifications.filter(isWrongSlipNotif).length;
  const approvedCount = notifications.filter(isVerifiedNotif).length;

  return (
    <Layout>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1.5rem" }}>
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  display: "flex",
                }}
              >
                <Bell size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#0f172a" }}>
                  Notification Center
                </h1>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
                  Real-time alerts for challan verification, approval milestones, and fleet updates.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={fetchNotifications}
              disabled={refreshing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 0.875rem",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: "600",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={15} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2563eb",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.8125rem",
                  fontWeight: "700",
                  color: "#ffffff",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
                }}
              >
                <CheckCheck size={16} />
                <span>Mark All Read ({unreadCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Total Alerts
            </span>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", marginTop: "0.25rem" }}>
              {notifications.length}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem",
              border: unreadCount > 0 ? "1px solid #fecaca" : "1px solid #e2e8f0",
              backgroundColor: unreadCount > 0 ? "#fef2f2" : "#ffffff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: unreadCount > 0 ? "#991b1b" : "#64748b", textTransform: "uppercase" }}>
              Unread Messages
            </span>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: unreadCount > 0 ? "#b91c1c" : "#0f172a", marginTop: "0.25rem" }}>
              {unreadCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: actionRequiredCount > 0 ? "#fff1f2" : "#ffffff",
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem",
              border: actionRequiredCount > 0 ? "1px solid #fecdd3" : "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: actionRequiredCount > 0 ? "#9f1239" : "#64748b", textTransform: "uppercase" }}>
              Action Required
            </span>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: actionRequiredCount > 0 ? "#be123c" : "#0f172a", marginTop: "0.25rem" }}>
              {actionRequiredCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Verified / Approved
            </span>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#059669", marginTop: "0.25rem" }}>
              {approvedCount}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "1.25rem",
            paddingBottom: "0.25rem",
            overflowX: "auto",
          }}
        >
          <button
            onClick={() => setActiveTab("all")}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem 0.5rem 0 0",
              border: "none",
              borderBottom: activeTab === "all" ? "2px solid #2563eb" : "2px solid transparent",
              backgroundColor: activeTab === "all" ? "#eff6ff" : "transparent",
              color: activeTab === "all" ? "#1d4ed8" : "#64748b",
              fontWeight: activeTab === "all" ? "700" : "500",
              fontSize: "0.875rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            All Alerts ({notifications.length})
          </button>

          <button
            onClick={() => setActiveTab("unread")}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem 0.5rem 0 0",
              border: "none",
              borderBottom: activeTab === "unread" ? "2px solid #2563eb" : "2px solid transparent",
              backgroundColor: activeTab === "unread" ? "#eff6ff" : "transparent",
              color: activeTab === "unread" ? "#1d4ed8" : "#64748b",
              fontWeight: activeTab === "unread" ? "700" : "500",
              fontSize: "0.875rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Unread ({unreadCount})
          </button>

          <button
            onClick={() => setActiveTab("action_required")}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem 0.5rem 0 0",
              border: "none",
              borderBottom: activeTab === "action_required" ? "2px solid #ef4444" : "2px solid transparent",
              backgroundColor: activeTab === "action_required" ? "#fef2f2" : "transparent",
              color: activeTab === "action_required" ? "#b91c1c" : "#64748b",
              fontWeight: activeTab === "action_required" ? "700" : "500",
              fontSize: "0.875rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Action Required ({actionRequiredCount})
          </button>

          <button
            onClick={() => setActiveTab("approved")}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem 0.5rem 0 0",
              border: "none",
              borderBottom: activeTab === "approved" ? "2px solid #10b981" : "2px solid transparent",
              backgroundColor: activeTab === "approved" ? "#f0fdf4" : "transparent",
              color: activeTab === "approved" ? "#047857" : "#64748b",
              fontWeight: activeTab === "approved" ? "700" : "500",
              fontSize: "0.875rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Approved ({approvedCount})
          </button>
        </div>

        {/* Notifications Feed */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
            <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 0.75rem auto" }} />
            <p style={{ margin: 0, fontSize: "0.9375rem" }}>Loading your notification feed...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3.5rem 1.5rem",
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px dashed #cbd5e1",
            }}
          >
            <Inbox size={40} style={{ color: "#94a3b8", margin: "0 auto 0.75rem auto" }} />
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.125rem", fontWeight: "700", color: "#1e293b" }}>
              No notifications in this category
            </h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
              {activeTab === "unread"
                ? "You have reviewed all your alerts. All caught up!"
                : activeTab === "action_required"
                ? "Great news! You have no rejected fee slips or urgent actions pending."
                : "No notifications have been recorded yet."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {filteredNotifications.map((item) => {
              const isWrongSlip = isWrongSlipNotif(item);
              const isVerified = isVerifiedNotif(item);

              let cardBg = item.is_read ? "#ffffff" : "#f8fafc";
              let cardBorder = item.is_read ? "#e2e8f0" : "#cbd5e1";
              let titleColor = "#0f172a";

              if (isWrongSlip) {
                cardBg = item.is_read ? "#fff8f8" : "#fef2f2";
                cardBorder = "#fca5a5";
                titleColor = "#991b1b";
              } else if (isVerified) {
                cardBg = item.is_read ? "#fafffb" : "#f0fdf4";
                cardBorder = "#86efac";
                titleColor = "#166534";
              }

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: "0.75rem",
                    padding: "1.25rem",
                    boxShadow: item.is_read ? "none" : "0 1px 3px rgba(0, 0, 0, 0.05)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    {/* Status Icon Indicator */}
                    <div style={{ flexShrink: 0, marginTop: "2px" }}>
                      {isWrongSlip ? (
                        <div
                          style={{
                            backgroundColor: "#fee2e2",
                            color: "#dc2626",
                            padding: "0.625rem",
                            borderRadius: "50%",
                            display: "flex",
                          }}
                        >
                          <AlertTriangle size={20} />
                        </div>
                      ) : isVerified ? (
                        <div
                          style={{
                            backgroundColor: "#dcfce7",
                            color: "#16a34a",
                            padding: "0.625rem",
                            borderRadius: "50%",
                            display: "flex",
                          }}
                        >
                          <CheckCircle size={20} />
                        </div>
                      ) : (
                        <div
                          style={{
                            backgroundColor: "#eff6ff",
                            color: "#2563eb",
                            padding: "0.625rem",
                            borderRadius: "50%",
                            display: "flex",
                          }}
                        >
                          <Bell size={20} />
                        </div>
                      )}
                    </div>

                    {/* Content Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                          marginBottom: "0.375rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: titleColor }}>
                            {item.title}
                          </h3>

                          {isWrongSlip && (
                            <span
                              style={{
                                backgroundColor: "#ef4444",
                                color: "#ffffff",
                                fontSize: "0.6875rem",
                                fontWeight: "700",
                                padding: "0.125rem 0.5rem",
                                borderRadius: "9999px",
                                textTransform: "uppercase",
                              }}
                            >
                              Action Required
                            </span>
                          )}

                          {!item.is_read && (
                            <span
                              style={{
                                backgroundColor: "#dbeafe",
                                color: "#1e40af",
                                fontSize: "0.6875rem",
                                fontWeight: "700",
                                padding: "0.125rem 0.5rem",
                                borderRadius: "9999px",
                              }}
                            >
                              New
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.75rem",
                            color: "#64748b",
                          }}
                        >
                          <Clock size={13} />
                          {new Date(item.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "0 0 0.875rem 0",
                          fontSize: "0.875rem",
                          color: "#334155",
                          lineHeight: "1.5",
                        }}
                      >
                        {item.message}
                      </p>

                      {/* Action Triggers */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        {isWrongSlip ? (
                          <button
                            onClick={() => handleAction(item)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.5rem 1rem",
                              backgroundColor: "#dc2626",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "0.5rem",
                              fontSize: "0.8125rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            <span>Re-Upload Corrected Fee Slip</span>
                            <ArrowRight size={14} />
                          </button>
                        ) : isVerified ? (
                          <button
                            onClick={() => handleAction(item)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.5rem 1rem",
                              backgroundColor: "#059669",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "0.5rem",
                              fontSize: "0.8125rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            <span>View Bus Pass & Details</span>
                            <ArrowRight size={14} />
                          </button>
                        ) : user?.role === "accounts" && (item.title || "").toLowerCase().includes("receipt") ? (
                          <button
                            onClick={() => handleAction(item)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.5rem 1rem",
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "0.5rem",
                              fontSize: "0.8125rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            <span>Review Receipt Queue</span>
                            <ArrowRight size={14} />
                          </button>
                        ) : null}

                        {!item.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(item.id)}
                            style={{
                              background: "transparent",
                              border: "1px solid #d1d5db",
                              color: "#475569",
                              padding: "0.45rem 0.75rem",
                              borderRadius: "0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsPage;

