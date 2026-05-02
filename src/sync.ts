import { execSync } from "child_process";
import { getAuthClient } from "./oauth.js";
import { fetchCalendars, fetchEvents } from "./google-api.js";
import { readConfig, writeCache, ensureDirs, DEFAULT_SYNC_INTERVAL_MINUTES } from "./cache.js";
import type { CalEvent, EventsCache } from "./types.js";

const ONCE_FLAG = "--once";
const DAYS_PAST = 7;
const DAYS_FUTURE = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const WAYBAR_SIGNAL_CMD = "pkill -RTMIN+11 waybar";

const once = process.argv.includes(ONCE_FLAG);

async function sync(): Promise<void> {
  const config = readConfig();

  if (config.accounts.length === 0) {
    console.error("[sync] No accounts in config. Add accounts to ~/.config/waybar-calendar/config.json");
    return;
  }

  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - DAYS_PAST);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + DAYS_FUTURE);

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

  if (accountMetas.length === 0) {
    console.error("[sync] All accounts failed. Keeping existing cache.");
    throw new Error("All accounts failed");
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
    execSync(WAYBAR_SIGNAL_CMD, { stdio: "ignore" });
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
  const intervalMs = (config.syncIntervalMinutes ?? DEFAULT_SYNC_INTERVAL_MINUTES) * SECONDS_PER_MINUTE * MS_PER_SECOND;

  await sync();
  setInterval(sync, intervalMs);
}

main().catch((err) => {
  console.error("[sync] Fatal:", err);
  process.exit(1);
});
