# waybar-calendar

A Waybar calendar popup widget with Google Calendar integration. Triggered by clicking the clock. Follows the omarchy theme dynamically.

## Architecture

```
custom/clock (on-click)
        │
        ▼
   toggle.sh  ──SIGUSR1──▶  popup (gjs -m popup/main.js)
                                   │ reads
                                   ▼
              sync daemon  ──writes──▶  ~/.cache/waybar-calendar/events.json
         (node dist/sync.js)              (atomic rename)
```

- **Popup trigger**: click on existing `custom/clock` → runs `toggle.sh`
- **Data pipeline**: systemd user service runs `sync.js` every 15 min, caches events
- **No new waybar bar module** — only `custom/clock` gets `on-click` added
- **Popup tech**: GJS (GNOME JavaScript) + GTK4 + gtk4-layer-shell

## File Structure

```
waybar-calendar/
├── package.json                  # deps: googleapis, typescript, @types/node
├── tsconfig.json                 # target ES2022, module Node16, outDir ./dist
├── src/
│   ├── types.ts                  # shared interfaces
│   ├── cache.ts                  # atomic read/write ~/.cache/waybar-calendar/
│   ├── oauth.ts                  # per-account OAuth2 flow + token persistence
│   ├── google-api.ts             # googleapis wrappers (calendarList, events.list)
│   └── sync.ts                   # daemon: fetch all accounts → write cache
├── popup/
│   ├── main.js                   # GJS entry: init app, read cache, SIGUSR1 toggle
│   ├── window.js                 # CalendarWindow: layer-shell setup, layout
│   ├── calendar-grid.js          # Gtk.Grid 7×7 month view, colored event dots
│   ├── events-panel.js           # Gtk.ListBox events list, detail card
│   ├── theme.js                  # parse colors.toml → CSS var map
│   └── style.css.template        # CSS template with {{VAR}} placeholders
└── scripts/
    ├── toggle.sh                 # PID-based toggle: SIGUSR1 or start popup
    └── install.sh                # build, create dirs, enable systemd service
```

## Design

Terminal aesthetic — transparent background, no rounded corners, JetBrains Mono, ASCII decorators.

```
┌─────────────────────────────────────────────────────────┐
│ JANUARY 2026          ‹ ›  │  upcoming                  │
│ ────────────────────────── │                            │
│ mo tu we th fr  sa su      │  › ● Sprint planning 09:00 │
│  -  -  1  2  3   4  5      │  › ● Code review    15:00  │
│  6  7  8  9 10  11 12      │  › ● Conference     14:00  │
│ 13 14[15]16 17  18 19      │  › ● Yoga           08:00  │
│ 20 21 22 23 24  25 26      │                            │
│ 27 28 29 30 31             │  ── detail ────────────    │
│                            │  ● Sprint planning         │
│ ⇄ month  ⇅ year  ↵ reset   │  09:00 · Kick off sprint   │
│                            │  ↗ open link               │
└─────────────────────────────────────────────────────────┘
  300px fixed                  320px flex
```

- Left (300px): calendar grid Mon-start, today = accent bg, selected = underline, 3px colored event dots
- Right (320px): "upcoming" / date title, event rows `›` + colored dot + title + time, inline detail card on click
- Bottom of left: nav hints strip `⇄ month · ⇅ year · ↵ reset`

## Dynamic Theming

Reads `~/.config/omarchy/current/theme/colors.toml` **on every popup open** (not just startup) — theme switches take effect without restart. Same pattern as waybar-ycal.

| CSS var | Source in colors.toml |
|---------|----------------------|
| `--bg` | transparent |
| `--border` | `color0` |
| `--muted` | `color0` |
| `--dim` | `color8` |
| `--text` | `foreground` |
| `--bright` | `foreground` |
| `--accent` | `accent` |
| `--red` | `color1` |
| `--purple` | `color5` |
| `--blue` | `color4` |
| `--pink` | `color13` |
| `--amber` | `color3` |

## Waybar Config Change

Add `on-click` to existing `custom/clock` in `~/.config/waybar/config.jsonc`:
```jsonc
"custom/clock": {
  "exec": "date '+%B %-d, %A, %H:%M'",
  "interval": 10,
  "tooltip": false,
  "on-click": "$HOME/Projects/waybar-calendar/scripts/toggle.sh",
  "on-click-right": "omarchy-launch-floating-terminal-with-presentation omarchy-tz-select"
}
```

## Layer Shell Positioning

Top-center, below bar (34px offset):
```javascript
Gtk4LayerShell.set_anchor(this, Gtk4LayerShell.Edge.TOP, true);
Gtk4LayerShell.set_margin(this, Gtk4LayerShell.Edge.TOP, 34);
// no LEFT/RIGHT anchor → horizontally centered
```

## Key Types

```typescript
interface CalEvent {
  id: string; calendarId: string; accountId: string;
  summary: string; start: string; end: string;
  allDay: boolean; color: string;  // hex from Google calendar backgroundColor
  description?: string; htmlLink: string;
}

interface EventsCache {
  syncedAt: string;
  accounts: { id: string; email: string }[];
  calendars: { id: string; summary: string; backgroundColor: string; accountId: string }[];
  events: CalEvent[];  // rolling window: today-7d to today+60d
}

interface Config {
  accounts: Array<{ id: string; email: string; credentialsPath: string }>;
  syncIntervalMinutes: number;
}
```

## Multi-Account Config

`~/.config/waybar-calendar/config.json`:
```json
{
  "accounts": [
    { "id": "personal", "email": "user@gmail.com", "credentialsPath": "~/.config/waybar-calendar/credentials-personal.json" }
  ],
  "syncIntervalMinutes": 15
}
```

## Systemd Service

`~/.config/systemd/user/waybar-calendar-sync.service`:
```ini
[Unit]
Description=Waybar Calendar Sync
After=network-online.target

[Service]
ExecStart=/usr/bin/node %h/Projects/waybar-calendar/dist/sync.js
Restart=on-failure

[Install]
WantedBy=default.target
```

## Implementation Order

1. `src/types.ts`
2. `src/cache.ts`
3. `src/oauth.ts`
4. `src/google-api.ts`
5. `src/sync.ts` — test: `node dist/sync.js --once`
6. `popup/theme.js`
7. `popup/style.css.template`
8. `popup/calendar-grid.js`
9. `popup/events-panel.js`
10. `popup/window.js`
11. `popup/main.js`
12. `scripts/toggle.sh` + `scripts/install.sh`
13. Waybar: add `on-click` to `custom/clock`

## Verification

- `node dist/sync.js --once` → inspect `~/.cache/waybar-calendar/events.json`
- `gjs -m popup/main.js` → popup appears centered below bar
- Click clock → popup toggles
- Month nav + keyboard arrows work
- Event dots on days with events; click day → event list updates
- Click event → detail card with link
- Change theme → reopen popup → colors update
