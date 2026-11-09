/**
 * Route-level authorization guard for client-side navigation.
 * Validates active login status and enforces Role-Based Access Control (RBAC).
 */

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, role, loading } = useAuth();

  // If session is still loading, display nothing or a loading spinner
  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Verifying session...</div>;
  }

  // If user is not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required and user's role is not allowed, redirect to their home portal
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "accounts") return <Navigate to="/accounts" replace />;
    return <Navigate to="/student" replace />;
  }

  // User is authorized; render the child route view
  return <Outlet />;
};

export default ProtectedRoute;

