/**
 * Top-level application routing and state provider tree for UniGo.
 * Configures BrowserRouter, mounts the global AuthProvider, and establishes
 * public and role-protected navigation routes.
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

// Smart Fallback Redirect: navigates logged-in users to their role portal, guests to /login
function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "accounts") return <Navigate to="/accounts" replace />;
  return <Navigate to="/student" replace />;
}

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
            <Route path="/admin/routes" element={<AdminDashboard />} />
            <Route path="/admin/routes/:id" element={<AdminDashboard />} />
            <Route path="/admin/registrations" element={<AdminDashboard />} />
            <Route path="/admin/schedules" element={<AdminDashboard />} />
          </Route>

          {/* ================================================================ */}
          {/* Smart Fallback: Redirect root and unknown paths by auth state    */}
          {/* ================================================================ */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
