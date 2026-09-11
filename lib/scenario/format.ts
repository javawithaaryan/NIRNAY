const locale = "en-IN";

export function formatClock(value: number): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export function formatStamp(value: number): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatDuration(minutes: number): string {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (hours === 0) return `${rest} min`;
  return `${hours} h ${String(rest).padStart(2, "0")} min`;
}

export function formatAge(fromMs: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - fromMs) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function formatHoursUntil(target: number, now: number): string {
  const hours = (target - now) / 3_600_000;
  if (hours < 0) return `${Math.abs(hours).toFixed(1)} h overdue`;
  return `${hours.toFixed(1)} h remaining`;
}

export function formatScore(value: number): string {
  return value.toFixed(2);
}

export function formatCoordinates(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
}
