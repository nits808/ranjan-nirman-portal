/** Parse YYYY-MM-DD as local date (no UTC shift). */
export function parseLocalDate(str) {
  if (!str || typeof str !== 'string') return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function isSameLocalDay(date, dayStr) {
  const t = parseLocalDate(dayStr);
  if (!t || !date) return false;
  return (
    date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
  );
}

/** Today start for comparisons */
export function startOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function isTaskOverdue(dueDateStr, status) {
  if (!dueDateStr || status === 'COMPLETED') return false;
  const due = parseLocalDate(dueDateStr);
  if (!due) return false;
  return due < startOfToday();
}

export function isTaskDueToday(dueDateStr, status) {
  if (!dueDateStr || status === 'COMPLETED') return false;
  return isSameLocalDay(startOfToday(), dueDateStr);
}
