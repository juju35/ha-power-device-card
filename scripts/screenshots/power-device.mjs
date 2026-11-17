// Renders the power device cards with mock appliances and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/power-device.mjs
import { pair, shoot } from "./harness.mjs";
import { setup, wsFor } from "./mock.mjs";

// Stills: animations: false draws the steam, drums and LEDs at a fixed moment, so a capture only changes when the card does.
const still = (file, s) => pair(file, { ...s, config: { animations: false, ...s.config } });
const scenes = ["airfryer", "washer", "pc", "kettle", "monitor", "offline"].flatMap((scene) => still(scene, { scene }));
await shoot({
  prefix: "pd",
  tag: "power-device-card",
  shots: [...scenes, ...still("pc-night", { scene: "pc", config: { illustration_theme: "night" } }), ...still("compact", { scene: "airfryer", config: { show_graph: false } })],
  setup,
  ws: wsFor,
});
await shoot({
  prefix: "pd-mini",
  tag: "power-device-mini-card",
  shots: [...still("airfryer", { scene: "airfryer" }), ...still("washer", { scene: "washer" }), ...still("zoom", { scene: "airfryer", open: ".zoom" })],
  setup,
  ws: wsFor,
});
