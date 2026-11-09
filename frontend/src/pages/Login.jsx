/**
 * Universal Login Page for UniGo.
 * Authenticates students, accounts officers, and transport admins.
 * Automatically steers the user to their respective portal based on role claims.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/client";
import { useAuth } from "../context/AuthContext";

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post("/auth/login", {
        identifier: identifier.trim(),
        password: password,
      });

      const { access_token, user } = response.data;
      login(access_token, user);

      // Dynamic redirect based on user role
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "accounts") {
        navigate("/accounts");
      } else {
        navigate("/student");
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Invalid login credentials. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logoTitle}>UniGo</h1>
          <p style={styles.subtitle}>Campus Transport & Fee Management Portal</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Roll No or Email Address</label>
            <input
              type="text"
              required
              placeholder="e.g., 23F-0509 or admin@unigo.test"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div style={styles.footer}>
          <span>New student? </span>
          <Link to="/register" style={styles.link}>Register for Transport</Link>
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
    padding: "1rem",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  logoTitle: {
    fontSize: "2.25rem",
    fontWeight: "800",
    color: "#1e3a8a",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "0.9rem",
    marginTop: "0.25rem",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    marginBottom: "1.25rem",
    border: "1px solid #fecaca",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    padding: "0.75rem",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.95rem",
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
    transition: "background-color 0.2s",
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

export default Login;

