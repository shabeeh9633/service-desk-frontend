import API from "./api";

// ─── Authentication ──────────────────────────────────────────────────────────

/** POST /api/v1/auth/login/ */
export const login = async (data) => {
  return await API.post("auth/login/", data);
};

/** POST /api/v1/auth/register/ */
export const register = async (data) => {
  return await API.post("auth/register/", data);
};

/** POST /api/v1/auth/google-login/ — send Google credential token */
export const googleLogin = async (credential) => {
  return await API.post("auth/google-login/", { credential });
};

/** GET /api/v1/auth/profile/ */
export const getProfile = async () => {
  return await API.get("auth/profile/");
};

// ─── User management (admin only) ────────────────────────────────────────────

/** GET /api/v1/users/pending/ */
export const getPendingUsers = async () => {
  return await API.get("users/pending/");
};

/** POST /api/v1/users/<id>/approve/ */
export const approveUser = async (id) => {
  return await API.post(`users/${id}/approve/`);
};

/** POST /api/v1/users/<id>/reject/ */
export const rejectUser = async (id) => {
  return await API.post(`users/${id}/reject/`);
};

/** GET /api/v1/users/agents/ */
export const getAgents = async () => {
  return await API.get("users/agents/");
};