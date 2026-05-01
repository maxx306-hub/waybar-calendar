import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_NAMES = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const UPCOMING_EVENT_COUNT = 4;

export const EventsPanel = GObject.registerClass(
class EventsPanel extends Gtk.Box {
  constructor(onClose) {
    super({ orientation: Gtk.Orientation.VERTICAL, spacing: 10 });
    this.add_css_class("events-panel");
    this._onClose = onClose ?? (() => {});

    this._events = [];
    this._activeEventId = null;
    this._selectedDay = null;

    this._buildHeader();
    this._buildList();
    this._buildDetail();
  }

  _buildHeader() {
    this._title = new Gtk.Label({ label: "upcoming", xalign: 0 });
    this._title.add_css_class("events-title");
    this.append(this._title);
  }

  _buildList() {
    this._listBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
    const scroll = new Gtk.ScrolledWindow({
      vexpand: true,
      hscrollbar_policy: Gtk.PolicyType.NEVER,
      vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    });
    scroll.set_child(this._listBox);
    this.append(scroll);
  }

  _buildDetail() {
    this._detailCard = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
    this._detailCard.add_css_class("detail-card");
    this._detailCard.set_visible(false);

    this._detailLabel = new Gtk.Label({ label: "── detail " + "─".repeat(20), xalign: 0 });
    this._detailLabel.add_css_class("detail-label");
    this._detailCard.append(this._detailLabel);

    const top = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });
    this._detailDot = new Gtk.DrawingArea({ width_request: 5, height_request: 5, valign: Gtk.Align.CENTER });
    this._detailColor = "#888888";
    this._detailDot.set_draw_func((da, cr) => {
      const [r, g, b] = hexToRgb(this._detailColor);
      cr.setSourceRGB(r, g, b);
      cr.arc(2.5, 2.5, 2.5, 0, 2 * Math.PI);
      cr.fill();
    });
    this._detailName = new Gtk.Label({ label: "", xalign: 0 });
    this._detailName.add_css_class("detail-name");
    top.append(this._detailDot);
    top.append(this._detailName);
    this._detailCard.append(top);

    this._detailBody = new Gtk.Label({ label: "", xalign: 0, wrap: true });
    this._detailBody.add_css_class("detail-body");
    this._detailCard.append(this._detailBody);

    const linksBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });

    this._detailLink = new Gtk.Button({ label: "↗ calendar" });
    this._detailLink.add_css_class("detail-link");
    this._detailLink.connect("clicked", () => {
      if (this._detailHref) {
        openUrl(this._detailHref);
        this._onClose();
      }
    });
    linksBox.append(this._detailLink);

    this._meetingLink = new Gtk.Button({ label: "↗ join meeting" });
    this._meetingLink.add_css_class("detail-link");
    this._meetingLink.connect("clicked", () => {
      if (this._meetingHref) {
        openUrl(this._meetingHref);
        this._onClose();
      }
    });
    this._meetingLink.set_visible(false);
    linksBox.append(this._meetingLink);

    this._detailCard.append(linksBox);

    this.append(this._detailCard);
  }

  setEvents(events) {
    this._events = events;
    this._activeEventId = null;
    this._render();
  }

  showDay(day) {
    this._selectedDay = day;
    this._activeEventId = null;
    this._render();
  }

  showUpcoming() {
    this._selectedDay = null;
    this._activeEventId = null;
    this._render();
  }

  _render() {
    // clear list
    let child = this._listBox.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      // clear draw funcs on dot DrawingAreas inside each row
      const inner = child.get_child?.();
      if (inner) {
        let w = inner.get_first_child?.();
        while (w) {
          if (w instanceof Gtk.DrawingArea) {
            w.set_draw_func(null);
          }
          w = w.get_next_sibling?.();
        }
      }
      this._listBox.remove(child);
      child = next;
    }
    this._detailCard.set_visible(false);

    let events;
    if (this._selectedDay) {
      const { year, month, day } = this._selectedDay;
      const iso = isoDate(year, month, day);
      events = this._events.filter(e => e.start.slice(0, 10) === iso);
      this._title.set_label(formatDayLabel(year, month, day));
    } else {
      const todayIso = isoDate(...todayParts());
      events = this._events
        .filter(e => e.start.slice(0, 10) >= todayIso)
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, UPCOMING_EVENT_COUNT);
      this._title.set_label("upcoming");
    }

    if (events.length === 0) {
      const msg = new Gtk.Label({ label: "-- no events", xalign: 0 });
      msg.add_css_class("no-events");
      this._listBox.append(msg);
      return;
    }

    for (const ev of events) {
      this._listBox.append(this._buildRow(ev));
    }
  }

  _buildRow(ev) {
    const btn = new Gtk.Button();
    btn.add_css_class("event-row");
    if (ev.id === this._activeEventId) {
      btn.add_css_class("active");
    }

    const inner = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8 });

    const prefix = new Gtk.Label({ label: "›" });
    prefix.add_css_class("event-prefix");
    inner.append(prefix);

    const dot = new Gtk.DrawingArea({ width_request: 4, height_request: 4, valign: Gtk.Align.CENTER });
    dot.set_draw_func((_da, cr) => {
      const [r, g, b] = hexToRgb(ev.color);
      cr.setSourceRGB(r, g, b);
      cr.arc(2, 2, 2, 0, 2 * Math.PI);
      cr.fill();
    });
    inner.append(dot);

    // ellipsize: 3 = Pango.EllipsizeMode.END
    const title = new Gtk.Label({ label: ev.summary, xalign: 0, hexpand: true, ellipsize: 3 });
    title.add_css_class("event-title");
    inner.append(title);

    const timeStr = this._selectedDay
      ? formatTime(ev.start, ev.allDay)
      : formatDayLabel(...isoToParts(ev.start.slice(0, 10)));
    const time = new Gtk.Label({ label: timeStr, xalign: 1 });
    time.add_css_class("event-time");
    inner.append(time);

    btn.set_child(inner);

    btn.connect("clicked", () => {
      if (this._activeEventId === ev.id) {
        this._activeEventId = null;
        this._render();
      } else {
        this._activeEventId = ev.id;
        this._render();
        this._showDetail(ev);
      }
    });

    return btn;
  }

  _showDetail(ev) {
    this._detailColor = ev.color;
    this._detailDot.queue_draw();
    this._detailName.set_label(ev.summary);

    const time = formatTime(ev.start, ev.allDay);
    const desc = ev.description ? `${time}  ·  ${ev.description}` : time;
    this._detailBody.set_label(desc);

    this._detailHref = ev.htmlLink;
    this._meetingHref = ev.meetingLink ?? null;
    this._meetingLink.set_visible(!!ev.meetingLink);
    this._detailCard.set_visible(true);
  }
});

function openUrl(url) {
  GLib.spawn_async(null, ["xdg-open", url], null,
    GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.STDOUT_TO_DEV_NULL | GLib.SpawnFlags.STDERR_TO_DEV_NULL,
    null);
}

function hexToRgb(hex) {
  const h = (hex ?? "#888888").replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isoToParts(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m - 1, d];
}

function todayParts() {
  const n = new Date();
  return [n.getFullYear(), n.getMonth(), n.getDate()];
}

function formatDayLabel(year, month, day) {
  const dt = new Date(year, month, day);
  return `${DAY_NAMES[dt.getDay()]} ${day} ${MONTH_NAMES[month]}`;
}

function formatTime(isoStart, allDay) {
  if (allDay) {
    return "all day";
  }
  const d = new Date(isoStart);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
