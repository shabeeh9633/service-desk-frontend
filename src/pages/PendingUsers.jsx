import { useEffect, useState, useCallback } from "react";
import * as authService from "../services/authService";
import { IconShield, IconRefresh, IconCheckCircle, IconX, IconCheck } from "../components/Icons";

/**
 * PendingUsers — Styled pending approvals panel for the Admin Dashboard.
 * Fetches users with is_approved=False and lets the admin approve/reject them.
 */
export default function PendingUsers() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [busy, setBusy]       = useState({});   // { [userId]: true } while action pending

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authService.getPendingUsers();
      setUsers(res.data);
    } catch {
      setError("Failed to load pending users. Make sure you are logged in as admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleApprove(id) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await authService.approveUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError("Approval failed. Please try again.");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function handleReject(id) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await authService.rejectUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError("Rejection failed. Please try again.");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  const roleColors = {
    admin: { bg: "rgba(239,68,68,0.15)",  color: "#ef4444" },
    agent: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
    user:  { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--warning)", display: "flex" }}><IconShield size={18} /></span> Pending Approvals
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            Users requesting elevated roles — approve or reject their access.
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchUsers}
          disabled={loading}
          title="Refresh"
        >
          <IconRefresh size={14} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0", color: "var(--text-secondary)" }}>
          <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          Loading pending requests…
        </div>
      )}

      {/* Empty state */}
      {!loading && users.length === 0 && !error && (
        <div style={{
          textAlign: "center",
          padding: "32px 0",
          color: "var(--text-secondary)",
          fontSize: "0.9rem",
        }}>
          <div style={{ color: "var(--success)", display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <IconCheckCircle size={32} />
          </div>
          No pending approval requests
        </div>
      )}

      {/* User list */}
      {!loading && users.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {users.map((u) => {
            const style = roleColors[u.requested_role] || roleColors.user;
            const isBusy = busy[u.id];
            return (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  flexWrap: "wrap",
                }}
              >
                {/* Avatar */}
                <div className="user-avatar" style={{ flexShrink: 0 }}>
                  {(u.username?.[0] || "?").toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{u.username}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{u.email}</div>
                </div>

                {/* Requested role badge */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  background: style.bg,
                  color: style.color,
                  flexShrink: 0,
                }}>
                  Wants: {u.requested_role}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    id={`approve-user-${u.id}`}
                    className="btn btn-success btn-sm"
                    onClick={() => handleApprove(u.id)}
                    disabled={isBusy}
                  >
                    {isBusy ? "…" : <><IconCheck size={14} /> Approve</>}
                  </button>
                  <button
                    id={`reject-user-${u.id}`}
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReject(u.id)}
                    disabled={isBusy}
                  >
                    {isBusy ? "…" : <><IconX size={14} /> Reject</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}