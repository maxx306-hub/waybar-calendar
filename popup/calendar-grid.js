import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";

const DAY_LABELS = ["mo", "tu", "we", "th", "fr", "sa", "su"];

export const CalendarGrid = GObject.registerClass(
class CalendarGrid extends Gtk.Box {
  constructor(onDaySelected) {
    super({ orientation: Gtk.Orientation.VERTICAL, spacing: 10 });
    this._onDaySelected = onDaySelected;
    this._viewYear = null;
    this._viewMonth = null;
    this._selectedDay = null;
    this._events = [];

    this._buildHeader();
    this._buildSep();
    this._buildGrid();
    this._buildHints();

    const now = new Date();
    this.setMonth(now.getFullYear(), now.getMonth());
  }

  _buildHeader() {
    const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 0 });

    this._monthLabel = new Gtk.Label({ label: "", xalign: 0, hexpand: true });
    this._monthLabel.add_css_class("cal-month");
    box.append(this._monthLabel);

    const navBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 2 });

    this._prevBtn = new Gtk.Button({ label: "‹" });
    this._prevBtn.add_css_class("nav-btn");
    this._prevBtn.connect("clicked", () => this._navigate(-1));
    navBox.append(this._prevBtn);

    this._nextBtn = new Gtk.Button({ label: "›" });
    this._nextBtn.add_css_class("nav-btn");
    this._nextBtn.connect("clicked", () => this._navigate(1));
    navBox.append(this._nextBtn);

    box.append(navBox);
    this.append(box);
  }

  _buildSep() {
    this._sep = new Gtk.Label({ label: "─".repeat(34), xalign: 0 });
    this._sep.add_css_class("sep");
    this.append(this._sep);
  }

  _buildGrid() {
    this._grid = new Gtk.Grid({ column_homogeneous: true, row_spacing: 1, column_spacing: 0 });

    DAY_LABELS.forEach((d, i) => {
      const lbl = new Gtk.Label({ label: d });
      lbl.add_css_class("day-label");
      this._grid.attach(lbl, i, 0, 1, 1);
    });

    this.append(this._grid);
  }

  _buildHints() {
    const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    box.add_css_class("nav-hints");

    for (const [key, label] of [["⇄", "month"], ["⇅", "year"], ["↵", "reset"]]) {
      const hint = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
      hint.add_css_class("hint");
      const k = new Gtk.Label({ label: key });
      k.add_css_class("hint-key");
      const l = new Gtk.Label({ label });
      hint.append(k);
      hint.append(l);
      box.append(hint);
    }

    this.append(box);
  }

  setEvents(events) {
    this._events = events;
    if (this._viewYear !== null) this._renderCells();
  }

  setMonth(year, month) {
    this._viewYear = year;
    this._viewMonth = month;
    const MONTHS = ["january","february","march","april","may","june",
                    "july","august","september","october","november","december"];
    this._monthLabel.set_label(`${MONTHS[month]} ${year}`);
    this._renderCells();
  }

  setSelectedDay(year, month, day) {
    this._selectedDay = { year, month, day };
    this._renderCells();
  }

  resetSelection() {
    this._selectedDay = null;
    this._renderCells();
  }

  _navigate(dir) {
    let m = this._viewMonth + dir;
    let y = this._viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    this._selectedDay = null;
    this.setMonth(y, m);
    this._onDaySelected(null);
  }

  navigateYear(dir) {
    this._selectedDay = null;
    this.setMonth(this._viewYear + dir, this._viewMonth);
    this._onDaySelected(null);
  }

  resetToToday() {
    const now = new Date();
    this._selectedDay = null;
    this.setMonth(now.getFullYear(), now.getMonth());
    this._onDaySelected(null);
  }

  _renderCells() {
    // remove old day cells (rows 1+)
    const toRemove = [];
    let child = this._grid.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      if (!child.has_css_class("day-label")) toRemove.push(child);
      child = next;
    }
    toRemove.forEach(c => {
      // clear draw funcs on any DrawingArea children to release closures
      let w = c.get_first_child();
      while (w) {
        const next = w.get_next_sibling();
        if (w instanceof Gtk.DrawingArea) w.set_draw_func(null);
        // check grandchildren (dots box)
        let gw = w.get_first_child?.();
        while (gw) {
          if (gw instanceof Gtk.DrawingArea) gw.set_draw_func(null);
          gw = gw.get_next_sibling?.();
        }
        w = next;
      }
      this._grid.remove(c);
    });

    const y = this._viewYear;
    const m = this._viewMonth;
    const now = new Date();
    const todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();

    const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const total = 42; // always 6 weeks — fixed height

    // build set of dates with events for fast lookup
    const eventDates = new Set();
    const eventColorMap = {};
    for (const ev of this._events) {
      const date = ev.start.slice(0, 10);
      eventDates.add(date);
      if (!eventColorMap[date]) eventColorMap[date] = [];
      if (eventColorMap[date].length < 3) eventColorMap[date].push(ev.color);
    }

    for (let i = 0; i < total; i++) {
      let cY = y, cM = m, cD;
      let otherMonth = false;

      if (i < offset) {
        cD = prevDays - offset + 1 + i;
        cM = m - 1; if (cM < 0) { cM = 11; cY = y - 1; }
        otherMonth = true;
      } else if (i - offset < daysInMonth) {
        cD = i - offset + 1;
      } else {
        cD = i - offset - daysInMonth + 1;
        cM = m + 1; if (cM > 11) { cM = 0; cY = y + 1; }
        otherMonth = true;
      }

      const isoDate = `${cY}-${String(cM + 1).padStart(2, "0")}-${String(cD).padStart(2, "0")}`;
      const isToday = cY === todayY && cM === todayM && cD === todayD;
      const isSel = this._selectedDay &&
        cY === this._selectedDay.year && cM === this._selectedDay.month && cD === this._selectedDay.day;
      const hasEvents = eventDates.has(isoDate) && !otherMonth;
      const colors = eventColorMap[isoDate] ?? [];

      const col = i % 7;
      const row = Math.floor(i / 7) + 1;

      const cell = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2, height_request: 36 });
      if (otherMonth) cell.add_css_class("day-other");
      if (isToday) cell.add_css_class("day-today");
      if (isSel) cell.add_css_class("day-selected");
      if (hasEvents) cell.add_css_class("day-has-events");

      const btn = new Gtk.Button({ label: String(cD) });
      btn.add_css_class("day-num");
      if (!otherMonth) {
        const _cY = cY, _cM = cM, _cD = cD;
        btn.connect("clicked", () => {
          this._selectedDay = { year: _cY, month: _cM, day: _cD };
          this._renderCells();
          this._onDaySelected({ year: _cY, month: _cM, day: _cD });
        });
      }
      cell.append(btn);

      if (hasEvents && colors.length > 0) {
        const dotsBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 2, halign: Gtk.Align.CENTER });
        for (const color of colors) {
          const dot = new Gtk.DrawingArea({ width_request: 3, height_request: 3 });
          dot.set_draw_func((da, cr) => {
            const [r, g, b] = hexToRgb(color);
            cr.setSourceRGB(r, g, b);
            cr.arc(1.5, 1.5, 1.5, 0, 2 * Math.PI);
            cr.fill();
          });
          dotsBox.append(dot);
        }
        cell.append(dotsBox);
      }

      this._grid.attach(cell, col, row, 1, 1);
    }
  }
});

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}
