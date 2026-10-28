import sourceEvents from "./events.json";

export interface HistEvent {
  id: string;
  t: string;
  y: number; // first year, used to order answer choices
  date: string; // complete source date, including ranges and multiple years
  note?: string;
}

export const EVENTS: HistEvent[] = sourceEvents.map((event) => ({
  id: event.id,
  t: event.title,
  y: event.yearSort,
  date: event.dateText,
  note: event.note,
}));

export function shiftDate(date: string, years: number): string {
  return date.replace(/\d+/g, (year) => String(Number(year) + years));
}
