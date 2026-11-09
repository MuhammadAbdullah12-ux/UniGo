/**
 * Global Authentication Context Provider for the UniGo frontend.
 * Manages user profile state, JWT bearer tokens, localStorage synchronization,
 * and exposes the useAuth() custom hook for application-wide access control.
 */

import React, { createContext, useContext, useState, useEffect } from "react";

// Create the context instance
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize user state from browser localStorage to persist sessions across page reloads
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("unigo_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("unigo_token") || null;
  });

  const [loading, setLoading] = useState(false);

  /**
   * Logs a user in by storing their credentials in state and localStorage.
   * @param {string} newToken - The JWT access token received from the backend.
   * @param {object} newUser - The user's profile object (id, full_name, email, role, etc.).
   */
  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("unigo_token", newToken);
    localStorage.setItem("unigo_user", JSON.stringify(newUser));
  };

  /**
   * Logs the user out by clearing credentials and removing storage entries.
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("unigo_token");
    localStorage.removeItem("unigo_user");
    window.location.href = "/login";
  };

  // The context value exposed to all child components
  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    role: user?.role || null,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom React hook for easy access to authentication state and functions.
 * Usage: const { user, role, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider wrapper");
  }
  return context;
};

