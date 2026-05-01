#!/bin/bash
PID_FILE="$HOME/.cache/waybar-calendar/popup.pid"
mkdir -p "$HOME/.cache/waybar-calendar"

if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill -SIGUSR1 "$PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

LD_PRELOAD=/usr/lib/libgtk4-layer-shell.so gjs -m "$HOME/Projects/waybar-calendar/popup/main.js" &
