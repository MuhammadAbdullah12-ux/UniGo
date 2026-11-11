/**
 * Top-level application routing and state provider tree for UniGo.
 * Configures BrowserRouter, mounts the global AuthProvider, and establishes
 * public and role-protected navigation routes.
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Page Views
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import AccountsDashboard from "./pages/AccountsDashboard";
import PendingReceipts from "./pages/PendingReceipts";
import VerifyReceipt from "./pages/VerifyReceipt";
import ReceiptsHistory from "./pages/ReceiptsHistory";
import StudentDetail from "./pages/StudentDetail";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ================================================================ */}
          {/* Public Routes (Accessible without login)                         */}
          {/* ================================================================ */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ================================================================ */}
          {/* Student Portal (Role: student)                                   */}
          {/* ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/student" element={<StudentDashboard />} />
          </Route>

          {/* ================================================================ */}
          {/* Accounts Officer Portal (Role: accounts)                         */}
          {/* ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["accounts"]} />}>
            <Route path="/accounts" element={<AccountsDashboard />} />
            <Route path="/accounts/receipts" element={<PendingReceipts />} />
            <Route path="/accounts/receipts/:id" element={<VerifyReceipt />} />
            <Route path="/accounts/history" element={<ReceiptsHistory />} />
            <Route path="/accounts/students/:id" element={<StudentDetail />} />
            <Route path="/accounts/students" element={<Navigate to="/accounts/history" replace />} />
          </Route>

          {/* ================================================================ */}
          {/* Transport Admin Portal (Role: admin)                             */}
          {/* ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* ================================================================ */}
          {/* Default Fallback: Redirect root and unknown paths to /login      */}
          {/* ================================================================ */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
