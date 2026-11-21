// The mock home of the screenshots and animations: appliances on smart plugs (a power sensor, the plug's switch and a
// daily energy sensor each), and their power history as Home Assistant's recorder would return it.
const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: new Date().toISOString() });
// The screenshots' fixed clock (harness.mjs): a sensor that changed `min` minutes before it.
const FIXED_NOW = Date.parse("2026-11-17T14:30:00+01:00");
const ago = (min) => new Date(FIXED_NOW - min * 60000).toISOString();

// A fridge's or a freezer's compressor over the day: `on` minutes running at `w` watts, `off` resting at 1 W, ending
// with `last` ([minutes from now, watts] steps).
const compressor = (on, off, w, last) => {
  const rows = [[-1440, 1]];
  for (let t = -1430; t < -90; t += on + off) rows.push([t, w], [t + on, 1.1]);
  return [...rows, ...last];
};
const temp = (id, v) => [`sensor.${id}`, String(v), { device_class: "temperature", unit_of_measurement: "°C", friendly_name: id }];

// Each scene: the appliance's name, area and model, its power now, today's energy, the card's options, and its history
// as [minutes from now, watts] steps (a plug reports on change).
const SCENES = {
  // An air fryer this morning, then running again for 18 minutes.
  airfryer: {
    name: "Air fryer",
    area: "Kitchen",
    model: "Shelly Plug S",
    watts: 1240,
    today: 0.42,
    config: { price: 0.2516 },
    history: [[-1440, 0.3], [-330, 1380], [-326, 1250], [-318, 1400], [-312, 0.4], [-18, 1350], [-12, 1240], [-6, 1300], [-1, 1240]],
  },
  // A washing machine that finished six minutes ago, after an hour and five minutes with a soak and a spin.
  washer: {
    name: "Washing machine",
    area: "Laundry",
    model: "Shelly Plus Plug S",
    watts: 0.8,
    today: 1.12,
    config: { price: 0.2516 },
    history: [[-1440, 0.6], [-71, 2050], [-58, 160], [-45, 2], [-43, 380], [-20, 520], [-12, 1900], [-6, 0.8]],
  },
  // The same washing machine in the middle of its spin (the animation).
  "washer-running": {
    name: "Washing machine",
    area: "Laundry",
    model: "Shelly Plus Plug S",
    watts: 1900,
    today: 0.86,
    config: { price: 0.2516 },
    history: [[-1440, 0.6], [-52, 2050], [-40, 160], [-28, 380], [-6, 1900]],
  },
  // A desktop PC, on standby all night, in use since lunch.
  pc: {
    name: "Gaming PC",
    area: "Office",
    model: "Tapo P110",
    watts: 186,
    today: 0.94,
    config: { threshold: 30, standby: 2 },
    history: [[-1440, 3.2], [-900, 3.1], [-560, 120], [-470, 3.2], [-200, 150], [-150, 240], [-90, 172], [-30, 205], [-2, 186]],
  },
  // A kettle, boiled twice today, off now.
  kettle: {
    name: "Kettle",
    area: "Kitchen",
    model: "Shelly Plug S",
    watts: 0,
    today: 0.18,
    config: {},
    history: [[-1440, 0], [-420, 2180], [-417, 0], [-182, 2150], [-180, 0]],
  },
  // A pair of screens on standby, used this morning.
  monitor: {
    name: "Desk screens",
    area: "Office",
    model: "Nous A1T",
    watts: 3.2,
    today: 0.16,
    config: { threshold: 15 },
    history: [[-1440, 3.2], [-330, 46], [-150, 3.2]],
  },
  // A homelab rack humming along (the animation of its LEDs).
  homelab: {
    name: "Homelab rack",
    area: "Office",
    model: "Shelly Pro 1PM",
    watts: 92,
    today: 1.36,
    config: {},
    history: [[-1440, 88], [-900, 95], [-600, 90], [-300, 104], [-120, 92]],
  },
  // A single-door fridge, its compressor running for 6 minutes, 4 °C inside.
  fridge: {
    name: "Kitchen fridge",
    area: "Kitchen",
    model: "Shelly Plug S",
    watts: 86,
    today: 0.52,
    config: { temperature: "sensor.fridge_temp", price: 0.2516 },
    extra: [temp("fridge_temp", 4.2)],
    history: compressor(14, 26, 84, [[-50, 86], [-36, 1.1], [-6, 86]]),
  },
  // A fridge-freezer resting between two cycles, both its temperatures shown.
  "fridge-combi": {
    name: "Fridge-freezer",
    area: "Kitchen",
    model: "Tapo P110",
    watts: 1.1,
    today: 0.61,
    config: { model: "combi", temperature: "sensor.fridge_temp", freezer_temperature: "sensor.freezer_temp" },
    extra: [temp("fridge_temp", 4), temp("freezer_temp", -18)],
    history: compressor(16, 24, 92, [[-40, 92], [-24, 1.1]]),
  },
  // An American fridge cooling.
  "fridge-american": {
    name: "American fridge",
    area: "Kitchen",
    model: "Shelly Plus Plug S",
    watts: 124,
    today: 0.94,
    config: { temperature: "sensor.fridge_temp" },
    extra: [temp("fridge_temp", 3)],
    history: compressor(18, 22, 120, [[-48, 122], [-30, 1.2], [-9, 124]]),
  },
  // A French door fridge whose door was left open 45 seconds ago (the door sensor's alert).
  "fridge-door": {
    name: "French door fridge",
    area: "Kitchen",
    model: "Shelly Plug S",
    watts: 96,
    today: 0.78,
    config: { model: "multi_door", temperature: "sensor.fridge_temp", door: "binary_sensor.fridge_door" },
    extra: [temp("fridge_temp", 6), ["binary_sensor.fridge_door", "on", { device_class: "door", friendly_name: "Fridge door" }, 0.75]],
    history: compressor(15, 25, 92, [[-40, 92], [-25, 1.1], [-3, 96]]),
  },
  // A chest freezer in the garage, cooling, −20 °C.
  "freezer-chest": {
    name: "Chest freezer",
    area: "Garage",
    model: "Nous A1T",
    watts: 72,
    today: 0.48,
    config: { model: "chest", temperature: "sensor.freezer_temp" },
    extra: [temp("freezer_temp", -20)],
    history: compressor(12, 30, 70, [[-46, 70], [-34, 1.1], [-4, 72]]),
  },
  // An upright freezer with drawers, resting.
  "freezer-drawers": {
    name: "Upright freezer",
    area: "Kitchen",
    model: "Shelly Plug S",
    watts: 1.1,
    today: 0.55,
    config: { temperature: "sensor.freezer_temp" },
    extra: [temp("freezer_temp", -18)],
    history: compressor(14, 28, 78, [[-38, 78], [-24, 1.1]]),
  },
  // A filter coffee maker brewing for 4 minutes.
  "coffee-filter": {
    name: "Filter coffee maker",
    area: "Kitchen",
    model: "Shelly Plug S",
    watts: 940,
    today: 0.21,
    config: { price: 0.2516 },
    history: [[-1440, 0], [-420, 950], [-404, 70], [-380, 0], [-4, 940]],
  },
  // The same coffee maker keeping the jug warm, 14 minutes after brewing.
  "coffee-filter-warm": {
    name: "Filter coffee maker",
    area: "Kitchen",
    model: "Shelly Plug S",
    watts: 68,
    today: 0.34,
    config: { price: 0.2516 },
    history: [[-1440, 0], [-420, 950], [-404, 70], [-380, 0], [-24, 940], [-14, 68]],
  },
  // Radiators (issue #12): a thermostat heating in cycles all day.
  radiator: {
    name: "Living room radiator",
    area: "Living room",
    model: "Shelly Plus Plug S",
    watts: 1480,
    today: 6.8,
    config: { temperature: "sensor.radiator_temp", price: 0.2516 },
    extra: [temp("radiator_temp", 19.6)],
    history: compressor(22, 18, 1490, [[-48, 1490], [-30, 0.4], [-9, 1480]]),
  },
  "radiator-oil": {
    name: "Oil-filled radiator",
    area: "Bedroom",
    model: "Tapo P110",
    watts: 0.3,
    today: 3.1,
    config: { model: "oil", temperature: "sensor.radiator_temp", price: 0.2516 },
    extra: [temp("radiator_temp", 18.2)],
    history: compressor(14, 34, 1190, [[-62, 1190], [-48, 0.3]]),
  },
  "radiator-towel": {
    name: "Towel rail",
    area: "Bathroom",
    model: "Nous A1T",
    watts: 495,
    today: 1.4,
    config: { price: 0.2516 },
    history: [[-1440, 0], [-1080, 500], [-1020, 0], [-35, 495]],
  },
  "radiator-climate": {
    name: "Office radiator",
    area: "Office",
    model: "Shelly Plus Plug S",
    watts: 980,
    today: 4.2,
    config: { climate: "climate.office", price: 0.2516 },
    extra: [["climate.office", "heat", { friendly_name: "Office", current_temperature: 18.4, temperature: 19, preset_mode: "eco", hvac_action: "heating" }]],
    history: compressor(16, 30, 990, [[-44, 990], [-28, 0.4], [-6, 980]]),
  },
  "radiator-window": {
    name: "Bedroom radiator",
    area: "Bedroom",
    model: "Shelly Plus Plug S",
    watts: 1495,
    today: 5.6,
    config: { climate: "climate.bedroom", window: "binary_sensor.bedroom_window", price: 0.2516 },
    extra: [
      ["climate.bedroom", "heat", { friendly_name: "Bedroom", current_temperature: 16.1, temperature: 20, preset_mode: "comfort" }],
      ["binary_sensor.bedroom_window", "on", { device_class: "window", friendly_name: "Bedroom window" }, 12],
    ],
    history: compressor(20, 20, 1490, [[-40, 1490], [-25, 0.4], [-14, 1495]]),
  },
  // A smart plug that stopped answering.
  // An outbuilding at the bottom of the garden (a CT clamp on its circuit): a garden shed in use, 12 °C inside.
  outbuilding: {
    name: "Garden shed",
    area: "Garden",
    model: "Zigbee CT clamp",
    watts: 640,
    today: 2.36,
    config: { kind: "outbuilding", threshold: 100, temperature: "sensor.outbuilding_temp", price: 0.2516 },
    extra: [temp("outbuilding_temp", 12.4)],
    stats: [62, 48, 71, 55, 90, 66],
    history: [[-1440, 18], [-1080, 18], [-560, 420], [-470, 22], [-200, 610], [-120, 18], [-45, 640], [-12, 655], [-2, 640]],
  },
  // A workshop with its vent running.
  "outbuilding-workshop": {
    name: "Workshop",
    area: "Garden",
    model: "Shelly Pro EM",
    watts: 1180,
    today: 3.4,
    config: { kind: "outbuilding", threshold: 100, price: 0.2516 },
    stats: [120, 80, 140, 95, 60, 110],
    history: [[-1440, 6], [-600, 900], [-540, 6], [-90, 1200], [-30, 1180]],
  },
  // A lived-in annex, its stove on, the window open for 8 minutes.
  "outbuilding-studio": {
    name: "Garden studio",
    area: "Garden",
    model: "Shelly Pro EM",
    watts: 1450,
    today: 7.9,
    config: { kind: "outbuilding", threshold: 100, window: "binary_sensor.studio_window", temperature: "sensor.outbuilding_temp", price: 0.2516 },
    extra: [temp("outbuilding_temp", 19.2), ["binary_sensor.studio_window", "on", { device_class: "window", friendly_name: "Studio window" }, 8]],
    stats: [260, 300, 240, 310, 280, 290],
    history: [[-1440, 40], [-700, 1300], [-500, 40], [-120, 1450]],
  },
  // A pool house, its pump running.
  "outbuilding-pool": {
    name: "Pool house",
    area: "Garden",
    model: "Shelly Pro 1PM",
    watts: 760,
    today: 4.6,
    config: { kind: "outbuilding", threshold: 100, model: "pool_house", price: 0.2516 },
    stats: [190, 200, 210, 180, 195, 205],
    history: [[-1440, 4], [-720, 760], [-480, 4], [-180, 760]],
  },
  // A garden shed whose door was left open three minutes ago.
  "outbuilding-door": {
    name: "Garden shed",
    area: "Garden",
    model: "Zigbee CT clamp",
    watts: 18,
    today: 0.62,
    config: { kind: "outbuilding", threshold: 100, door: "binary_sensor.shed_door", price: 0.2516 },
    extra: [["binary_sensor.shed_door", "on", { device_class: "door", friendly_name: "Shed door" }, 3]],
    stats: [30, 28, 35, 26, 31, 29],
    history: [[-1440, 18], [-300, 420], [-280, 18]],
  },
  // A workshop with nothing on, 1 °C inside: frost.
  "outbuilding-frost": {
    name: "Workshop",
    area: "Garden",
    model: "Shelly Pro EM",
    watts: 0,
    today: 0.12,
    config: { kind: "outbuilding", threshold: 100, temperature: "sensor.outbuilding_temp" },
    extra: [temp("outbuilding_temp", 1)],
    stats: [10, 12, 8, 11, 9, 10],
    history: [[-1440, 0], [-400, 600], [-380, 0]],
  },
  offline: {
    name: "Garage plug",
    area: "Garage",
    model: "Tapo P110",
    watts: null,
    today: null,
    config: { kind: "tools" },
    history: [],
  },
};

const slug = (s) => s.replace(/-.*/, "");

export const setup = (s) => {
  const v = SCENES[s.scene];
  const id = slug(s.scene);
  const states = {
    [`sensor.${id}_power`]: st(`sensor.${id}_power`, v.watts == null ? "unavailable" : String(v.watts), { device_class: "power", unit_of_measurement: "W", friendly_name: `${v.name} Power` }),
    [`switch.${id}`]: st(`switch.${id}`, v.watts == null ? "unavailable" : "on", { friendly_name: v.name }),
    [`sensor.${id}_energy_today`]: st(`sensor.${id}_energy_today`, v.today == null ? "unavailable" : String(v.today), { device_class: "energy", unit_of_measurement: "kWh", friendly_name: `${v.name} Energy today` }),
  };
  // A fridge's thermometer, its door sensor (changed `min` minutes ago): beside the plug, not on its device.
  const others = Object.fromEntries((v.extra || []).map(([eid, state, attributes, min]) => [eid, { ...st(eid, state, attributes), last_changed: ago(min ?? 30) }]));
  const entities = Object.fromEntries(Object.keys(states).map((k) => [k, { entity_id: k, device_id: id, platform: "shelly" }]));
  return {
    hass: {
      language: "en",
      locale: { language: "en" },
      config: { currency: "EUR", unit_system: { temperature: "°C" } },
      themes: { darkMode: s.theme === "dark" },
      areas: { [id]: { area_id: id, name: v.area } },
      devices: { [id]: { area_id: id, name: v.name, model: v.model } },
      entities,
      states: { ...states, ...others },
    },
    config: { entity: `sensor.${id}_power`, ...v.config, ...s.config },
    open: s.open,
  };
};

// The recorder's answer for the shot's scene (minimal response), relative to the page's (fixed) clock.
export const wsFor = (s) => `window.__ws = async (msg) => {
  const now = Date.now();
  const rows = ${JSON.stringify(SCENES[s.scene].history)}.map(([m, w]) => ({ s: String(w), lu: (now + m * 60000) / 1000 }));
  const stats = ${JSON.stringify(SCENES[s.scene].stats || [])}.map((mean) => ({ mean }));
  if (msg.type === "recorder/statistics_during_period") return stats.length ? { [msg.statistic_ids.at(-1)]: stats } : {};
  return msg.type === "history/history_during_period" ? { [msg.entity_ids[0]]: rows } : {};
};`;
