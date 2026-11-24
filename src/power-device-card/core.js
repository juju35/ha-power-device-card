/**
 * power-device-card / power-device-mini-card: any appliance on a smart plug or a power meter, illustrated. Its power,
 * whether it runs, how long and since when; its last 24 hours as a curve with its cycles; this cycle's and today's
 * energy and cost; the plug's switch.
 * https://github.com/juju35/ha-power-device-card
 */

// Colour of each state: on the badge, the pill, the halo and the curve.
export const PD_ACCENTS = { running: "#f08c00", heating: "#e8590c", holding: "#2e9d5a", cooling: "#1c7ed6", alert: "#e03131", done: "#2e9d5a", standby: "#4f7fd6", idle: "#9aa3ae", offline: "#9aa3ae" };
// A radiator's glow and heat by its pilot wire order (or its thermostat's preset): heating orange, eco green, frost blue.
export const PD_PILOT_COLORS = { comfort: "#e8590c", eco: "#2e9d5a", frost: "#2f80ed", off: "#8a94a0" };
export const PD_KIND_ICONS = {
  airfryer: "mdi:pot-steam-outline",
  kettle: "mdi:kettle-steam-outline",
  radiator: "mdi:radiator",
  toaster: "mdi:toaster",
  coffee: "mdi:coffee-maker-outline",
  fridge: "mdi:fridge-outline",
  freezer: "mdi:snowflake-thermometer",
  beer: "mdi:beer-outline",
  dishwasher: "mdi:dishwasher",
  washer: "mdi:washing-machine",
  dryer: "mdi:tumble-dryer",
  tools: "mdi:toolbox",
  charger: "mdi:cellphone-charging",
  homelab: "mdi:server-network",
  laptop: "mdi:laptop",
  monitor: "mdi:monitor-multiple",
  pc: "mdi:desktop-tower-monitor",
  piano: "mdi:piano",
  multiplug: "mdi:power-socket-eu",
  plug: "mdi:power-plug-outline",
  outbuilding: "mdi:home-variant-outline",
};
// An outbuilding's icon by its model.
export const PD_BUILDING_ICONS = { shed: "mdi:home-variant-outline", workshop: "mdi:garage-variant", studio: "mdi:home-outline", pool_house: "mdi:pool" };
// One loop of the illustrations' animations (s): steam rises, a drum turns, LEDs blink. The GIFs record one loop.
export const PD_LOOP = 2.4;
// A filter coffee maker brews for this long (min), then keeps the jug warm; it turns itself off after `auto_off` (min).
export const PD_BREW_MIN = 10;
export const PD_AUTO_OFF_MIN = 40;
// A fridge's compressor running longer than this (min) without a pause: its door may be ajar (`long_run`).
export const PD_LONG_RUN_MIN = 120;
// No compressor cycle for this long while plugged in: the fridge gets no power (or has failed).
export const PD_SILENT_MS = 3 * 3600000;
// A cycle that ended less than this ago shows as done.
export const PD_DONE_MS = 15 * 60000;
// The history is fetched again after this long.
export const PD_HISTORY_MS = 5 * 60000;
export const PD_DAY_MS = 24 * 3600000;
// The last seven days' energy (an outbuilding's tile) is fetched again after this long.
export const PD_WEEK_MS = 30 * 60000;
// An outbuilding's frost alert, by default, below this (°C) when it has a temperature sensor.
export const PD_FROST_C = 3;
// An outbuilding that always draws something (`always_on`) with nothing drawn for this long: a power cut.
export const PD_CUT_MS = 5 * 60000;
// A cycle's pauses (minutes) by kind: a washing machine soaks, a dishwasher dries; a kettle's cycle ends at once.
export const PD_GAPS = { washer: 5, dryer: 5, dishwasher: 10, coffee: 2, airfryer: 2, homelab: 2, pc: 2 };

// The status pill's place, decided by measurement after each render and each new width (the same rule on every
// ha-* card): on the title row, right after the title, only when the whole title and the pill's whole label fit there;
// otherwise on its own line under the subtitle; when the label is still cut there, or the text leaves the banner or
// runs over its ground strip, its dot alone on the title row. A card of 200 px or less shows the dot alone (CSS).
export const pdPlacePill = (head, row, ground) => {
  if (!head) return;
  head.removeAttribute("data-wrap");
  head.removeAttribute("data-dot");
  const pill = row.querySelector(":scope > .bpill, :scope > .pill");
  const text = pill?.querySelector(".bpt, .pt");
  if (!text?.getBoundingClientRect || text.getBoundingClientRect().width <= 1) return;
  const name = row.querySelector(".title");
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const title = name ? (name.scrollWidth > name.clientWidth ? name.scrollWidth : name.getBoundingClientRect().width) + gap : 0;
  if (title + pill.getBoundingClientRect().width <= row.getBoundingClientRect().width + 0.5) return;
  head.setAttribute("data-wrap", "");
  const box = row.parentElement.getBoundingClientRect();
  const frame = head.getBoundingClientRect();
  const out = ground && (box.bottom > ground.getBoundingClientRect().top + 0.5 || box.top < frame.top - 0.5);
  if (text.scrollWidth > text.clientWidth + 0.5 || out) {
    head.removeAttribute("data-wrap");
    head.setAttribute("data-dot", "");
  }
};
