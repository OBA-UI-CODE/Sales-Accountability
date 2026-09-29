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

export type ReportPeriod = "day" | "week" | "month";

function toLagosDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00${LAGOS_OFFSET}`);
}

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Returns the selected reporting period and the immediately preceding one. */
export function lagosReportRange(dateStr: string, period: ReportPeriod) {
  const selected = toLagosDate(dateStr);
  let start = selected;
  let end: Date;

  if (period === "week") {
    const mondayOffset = (selected.getUTCDay() + 6) % 7;
    start = new Date(selected.getTime() - mondayOffset * 86_400_000);
    end = new Date(start.getTime() + 7 * 86_400_000);
  } else if (period === "month") {
    const [year, month] = dateStr.split("-").map(Number);
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00${LAGOS_OFFSET}`);
    end = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00${LAGOS_OFFSET}`);
  } else {
    end = new Date(start.getTime() + 86_400_000);
  }

  const duration = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - duration);

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    previousStartISO: previousStart.toISOString(),
    labelStart: dateKey(start),
    labelEnd: dateKey(new Date(end.getTime() - 86_400_000)),
  };
}

export function formatShortDateLagos(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateStr}T12:00:00${LAGOS_OFFSET}`));
}
