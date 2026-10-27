import sourceEvents from "./events.json";

export interface HistEvent {
  t: string;
  y: number; // first year, used to order answer choices
  date: string; // complete source date, including ranges and multiple years
}

export const EVENTS: HistEvent[] = sourceEvents.map((event) => ({
  t: event.title,
  y: event.yearSort,
  date: event.dateText,
}));

export function shiftDate(date: string, years: number): string {
  return date.replace(/\d+/g, (year) => String(Number(year) + years));
}
