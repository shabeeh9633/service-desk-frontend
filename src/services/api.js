import axios from "axios";

// ─── Base instance ──────────────────────────────────────────────────────────
const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1/`,
});

// ─── Request interceptor: attach JWT access token ───────────────────────────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access"); // ← correct key
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: auto-refresh on 401 ──────────────────────────────
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh");

      if (refresh) {
        try {
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/v1/auth/token/refresh/`,
            { refresh }
          );
          const newAccess = res.data.access;
          localStorage.setItem("access", newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return API(originalRequest); // retry the original request
        } catch {
          // Refresh failed — clear session
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          localStorage.removeItem("user");
          window.location.href = "/";
        }
      } else {
        // No refresh token — redirect to login
        localStorage.removeItem("access");
        localStorage.removeItem("user");
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default API;