// A mock Home Assistant with appliances on smart plugs: an air fryer (a Shelly plug: power, switch, daily energy) in
// the kitchen, a washing machine on a meter with no switch, and a lone power sensor with no device. `history` answers
// the recorder's history call with [minutes from now, watts] steps for every entity asked.
export const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-01-01T00:00:00Z" });

export const makeHass = ({ watts = "1240", sw = "on", washer = "0.8", history = [], ...overrides } = {}) => {
  const calls = [];
  return {
    language: "en",
    locale: { language: "en" },
    config: { currency: "EUR", unit_system: { temperature: "°C" } },
    themes: { darkMode: false },
    areas: { kitchen: { area_id: "kitchen", name: "Kitchen" }, laundry: { area_id: "laundry", name: "Laundry" } },
    devices: {
      fryer: { area_id: "kitchen", name: "Air fryer", model: "Shelly Plug S" },
      washer: { area_id: "laundry", name: "Washing machine", model: "Shelly EM" },
    },
    entities: {
      "sensor.fryer_power": { device_id: "fryer", platform: "shelly" },
      "switch.fryer": { device_id: "fryer", platform: "shelly" },
      "sensor.fryer_energy_today": { device_id: "fryer", platform: "shelly" },
      "sensor.fryer_temperature": { device_id: "fryer", platform: "shelly", entity_category: "diagnostic" },
      "sensor.washer_power": { device_id: "washer", platform: "shelly" },
      "sensor.washer_energy": { device_id: "washer", platform: "shelly" },
    },
    states: {
      "sensor.fryer_power": st("sensor.fryer_power", watts, { device_class: "power", unit_of_measurement: "W", friendly_name: "Air fryer Power" }),
      "switch.fryer": st("switch.fryer", sw, { friendly_name: "Air fryer" }),
      "sensor.fryer_energy_today": st("sensor.fryer_energy_today", "0.42", { device_class: "energy", unit_of_measurement: "kWh", friendly_name: "Air fryer Energy today" }),
      "sensor.fryer_temperature": st("sensor.fryer_temperature", "31", { device_class: "temperature", unit_of_measurement: "°C" }),
      "sensor.washer_power": st("sensor.washer_power", washer, { device_class: "power", unit_of_measurement: "W", friendly_name: "Washing machine Power" }),
      "sensor.washer_energy": st("sensor.washer_energy", "812.4", { device_class: "energy", unit_of_measurement: "kWh", state_class: "total_increasing", friendly_name: "Washing machine Energy" }),
      "sensor.meter_power": st("sensor.meter_power", "2.4", { device_class: "power", unit_of_measurement: "kW", friendly_name: "Garage meter" }),
      "sensor.price": st("sensor.price", "0.25", { unit_of_measurement: "EUR/kWh", friendly_name: "Electricity price" }),
    },
    calls,
    ws: [],
    callService(domain, service, data) {
      calls.push([domain, service, data]);
    },
    callWS(msg) {
      this.ws.push(msg);
      const now = Date.now();
      const rows = history.map(([m, w]) => ({ s: String(w), lu: (now + m * 60000) / 1000 }));
      return Promise.resolve(Object.fromEntries(msg.entity_ids.map((id) => [id, rows])));
    },
    ...overrides,
  };
};
