export function formatRelativeTime(timestamp: string): string {
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return "recently";
  const diffHours = Math.max(0, (Date.now() - value) / 3_600_000);
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  const days = Math.floor(diffHours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function formatIsoRelative(timestamp?: string | null): string {
  if (!timestamp) return "recently";
  return formatRelativeTime(timestamp);
}

export function formatTimeSignal(lastRefreshedAt?: string | null, createdAt?: string | null, lastTouched?: string | null): string {
  if (lastTouched) return `Last touched ${formatRelativeTime(lastTouched)}`;
  if (lastRefreshedAt) return `Last touched ${formatRelativeTime(lastRefreshedAt)}`;
  if (createdAt) return `Saved ${formatRelativeTime(createdAt)}`;
  return "Saved recently";
}

export function formatSessionDuration(session: { startedAt: string; endedAt: string | null; state: string } | null): string {
  if (!session) return "00:00";
  const start = new Date(session.startedAt).getTime();
  if (!Number.isFinite(start)) return "00:00";
  const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  if (!Number.isFinite(end)) return "00:00";
  const elapsed = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const timeWindowOptions = ["2h", "4h", "6h", "8h", "24h", "custom"] as const;
export const timeWindowLabels: Record<(typeof timeWindowOptions)[number], string> = {
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "8h": "8h",
  "24h": "24h",
  custom: "Custom"
};
export const timeWindowDurations: Record<Exclude<(typeof timeWindowOptions)[number], "custom">, number> = {
  "2h": 120,
  "4h": 240,
  "6h": 360,
  "8h": 480,
  "24h": 1440
};
