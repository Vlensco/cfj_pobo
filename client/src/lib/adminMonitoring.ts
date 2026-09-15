export type DatePreset = "last7" | "last30" | "month";
function toInputDate(date: Date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
export function getDatePreset(preset: DatePreset, now = new Date()) { const end = new Date(now); const start = new Date(now); if (preset === "last7") start.setDate(start.getDate() - 6); else if (preset === "last30") start.setDate(start.getDate() - 29); else start.setDate(1); return { startDate: toInputDate(start), endDate: toInputDate(end) }; }
export function formatTrendLabel(day: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(new Date(`${day}T12:00:00`)); }
