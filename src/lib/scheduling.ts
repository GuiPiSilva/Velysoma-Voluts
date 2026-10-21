export type CalendarEvent = { id?: string; date?: string; time?: string; durationMinutes?: number; name?: string };
export type Availability = { weekdays?: number[]; blockedDates?: string[] };
export const statuses = ["scheduled", "confirmed", "declined", "checked_in"] as const;
export type ShiftStatus = typeof statuses[number];
export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function weekday(date: string) {
  return new Date(date + "T12:00:00Z").getUTCDay();
}
export function minutes(value?: string) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
export function overlaps(a: CalendarEvent, b: CalendarEvent) {
  if (!a.date || !b.date || a.date !== b.date) return false;
  const startA = minutes(a.time), startB = minutes(b.time);
  if (startA === null || startB === null) return true; // Horários ignorados são tratados com prudência.
  const durationA = Number.isFinite(a.durationMinutes) && (a.durationMinutes ?? 0) > 0 ? Math.min(a.durationMinutes!, 1440) : 120;
  const durationB = Number.isFinite(b.durationMinutes) && (b.durationMinutes ?? 0) > 0 ? Math.min(b.durationMinutes!, 1440) : 120;
  return startA < startB + durationB && startB < startA + durationA;
}
export function availabilityFor(event: CalendarEvent, availability?: Availability) {
  if (!event.date || !isValidDate(event.date)) return "unknown" as const;
  if (availability?.blockedDates?.includes(event.date)) return "unavailable" as const;
  if (!availability || !Array.isArray(availability.weekdays)) return "unknown" as const;
  return availability.weekdays.includes(weekday(event.date)) ? "available" as const : "unavailable" as const;
}
export function shiftActive(status?: string) { return status !== "declined" && status !== "cancelled"; }
