export const resources = ["ministries", "people", "events", "assignments"] as const;
export type Resource = (typeof resources)[number];
export const resourceNames: Record<Resource, string> = {
  ministries: "Ministérios",
  people: "Pessoas",
  events: "Programações",
  assignments: "Escalas"
};
export type Entry = {
  id: string; name?: string; ministryId?: string; date?: string; time?: string;
  eventId?: string; personId?: string; email?: string; phone?: string;
  durationMinutes?: number; status?: string; checkInAt?: string;
};
export const isResource = (value: string): value is Resource => resources.some(item => item === value);
