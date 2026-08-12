// Facebook's in-app browser re-opens the site under its own fbclid-only URL,
// dropping the ?date= that event links carry. Remember the last event date seen so
// a re-entry without the param lands on the same night instead of silently falling
// back to today — that silent fallback once produced a real booking for the wrong
// night that the admin had to delete and redo by hand.
const KEY = 'jongtao_event_date';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function rememberEventDate(date) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date, seenAt: Date.now() }));
  } catch { /* storage unavailable — nothing to remember into */ }
}

// `todayStr` is the caller's local YYYY-MM-DD; a remembered night that has already
// passed must not resurface.
export function recallEventDate(todayStr) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { date, seenAt } = JSON.parse(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
    if (Date.now() - (seenAt || 0) > MAX_AGE_MS) return null;
    if (todayStr && date < todayStr) return null;
    return date;
  } catch {
    return null;
  }
}
