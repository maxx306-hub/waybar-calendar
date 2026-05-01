export interface CalEvent {
  id: string;
  calendarId: string;
  accountId: string;
  summary: string;
  start: string;        // ISO 8601; date-only for all-day ("2026-05-01")
  end: string;
  allDay: boolean;
  color: string;        // hex from Google calendar backgroundColor
  description?: string;
  htmlLink: string;
  meetingLink?: string;
}

export interface CalendarMeta {
  id: string;
  summary: string;
  backgroundColor: string;
  accountId: string;
}

export interface EventsCache {
  syncedAt: string;
  accounts: { id: string; email: string }[];
  calendars: CalendarMeta[];
  events: CalEvent[];   // rolling window: today-7d to today+60d
}

export interface AccountConfig {
  id: string;
  email: string;
}

export interface Config {
  credentialsPath: string;
  accounts: AccountConfig[];
  syncIntervalMinutes: number;
}
