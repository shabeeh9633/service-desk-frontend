import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PendingUsers from "./PendingUsers";
import { useAuth } from "../context/AuthContext";
import { getTickets } from "../services/ticketService";
import api from "../services/api";
import {
  IconDashboard, IconTicket, IconUsers, IconCheckCircle, IconAlert, IconChart,
  IconList, IconShield, IconRefresh, IconDownload, IconPrint,
  IconPlus, IconUser, IconTrophy, IconStar, IconClock,
  IconMapPin, IconTag, IconBuilding, IconSearch, IconActivity, IconZap
} from "../components/Icons";

const priorityColor = { low: "#059669", medium: "#d97706", high: "#ea580c", critical: "#dc2626" };
const statusColor   = { open: "#0891b2", in_progress: "#d97706", resolved: "#059669", closed: "#6b7280" };

// ── KPI Card ──
function KpiCard({ icon: Icon, label, value, variant = "accent", sub, onClick }) {
  const isClickable = typeof onClick === "function";
  return (
    <div
      className={`kpi-card ${variant} ${isClickable ? "interactive" : ""}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={isClickable ? { cursor: "pointer" } : {}}
    >
      <div className="kpi-card-header">
        <div className="kpi-card-icon"><Icon size={18} /></div>
      </div>
      <div>
        <div className="kpi-card-value">{value ?? 0}</div>
        <div className="kpi-card-label">{label}</div>
        {sub && <div className="kpi-card-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics]           = useState(null);
  const [tickets, setTickets]               = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [error, setError]                   = useState("");
  const [activeTab, setActiveTab]           = useState("dashboard");

  const [searchQuery, setSearchQuery]       = useState("");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [overdueFilter, setOverdueFilter]   = useState("all");

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["dashboard", "analytics", "logs", "tickets"].includes(tab)) {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab("dashboard");
    }
  }, [location.search]);

  const loadData = useCallback(async () => {
    setLoadingAnalytics(true);
    setLoadingTickets(true);
    setError("");

    try {
      const res = await api.get("analytics/");
      if (res.data) setAnalytics(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch administrative analytics.");
    } finally {
      setLoadingAnalytics(false);
    }

    try {
      const res = await getTickets();
      if (res.data?.tickets) setTickets(res.data.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── CSV Export (unchanged logic) ──
  const exportToCSV = () => {
    if (!analytics) return;
    let csv = "data:text/csv;charset=utf-8,";
    csv += "--- SYSTEM SUMMARY KPIs ---\r\n";
    csv += "Metric,Value\r\n";
    Object.entries(analytics.kpis || {}).forEach(([k, v]) => {
      csv += `"${k.toUpperCase().replace("_", " ")}",${v}\r\n`;
    });
    csv += "\r\n--- AGENT PERFORMANCE LEADERBOARD ---\r\n";
    csv += "Rank,Agent,Email,Tickets Resolved,Avg Rating,SLA Compliance %\r\n";
    (analytics.leaderboard || []).forEach((agent, i) => {
      csv += `${i+1},"${agent.username}","${agent.email}",${agent.resolved_count},${agent.avg_rating},${agent.sla_compliance_pct}%\r\n`;
    });
    csv += "\r\n--- GEOGRAPHIC BRANCH ANALYTICS ---\r\n";
    csv += "Branch,Total Tickets,Resolved,Critical Active\r\n";
    (analytics.branch_breakdown || []).forEach(b => {
      csv += `"${b.branch || "General"}",${b.total},${b.resolved},${b.critical}\r\n`;
    });
    csv += "\r\n--- CATEGORY BREAKDOWN ---\r\n";
    csv += "Category,Total Tickets\r\n";
    (analytics.category_breakdown || []).forEach(c => {
      csv += `"${c.category || "General"}",${c.total}\r\n`;
    });
    csv += "\r\n--- DEPARTMENT BREAKDOWN ---\r\n";
    csv += "Department,Total Tickets\r\n";
    (analytics.department_breakdown || []).forEach(d => {
      csv += `"${d.department || "General"}",${d.total}\r\n`;
    });
    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Enterprise_Support_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── AI Insight text parser (unchanged) ──
  const renderInsight = (text) => {
    const parts = text.split("**");
    return parts.map((part, index) =>
      index % 2 === 1
        ? <strong key={index} style={{ color: "var(--accent-1)" }}>{part}</strong>
        : part
    );
  };

  // ── Ticket filter ──
  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id?.toString() === searchQuery ||
      t.assigned_to?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus   = statusFilter   === "all" || t.status   === statusFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchesOverdue  = overdueFilter  === "all" || (overdueFilter === "overdue" ? t.is_overdue : !t.is_overdue);
    return matchesSearch && matchesStatus && matchesPriority && matchesOverdue;
  });

  const kpis = analytics?.kpis || {};
  const hasCriticalIncidents = kpis.critical_count > 0;

  const TABS = [
    { id: "dashboard", label: "Dashboard",        icon: IconDashboard },
    { id: "analytics", label: "Analytics",        icon: IconChart  },
    { id: "logs",      label: "Approvals & Logs",  icon: IconShield },
    { id: "tickets",   label: "Ticket Control",    icon: IconList   },
  ];

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        {/* ── Page Header ── */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">
                <span className="page-title-icon"><IconChart size={18} /></span>
                Admin Console
              </h1>
              <p className="page-subtitle">
                Welcome back, <strong>{user?.first_name || user?.username}</strong>. System status, insights, and support auditing.
              </p>
            </div>
            <div className="page-actions">
              <button className="btn btn-ghost btn-sm" onClick={loadData} disabled={loadingAnalytics} title="Refresh data">
                <IconRefresh size={15} /> Refresh
              </button>
              <button className="btn btn-ghost btn-sm" onClick={exportToCSV} disabled={loadingAnalytics} title="Export analytics report">
                <IconDownload size={15} /> Export CSV
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()} title="Print report">
                <IconPrint size={15} /> Print
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate("/tickets/create")}>
                <IconPlus size={15} /> New Ticket
              </button>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Critical Incident Banner ── */}
        {hasCriticalIncidents && (
          <div className="alert-banner alert-banner-danger" style={{ animation: "pulse-ring 2s infinite" }}>
            <div className="alert-banner-content">
              <div className="alert-banner-icon" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                <span style={{
                  width: 10, height: 10, borderRadius: "50%", background: "var(--danger)",
                  boxShadow: "0 0 8px var(--danger)", display: "block",
                  animation: "pulse-dot 1.5s infinite"
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--danger)" }}>
                  Critical Service Threat Detected
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <strong>{kpis.critical_count}</strong> unresolved critical incident(s) are threatening SLA deadlines.
                </p>
              </div>
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => { setActiveTab("tickets"); setPriorityFilter("critical"); setStatusFilter("all"); }}
            >
              Review Incidents
            </button>
          </div>
        )}

        {/* ── Tab Bar ── */}
        <div className="tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-item${activeTab === tab.id ? " active" : ""}`}
              onClick={() => navigate(`/admin-dashboard?tab=${tab.id}`)}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {loadingAnalytics && activeTab !== "tickets" ? (
          <div className="spinner-wrap">
            <div className="spinner" />
            <span style={{ marginTop: 12, color: "var(--text-secondary)", fontSize: "0.85rem" }}>Loading analytics…</span>
          </div>
        ) : (
          <>
            {/* ━━━━━━━━━━ TAB 1: DASHBOARD ━━━━━━━━━━ */}
            {activeTab === "dashboard" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* KPI Cards */}
                <div className="kpi-grid">
                  <KpiCard icon={IconTicket}      label="Total Tickets"    value={kpis.total_tickets}     variant="accent"   sub="All time"    onClick={() => { navigate("/admin-dashboard?tab=tickets"); setStatusFilter("all"); setPriorityFilter("all"); setOverdueFilter("all"); }} />
                  <KpiCard icon={IconActivity}    label="Open"             value={kpis.open_count}        variant="info"     sub="Needs action" onClick={() => { navigate("/admin-dashboard?tab=tickets"); setStatusFilter("open"); setPriorityFilter("all"); setOverdueFilter("all"); }} />
                  <KpiCard icon={IconZap}         label="In Progress"      value={kpis.in_progress_count} variant="warning"  sub="Active work"  onClick={() => { navigate("/admin-dashboard?tab=tickets"); setStatusFilter("in_progress"); setPriorityFilter("all"); setOverdueFilter("all"); }} />
                  <KpiCard icon={IconCheckCircle} label="Resolved"         value={kpis.resolved_count}    variant="success"  sub="Completed"   onClick={() => { navigate("/admin-dashboard?tab=tickets"); setStatusFilter("resolved"); setPriorityFilter("all"); setOverdueFilter("all"); }} />
                  <KpiCard icon={IconClock}       label="SLA Breaches"     value={kpis.overdue_count}     variant={kpis.overdue_count > 0 ? "warning" : "slate"} sub="Overdue"    onClick={() => { navigate("/admin-dashboard?tab=tickets"); setStatusFilter("all"); setPriorityFilter("all"); setOverdueFilter("overdue"); }} />
                  <KpiCard icon={IconAlert}       label="Critical Priority" value={kpis.critical_count}  variant={kpis.critical_count > 0 ? "danger" : "slate"}  sub="Immediate"  onClick={() => { navigate("/admin-dashboard?tab=tickets"); setStatusFilter("all"); setPriorityFilter("critical"); setOverdueFilter("all"); }} />
                </div>

                {/* AI Insights + Leaderboard */}
                <div className="grid-2" style={{ gap: 20 }}>

                  {/* AI Insights */}
                  <div className="card" style={{ borderTop: "3px solid var(--accent-1)" }}>
                    <div className="card-header">
                      <div>
                        <div className="card-title">
                          <span style={{ color: "var(--accent-1)", display: "flex" }}><IconActivity size={16} /></span>
                          AI Executive Insights
                        </div>
                        <div className="card-subtitle">Real-time strategic observations from platform data and performance trends.</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {analytics?.ai_insights?.map((insight, idx) => (
                        <div key={idx} style={{
                          display: "flex", gap: 10, background: "var(--bg-base)", padding: "10px 14px",
                          borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-2)",
                          fontSize: "0.82rem", lineHeight: 1.5
                        }}>
                          <span style={{ color: "var(--accent-2)", flexShrink: 0, marginTop: 1 }}>
                            <IconCheckCircle size={13} />
                          </span>
                          <div style={{ color: "var(--text-secondary)" }}>{renderInsight(insight)}</div>
                        </div>
                      )) || (
                        <div className="empty-state" style={{ padding: "24px 0" }}>
                          <div className="empty-icon"><IconActivity size={22} /></div>
                          <div className="empty-sub">No executive insights available yet.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agent Leaderboard */}
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">
                          <span style={{ color: "var(--warning)", display: "flex" }}><IconTrophy size={16} /></span>
                          Agent Leaderboard
                        </div>
                        <div className="card-subtitle">Top agents by resolutions, rating, and SLA compliance.</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {analytics?.leaderboard?.map((agent, index) => {
                        const rankClasses = ["rank-badge-1", "rank-badge-2", "rank-badge-3"];
                        const rankClass = rankClasses[index] || "rank-badge-n";
                        return (
                          <div key={agent.id} style={{
                            display: "flex", alignItems: "center",
                            padding: "10px 12px", border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            background: index === 0 ? "var(--accent-1-light)" : "transparent"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                              <span className={`rank-badge ${rankClass}`}>#{index + 1}</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{agent.username}</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{agent.email}</div>
                              </div>
                            </div>
                            <div className="leaderboard-agent-badges" style={{ display: "flex", gap: 6 }}>
                              <span style={{ background: "var(--accent-1-light)", color: "var(--accent-1)", fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                                {agent.resolved_count} res
                              </span>
                              <span style={{ background: "rgba(217,119,6,0.08)", color: "var(--warning)", fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                                <IconStar size={10} /> {agent.avg_rating}
                              </span>
                              <span style={{ background: "var(--success-light)", color: "var(--success)", fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                                {agent.sla_compliance_pct}%
                              </span>
                            </div>
                          </div>
                        );
                      }) || (
                        <div className="empty-state" style={{ padding: "24px 0" }}>
                          <div className="empty-icon"><IconUsers size={22} /></div>
                          <div className="empty-sub">No agent activity registered.</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ━━━━━━━━━━ TAB 2: ANALYTICS ━━━━━━━━━━ */}
            {activeTab === "analytics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title"><span style={{ color: "var(--accent-1)", display: "flex" }}><IconChart size={16} /></span> Business &amp; Location Analytics</div>
                      <div className="card-subtitle">Ticket density by branches, categories, and departments.</div>
                    </div>
                  </div>

                  <div className="admin-analytics-grid">
                    {/* Branch Breakdown */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                        <IconMapPin size={14} style={{ color: "var(--text-muted)" }} />
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Geographic Branches</span>
                      </div>
                      {!analytics?.branch_breakdown?.length ? (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", textAlign: "center", padding: "16px 0" }}>No branch data.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {analytics.branch_breakdown.slice(0, 5).map((b, idx) => {
                            const resolvedPct = b.total > 0 ? (b.resolved / b.total) * 100 : 0;
                            const criticalPct = b.total > 0 ? (b.critical / b.total) * 100 : 0;
                            const openPct = 100 - resolvedPct - criticalPct;
                            return (
                              <div key={idx} style={{ fontSize: "0.8rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 5 }}>
                                  <span>{b.branch || "General"}</span>
                                  <span style={{ color: "var(--text-muted)" }}>{b.total}</span>
                                </div>
                                <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "#f1f5f9" }}>
                                  <div style={{ width: `${resolvedPct}%`, background: "var(--success)" }} />
                                  <div style={{ width: `${criticalPct}%`, background: "var(--danger)" }} />
                                  <div style={{ width: `${openPct}%`, background: "var(--info)" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 3 }}>
                                  <span style={{ color: "var(--success)" }}>{b.resolved} resolved</span>
                                  {b.critical > 0 && <span style={{ color: "var(--danger)", fontWeight: 700 }}>{b.critical} critical</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Category SVG Bar Chart */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                        <IconTag size={14} style={{ color: "var(--text-muted)" }} />
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ticket Categories</span>
                      </div>
                      {!analytics?.category_breakdown?.length ? (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", textAlign: "center", padding: "16px 0" }}>No category data.</div>
                      ) : (
                        <div style={{ position: "relative", height: 180 }}>
                          {(() => {
                            const maxVal = Math.max(...(analytics.category_breakdown.map(c => c.total) || [10]));
                            return (
                              <svg viewBox="0 0 400 200" width="100%" height="100%" style={{ overflow: "visible" }}>
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                  const y = 160 - ratio * 130;
                                  return (
                                    <g key={i}>
                                      <line x1="36" y1={y} x2="380" y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
                                      <text x="26" y={y + 3} fontSize="9" textAnchor="end" fill="var(--text-muted)" fontWeight="600">{Math.round(ratio * maxVal)}</text>
                                    </g>
                                  );
                                })}
                                {analytics.category_breakdown.slice(0, 6).map((c, idx) => {
                                  const barWidth = 32;
                                  const gap = (344 - (6 * barWidth)) / 7;
                                  const x = 36 + gap + idx * (barWidth + gap);
                                  const valRatio = maxVal > 0 ? c.total / maxVal : 0;
                                  const height = valRatio * 130;
                                  const y = 160 - height;
                                  const rawLabel = c.category || "Other";
                                  const shortLabel = rawLabel.length > 7 ? rawLabel.slice(0, 6) + "…" : rawLabel;
                                  return (
                                    <g key={idx}>
                                      <rect x={x} y={y} width={barWidth} height={Math.max(height, 4)} rx="3" fill="url(#adminChartGradient)" />
                                      <text x={x + barWidth / 2} y={y - 5} fontSize="9" fontWeight="800" textAnchor="middle" fill="var(--text-primary)">{c.total}</text>
                                      <text x={x + barWidth / 2} y="174" fontSize="9" fontWeight="700" textAnchor="middle" fill="var(--text-secondary)">{shortLabel}</text>
                                    </g>
                                  );
                                })}
                                <defs>
                                  <linearGradient id="adminChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="var(--accent-1)" />
                                    <stop offset="100%" stopColor="var(--accent-2)" />
                                  </linearGradient>
                                </defs>
                              </svg>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Department Breakdown */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                        <IconBuilding size={14} style={{ color: "var(--text-muted)" }} />
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Departments</span>
                      </div>
                      {!analytics?.department_breakdown?.length ? (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", textAlign: "center", padding: "16px 0" }}>No department data.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {(() => {
                            const maxVal = Math.max(...(analytics.department_breakdown.map(d => d.total) || [10]));
                            return analytics.department_breakdown.slice(0, 5).map((d, idx) => {
                              const pct = maxVal > 0 ? (d.total / maxVal) * 100 : 0;
                              return (
                                <div key={idx} style={{ fontSize: "0.8rem" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontWeight: 600 }}>
                                    <span>{d.department || "General"}</span>
                                    <span style={{ color: "var(--text-muted)" }}>{d.total}</span>
                                  </div>
                                  <div style={{ height: 6, background: "var(--bg-base)", borderRadius: 3, overflow: "hidden" }}>
                                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-gradient)", borderRadius: 3 }} />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* ━━━━━━━━━━ TAB 2: APPROVALS & LOGS ━━━━━━━━━━ */}
            {activeTab === "logs" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <PendingUsers />

                <div className="grid-2" style={{ gap: 20 }}>
                  {/* Audit Logs */}
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title"><span style={{ display: "flex", color: "var(--accent-1)" }}><IconList size={16} /></span> System Audit Feed</div>
                        <div className="card-subtitle">Administrative modifications, assignments, and user changes.</div>
                      </div>
                    </div>
                    <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
                      {analytics?.recent_audits?.map(log => (
                        <div key={log.id} style={{
                          padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                          fontSize: "0.8rem", background: "var(--bg-base)"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ color: "var(--accent-1)", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                              <IconUser size={12} /> {log.username}
                            </span>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                              {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{log.action}</div>
                          <div style={{ color: "var(--text-secondary)", fontSize: "0.74rem", marginTop: 2 }}>{log.details}</div>
                        </div>
                      )) || (
                        <div className="empty-state" style={{ padding: "20px 0" }}>
                          <div className="empty-icon"><IconList size={20} /></div>
                          <div className="empty-sub">No audit logs found.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Security Logs */}
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title"><span style={{ display: "flex", color: "var(--danger)" }}><IconShield size={16} /></span> Security Audit Feed</div>
                        <div className="card-subtitle">Login activity, authentication outcomes, and lockout alerts.</div>
                      </div>
                    </div>
                    <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
                      {analytics?.recent_security?.map(log => (
                        <div key={log.id} style={{
                          padding: "10px 12px",
                          border: `1px solid ${log.is_suspicious ? "rgba(220,38,38,0.2)" : "var(--border)"}`,
                          borderRadius: "var(--radius-sm)", fontSize: "0.8rem",
                          background: log.is_suspicious ? "var(--danger-light)" : "var(--bg-base)"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", color: log.is_suspicious ? "var(--danger)" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                              <IconShield size={11} />
                              {log.is_suspicious ? "Suspicious Activity" : "Login Event"}
                            </span>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                              {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                            User: <span style={{ color: "var(--text-primary)" }}>{log.username}</span>
                            <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>IP: {log.ip_address}</span>
                          </div>
                          <div style={{ color: "var(--text-secondary)", fontSize: "0.74rem", marginTop: 2 }}>
                            {log.event_type} — {log.details}
                          </div>
                        </div>
                      )) || (
                        <div className="empty-state" style={{ padding: "20px 0" }}>
                          <div className="empty-icon"><IconShield size={20} /></div>
                          <div className="empty-sub">No security events recorded.</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ━━━━━━━━━━ TAB 3: TICKET CONTROL ━━━━━━━━━━ */}
            {activeTab === "tickets" && (
              <div className="card">
                {/* Filters */}
                 <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
                    <span className="search-icon"><IconSearch size={15} /></span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search by ID, title, or agent…"
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

                {loadingTickets ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--text-secondary)", padding: "20px 0" }}>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Loading tickets…
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><IconTicket size={24} /></div>
                    <div className="empty-title">No tickets found</div>
                    <div className="empty-sub">No tickets match the active filters.</div>
                  </div>
                ) : (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Branch</th>
                          <th>Department</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Assigned Agent</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTickets.map((t) => (
                          <tr key={t.id}>
                            <td className="td-mono" style={{ color: "var(--text-muted)" }}>#{t.id}</td>
                            <td>
                              <div className="td-primary">{t.title}</div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{t.category || "General"}</div>
                            </td>
                            <td>{t.branch || "—"}</td>
                            <td>{t.department || "—"}</td>
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
                              <span style={{
                                padding: "3px 9px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
                                background: statusColor[t.status] + "18",
                                color: statusColor[t.status],
                                border: `1px solid ${statusColor[t.status]}35`,
                                textTransform: "capitalize"
                              }}>
                                {t.status?.replace("_", " ")}
                              </span>
                            </td>
                            <td>
                              {t.assigned_to?.username ? (
                                <span style={{ fontWeight: 600, color: "var(--accent-1)", display: "flex", alignItems: "center", gap: 5 }}>
                                  <IconUser size={13} /> {t.assigned_to.username}
                                </span>
                              ) : <span style={{ color: "var(--text-muted)" }}>Unassigned</span>}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/tickets/${t.id}`)}>
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
