import { execSync } from "child_process";
import { getAuthClient } from "./oauth.js";
import { fetchCalendars, fetchEvents } from "./google-api.js";
import { readConfig, writeCache, ensureDirs } from "./cache.js";
import type { CalEvent, EventsCache } from "./types.js";

const once = process.argv.includes("--once");

async function sync(): Promise<void> {
  const config = readConfig();

  if (config.accounts.length === 0) {
    console.error("[sync] No accounts in config. Add accounts to ~/.config/waybar-calendar/config.json");
    return;
  }

  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 60);

  const allEvents: CalEvent[] = [];
  const allCalendars: EventsCache["calendars"] = [];
  const accountMetas: EventsCache["accounts"] = [];

  for (const account of config.accounts) {
    try {
      console.error(`[sync] Fetching account: ${account.id} (${account.email})`);
      const auth = await getAuthClient(account, config.credentialsPath);
      const calendars = await fetchCalendars(auth, account.id);
      allCalendars.push(...calendars);
      accountMetas.push({ id: account.id, email: account.email });

      for (const cal of calendars) {
        const events = await fetchEvents(auth, cal.id, account.id, cal.backgroundColor, timeMin, timeMax);
        allEvents.push(...events);
      }
    } catch (err) {
      console.error(`[sync] Error fetching account ${account.id}:`, err);
    }
  }

  const cache: EventsCache = {
    syncedAt: new Date().toISOString(),
    accounts: accountMetas,
    calendars: allCalendars,
    events: allEvents,
  };

  writeCache(cache);
  console.error(`[sync] Done. ${allEvents.length} events from ${accountMetas.length} accounts.`);

  try {
    execSync("pkill -RTMIN+11 waybar", { stdio: "ignore" });
  } catch {
    // waybar may not be running
  }
}

async function main(): Promise<void> {
  ensureDirs();

  if (once) {
    await sync();
    return;
  }

  const config = readConfig();
  const intervalMs = (config.syncIntervalMinutes ?? 15) * 60 * 1000;

  await sync();
  setInterval(sync, intervalMs);
}

main().catch((err) => {
  console.error("[sync] Fatal:", err);
  process.exit(1);
});
