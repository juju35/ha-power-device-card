// The mock home of the screenshots and animations: appliances on smart plugs (a power sensor, the plug's switch and a
// daily energy sensor each), and their power history as Home Assistant's recorder would return it.
const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: new Date().toISOString() });

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
  // A smart plug that stopped answering.
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
      states,
    },
    config: { entity: `sensor.${id}_power`, ...v.config, ...s.config },
    open: s.open,
  };
};

// The recorder's answer for the shot's scene (minimal response), relative to the page's (fixed) clock.
export const wsFor = (s) => `window.__ws = async (msg) => {
  const now = Date.now();
  const rows = ${JSON.stringify(SCENES[s.scene].history)}.map(([m, w]) => ({ s: String(w), lu: (now + m * 60000) / 1000 }));
  return msg.type === "history/history_during_period" ? { [msg.entity_ids[0]]: rows } : {};
};`;
