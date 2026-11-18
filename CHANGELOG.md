# Changelog

## 1.0.2 - 2026-11-18

### Fixes
- Editor: the `auto` illustration theme label no longer mentions the sun.

## 1.0.1 - 2026-11-18

### Fixes
- Illustrated header: `auto` now follows the Home Assistant theme alone — a light theme keeps the day picture after sunset, a dark theme still shows the night one.

## 1.0.0 - 2026-11-17

### Features
- **Power device card** (`custom:power-device-card`): any appliance on a smart plug or a power meter, from its power sensor alone — running, standby, off, done (for 15 minutes after a cycle), offline; a switched-off plug draws nothing.
- **Cycles** from the last 24 hours of history, short pauses merged by kind (a washing machine soaks, a dishwasher dries; `cycle_gap` sets them): *Running for 18 min*, *Done 6 min ago*, today's cycles, their average length and the last one's end.
- **24-hour curve**: the power as steps, its area and the running threshold dashed, in the state's colour (`show_graph`).
- **Three tiles**: this cycle's (or the last one's) energy, today's energy (the daily sensor, else worked out from the power), today's cost (`price`, a number or a sensor, in Home Assistant's currency), else the peak.
- **The plug's switch** as a round button (`show_controls`), found on the plug or set with `switch`.
- **Illustrated header**: a 90 px banner with the appliance drawn in its room (kitchen worktop, laundry, desk, living room, garage, server corner, wall) on a ground strip, the badge's icon in the state's colour and the status pill placed by measurement; 17 appliances found from the name in 22 languages or set with `kind` (air fryer, kettle, toaster, coffee maker, beer tap, dishwasher, washing machine, dryer, tool charger, phone charger, homelab rack, laptop, screens, desktop PC, digital piano, power strip, smart plug), each animated while it runs; `image` draws your own picture instead. Night mode with the sun below the horizon or the dark theme (`illustration_theme`); `illustration: false` for the classic header.
- **Power device mini card** (`custom:power-device-mini-card`): the banner with the state, the power, the running time and today's energy as chips, and a zoom to the full card.
- Visual editor for every option; labels in 22 languages, English in the bundle and the others loaded on demand.
