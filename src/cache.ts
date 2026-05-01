import fs from "fs";
import path from "path";
import os from "os";
import type { EventsCache, Config } from "./types.js";

export const CACHE_DIR = path.join(os.homedir(), ".cache", "waybar-calendar");
export const CONFIG_DIR = path.join(os.homedir(), ".config", "waybar-calendar");

const EVENTS_FILE = path.join(CACHE_DIR, "events.json");
const EVENTS_TMP = path.join(CACHE_DIR, "events.json.tmp");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function ensureDirs(): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

export function writeCache(cache: EventsCache): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(EVENTS_TMP, JSON.stringify(cache, null, 2));
  fs.renameSync(EVENTS_TMP, EVENTS_FILE);
}

export function readCache(): EventsCache | null {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8")) as EventsCache;
  } catch {
    return null;
  }
}

export function readConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) as Config;
  } catch {
    return { credentialsPath: "", accounts: [], syncIntervalMinutes: 15 };
  }
}
