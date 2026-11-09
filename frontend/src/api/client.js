/**
 * Centralized Axios HTTP client configuration for UniGo.
 * Manages baseURL settings, automatic JWT bearer token injection via request interceptors,
 * and global session expiration handling via response interceptors.
 */

import axios from "axios";

// Create Axios client instance targeting the FastAPI backend
const API = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// ==============================================================================
// Request Interceptor: Automatic JWT Token Attachment
// ==============================================================================
API.interceptors.request.use(
  (config) => {
    // Retrieve the active JWT token from browser localStorage
    const token = localStorage.getItem("unigo_token");
    if (token) {
      // Attach the token in the standard Bearer authorization header format
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==============================================================================
// Response Interceptor: Global 401 Session Expiration Handling
// ==============================================================================
API.interceptors.response.use(
  (response) => {
    // Pass through successful responses unaltered
    return response;
  },
  (error) => {
    // If backend returns 401 Unauthorized (token expired or invalidated)
    if (error.response && error.response.status === 401) {
      // Avoid redirect loops if already on the login page
      if (!window.location.pathname.includes("/login")) {
        console.warn("Session expired or unauthorized. Redirecting to login...");
        localStorage.removeItem("unigo_token");
        localStorage.removeItem("unigo_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;

