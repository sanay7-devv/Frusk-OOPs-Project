/** "5d 16h", "3h 12m" or "40m" for a span in milliseconds. */
export function formatSpan(ms: number): string {
  const m = Math.floor(Math.abs(ms) / 60000);
  if (m >= 1440) return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}
