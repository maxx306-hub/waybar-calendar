import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import GLibUnix from "gi://GLibUnix";
import Gio from "gi://Gio";
import { CalendarWindow } from "./window.js";
import { loadTheme, buildCss } from "./theme.js";

const CACHE_FILE   = GLib.get_home_dir() + "/.cache/waybar-calendar/events.json";
const PID_FILE     = GLib.get_home_dir() + "/.cache/waybar-calendar/popup.pid";
const CSS_TEMPLATE = GLib.get_home_dir() + "/Projects/waybar-calendar/popup/style.css.template";

function readCache() {
  try {
    const [ok, bytes] = GLib.file_get_contents(CACHE_FILE);
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function applyTheme() {
  const theme = loadTheme();
  const [ok, bytes] = GLib.file_get_contents(CSS_TEMPLATE);
  if (!ok) return;
  const css = buildCss(new TextDecoder().decode(bytes), theme);

  if (!applyTheme._provider) {
    applyTheme._provider = new Gtk.CssProvider();
    Gtk.StyleContext.add_provider_for_display(
      applyTheme._display,
      applyTheme._provider,
      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
    );
  }
  applyTheme._provider.load_from_string(css);
}

const app = new Gtk.Application({ application_id: "dev.waybar.calendar" });

app.connect("activate", () => {
  const win = new CalendarWindow(app);

  applyTheme._display = win.get_display();
  applyTheme();
  win.loadData(readCache());
  win.present();

  // store source IDs for cleanup
  const signalSourceId = GLibUnix.signal_add(GLib.PRIORITY_DEFAULT, 10 /* SIGUSR1 */, () => {
    if (win.get_visible()) {
      win.hide();
    } else {
      applyTheme();
      win.loadData(readCache());
      win.present();
    }
    return GLib.SOURCE_CONTINUE;
  });

  const cacheGio = Gio.File.new_for_path(CACHE_FILE);
  const monitor = cacheGio.monitor_file(Gio.FileMonitorFlags.NONE, null);
  const monitorHandlerId = monitor.connect("changed", (_mon, _file, _other, eventType) => {
    if (eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
      win.loadData(readCache());
    }
  });

  app.connect("shutdown", () => {
    // stop file monitor
    monitor.disconnect(monitorHandlerId);
    monitor.cancel();

    // remove unix signal source
    GLib.source_remove(signalSourceId);

    GLib.unlink(PID_FILE);
  });
});

app.run([]);
