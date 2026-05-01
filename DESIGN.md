# Design

## Principles

Terminal-style. Monospace. Transparent background. No rounded corners. No glow. No shadows. Minimal chrome. Every pixel earns its place.

## Layout

```
┌─────────────────────────────────────────────────────────────────┐  ← 1px border
│                                 ║                               │
│  january ▾  2026 ▾              ║  upcoming                     │
│  ────────────────────────────── ║                               │
│  mo  tu  we  th  fr  sa  su     ║  ›  ●  Sprint       09:00     │
│   -   -   1   2   3   4   5     ║  ›  ●  Code review  15:00     │
│   6   7   8   9  10  11  12     ║  ›  ●  Conference   14:00     │
│  13  14 [15] 16  17  18  19     ║  ›  ●  Yoga         08:00     │
│  20  21  22  23  24  25  26     ║                               │
│  27  28  29  30  31             ║  ── detail ──  you@gmail.com  │
│                                 ║  ●  Sprint planning           │
│  ⇄ month  ⇅ year  ↵ reset       ║     09:00 · Kick off sprint   │ 
│                                 ║     ↗ calendar ↗ join meeting │
└─────────────────────────────────────────────────────────────────┘
   320px                             400px
```

**Total width**: 720px  
**Left panel**: 320px — calendar grid  
**Divider**: 1px border vertical line  
**Right panel**: 400px — events list + detail card

## Colors

Loaded from `~/.config/omarchy/current/theme/colors.toml` on every popup open. No hardcoded palette — UI chrome derived from `foreground` at different opacities so it works on any theme.

| Variable | Derivation | Role |
|----------|-----------|------|
| `bg` | `background` at 0.98 opacity | Widget fill |
| `border` | `foreground` at 0.12 opacity | Border, dividers, separators |
| `muted` | `foreground` at 0.25 opacity | Day-of-week labels, hint text |
| `dim` | `foreground` at 0.45 opacity | Times, nav arrows, `›` prefix |
| `text` | `foreground` at 0.85 opacity | Day numbers, event titles |
| `bright` | `foreground` at 1.0 | Month/year label, selected event |
| `accent` | `accent` from theme | Today bg, hover color, active state |
| `accent_fg` | `background` | Text on today cell |

Event dot colors come directly from Google Calendar's `backgroundColor` per calendar.

## Typography

Font: **JetBrains Mono** throughout.

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Month / year dropdowns | 14px | 600 | `bright` |
| Day-of-week headers | 11px | 400 | `muted` |
| Day numbers | 13px | 400 | `text` |
| Day number — today | 13px | 600 | `accent_fg` on `accent` bg |
| Day number — selected | 13px | 400 | `accent`, 1px `accent` border |
| Event title | 13px | 400 | `text` |
| Event time / date label | 12px | 400 | `dim` |
| Events section header | 14px | 600 | `bright` |
| Detail event name | 13px | 600 | `bright` |
| Detail body | 12px | 400 | `dim` |
| Detail account | 10px | 400 | `border` |
| Nav hints | 11px | 400 | `muted` |
| `›` prefix | 12px | 400 | `dim` → `accent` on active |

## Components

### Calendar Grid

- 7 columns, always 6 rows (42 cells fixed — no height jump between months)
- Header row: `mo tu we th fr sa su` (week starts Monday)
- Each cell: day number button + optional dot strip below (max 3 dots, 3×3px, gap 2px)
- **Today**: `accent` background, `accent_fg` text
- **Selected** (not today): `accent` text + 1px `accent` border
- **Other month**: `border` color (nearly invisible)
- **Has events**: colored dots appear below the day number
- Cell height: 36px fixed

### Month / Year Navigation

- Two text-style dropdowns in the header: `january ▾` and `2026 ▾`
- Click opens a list picker for the respective field
- Color: `bright` default → `accent` on hover
- Keyboard: `←`/`→` = prev/next month, `↑`/`↓` = prev/next year, `↵` = reset to today

### ASCII Separator

- `─` repeated 34 times, 11px, `border` color
- Between header row and day-of-week labels

### Event Row

```
› ● Event title here              09:00
```

- `›` prefix: `dim` → `accent` on hover/active
- Dot: 4×4px circle, calendar color
- Title: expands, truncated with ellipsis
- Time (day view) or date label (upcoming view): right-aligned, `dim`
- No background on hover

### Detail Card

Appears below event list when row is clicked. Click same row to dismiss.

```
── detail ──────────────  you@gmail.com
● Event Title
  09:00 · Description text, wraps at panel width
  ↗ calendar   ↗ join meeting
```

- Top border: 1px `border`
- Header row: `── detail ──` on left (hexpand), account email on right — same `detail-label` style
- Dot: 5×5px, calendar color
- Name: `bright`, 13px, 600
- Body: `dim`, 12px, wraps (does not expand panel width)
- Links: `accent`, underlined, open in browser and close popup

### Nav Hints Strip

Bottom of left panel.

```
⇄ month   ⇅ year   ↵ reset
```

- Top border: 1px `border`, padding-top 8px
- Key icon: `dim`, 12px
- Label: `muted`, 11px

## Interactions

| Action | Result |
|--------|--------|
| Click day | right panel shows that day's events |
| Click event row | detail card expands |
| Click active event row | detail card collapses |
| Click `‹` / `›` | prev/next month, resets day selection |
| Click month dropdown | month picker opens |
| Click year dropdown | year picker opens |
| `←` / `→` | prev/next month |
| `↑` / `↓` | prev/next year |
| `↵` | jump to current month, reset selection |
| `Escape` | close popup |
| Click ↗ link | open in browser, close popup |

Right panel default: shows next 4 upcoming events with date label instead of time.
