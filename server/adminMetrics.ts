export type DateWindow = { startDate: string; endDate: string; label: string };
function parseDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Date(Date.UTC(year, month - 1, day)); }
function formatDate(value: Date) { return value.toISOString().slice(0, 10); }
export function getComparisonWindows(startDate: string, endDate: string): { current: DateWindow; previous: DateWindow } {
  const start = parseDate(startDate); const end = parseDate(endDate); const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1); const previousEnd = new Date(start); previousEnd.setUTCDate(previousEnd.getUTCDate() - 1); const previousStart = new Date(previousEnd); previousStart.setUTCDate(previousStart.getUTCDate() - dayCount + 1);
  return { current: { startDate, endDate, label: `${dayCount} days` }, previous: { startDate: formatDate(previousStart), endDate: formatDate(previousEnd), label: `previous ${dayCount} days` } };
}
export function calculatePercentChange(current: number, previous: number): number | null { if (previous === 0) return current === 0 ? 0 : null; return Math.round(((current - previous) / previous) * 100); }
