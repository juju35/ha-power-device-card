// ── Editor ───────────────────────────────────────────────────────────────────
import { PowerDeviceCard } from "./card.js";

export const pdSchema = (booleans) => (lang, _hass, config) => [
  { name: "entity", selector: { entity: { domain: ["sensor", "switch", "input_boolean"] } } },
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "kind", selector: { select: { mode: "dropdown", options: ["auto", ...PD_KINDS].map((value) => ({ value, label: rcT(PD_I18N, lang, `k_${value}`) })) } } },
  {
    name: "model",
    selector: {
      select: {
        mode: "dropdown",
        options: ["auto", ...Object.values(PD_MODELS).flatMap((list) => list.map(([m]) => m))].map((value) => ({ value, label: rcT(PD_I18N, lang, `m_${value}`) })),
      },
    },
  },
  { name: "image", selector: { text: {} } },
  { name: "switch", selector: { entity: { domain: ["switch", "input_boolean"] } } },
  { name: "energy", selector: { entity: { domain: "sensor", device_class: "energy" } } },
  { name: "threshold", selector: { number: { min: 0, max: 5000, step: 1, mode: "box", unit_of_measurement: "W" } } },
  { name: "standby", selector: { number: { min: 0, max: 500, step: 0.1, mode: "box", unit_of_measurement: "W" } } },
  // A price typed by hand (a sensor id in `price`, from before `price_entity`, keeps its text field).
  typeof config?.price === "string" && /^[a-z_]+\.\w+$/.test(config.price.trim())
    ? { name: "price", selector: { text: {} } }
    : { name: "price", selector: { number: { min: 0, step: "any", mode: "box" } } },
  { name: "price_entity", selector: { entity: { domain: ["sensor", "input_number"] } } },
  { name: "temperature", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
  { name: "freezer_temperature", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
  { name: "max_temp", selector: { number: { min: -40, max: 30, step: 1, mode: "box" } } },
  { name: "door", selector: { entity: { domain: "binary_sensor" } } },
  { name: "climate", selector: { entity: { domain: ["climate", "select", "input_select"] } } },
  { name: "window", selector: { entity: { domain: "binary_sensor" } } },
  { name: "min_temp", selector: { number: { min: -10, max: 30, step: 0.5, mode: "box" } } },
  { name: "quiet_hours", selector: { text: {} } },
  { name: "always_on", selector: { boolean: {} } },
  ...rcBooleans(...booleans),
  {
    name: "illustration_theme",
    selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(PD_I18N, lang, `ed_theme_${value}`) })) } },
  },
  ...rcAdvanced(PD_I18N, lang, "language"),
];

export const PD_HELPERS = ["entity", "title", "switch", "energy", "model", "image", "threshold", "standby", "price", "price_entity", "temperature", "freezer_temperature", "max_temp", "door", "climate", "window", "min_temp", "quiet_hours", "always_on", "zoom", "language"];

export const PowerDeviceCardEditor = rcEditor({
  card: PowerDeviceCard,
  helpers: PD_HELPERS,
  schema: pdSchema(["show_title", "illustration", "show_graph", "animations", "show_controls"]),
});

rcRegister(
  PowerDeviceCard,
  PowerDeviceCardEditor,
  "Power Device Card",
  "Any appliance on a smart plug or a power meter, illustrated: its power, whether it runs and for how long, its 24-hour curve, cycles, energy and cost",
);
