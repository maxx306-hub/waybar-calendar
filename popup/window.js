import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";
import Gdk from "gi://Gdk?version=4.0";
import Gtk4LayerShell from "gi://Gtk4LayerShell";
import GLib from "gi://GLib";
import { CalendarGrid } from "./calendar-grid.js";
import { EventsPanel } from "./events-panel.js";

export const CalendarWindow = GObject.registerClass(
class CalendarWindow extends Gtk.ApplicationWindow {
  constructor(app) {
    super({ application: app, title: "waybar-calendar", decorated: false, resizable: false });

    this.set_opacity(1.0);
    this._setupLayerShell();
    this._buildLayout();
    this._setupKeyboard();
  }

  _setupLayerShell() {
    Gtk4LayerShell.init_for_window(this);
    Gtk4LayerShell.set_layer(this, Gtk4LayerShell.Layer.TOP);
    Gtk4LayerShell.set_anchor(this, Gtk4LayerShell.Edge.TOP, true);
    Gtk4LayerShell.set_margin(this, Gtk4LayerShell.Edge.TOP, 34);
    Gtk4LayerShell.set_keyboard_mode(this, Gtk4LayerShell.KeyboardMode.ON_DEMAND);
  }

  _buildLayout() {
    const outer = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 0 });
    outer.add_css_class("widget");
    outer.set_size_request(-1, 320);
    outer.set_vexpand(false);
    this.set_child(outer);

    this._calGrid = new CalendarGrid((day) => {
      if (day) {
        this._eventsPanel.showDay(day);
      } else {
        this._eventsPanel.showUpcoming();
      }
    });
    this._calGrid.add_css_class("cal-panel");
    this._calGrid.set_size_request(320, -1);
    this._calGrid.set_vexpand(true);
    outer.append(this._calGrid);

    this._eventsPanel = new EventsPanel(() => this.hide());
    this._eventsPanel.set_size_request(400, -1);
    this._eventsPanel.set_vexpand(true);
    outer.append(this._eventsPanel);
  }

  _setupKeyboard() {
    const ctrl = new Gtk.EventControllerKey();
    ctrl.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
    ctrl.connect("key-pressed", (_ctrl, keyval, _keycode, _state) => {
      if (keyval === Gdk.KEY_Left)   { this._calGrid._navigate(-1);    return true; }
      if (keyval === Gdk.KEY_Right)  { this._calGrid._navigate(1);     return true; }
      if (keyval === Gdk.KEY_Up)     { this._calGrid.navigateYear(-1); return true; }
      if (keyval === Gdk.KEY_Down)   { this._calGrid.navigateYear(1);  return true; }
      if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
        this._calGrid.resetToToday();
        return true;
      }
      if (keyval === Gdk.KEY_Escape) { this.hide(); return true; }
      return false;
    });
    this.add_controller(ctrl);
  }

  loadData(cache) {
    if (!cache) return;
    this._calGrid.setEvents(cache.events);
    this._eventsPanel.setEvents(cache.events);
  }
});
