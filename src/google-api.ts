import { google, Auth } from "googleapis";
import type { calendar_v3 } from "googleapis";
import type { CalEvent, CalendarMeta } from "./types.js";

export async function fetchCalendars(
  auth: Auth.OAuth2Client,
  accountId: string
): Promise<CalendarMeta[]> {
  const cal = google.calendar({ version: "v3", auth });
  const res = await cal.calendarList.list({ minAccessRole: "reader" });
  return (res.data.items ?? []).map((c) => ({
    id: c.id!,
    summary: c.summary ?? "",
    backgroundColor: c.backgroundColor ?? "#89b4fa",
    accountId,
  }));
}

export async function fetchEvents(
  auth: Auth.OAuth2Client,
  calendarId: string,
  accountId: string,
  color: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalEvent[]> {
  const cal = google.calendar({ version: "v3", auth });
  const res = await cal.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 500,
  } as calendar_v3.Params$Resource$Events$List);

  return ((res.data.items ?? []) as calendar_v3.Schema$Event[])
    .filter((e) => e.status !== "cancelled")
    .map((e) => {
      const allDay = !e.start?.dateTime;
      const conferenceVideoUri = e.conferenceData?.entryPoints
        ?.find((ep: calendar_v3.Schema$EntryPoint) => ep.entryPointType === "video")?.uri;
      const meetingLink = extractMeetingLink(e.hangoutLink, conferenceVideoUri, e.location, e.description);
      return {
        id: e.id!,
        calendarId,
        accountId,
        summary: e.summary ?? "(no title)",
        start: (e.start?.dateTime ?? e.start?.date)!,
        end: (e.end?.dateTime ?? e.end?.date)!,
        allDay,
        color,
        description: e.description ?? undefined,
        meetingLink,
        htmlLink: e.htmlLink ?? "",
      };
    });
}

const URL_RE = /https?:\/\/[^\s"<>]+/;

function extractMeetingLink(
  hangoutLink?: string | null,
  conferenceUri?: string | null,
  location?: string | null,
  description?: string | null
): string | undefined {
  if (hangoutLink) return hangoutLink;
  if (conferenceUri) return conferenceUri;
  if (location) {
    const m = location.match(URL_RE);
    if (m) return m[0];
  }
  if (description) {
    const m = description.match(URL_RE);
    if (m) return m[0];
  }
  return undefined;
}
