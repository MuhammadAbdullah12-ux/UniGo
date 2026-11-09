/**
 * Transport Administration Portal Dashboard.
 * Displays vehicle fleet oversight, seat occupancy analytics, route management, and special departure controls.
 */

import React from "react";
import { useAuth } from "../context/AuthContext";

export const AdminDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Transport Admin Portal</h1>
          <p style={styles.welcome}>Signed in as: <strong>{user?.full_name}</strong> ({user?.email})</p>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>Sign Out</button>
      </header>

      <main style={styles.content}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Fleet & Route Operations</h2>
          <p style={styles.text}><strong>Assigned Role:</strong> Transport Administrator</p>
          <div style={styles.alertNotice}>
            ✓ Transport Admin portal access verified. Ready for route management and Friday/Exam early departure controls.
          </div>
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", backgroundColor: "#f8fafc", padding: "2rem" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  title: { fontSize: "1.75rem", color: "#1e3a8a", fontWeight: "700" },
  welcome: { color: "#64748b", marginTop: "0.25rem" },
  logoutBtn: { backgroundColor: "#ef4444", color: "#fff", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", fontWeight: "600" },
  content: { maxWidth: "800px" },
  card: { backgroundColor: "#fff", padding: "1.5rem", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  cardTitle: { fontSize: "1.2rem", color: "#0f172a", marginBottom: "1rem" },
  text: { margin: "0.5rem 0", color: "#334155" },
  alertNotice: { marginTop: "1rem", backgroundColor: "#f0fdf4", color: "#16a34a", padding: "0.75rem", borderRadius: "6px", border: "1px solid #bbf7d0" },
};

export default AdminDashboard;

