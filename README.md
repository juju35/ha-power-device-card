# ha-power-device-card

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HACS Validation](https://github.com/juju35/ha-power-device-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-power-device-card/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-power-device-card/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-power-device-card/actions/workflows/validate.yml)
[![Lint](https://github.com/juju35/ha-power-device-card/actions/workflows/lint.yml/badge.svg)](https://github.com/juju35/ha-power-device-card/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-power-device-card)](https://github.com/juju35/ha-power-device-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-power-device-card/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/images/icon.svg" alt="Power Device Card" width="120"></p>

An illustrated Lovelace card for **any appliance on a smart plug or a power meter**: an air fryer, a kettle, a washing machine with no integration of its own, a PC, a homelab rack… A power sensor is all it needs. It shows the power, whether the appliance runs and for how long, when its cycle ended, its last 24 hours as a curve, this cycle's and today's energy and cost, and the plug's switch.

[![Open your Home Assistant instance and open a repository inside the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-power-device-card&category=plugin)

| Card | Type | What it shows |
|---|---|---|
| [Power device](#power-device) | `custom:power-device-card` | The appliance illustrated, its power and state, the 24-hour curve, three tiles, its cycles and the plug's switch. |
| [Power device mini](#power-device-mini) | `custom:power-device-mini-card` | The same appliance on its illustrated banner: the state, the power and today's energy, a zoom to the full card. |

| Running | Done | Standby | Mini |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-airfryer.gif" alt="Running" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-washer.png" alt="Done" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-monitor-dark.png" alt="Standby" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-airfryer.png" alt="Mini" width="400"> |

The cards share the look of the other ha-* cards (illustrated header with a status pill, tinted tiles), a visual editor covering every option, labels in 22 languages following the Home Assistant language, light and dark themes, and come in a single Marketplace install with no dependency.

## Features

### Power device

`custom:power-device-card` — The appliance of `entity`: its power sensor, or the switch of its smart plug (the first smart plug of the home when none is set).

- **States**, from the power alone: **running** (orange) at or above `threshold`, **standby** (blue) at or above `standby`, **off** (grey) below it, **done** (green) for 15 minutes after a cycle of a minute or more ends, *offline* when the plug cannot report. A plug switched off draws nothing, whatever its sensor last said
- **Cycles**: stretches at or above the threshold, read from the last 24 hours of history. A short drop under it does not end a cycle — a washing machine soaks, a dishwasher dries: the pause allowed is 5 minutes for a washing machine or a dryer, 10 for a dishwasher, 2 for a coffee maker, an air fryer, a PC or a rack, 1 for the rest (`cycle_gap` in minutes sets it)
- **The big reading**: the power (*0.8 W*, *186 W*, *1.2 kW*) and what it means — *Running for 18 min*, *Done 6 min ago*, *Standby*, *Off*. A tap opens the sensor's dialog
- **The 24-hour curve**: the power as steps (a plug reports on change), its area, the running threshold dashed (*on ≥ 10 W*), in the state's colour (`show_graph: false` hides it)
- **Three tiles**: this cycle's energy (or the last cycle's), today's energy (the device's daily energy sensor, else worked out from the power since midnight), today's cost (with `price`, a number or a price sensor, in Home Assistant's currency), else the curve's peak
- **Chips**: today's cycles, their average length, how long ago the last one ended
- **The plug's switch**: a round button turns the appliance on and off (the plug's switch, found on its device, or `switch`; `show_controls: false` removes it)
- **Illustrated header**: a 90 px banner with the appliance drawn in its room — on a kitchen worktop, in a laundry, on a desk, in a living room, a garage or a server corner — on a ground strip edge to edge; the name, the area and the state on the wall at the left, beside a round badge whose icon (the appliance's) takes the state's colour. Running, the appliance comes alive: steam rises from the air fryer, the kettle and the coffee maker, frost twinkles by a cooling fridge or freezer, coffee drips into the filter coffee maker's jug, the toaster's slots glow, the drum of the washing machine or the dryer turns, the PC's fans spin, the rack's LEDs blink, notes rise from the piano; a halo in the state's colour shows behind it. Screens light up on standby too. By night (with a dark Home Assistant theme; `illustration_theme: day | night` forces it) the room is dark. `illustration: false` brings back the classic header
- **Fridges and freezers**: their compressor runs in short cycles all day, so they never show as *done* — **cooling** (blue, frost twinkles while it runs) or *compressor off*, and the **duty cycle** over the last 24 hours (the share of the time the compressor ran) as the first tile. With a `temperature` sensor (and `freezer_temperature` for a fridge-freezer), the temperature is the big reading. **Alerts** (red): the door left open (`door`, a door sensor: the door is drawn open, the inside lit), **too warm** (above `max_temp`: 8 °C for a fridge, −12 °C for a freezer by default; −12 °C for a fridge-freezer's freezer), **no power** (the plug switched off, or no compressor cycle for 3 hours), **running non-stop** (the compressor running for 2 hours without a pause — a door ajar, a failing seal; `long_run` in minutes sets it)
- **Filter coffee maker** (`model: filter`): **brewing** for its first 10 minutes (coffee drips into the jug, the jug fills; `brew_time` in minutes sets it), then **keeping warm** (the plate glows red, steam rises), and when it turns itself off (`auto_off`, 40 minutes after it started by default; `auto_off: false` hides it)
- **Models** (`model`): a fridge is `single` (one door), `combi` (a fridge-freezer), `american` (side by side, with its dispenser) or `multi_door` (French door with two drawers); a freezer `drawers` (upright) or `chest`; a coffee maker `espresso` or `filter`. `auto` finds it from the name (*Frigo combiné*, *American fridge*, *Congélateur coffre*, *Cafetière filtre*…), else the first one
- **Your own picture**: `image: /local/my-appliance.png` draws it in place of the illustration, standing in the room
- `animations: false` stops the illustration (also when the system asks for reduced motion)

The appliance's kind decides its illustration and its room; it is found from the name (in any of the card's languages: *Air fryer*, *Bouilloire*, *Waschmaschine*, *Lave-vaisselle*, *Gaming PC*, *Baie homelab*, *Frigo*, *Gefriertruhe*…), else set with `kind`:

| `kind` | Appliance | Room |
|---|---|---|
| `airfryer` | Air fryer | Kitchen |
| `kettle` | Kettle | Kitchen |
| `toaster` | Toaster | Kitchen |
| `coffee` | Coffee maker (espresso or filter) | Kitchen |
| `fridge` | Fridge (single door, fridge-freezer, American, French door) | Kitchen |
| `freezer` | Freezer (upright with drawers, chest) | Kitchen |
| `beer` | Beer tap (PerfectDraft…) | Kitchen |
| `dishwasher` | Dishwasher | Kitchen |
| `washer` | Washing machine | Laundry |
| `dryer` | Tumble dryer | Laundry |
| `tools` | Tool battery charger | Garage |
| `charger` | Phone charger | Desk |
| `homelab` | Homelab rack | Server corner |
| `laptop` | Laptop | Desk |
| `monitor` | Computer screens | Desk |
| `pc` | Desktop PC | Desk |
| `piano` | Digital piano | Living room |
| `multiplug` | Power strip | Living room |
| `plug` | Smart plug (any other appliance) | Wall |

### Power device mini

`custom:power-device-mini-card` — The appliance on the same 90 px illustrated banner (two lines with `illustration: false`): the state as the status pill after the name (*Cooling*, *Door open*, *Brewing*…), then a fridge's or a freezer's temperature, or the power while it runs or stands by, how long it has run or since it finished, and today's energy as chips. The **zoom** button (top right) opens the full card in place, a click anywhere else folds it back (`zoom: false` removes the button).

## Supported integrations

Any integration giving a **power sensor** (a `sensor` with the `power` device class, in W or kW) works; the plug's switch and its energy sensor are found on the same device. Among them:

| Integration | Plugs and meters |
|---|---|
| [Shelly](https://www.home-assistant.io/integrations/shelly/) (built in) | Shelly Plug S, Plus Plug S, Plug US, 1PM, Pro 1PM, EM, Pro 3EM |
| [TP-Link Smart Home](https://www.home-assistant.io/integrations/tplink/) (built in) | Tapo P110, P115, Kasa KP115, HS110 |
| [Zigbee Home Automation](https://www.home-assistant.io/integrations/zha/) (built in) | Zigbee plugs with metering (Nous A1Z, Ikea Inspelning, Aqara, Tuya…) |
| [Zigbee2MQTT](https://www.zigbee2mqtt.io/guide/usage/integrations/home_assistant.html) (MQTT) | The same Zigbee plugs |
| [Matter](https://www.home-assistant.io/integrations/matter/) (built in) | Matter plugs with energy measurement |
| [Tuya](https://www.home-assistant.io/integrations/tuya/) (built in) and [Local Tuya](https://github.com/rospogrigio/localtuya) (Marketplace) | Tuya and Smart Life plugs with power |
| [Meross](https://github.com/krahabb/meross_lan) (Marketplace), [Sonoff](https://github.com/AlexxIT/SonoffLAN) (Marketplace), [Tasmota](https://www.home-assistant.io/integrations/tasmota/) (built in), [ESPHome](https://www.home-assistant.io/integrations/esphome/) (built in) | Their plugs and meters |
| [Template](https://www.home-assistant.io/integrations/template/) and [Integration](https://www.home-assistant.io/integrations/integration/) (built in) | A power sensor of your own (a CT clamp, a calculated power) |

When the card picks the wrong switch or energy sensor, set it with `switch` / `energy`, and open an issue with the plug's entities so that the discovery learns it.

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-power-device-card&category=plugin)

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-power-device-card` — Type: **Dashboard**
3. Open **Power Device Card** and click **Install**
4. Clear your browser cache and refresh

The Marketplace registers the dashboard resource for you.

### Manual

1. Download `ha-power-device-card.js` and the `ha-power-device-card.i18n.*.js` translation files from the [latest release](https://github.com/juju35/ha-power-device-card/releases/latest)
2. Copy them all to `/config/www/` (without the translation files, the cards show in English)
3. Go to **Settings → Dashboards → Resources** → Add resource:
   - URL: `/local/ha-power-device-card.js`
   - Type: **JavaScript Module**
4. Clear your browser cache and refresh

## Configuration

Every option is in the visual editor. In YAML:

```yaml
type: custom:power-device-card
entity: sensor.air_fryer_power

# A washing machine on a plug, with the price of the kWh
type: custom:power-device-card
entity: sensor.washing_machine_power
price: 0.2516

# A PC: running above 30 W, on standby above 2 W, the price from a sensor
type: custom:power-device-card
entity: sensor.gaming_pc_power
threshold: 30
standby: 2
price: sensor.electricity_price

# Your own picture
type: custom:power-device-card
entity: sensor.espresso_power
kind: coffee
image: /local/espresso.png

# A fridge-freezer with its two thermometers and a door sensor
type: custom:power-device-card
entity: sensor.fridge_power
kind: fridge
model: combi
temperature: sensor.fridge_temperature
freezer_temperature: sensor.freezer_temperature
door: binary_sensor.fridge_door

# On a phone dashboard
type: custom:power-device-mini-card
entity: sensor.kettle_power
```

| Option | Type | Default | Description |
|---|---|---|---|
| `entity` | string | the first smart plug found | The appliance's power sensor, or the switch of its smart plug |
| `title` | string | the device's name | Card title |
| `show_title` | boolean | `true` | Show the title |
| `navigation_path` | string | | A tap on the header opens this dashboard path |
| `kind` | string | `auto` | The appliance (see the table above); `auto` finds it from the name |
| `model` | string | `auto` | Both: a fridge's, a freezer's or a coffee maker's look — `single`, `combi`, `american`, `multi_door`; `drawers`, `chest`; `espresso`, `filter`; `auto` finds it from the name |
| `image` | string | | Your own picture of the appliance (`/local/…`), in place of the illustration |
| `switch` | string | the plug's | The switch that turns the appliance on and off |
| `energy` | string | the device's | An energy sensor; a daily one (*today*, *jour*, *heute*…) gives today's energy, else it is worked out from the power |
| `threshold` | number | `10` | Watts at or above which the appliance runs |
| `standby` | number | `1` | Watts at or above which it is on standby (below `threshold`) |
| `cycle_gap` | number | by kind | YAML: minutes under the threshold that do not end a cycle |
| `price` | number or string | | The price of a kWh, or a sensor with it, for today's cost |
| `temperature` | string | | Both: a fridge's or a freezer's temperature sensor, shown big; an alert above `max_temp` |
| `freezer_temperature` | string | | Both: a fridge-freezer's second sensor, for its freezer (an alert above −12 °C) |
| `max_temp` | number | `8` (fridge), `-12` (freezer) | Both: the temperature above which a too-warm alert shows |
| `door` | string | | Both: a door sensor (`binary_sensor`): an alert while the door stays open |
| `long_run` | number | `120` | YAML: minutes a fridge's compressor may run without a pause before a *running non-stop* alert |
| `brew_time` | number | `10` | YAML: minutes a filter coffee maker brews before it keeps warm |
| `auto_off` | number or `false` | `40` | YAML: minutes after which a filter coffee maker turns itself off (`false`: not shown) |
| `illustration` | boolean | `true` | Both: the illustrated header (`false`: the classic header) |
| `illustration_theme` | string | `auto` | Both: `auto` (follows the Home Assistant theme: night with a dark theme, day with a light theme), `day` or `night` |
| `show_graph` | boolean | `true` | The 24-hour curve |
| `animations` | boolean | `true` | Steam, drums, fans and LEDs |
| `show_controls` | boolean | `true` | The plug's switch |
| `zoom` | boolean | `true` | Mini card: the zoom button |
| `language` | string | Home Assistant's | Advanced: one of the [languages](#translations) |

## Screenshots

| Running (air fryer) | Done (washing machine) | Running (PC) |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-airfryer.png" alt="Air fryer running" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-washer.png" alt="Washing machine done" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-pc.png" alt="PC running" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-airfryer-dark.png" alt="Air fryer running, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-washer-dark.png" alt="Washing machine done, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-pc-dark.png" alt="PC running, dark" width="400"> |

| Off (kettle) | Standby (screens) | Offline |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-kettle.png" alt="Kettle off" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-monitor.png" alt="Screens on standby" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-offline.png" alt="Offline" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-kettle-dark.png" alt="Kettle off, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-monitor-dark.png" alt="Screens on standby, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-offline-dark.png" alt="Offline, dark" width="400"> |

| By night | Without the curve (`show_graph: false`) |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-pc-night.png" alt="By night" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-compact.png" alt="Without the curve" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-pc-night-dark.png" alt="By night, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-compact-dark.png" alt="Without the curve, dark" width="400"> |

| Fridge, cooling | Fridge-freezer, compressor off | American fridge | French door, door open |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge.png" alt="Fridge cooling" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-combi.png" alt="Fridge-freezer, compressor off" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-american.png" alt="American fridge" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-door.png" alt="French door fridge, door open" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-dark.png" alt="Fridge cooling, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-combi-dark.png" alt="Fridge-freezer, compressor off, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-american-dark.png" alt="American fridge, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-door-dark.png" alt="French door fridge, door open, dark" width="400"> |

| Chest freezer | Upright freezer | Filter coffee, brewing | Filter coffee, keeping warm |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-freezer-chest.png" alt="Chest freezer" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-freezer-drawers.png" alt="Upright freezer" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-coffee-filter.png" alt="Filter coffee maker brewing" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-coffee-filter-warm.png" alt="Filter coffee maker keeping warm" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-freezer-chest-dark.png" alt="Chest freezer, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-freezer-drawers-dark.png" alt="Upright freezer, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-coffee-filter-dark.png" alt="Filter coffee maker brewing, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-coffee-filter-warm-dark.png" alt="Filter coffee maker keeping warm, dark" width="400"> |

**Animations**: while the appliance runs, the air fryer steams, the washing machine's drum turns, the PC's fans spin and the rack's LEDs blink; frost twinkles by a cooling fridge or freezer, an open fridge door's light and alert halo blink, coffee drips into the filter coffee maker's jug, then its plate glows while it keeps warm (still with `animations: false`, or when the system asks for reduced motion).

| Air fryer | Washing machine | Desktop PC | Homelab rack |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-airfryer.gif" alt="Air fryer animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-washer.gif" alt="Washing machine animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-pc.gif" alt="PC animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-homelab.gif" alt="Rack animation" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-airfryer-dark.gif" alt="Air fryer animation, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-washer-dark.gif" alt="Washing machine animation, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-pc-dark.gif" alt="PC animation, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-homelab-dark.gif" alt="Rack animation, dark" width="400"> |

| Fridge, cooling | Fridge, door open | Chest freezer, cooling |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge.gif" alt="Fridge animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-door.gif" alt="Fridge door open animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-freezer-chest.gif" alt="Chest freezer animation" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-dark.gif" alt="Fridge animation, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-fridge-door-dark.gif" alt="Fridge door open animation, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-freezer-chest-dark.gif" alt="Chest freezer animation, dark" width="400"> |

| Filter coffee, brewing | Filter coffee, keeping warm |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-coffee-filter.gif" alt="Filter coffee brewing animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-coffee-filter-warm.gif" alt="Filter coffee keeping warm animation" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-coffee-filter-dark.gif" alt="Filter coffee brewing animation, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-coffee-filter-warm-dark.gif" alt="Filter coffee keeping warm animation, dark" width="400"> |

### Power device mini

| Running | Done | Zoomed in |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-airfryer.png" alt="Mini, running" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-washer.png" alt="Mini, done" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-zoom.png" alt="Mini, zoomed in" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-airfryer-dark.png" alt="Mini, running, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-washer-dark.png" alt="Mini, done, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-zoom-dark.png" alt="Mini, zoomed in, dark" width="400"> |

| Fridge, door open | Chest freezer | Filter coffee, brewing |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-fridge-door.png" alt="Mini, fridge door open" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-freezer-chest.png" alt="Mini, chest freezer" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-coffee-filter.png" alt="Mini, filter coffee brewing" width="320"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-fridge-door-dark.png" alt="Mini, fridge door open, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-freezer-chest-dark.png" alt="Mini, chest freezer, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-power-device-card/main/screenshots/pd-mini-coffee-filter-dark.png" alt="Mini, filter coffee brewing, dark" width="320"> |

## How it works

- **Appliance**: `entity`, else the first power sensor of a device that also has a switch (a smart plug), else the first power sensor of the home
- **On its device**: the power sensor (when `entity` is the switch), the switch (when `entity` is the sensor) and an energy sensor, a daily one first; diagnostic entities (a plug's own temperature) are left out
- **History**: the last 24 hours of the power sensor from Home Assistant's recorder (`history/history_during_period`), fetched again every 5 minutes, closed by the live reading; the durations move on by the minute
- **Energy**: the power held until its next report, summed (a plug reports on change); today's from midnight in Home Assistant's browser time
- **Actions**: `turn_on` / `turn_off` on the plug's switch (never on a sensor); nothing else

## Development

```bash
npm install
npm run build        # stamps the version of package.json into dist/ha-power-device-card.js
npm run check        # builds and checks the bundle (run in CI)
npm test             # unit tests
npm run screenshots  # renders the cards with mock appliances into screenshots/ (and the GIFs, needs ffmpeg)
```

`dist/` is not committed: `npm run build` creates it locally, CI builds it on every push, and the release workflow attaches the built files to the release, which is where the Marketplace installs them from.

### Releasing

1. Bump `version` in `package.json`
2. Add a `## <version>` section at the top of [CHANGELOG.md](https://github.com/juju35/ha-power-device-card/blob/main/CHANGELOG.md)
3. Push to `main`: the **Release** workflow builds the card, creates the tag and the GitHub release with the changelog section as notes, and attaches `ha-power-device-card.js` and its translation files

## Translations

The card auto-detects the language from your Home Assistant settings. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |
| Deutsch | `de` |
| Español | `es` |
| Српски | `sr` |
| Srpski (latinica) | `sr-Latn` |
| Italiano | `it` |
| Nederlands | `nl` |
| Português (Portugal) | `pt` |
| Polski | `pl` |
| Română | `ro` |
| Dansk | `da` |
| Svenska | `sv` |
| Български | `bg` |
| Русский | `ru` |
| Українська | `uk` |
| Magyar | `hu` |
| Slovenčina | `sk` |
| Čeština | `cs` |
| Slovenščina | `sl` |
| Latviešu | `lv` |
| Ελληνικά | `el` |

Contributions for additional languages are welcome!

## License

[MIT](https://github.com/juju35/ha-power-device-card/blob/main/LICENSE)
