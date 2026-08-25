// The shop is in Nigeria (Africa/Lagos, fixed UTC+1, no DST), so "today"
// and date-picker boundaries are computed in that timezone rather than the
// server's local time — otherwise a sale logged at 11pm Lagos time could
// land in "tomorrow" on a UTC server.

const LAGOS_OFFSET = "+01:00";

/** Returns the current date as YYYY-MM-DD in Africa/Lagos. */
export function lagosToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Given a YYYY-MM-DD date (interpreted as an Africa/Lagos calendar date),
 * returns the UTC ISO instants bounding that day: [startISO, endISO).
 */
export function lagosDayRange(dateStr: string): {
  startISO: string;
  endISO: string;
} {
  const start = new Date(`${dateStr}T00:00:00${LAGOS_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export function formatTimeLagos(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatDateLagos(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateStr}T12:00:00${LAGOS_OFFSET}`));
}
