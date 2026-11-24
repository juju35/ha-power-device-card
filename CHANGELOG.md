# Changelog

## 1.3.3 - 2026-11-24

### Maintenance
- The card source is split into ES modules: `src/power-device-card/` (entry `src/power-device-card/index.js`), `src/shared/` (entry `src/shared/index.js`), cut at its sections, with the translations in one file per language (`i18n/<lang>.js`). `scripts/bundle.mjs` concatenates them back, in their original order, into the same single file and per-language files as before; the tests evaluate that bundle.

## 1.3.2 - 2026-11-22

### Performance
- Card picker: the previews are back (`preview: true`), and light. Each card's preview is drawn only once it scrolls into view of Home Assistant's card picker, which otherwise builds the preview of every card at once: until then it holds Home Assistant's state (no render, no history request, no animation). On a dashboard or in the card editor the card is drawn as before.

## 1.3.1 - 2026-11-22

### Performance
- Card picker: the cards no longer ask Home Assistant for a live preview (`preview: false` in `window.customCards`). The picker drew every card at once (history requests, animations), which made the list slow to open; it now shows each card's description instead.

## 1.3.0 - 2026-11-21

### Features
- **Outbuildings** (`kind: outbuilding`, #17): a garden shed, a workshop or garage, an annex or studio, a pool house (`model: shed | workshop | studio | pool_house`, found from the name in every language), drawn at the bottom of a new garden scene, day and night. Its windows light up with what it draws; in use, the shed's lamp flickers, the workshop's vent turns, smoke rises from the studio's chimney, the pool's water ripples. No cycles and never *done*: **in use**, *standby* or *nothing on*.
- Outbuildings' tiles: today's energy, today's cost and **the last 7 days** (the recorder's daily statistics); the temperature as a chip.
- Outbuildings' **alerts**: the door or the window left open (drawn open), **frost risk** below `min_temp` (3 °C by default), **on at night** during `quiet_hours`, **power cut** with `always_on`. `quiet_hours` and `always_on` in the visual editor of both cards.
- **Time-of-use cost**: with a price sensor, each of its changes today prices the power used while it was in force (peak and off-peak hours, Tempo, spot prices), instead of today's energy at the current price — for every kind.
- Screenshots and animations (light and dark) of the four outbuildings, the open door and the frost alert.

## 1.2.2 - 2026-11-21

### Fixes
- Today's cost shows with a price typed with a decimal comma (`price: 0,1684`, read as text by YAML) or followed by its currency (`0.25 €`), instead of no cost at all (#17).
- `price_entity`: the price sensor (or an `input_number`) gets its own entity picker in the visual editor; the fixed `price` is now a number field. `price: sensor.…` keeps working.

## 1.2.1 - 2026-11-20

### Fixes
- The mini card's detail button keeps its frosted glass on older Safari / iOS (`-webkit-backdrop-filter`).

### Performance
- About 410 lines of the shared base that this card never used (room discovery, toggle and rooms-panel cards, their editor fields and styles) are gone: the bundle shrinks from 306 KB to 285 KB (167 KB to 146 KB with the translations split).

## 1.2.0 - 2026-11-20

### Features
- **Radiators** (`kind: radiator`, #12), in three models drawn as in ha-heating-card (`model: column | oil | towel`): the thermostat's cycles from the power — **heating** (orange, the columns glow and heat rises) or **at temperature** (green), never *done* — and the **duty cycle** over the last 24 hours as the first tile; a `temperature` sensor shown big, to one decimal.
- **With its thermostat or pilot wire** (`climate`: a `climate` entity, or a pilot wire `select` as in ha-heating-card): the room's temperature and its target (*18.4 °C → 19°*), the order as a chip (*Comfort*, *Eco*, *Frost protection*, *Off*) and the radiator's glow in its colour.
- **Alerts** for radiators: the window open while it heats (`window`), too cold (`min_temp`).
- `climate`, `window` and `min_temp` in the visual editor of both cards; radiators and towel rails found from the name in every language.
- Screenshots and animations (light and dark) of the three radiator models, the pilot wire and the open window alert.

## 1.1.1 - 2026-11-19

### Fixes
- The page no longer jumps by a few pixels in Firefox when the card, scrolled above the viewport, updates with its 24-hour curve shown (#8): the curve is drawn to the minute, so the card is no longer rebuilt on every update, and a redraw keeps the card's height until the new content has settled.

## 1.1.0 - 2026-11-18

### Features
- **Fridges** (`kind: fridge`), in four models (`model: single | combi | american | multi_door`): the compressor's cycles from the power — **cooling** (blue, frost twinkles while it runs) or *compressor off*, never *done* — and its **duty cycle** over the last 24 hours as the first tile.
- **Freezers** (`kind: freezer`), upright with drawers or a chest (`model: drawers | chest`), with the same cycles and duty cycle.
- **Temperatures and alerts** for fridges and freezers: a `temperature` sensor (and `freezer_temperature` for a fridge-freezer) shown big; red alerts when the door stays open (`door` sensor; the door is drawn open, the inside lit, the halo blinks), when it gets too warm (`max_temp`, 8 °C for a fridge, −12 °C for a freezer), when the plug gives no power (switched off, or no compressor cycle for 3 hours) and when the compressor runs non-stop for 2 hours (`long_run`).
- **Filter coffee maker** (`kind: coffee`, `model: filter`): *brewing* (coffee drips into the jug, the jug fills), then *keeping warm* (the plate glows red), and when it turns itself off (`brew_time`, `auto_off`).
- `model`, `temperature`, `freezer_temperature`, `max_temp` and `door` in the visual editor of both cards; the kinds and models found from the name in every language.
- Screenshots and animations (light and dark) of every fridge model, both freezers and the filter coffee maker.

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
