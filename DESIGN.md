# Design

## Principles

Terminal-style. Monospace. Transparent background. No rounded corners. No glow. No shadows. Minimal chrome. Every pixel earns its place.

## Layout

```
┌─────────────────────────────────────────────────────────────┐  ← 1px --border
│                                                             │
│  JANUARY 2026              ‹ › ║  upcoming                  │
│  ──────────────────────────── ║                             │
│  mo  tu  we  th  fr  sa  su  ║  ›  ●  Sprint planning  09:00│
│   -   -   1   2   3   4   5  ║  ›  ●  Code review     15:00│
│   6   7   8   9  10  11  12  ║  ›  ●  Conference      14:00│
│  13  14 [15] 16  17  18  19  ║  ›  ●  Yoga            08:00│
│  20  21  22  23  24  25  26  ║                             │
│  27  28  29  30  31          ║  ── detail ──────────────── │
│                              ║  ●  Sprint planning         │
│  ⇄ month  ⇅ year  ↵ reset   ║     09:00 · Kick off sprint  │
│                              ║     ↗ open link             │
└─────────────────────────────────────────────────────────────┘
   300px                           320px
```

**Total width**: 620px  
**Left panel**: 300px fixed — calendar grid  
**Divider**: 1px `--border` vertical line  
**Right panel**: 320px — events list + detail card  
**No padding on outer container** — panels handle their own padding (20px 16px)

## Colors

Loaded from `~/.config/omarchy/current/theme/colors.toml` **on every popup open** (same as waybar-ycal) so theme switches take effect immediately without restart. No hardcoded values except transparent and fallbacks.

**Fallbacks** (used when key missing from colors.toml):
```
foreground → #cdd6f4
background → #1e1e2e
accent     → #89b4fa
color0     → #45475a
color8     → #585b70
color1     → #f38ba8
color2     → #a6e3a1
color3     → #f9e2af
color4     → #89b4fa
color5     → #f5c2e7
color6     → #94e2d5
color13    → #cba6f7
```

| Variable | Source key | Role |
|----------|-----------|------|
| `--bg` | transparent | Widget fill |
| `--border` | `color0` | Border, dividers, separators |
| `--muted` | `color0` | Day-of-week labels, hint text |
| `--dim` | `color8` | Times, nav arrows, `›` prefix |
| `--text` | `foreground` | Day numbers, event titles |
| `--bright` | `foreground` | Month/year label, selected event |
| `--accent` | `accent` | Today bg, hover color |
| `--accent-fg` | `background` | Text on today cell |
| `--red` | `color1` | Calendar color slot |
| `--green` | `color2` | Calendar color slot |
| `--yellow` | `color3` | Calendar color slot |
| `--blue` | `color4` | Calendar color slot |
| `--pink` | `color5` | Calendar color slot |
| `--cyan` | `color6` | Calendar color slot |

Google Calendar's `backgroundColor` for each calendar maps to the nearest slot color. Fallback: `--dim`.

## Typography

Font: **JetBrains Mono** throughout  
No system-ui fallback — if font missing, widget shows broken but that's fine on this system.

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Month label | 11px | 600 | `--bright` |
| Day-of-week headers | 9px | 400 | `--muted` |
| Day numbers | 11px | 400 | `--text` |
| Day number (today) | 11px | 600 | `--accent-fg` |
| Event title | 10.5px | 400 | `--text` |
| Event time / date | 9.5px | 400 | `--dim` |
| Events section header | 11px | 600 | `--bright` |
| Detail title | 10.5px | 600 | `--bright` |
| Detail body | 9.5px | 400 | `--dim` |
| Nav hints | 9px | 400 | `--muted` |
| `›` prefix | 10px | 400 | `--dim` (active: `--accent`) |

Letter spacing: 0.08–0.12em on uppercase labels. Normal elsewhere.

## Components

### Calendar Grid

- 7 columns, rows = ceil((offset + days) / 7) — typically 5 or 6
- Header row: `mo tu we th fr sa su` (week starts Monday)
- Each day cell: day number + optional dot strip below
- **Today**: `--accent` background fill, `--accent-fg` text, no border-radius
- **Selected** (not today): `--accent` color text, underline offset 3px
- **Other month**: `--border` color (nearly invisible)
- **Has events**: cursor pointer, hover brightens day number to `--accent`
- **Event dots**: max 3 dots per day, 3×3px circles, gap 2px, colors from calendar

### Month Navigation

- `‹` / `›` buttons top-right of left panel
- `background: none; border: none`
- Color: `--dim` default → `--accent` on hover
- Font: inherit (monospace), 11px

### ASCII Separator

- Single `─` character repeated to fill width (~36 chars)
- 9px, `--border` color
- Between header and grid

### Event Row

```
› ● Event title here         09:00
```

- `›` prefix: 10px, `--dim`, transitions to `--accent` on hover/active
- `●` dot: 4×4px circle, `border-radius: 50%`, color = calendar color
- Title: flex-1, truncated with ellipsis
- Time: shrink-0, right-aligned, `--dim`
- Row padding: 5px 6px
- No background on hover (stays transparent)
- Active row: `›` becomes `--accent`

### Detail Card

Appears below event list when row clicked. Click again to dismiss.

```
── detail ───────────────────
● Event Title
  09:00 · Description text here
  ↗ open link
```

- Top border: 1px `--border`
- `::before` pseudo with ASCII `── detail ──...` in `--border` color, 8px
- Dot: 5×5px, calendar color
- Title: `--bright`, 10.5px, 600
- Body: `--dim`, 9.5px, line-height 1.6, indented 13px
- Link: `--accent`, 9px, underline, opens in browser

### Nav Hints Strip

Bottom of left panel, above nothing — last element before panel end.

```
⇄ month   ⇅ year   ↵ reset
```

- Border-top: 1px `--border`
- Padding-top: 8px
- Gap between hints: 12px
- Key icon: `--dim`, 10px
- Label: `--muted`, 9px, 0.03em letter-spacing

## Interactions

| Action | Result |
|--------|--------|
| Click day (no events) | nothing |
| Click day (has events) | right panel shows that day's events; header = `wed 15 may` |
| Click event row | detail card expands below list |
| Click active event row | detail card collapses |
| Click `‹` / `›` | prev/next month; resets selection |
| `←` / `→` keys | prev/next month |
| `↑` / `↓` keys | prev/next year |
| `Esc` or `Enter` | jump to current month, reset selection |
| Click outside popup | popup closes (SIGUSR1 to self) |
| `Escape` key | popup closes |

Right panel default state (no day selected): shows next 4 upcoming events with date label instead of time.

## Window

- **Layer**: TOP
- **Anchor**: TOP only (no LEFT/RIGHT → horizontally centered)
- **Margin top**: 34px (bar height)
- **No exclusive zone**
- **Keyboard mode**: ON_DEMAND (grab keyboard when visible)
- **Background**: transparent (GTK window alpha)
- **No decorations**: `set_decorated(false)`

## File: `popup/style.css.template`

CSS is generated at runtime from this template. All color values are `{{VAR}}` tokens replaced with hex from `colors.toml`.

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

window {
  background: transparent;
  font-family: 'JetBrains Mono', monospace;
  color: {{text}};
}

.widget {
  background: {{bg}};
  border: 1px solid {{border}};
  /* no border-radius */
}

.cal-panel {
  min-width: 300px;
  max-width: 300px;
  padding: 20px 16px 14px;
  border-right: 1px solid {{border}};
}

.cal-month {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: {{bright}};
}

.nav-btn {
  background: none;
  border: none;
  color: {{dim}};
  font-size: 11px;
  font-family: inherit;
  min-width: 22px;
  min-height: 22px;
}
.nav-btn:hover { color: {{accent}}; }

.sep {
  font-size: 9px;
  color: {{border}};
  line-height: 1;
}

.day-label {
  font-size: 9px;
  color: {{muted}};
  letter-spacing: 0.06em;
}

.day-num {
  font-size: 11px;
  color: {{text}};
  min-width: 26px;
  min-height: 22px;
}

.day-cell.other-month .day-num { color: {{border}}; }

.day-cell.today .day-num {
  background: {{accent}};
  color: {{accent_fg}};
  font-weight: 600;
}

.day-cell.selected:not(.today) .day-num {
  color: {{accent}};
  text-decoration: underline;
}

.day-cell.has-events:hover .day-num { color: {{accent}}; }

.nav-hints { border-top: 1px solid {{border}}; padding-top: 8px; }
.hint { font-size: 9px; color: {{muted}}; }
.hint-key { font-size: 10px; color: {{dim}}; }

/* ── Right panel ── */
.events-panel { padding: 20px 14px 14px; }

.events-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: {{bright}};
}

.event-row { padding: 5px 6px; }

.event-prefix {
  font-size: 10px;
  color: {{dim}};
}
.event-row:hover .event-prefix,
.event-row.active .event-prefix { color: {{accent}}; }

.event-title { font-size: 10.5px; color: {{text}}; }
.event-time  { font-size: 9.5px;  color: {{dim}};  }

/* .event-dot background set programmatically */

.detail-card { border-top: 1px solid {{border}}; padding: 10px 12px; }
.detail-label { font-size: 8px; color: {{border}}; }
.detail-name  { font-size: 10.5px; font-weight: 600; color: {{bright}}; }
.detail-body  { font-size: 9.5px;  color: {{dim}};   line-height: 1.6; }
.detail-link  { font-size: 9px; color: {{accent}}; text-decoration: underline; }

.no-events { font-size: 10px; color: {{muted}}; }
```
