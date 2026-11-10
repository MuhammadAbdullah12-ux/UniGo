/**
 * Secure PDF receipt upload modal component for students.
 * Enforces client-side file size restrictions (<= 5 MB) and MIME-type checks
 * before transmitting binary data to POST /fees/{fee_id}/receipt via multipart/form-data.
 */

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ShieldAlert } from "lucide-react";
import API from "../api/client";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const UploadReceiptModal = ({
  isOpen,
  onClose,
  feeId,
  amount,
  onSuccess,
  isReupload = false,
  lastRejectReason = null,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Validate file integrity on selection
  const handleFileValidation = (file) => {
    setError(null);
    if (!file) return;

    // 1. Verify PDF extension / MIME type
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Invalid file format. Only genuine PDF documents (.pdf) are accepted.");
      setSelectedFile(null);
      return;
    }

    // 2. Enforce 5 MB maximum file boundary
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`Selected document is ${sizeMB} MB. The maximum allowable file size is 5 MB.`);
      setSelectedFile(null);
      return;
    }

    // 3. Prevent empty 0-byte files
    if (file.size === 0) {
      setError("The selected file is empty. Please select a valid document.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileValidation(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a PDF challan file to upload.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Package file inside multipart/form-data payload
      const formData = new FormData();
      formData.append("file", selectedFile);

      await API.post(`/fees/${feeId}/receipt`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Receipt upload failure:", err);
      const msg = err.response?.data?.detail || "Failed to submit challan. Please verify file integrity.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
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
          maxWidth: "520px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            backgroundColor: isReupload ? "#991b1b" : "#1e3a8a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <UploadCloud size={22} />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700" }}>
                {isReupload ? "Re-Upload Corrected Challan" : "Submit Bank Payment Challan"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.85 }}>
                Voucher #{feeId} • Rs. {Number(amount).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "0.25rem",
              borderRadius: "0.375rem",
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          {/* Rejection Notice Banner (if re-uploading) */}
          {isReupload && lastRejectReason && (
            <div
              style={{
                backgroundColor: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#9f1239",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                marginBottom: "1.25rem",
                fontSize: "0.8125rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
              <div>
                <strong>Accounts Officer's Rejection Reason:</strong>
                <p style={{ margin: "0.125rem 0 0 0" }}>"{lastRejectReason}"</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                marginBottom: "1.25rem",
                fontSize: "0.8125rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileValidation(e.target.files[0])}
            style={{ display: "none" }}
          />

          {/* Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              border: `2px dashed ${dragActive ? "#2563eb" : "#d1d5db"}`,
              backgroundColor: dragActive ? "#eff6ff" : "#f9fafb",
              borderRadius: "0.75rem",
              padding: "2rem 1rem",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              marginBottom: "1.25rem",
            }}
          >
            {selectedFile ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <FileText size={24} />
                </div>
                <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: "700", color: "#111827" }}>
                  {selectedFile.name}
                </h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Ready to Upload
                </p>
                <span
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#2563eb",
                    textDecoration: "underline",
                  }}
                >
                  Click to choose a different file
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <UploadCloud size={24} />
                </div>
                <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: "700", color: "#1f2937" }}>
                  Drag & drop your paid challan slip here
                </h4>
                <p style={{ margin: "0.25rem 0 0.5rem 0", fontSize: "0.75rem", color: "#6b7280" }}>
                  or click to browse from your computer
                </p>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.25rem 0.5rem",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "0.25rem",
                    fontSize: "0.6875rem",
                    color: "#4b5563",
                    fontWeight: "600",
                  }}
                >
                  PDF files only (Max 5 MB)
                </span>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              style={{
                padding: "0.625rem 1rem",
                border: "1px solid #d1d5db",
                backgroundColor: "#ffffff",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              style={{
                padding: "0.625rem 1.25rem",
                border: "none",
                backgroundColor: isReupload ? "#991b1b" : "#1e3a8a",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#ffffff",
                cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
                opacity: !selectedFile || uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "Uploading PDF..." : isReupload ? "Submit Corrected Receipt" : "Submit Receipt for Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadReceiptModal;

