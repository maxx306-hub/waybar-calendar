import GLib from "gi://GLib";

const DEFAULTS = {
  foreground: "#cdd6f4",
  background: "#1e1e2e",
  accent: "#89b4fa",
  color1: "#f38ba8",
  color2: "#a6e3a1",
  color3: "#f9e2af",
  color4: "#89b4fa",
  color5: "#f5c2e7",
  color6: "#94e2d5",
  color13: "#cba6f7",
};

export function loadTheme() {
  const path = GLib.get_home_dir() + "/.config/omarchy/current/theme/colors.toml";
  const [ok, bytes] = GLib.file_get_contents(path);

  const c = { ...DEFAULTS };
  if (ok) {
    const text = new TextDecoder().decode(bytes);
    for (const line of text.split("\n")) {
      const m = line.match(/^(\w+)\s*=\s*"(#[0-9a-fA-F]{6})"/);
      if (m) c[m[1]] = m[2];
    }
  }

  // border/muted/dim derived from foreground opacity — works on any theme
  return {
    bg:         hexToRgba(c.background, 0.98),
    border:     hexToRgba(c.foreground, 0.12),
    muted:      hexToRgba(c.foreground, 0.25),
    dim:        hexToRgba(c.foreground, 0.45),
    text:       hexToRgba(c.foreground, 0.85),
    bright:     c.foreground,
    accent:     c.accent,
    accent_fg:  c.background,
    red:        c.color1,
    green:      c.color2,
    yellow:     c.color3,
    blue:       c.color4,
    pink:       c.color5,
    cyan:       c.color6,
    purple:     c.color13,
  };
}

function hexToRgba(hex, alpha) {
  const h = (hex ?? "#888888").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildCss(template, theme) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => theme[key] ?? "inherit");
}
