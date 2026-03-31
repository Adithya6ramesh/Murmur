/** Monday-first calendar cells (6 rows × 7 cols = 42 max). */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const firstDow = first.getDay();
  const offsetMon = (firstDow + 6) % 7;

  const cells = [];
  const prevMonthLast = new Date(year, month, 0);
  const dimPrev = prevMonthLast.getDate();

  for (let i = offsetMon - 1; i >= 0; i--) {
    const day = dimPrev - i;
    cells.push({
      key: `p-${day}`,
      day,
      isOtherMonth: true,
      isToday: false,
      dateKey: null,
      year: null,
      month: null,
    });
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
    const dateKey = new Date(year, month, d).toDateString();
    cells.push({
      key: `c-${dateKey}`,
      day: d,
      isOtherMonth: false,
      isToday,
      dateKey,
      year,
      month,
    });
  }

  const rem = Math.max(0, 42 - cells.length);
  for (let d = 1; d <= rem; d++) {
    cells.push({
      key: `n-${d}`,
      day: d,
      isOtherMonth: true,
      isToday: false,
      dateKey: null,
      year: null,
      month: null,
    });
  }

  return cells;
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
