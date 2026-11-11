/**
 * Real-time notification bell component for the application header (Day 20).
 * Features:
 *   - Auto-polling GET /notifications every 30 seconds (cleared on unmount).
 *   - Unread badge counter with 9+ truncation.
 *   - Dropdown showing the latest 5 alerts with smart category styling:
 *       * Red highlight and alert icon for "Wrong Fee Slip" / Rejection notices.
 *       * Green highlight and checkmark icon for "Fee Verified" approvals.
 *       * Blue highlight for new receipt submissions.
 *   - One-click "Mark All as Read" action.
 *   - Direct interactive navigation upon clicking an alert (e.g. wrong slip navigates to student re-upload).
 *   - Footer link to the full dedicated Notifications page.
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/client";

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications from FastAPI backend
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await API.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds (Day 20 requirement)
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when user clicks outside the component
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
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
      console.error("Failed to mark all as read:", err);
    }
  };

  // Handle clicking on a notification item: marks as read and navigates to the relevant page
  const handleItemClick = (item) => {
    if (!item.is_read) {
      handleMarkAsRead(item.id);
    }
    setIsOpen(false);

    const titleLower = (item.title || "").toLowerCase();
    const msgLower = (item.message || "").toLowerCase();

    // Context-sensitive routing
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

  // Show latest 5 in the quick drawer
  const visibleNotifications = notifications.slice(0, 5);

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="View Notifications"
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "0.5rem",
          borderRadius: "0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#374151",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              fontSize: "0.6875rem",
              fontWeight: "700",
              minWidth: "18px",
              height: "18px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 0 2px #ffffff",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Notification Drawer */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: "0.5rem",
            width: "380px",
            maxWidth: "92vw",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e2e8f0",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #f1f5f9",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.9375rem" }}>
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span
                  style={{
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    padding: "0.125rem 0.5rem",
                    borderRadius: "9999px",
                  }}
                >
                  {unreadCount} new
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: "#f1f5f9",
                    color: "#64748b",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                    padding: "0.125rem 0.5rem",
                    borderRadius: "9999px",
                  }}
                >
                  All caught up
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* List Feed (Latest 5 items) */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>
                Loading alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
                <Bell size={32} style={{ color: "#cbd5e1", margin: "0 auto 0.5rem auto" }} />
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b", fontWeight: "500" }}>
                  You have no notifications yet.
                </p>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Important updates regarding receipts, routes, and verifications will appear here.
                </span>
              </div>
            ) : (
              visibleNotifications.map((item) => {
                const titleLower = (item.title || "").toLowerCase();
                const msgLower = (item.message || "").toLowerCase();

                // Notification classification for distinct styling
                const isWrongSlip =
                  titleLower.includes("wrong") ||
                  titleLower.includes("reject") ||
                  msgLower.includes("reject");
                const isVerified =
                  titleLower.includes("verified") ||
                  titleLower.includes("approv");
                const isNewReceipt =
                  titleLower.includes("receipt") ||
                  msgLower.includes("uploaded");

                // Dynamic background and border accents
                let itemBg = item.is_read ? "#ffffff" : "#f0f9ff";
                let borderColor = "transparent";
                let titleColor = item.is_read ? "#334155" : "#0369a1";

                if (isWrongSlip) {
                  itemBg = item.is_read ? "#fff8f8" : "#fef2f2";
                  borderColor = "#ef4444";
                  titleColor = "#991b1b";
                } else if (isVerified) {
                  itemBg = item.is_read ? "#f8fdf9" : "#f0fdf4";
                  borderColor = "#10b981";
                  titleColor = "#166534";
                } else if (!item.is_read) {
                  borderColor = "#2563eb";
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      padding: "0.875rem 1rem",
                      borderBottom: "1px solid #f1f5f9",
                      borderLeft: `4px solid ${borderColor}`,
                      backgroundColor: itemBg,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = "brightness(0.97)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = "none";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                      {/* Icon Indicator */}
                      <div style={{ marginTop: "2px", flexShrink: 0 }}>
                        {isWrongSlip ? (
                          <div
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#dc2626",
                              padding: "0.375rem",
                              borderRadius: "50%",
                              display: "flex",
                            }}
                          >
                            <AlertTriangle size={15} />
                          </div>
                        ) : isVerified ? (
                          <div
                            style={{
                              backgroundColor: "#dcfce7",
                              color: "#16a34a",
                              padding: "0.375rem",
                              borderRadius: "50%",
                              display: "flex",
                            }}
                          >
                            <CheckCircle size={15} />
                          </div>
                        ) : isNewReceipt ? (
                          <div
                            style={{
                              backgroundColor: "#dbeafe",
                              color: "#2563eb",
                              padding: "0.375rem",
                              borderRadius: "50%",
                              display: "flex",
                            }}
                          >
                            <FileText size={15} />
                          </div>
                        ) : (
                          <div
                            style={{
                              backgroundColor: "#f1f5f9",
                              color: "#64748b",
                              padding: "0.375rem",
                              borderRadius: "50%",
                              display: "flex",
                            }}
                          >
                            <Bell size={15} />
                          </div>
                        )}
                      </div>

                      {/* Content Body */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                          <h4
                            style={{
                              margin: 0,
                              fontSize: "0.875rem",
                              fontWeight: item.is_read ? "600" : "700",
                              color: titleColor,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.title}
                          </h4>
                          {!item.is_read && (
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                backgroundColor: isWrongSlip ? "#ef4444" : "#2563eb",
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>

                        <p
                          style={{
                            margin: "0.25rem 0 0.375rem 0",
                            fontSize: "0.8125rem",
                            color: "#475569",
                            lineHeight: "1.4",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.message}
                        </p>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.25rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.6875rem",
                              color: "#94a3b8",
                            }}
                          >
                            <Clock size={11} />
                            {new Date(item.created_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: isWrongSlip ? "#dc2626" : "#2563eb",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            {isWrongSlip ? "Action Required" : "View"} <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer: Link to Full Notifications Center */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderTop: "1px solid #f1f5f9",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Showing {Math.min(5, notifications.length)} of {notifications.length} alerts
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                fontSize: "0.8125rem",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <span>View All Notifications</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
