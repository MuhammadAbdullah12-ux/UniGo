/**
 * Student Self-Registration Page for UniGo.
 * Collects student enrollment details, university roll number, residence type (Day Scholar vs Hostelite),
 * and validates inputs before dispatching registration payloads to the FastAPI backend.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";

export const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    reg_no: "",
    full_name: "",
    email: "",
    password: "",
    student_type: "day_scholar",
    phone: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await API.post("/auth/register", {
        ...formData,
        reg_no: formData.reg_no.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
      });

      setSuccess("Account registered successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation error array
        setError(detail[0]?.msg || "Validation error in registration form");
      } else {
        setError(detail || "Registration failed. Please check your details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logoTitle}>UniGo</h1>
          <p style={styles.subtitle}>Student Transport Portal Registration</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Roll No / Reg Number</label>
              <input
                type="text"
                name="reg_no"
                required
                placeholder="e.g. 23F-0509"
                value={formData.reg_no}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                placeholder="Muhammad Abdullah"
                value={formData.full_name}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>University Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="23f0509@cfd.nu.edu.pk"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Password (Min 8 chars)</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Student Type</label>
              <select
                name="student_type"
                value={formData.student_type}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="day_scholar">Day Scholar (Daily Commuter)</option>
                <option value="hostelite">Hostelite (Weekend Commuter)</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number (Optional)</label>
            <input
              type="text"
              name="phone"
              placeholder="0300-1234567"
              value={formData.phone}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Creating Account..." : "Complete Registration"}
          </button>
        </form>

        <div style={styles.footer}>
          <span>Already registered? </span>
          <Link to="/login" style={styles.link}>Sign In here</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    padding: "1.5rem",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "520px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  },
  header: {
    textAlign: "center",
    marginBottom: "1.75rem",
  },
  logoTitle: {
    fontSize: "2.25rem",
    fontWeight: "800",
    color: "#1e3a8a",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "0.9rem",
    marginTop: "0.25rem",
  },
  row: {
    display: "flex",
    gap: "1rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
  },
  formGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    padding: "0.7rem",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.95rem",
    outline: "none",
  },
  select: {
    padding: "0.7rem",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.95rem",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  button: {
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
    padding: "0.85rem",
    borderRadius: "8px",
    border: "none",
    fontWeight: "600",
    fontSize: "1rem",
    marginTop: "0.5rem",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    marginBottom: "1rem",
    border: "1px solid #fecaca",
  },
  successBox: {
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    marginBottom: "1rem",
    border: "1px solid #bbf7d0",
  },
  footer: {
    marginTop: "1.5rem",
    textAlign: "center",
    fontSize: "0.875rem",
    color: "#64748b",
  },
  link: {
    color: "#0284c7",
    fontWeight: "600",
  },
};

export default Register;

