import { FORECAST_DAYS } from "./config";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export type BusyBlock = {
  weekday: string;
  start: string;
  end: string;
  label: string;
};

export type PickupTime = {
  weekday: string;
  time: string;
  label: string;
};

export type OfferWindow = {
  firstName: string;
  weekday: string;
  start: string;
  end: string;
  note?: string;
};

export type ForecastSuggestion = {
  weekday: string;
  pickupTime: string;
  pickupLabel: string;
  busyLabel: string;
  helperName: string | null;
  summary: string;
};

export function parseMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function validTimeRange(start: string, end: string): boolean {
  const from = parseMinutes(start);
  const to = parseMinutes(end);
  return from !== null && to !== null && from < to;
}

export function timeRangeCovers(start: string, end: string, time: string): boolean {
  const from = parseMinutes(start);
  const to = parseMinutes(end);
  const at = parseMinutes(time);
  if (from === null || to === null || at === null || from > to) return false;
  return from <= at && at <= to;
}

export function formatCompactTime(value: string): string {
  const total = parseMinutes(value);
  if (total === null) return value;
  const minutes = total % 60;
  let hours = Math.floor(total / 60) % 12;
  if (hours === 0) hours = 12;
  return minutes === 0 ? `${hours}` : `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatClock(value: string): string {
  const total = parseMinutes(value);
  if (total === null) return value;
  const minutes = total % 60;
  const rawHour = Math.floor(total / 60);
  const suffix = rawHour >= 12 ? "PM" : "AM";
  let hours = rawHour % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function weekdayLabel(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function upcomingWeekdays(now: Date, days: number): Set<string> {
  const found = new Set<string>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    found.add(WEEKDAYS[date.getDay()]);
  }
  return found;
}

export function forecastConflicts(input: {
  busy: BusyBlock[];
  pickups: PickupTime[];
  offers: OfferWindow[];
  now: Date;
  days?: number;
}): ForecastSuggestion[] {
  const windowDays = input.days ?? FORECAST_DAYS;
  const upcoming = upcomingWeekdays(input.now, windowDays);
  const suggestions: ForecastSuggestion[] = [];

  for (const pickup of input.pickups) {
    const day = pickup.weekday.toLowerCase();
    if (!upcoming.has(day)) continue;
    const clash = input.busy.find(
      (block) => block.weekday.toLowerCase() === day && timeRangeCovers(block.start, block.end, pickup.time)
    );
    if (!clash) continue;
    const offer = input.offers.find(
      (item) => item.weekday.toLowerCase() === day && timeRangeCovers(item.start, item.end, pickup.time)
    );
    const dayLabel = weekdayLabel(day);
    const clock = formatCompactTime(pickup.time);
    const summary = offer
      ? `${dayLabel} ${clock} conflict. ${offer.firstName} offered ${dayLabel} ${formatCompactTime(offer.start)} to ${formatCompactTime(offer.end)}.`
      : `${dayLabel} ${clock} conflict.`;
    suggestions.push({
      weekday: day,
      pickupTime: pickup.time,
      pickupLabel: pickup.label,
      busyLabel: clash.label,
      helperName: offer?.firstName ?? null,
      summary,
    });
  }

  return suggestions;
}
