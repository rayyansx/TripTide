import type { Trip } from '@trek/shared';

const MS_PER_DAY = 86400000;

export type TripFilter = 'planned' | 'archive' | 'completed';
export type TripStatus = 'ongoing' | 'today' | 'tomorrow' | 'future' | 'past' | null;

export function localIsoToday(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

export function getTripStatus(trip: Trip): TripStatus {
  const today = localIsoToday();
  if (trip.start_date && trip.end_date && trip.start_date <= today && trip.end_date >= today) return 'ongoing';
  const until = daysUntil(trip.start_date);
  if (until === null) return null;
  if (until === 0) return 'today';
  if (until === 1) return 'tomorrow';
  if (until > 1) return 'future';
  return 'past';
}

export function splitDashboard(trips: Trip[], filter: TripFilter): { spotlight: Trip | null; grid: Trip[] } {
  const active = trips.filter((trip) => !trip.is_archived);
  const archived = trips.filter((trip) => trip.is_archived);
  const today = localIsoToday();
  const featured =
    active.find((trip) => trip.start_date && trip.end_date && trip.start_date <= today && trip.end_date >= today) ||
    active.find((trip) => trip.start_date && trip.start_date >= today) ||
    null;
  const spotlight = featured || active[0] || null;
  const rest = featured ? active.filter((trip) => trip.id !== featured.id) : active;
  const grid =
    filter === 'archive'
      ? archived
      : filter === 'completed'
        ? rest.filter((trip) => getTripStatus(trip) === 'past')
        : rest.filter((trip) => getTripStatus(trip) !== 'past');
  return { spotlight, grid };
}

export function shortDate(dateStr: string | null | undefined, locale: string): string | null {
  if (!dateStr) return null;
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  if (date.getUTCFullYear() !== new Date().getUTCFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString(locale, opts);
}

export function dayChipLabel(dateStr: string | null | undefined, fallback: string, locale: string): string {
  if (!dateStr) return fallback;
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  return `${weekday} ${date.getDate()}`;
}
