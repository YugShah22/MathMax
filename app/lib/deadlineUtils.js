/** Returns deadline status info object, or null if no deadline. */
export function dlStatus(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  const h = Math.floor(diff / 36e5);
  const d = Math.floor(diff / 864e5);
  if (diff < 0)  return { label: 'Closed',    color: '#ef4444', bg: 'rgba(210, 47, 47, 0.09)',  border: 'rgba(239,68,68,0.22)',  closed: true  };
  if (h < 24)    return { label: `${h}h left`, color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.25)', closed: false };
  if (d <= 3)    return { label: `${d}d left`, color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.25)', closed: false };
  return          { label: `${d}d left`,        color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',  closed: false };
}

/** Formats a deadline string to "12 May 2026, 11:59 PM" */
export function formatDeadline(deadline) {
  if (!deadline) return '';
  return `${new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${new Date(deadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Returns score colour (green / amber / red). */
export function scoreColor(score) {
  return score >= 85 ? '#10b981' : score >= 65 ? '#f59e0b' : '#ef4444';
}
