/**
 * Real-time notification bell component for the application header.
 * Displays unread alert counter badges, opens an interactive notification drawer,
 * and allows users to mark individual alerts or batch-mark all alerts as read.
 */

import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Clock, X } from "lucide-react";
import API from "../api/client";

export const NotificationBell = () => {
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

    // Poll for new notifications every 30 seconds
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
    e.stopPropagation();
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
            width: "360px",
            maxWidth: "90vw",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
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
              borderBottom: "1px solid #f3f4f6",
              backgroundColor: "#fafafa",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: "700", color: "#111827", fontSize: "0.9375rem" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    padding: "0.125rem 0.5rem",
                    borderRadius: "9999px",
                  }}
                >
                  {unreadCount} new
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

          {/* List Feed */}
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
                Loading alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
                <Bell size={28} style={{ color: "#9ca3af", margin: "0 auto 0.5rem auto" }} />
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
                  You have no notifications yet.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={(e) => !item.is_read && handleMarkAsRead(item.id, e)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid #f3f4f6",
                    backgroundColor: item.is_read ? "#ffffff" : "#f0f9ff",
                    cursor: item.is_read ? "default" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        {!item.is_read && (
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              backgroundColor: "#0284c7",
                              display: "inline-block",
                            }}
                          />
                        )}
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "0.875rem",
                            fontWeight: item.is_read ? "600" : "700",
                            color: item.is_read ? "#374151" : "#0c4a6e",
                          }}
                        >
                          {item.title}
                        </h4>
                      </div>
                      <p
                        style={{
                          margin: "0.25rem 0 0.375rem 0",
                          fontSize: "0.8125rem",
                          color: "#4b5563",
                          lineHeight: "1.4",
                        }}
                      >
                        {item.message}
                      </p>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.6875rem",
                          color: "#9ca3af",
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
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

