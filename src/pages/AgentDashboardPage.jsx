import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { updateStatus } from "../services/ticketService";
import api from "../services/api";
import {
  IconTrophy, IconStar, IconClock, IconZap,
  IconAlert, IconCheckCircle, IconList, IconActivity, IconUser,
  IconSearch
} from "../components/Icons";

const priorityColor = { low: "#059669", medium: "#d97706", high: "#ea580c", critical: "#dc2626" };
const statusColor   = { open: "#0891b2", in_progress: "#d97706", resolved: "#059669", closed: "#6b7280" };

// ── KPI Metric Card ──
function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 44, height: 44, borderRadius: "var(--radius-sm)", flexShrink: 0,
        background: color + "15", display: "flex", alignItems: "center", justifyContent: "center",
        color
      }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [metrics, setMetrics] = useState({
    active_count: 0,
    max_capacity: 10,
    workload_pct: 0,
    resolved_count: 0,
    overdue_count: 0,
    avg_rating: 5.0,
    sla_compliance_pct: 100,
    avg_resolution_hours: 0,
  });
  const [dailyPerformance, setDailyPerformance] = useState([]);
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [updating, setUpdating] = useState({});
  const [searchQuery, setSearchQuery]       = useState("");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [overdueFilter, setOverdueFilter]   = useState("all");


  useEffect(() => { fetchPerformanceData(); }, []);

  async function fetchPerformanceData() {
    setLoading(true);
    try {
      const res = await api.get("analytics/agent/performance/");
      if (res.data) {
        setMetrics(res.data.metrics);
        setDailyPerformance(res.data.daily_performance || []);
        setTickets(res.data.assigned_queue || []);
      }
    } catch {
      setError("Failed to load agent performance metrics.");
    } finally {
      setLoading(false);
    }
  }



  async function handleStatusChange(ticketId, newStatus) {
    setUpdating(u => ({ ...u, [ticketId]: true }));
    try {
      await updateStatus(ticketId, newStatus);
      fetchPerformanceData();
    } catch {
      setError("Failed to update ticket status.");
    } finally {
      setUpdating(u => ({ ...u, [ticketId]: false }));
    }
  }

  function getWorkloadColor(pct) {
    if (pct < 50) return "#059669";
    if (pct < 80) return "#d97706";
    return "#dc2626";
  }

  const overdueTickets = tickets.filter(t => t.is_overdue);

  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id?.toString() === searchQuery ||
      t.created_by?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus   = statusFilter   === "all" || t.status   === statusFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchesOverdue  = overdueFilter  === "all" || (overdueFilter === "overdue" ? t.is_overdue : !t.is_overdue);
    return matchesSearch && matchesStatus && matchesPriority && matchesOverdue;
  });



  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">
                <span className="page-title-icon"><IconActivity size={18} /></span>
                Agent Support Center
              </h1>
              <p className="page-subtitle">
                Welcome back, <strong>{user?.first_name || user?.username}</strong>. Manage your assigned ticket workload.
              </p>
            </div>


          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── SLA Breach Alert ── */}
            {overdueTickets.length > 0 && (
              <div className="alert-banner alert-banner-danger">
                <div className="alert-banner-content">
                  <div className="alert-banner-icon" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                    <IconAlert size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--danger)" }}>
                      {overdueTickets.length} SLA {overdueTickets.length === 1 ? "Breach" : "Breaches"} Detected
                    </div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      These tickets have exceeded their SLA response deadline. Please resolve immediately.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {overdueTickets.slice(0, 3).map(t => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid rgba(220,38,38,0.15)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", gap: 12, minWidth: 280 }}>
                      <span style={{ fontWeight: 600 }}>#{t.id} — {t.title}</span>
                      <button className="btn btn-danger btn-xs" onClick={() => navigate(`/tickets/${t.id}`)}>
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Metrics + Workload ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20 }}>
              <div className="grid-2" style={{ gap: 16 }}>
                <MetricCard icon={IconTrophy}      label="Tickets Resolved"    value={metrics.resolved_count}    color="var(--accent-1)" />
                <MetricCard icon={IconStar}         label="Average Rating"      value={`${metrics.avg_rating} / 5`} color="var(--warning)" />
                <MetricCard icon={IconCheckCircle}  label="SLA Compliance"      value={`${metrics.sla_compliance_pct}%`} color="var(--success)" />
                <MetricCard icon={IconZap}          label="Avg Resolution Time"  value={`${metrics.avg_resolution_hours}h`} color="var(--info)" />
              </div>

              {/* Workload Gauge */}
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                  Workload Capacity
                </div>
                <div style={{ position: "relative", width: 140, height: 80 }}>
                  <svg width="140" height="80">
                    <path d="M 20 70 A 50 50 0 0 1 120 70" fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
                    <path
                      d="M 20 70 A 50 50 0 0 1 120 70"
                      fill="none"
                      stroke={getWorkloadColor(metrics.workload_pct)}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="157"
                      strokeDashoffset={157 - (157 * metrics.workload_pct) / 100}
                      style={{ transition: "stroke-dashoffset 0.8s ease" }}
                    />
                  </svg>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, fontSize: "1.3rem", fontWeight: 800, color: getWorkloadColor(metrics.workload_pct) }}>
                    {metrics.active_count} / {metrics.max_capacity}
                  </div>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 8, fontWeight: 500 }}>
                  {metrics.workload_pct}% capacity used
                </div>
              </div>
            </div>

            {/* ── Daily Performance + Queue ── */}
            <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>

              {/* Daily Bar Chart */}
              <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
                  Resolved This Week
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 120, paddingBottom: 10 }}>
                  {dailyPerformance.map((day, idx) => {
                    const barHeight = day.resolved * 15;
                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 5 }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-secondary)" }}>{day.resolved}</div>
                        <div style={{
                          width: 14,
                          height: Math.max(barHeight, 4),
                          background: "var(--accent-gradient)",
                          borderRadius: "3px 3px 0 0",
                          transition: "height 0.5s ease"
                        }} />
                        <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)" }}>{day.day}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ticket Queue Table */}
              <div className="card">
                <div className="card-header" style={{ marginBottom: 12 }}>
                  <div className="card-title">
                    <span style={{ color: "var(--accent-1)", display: "flex" }}><IconList size={16} /></span>
                    Active Ticket Queue
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>{filteredTickets.length} of {tickets.length} Assigned</span>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
                    <span className="search-icon"><IconSearch size={15} /></span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search queue by ID, title, user..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: "auto" }}>
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select className="form-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ width: "auto" }}>
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select className="form-select" value={overdueFilter} onChange={(e) => setOverdueFilter(e.target.value)} style={{ width: "auto" }}>
                    <option value="all">All SLA Statuses</option>
                    <option value="overdue">SLA Breached</option>
                    <option value="on_time">Within SLA</option>
                  </select>
                </div>

                {tickets.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><IconCheckCircle size={22} /></div>
                    <div className="empty-title">All caught up!</div>
                    <div className="empty-sub">No active tickets in your queue.</div>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><IconList size={22} /></div>
                    <div className="empty-title">No tickets match filters</div>
                    <div className="empty-sub">Try adjusting your search or filters.</div>
                  </div>
                ) : (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Title</th>
                          <th>Priority</th>
                          <th>SLA Remaining</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTickets.map(t => (
                          <tr key={t.id}>
                            <td className="td-mono" style={{ color: "var(--text-muted)" }}>#{t.id}</td>
                            <td>
                              <div className="td-primary">{t.title}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
                                {t.category} · <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><IconUser size={10} /> {t.created_by}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{
                                padding: "3px 9px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
                                background: priorityColor[t.priority] + "18",
                                color: priorityColor[t.priority],
                                border: `1px solid ${priorityColor[t.priority]}35`,
                                textTransform: "capitalize"
                              }}>
                                {t.priority}
                              </span>
                            </td>
                            <td>
                              {t.is_overdue ? (
                                <span style={{ color: "var(--danger)", fontWeight: 700, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}>
                                  <IconAlert size={13} /> Breached
                                </span>
                              ) : (
                                <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}>
                                  <IconClock size={13} /> {t.sla_remaining || "N/A"}
                                </span>
                              )}
                            </td>
                            <td>
                              <select
                                value={t.status}
                                disabled={updating[t.id]}
                                onChange={(e) => handleStatusChange(t.id, e.target.value)}
                                className="form-select"
                                style={{ width: "auto", padding: "4px 8px", fontSize: "0.78rem" }}
                              >
                                {["open", "in_progress", "resolved", "closed"].map(s => (
                                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/tickets/${t.id}`)}>
                                Work
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
