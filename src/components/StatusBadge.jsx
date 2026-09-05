export default function StatusBadge({ status, priority, size = '' }) {
  if (status) {
    const label = status.replace('_', ' ')
    return <span className={`badge badge-${status} ${size}`}>{label}</span>
  }
  if (priority) {
    return <span className={`badge badge-${priority} ${size}`}>{priority}</span>
  }
  return null
}
