/**
 * Reusable status indicator badge for financial records and fee vouchers.
 * Dynamically renders custom iconography, labels, and color palettes
 * based on the lifecycle state: unpaid, pending, rejected, or paid.
 */

import React from "react";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

const STATUS_CONFIG = {
  paid: {
    label: "Paid & Confirmed",
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending Verification",
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fde68a",
    icon: Clock,
  },
  rejected: {
    label: "Challan Rejected",
    bg: "#fef2f2",
    text: "#991b1b",
    border: "#fecaca",
    icon: XCircle,
  },
  unpaid: {
    label: "Payment Due (Unpaid)",
    bg: "#f3f4f6",
    text: "#374151",
    border: "#d1d5db",
    icon: AlertCircle,
  },
};

export const StatusBadge = ({ status = "unpaid", className = "" }) => {
  const normalized = (status || "unpaid").toLowerCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.unpaid;
  const IconComponent = config.icon;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.25rem 0.75rem",
        borderRadius: "9999px",
        fontSize: "0.8125rem",
        fontWeight: "600",
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        lineHeight: "1.25",
        letterSpacing: "0.01em",
      }}
    >
      <IconComponent size={14} strokeWidth={2.5} />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;

