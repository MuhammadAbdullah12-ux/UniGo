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
import RouteEnrollment from "./pages/RouteEnrollment";
import StudentRouteChange from "./pages/StudentRouteChange";
import AccountsDashboard from "./pages/AccountsDashboard";
import PendingReceipts from "./pages/PendingReceipts";
import VerifyReceipt from "./pages/VerifyReceipt";
import ReceiptsHistory from "./pages/ReceiptsHistory";
import StudentDetail from "./pages/StudentDetail";
import StudentLedger from "./pages/StudentLedger";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRegistrations from "./pages/AdminRegistrations";
import AdminSchedules from "./pages/AdminSchedules";
import NotificationsPage from "./pages/NotificationsPage";

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
            <Route path="/student/routes" element={<RouteEnrollment />} />
            <Route path="/student/change-route" element={<StudentRouteChange />} />
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
            <Route path="/accounts/students" element={<StudentLedger />} />
          </Route>

          {/* ================================================================ */}
          {/* Transport Admin Portal (Role: admin)                             */}
          {/* ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/routes" element={<AdminDashboard />} />
            <Route path="/admin/routes/:id" element={<AdminDashboard />} />
            <Route path="/admin/registrations" element={<AdminRegistrations />} />
            <Route path="/admin/schedules" element={<AdminSchedules />} />
          </Route>

          {/* ================================================================ */}
          {/* Notification Center (Accessible across all authenticated roles)   */}
          {/* ================================================================ */}
          <Route element={<ProtectedRoute allowedRoles={["student", "accounts", "admin"]} />}>
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/student/notifications" element={<NotificationsPage />} />
            <Route path="/accounts/notifications" element={<NotificationsPage />} />
            <Route path="/admin/notifications" element={<NotificationsPage />} />
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
