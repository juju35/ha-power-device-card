import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass } from "./hass.mjs";
import { fakeNode, load } from "./load.mjs";

const pd = load();
const { cards } = pd;
const json = (v) => JSON.parse(JSON.stringify(v));
const settle = () => new Promise((r) => setTimeout(r, 0));

// A card whose shadow root answers every selector with nodes recording their click listeners.
const make = (tag, config, hass = makeHass()) => {
  const card = new cards[tag]();
  card.attachShadow();
  const nodes = {};
  card.shadowRoot.querySelector = (s) => (nodes[s] ||= fakeNode());
  card._nodes = nodes;
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  return card;
};
const click = (card, sel) => card._nodes[sel].listeners.click({ stopPropagation() {} });
const FRYER = { entity: "sensor.fryer_power" };
// This morning's cycle, then running again for 18 minutes.
const HISTORY = [
  [-1440, 0.3],
  [-330, 1380],
  [-312, 0.4],
  [-18, 1350],
  [-1, 1240],
];

test("both cards are registered, with their editors and a picker entry", () => {
  for (const tag of ["power-device-card", "power-device-mini-card"]) {
    assert.ok(pd.customElements.get(tag), tag);
    assert.ok(pd.customElements.get(`${tag}-editor`), `${tag}-editor`);
  }
  assert.deepEqual(json(pd.window.customCards.map((c) => c.type)), ["power-device-card", "power-device-mini-card"]);
});

test("discovery: the power sensors of smart plugs first; the switch and the daily energy on the device", () => {
  const h = makeHass();
  const found = json(pd.pdDevices(h));
  assert.equal(found[0], "sensor.fryer_power", "a plug (power + switch) comes first");
  assert.ok(found.includes("sensor.meter_power"), "a kW sensor counts too");
  const r = pd.pdFind(h, "sensor.fryer_power");
  assert.deepEqual([r.power, r.switch, r.energy, r.dailyEnergy], ["sensor.fryer_power", "switch.fryer", "sensor.fryer_energy_today", true]);
  // From the switch, the power sensor is found; a total-increasing energy is not today's.
  assert.equal(pd.pdFind(h, "switch.fryer").power, "sensor.fryer_power");
  const w = pd.pdFind(h, "sensor.washer_power");
  assert.deepEqual([w.switch, w.energy, w.dailyEnergy], [undefined, "sensor.washer_energy", false]);
  assert.equal(pd.pdFind(h, "sensor.fryer_power", { switch: "switch.other" }).switch, "switch.other");
  assert.deepEqual(json(cards["power-device-card"].getStubConfig(h)), FRYER);
});

test("kinds from the name, in several languages; a dishwasher is not a washer", () => {
  const cases = {
    "Air fryer": "airfryer",
    Bouilloire: "kettle",
    "Lave-vaisselle": "dishwasher",
    Waschmaschine: "washer",
    "Sèche-linge": "dryer",
    "Chargeur téléphone": "charger",
    "PC portable": "laptop",
    "Écrans bureau": "monitor",
    "Gaming PC": "pc",
    "Baie homelab": "homelab",
    "Piano numérique": "piano",
    Multiprise: "multiplug",
    "Chargeur d'outils Ryobi": "tools",
    PerfectDraft: "beer",
    "Smart plug 3": "plug",
  };
  for (const [name, kind] of Object.entries(cases)) assert.equal(pd.pdKindOf(name), kind, name);
  for (const k of pd.PD_KINDS) assert.ok(pd.PD_I18N.en[`k_${k}`], `k_${k}`);
});

test("cycles: stretches above the threshold, short pauses merged, today's energy from midnight", () => {
  const now = Date.UTC(2026, 10, 17, 13, 30);
  const min = 60000;
  const points = [
    { t: now - 120 * min, w: 0 },
    { t: now - 71 * min, w: 2000 },
    { t: now - 45 * min, w: 2 },
    { t: now - 43 * min, w: 500 },
    { t: now - 6 * min, w: 1 },
  ];
  const a = pd.pdAnalyse(points, { now, threshold: 10, gap: 5 * min, midnight: now - 600 * min });
  assert.equal(a.cycles.length, 1, "a 2-minute soak does not split the cycle");
  assert.equal(a.cycles[0].start, now - 71 * min);
  assert.equal(a.cycles[0].end, now - 6 * min);
  assert.equal(Math.round(a.cycles[0].kwh * 100) / 100, 1.18);
  assert.equal(a.peak, 2000);
  const split = pd.pdAnalyse(points, { now, threshold: 10, gap: 1 * min, midnight: now - 600 * min });
  assert.equal(split.cycles.length, 2, "with a 1-minute gap, two cycles");
  // Home Assistant's minimal history: s and lu (seconds), unavailable left out.
  assert.deepEqual(json(pd.pdPoints([{ s: "12.5", lu: 100 }, { s: "unavailable", lu: 101 }, { s: "3", lu: 99 }])), [
    { t: 99000, w: 3 },
    { t: 100000, w: 12.5 },
  ]);
});

test("full card: running, its duration, the curve, three tiles and the plug's switch", async () => {
  const hass = makeHass({ history: HISTORY });
  const card = make("power-device-card", { ...FRYER, price: 0.25 }, hass);
  assert.equal(hass.ws[0].type, "history/history_during_period");
  assert.deepEqual(json(hass.ws[0].entity_ids), ["sensor.fryer_power"]);
  await settle();
  const m = card._items;
  assert.equal(m.state, "running");
  assert.equal(m.kind, "airfryer");
  assert.equal(m.switchId, "switch.fryer");
  assert.equal(m.today, 0.42, "today's energy from the daily sensor");
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /class="banner r-kitchen"/);
  assert.match(html, /<span class="bpt">Running<\/span>/);
  assert.match(html, /<div class="subt">Kitchen<\/div>/, "the subtitle does not repeat the kind already in the name");
  assert.match(html, /<span class="big">1\.2<\/span><span class="u">kW<\/span>/);
  assert.match(html, /Running for 18 min/);
  assert.match(html, /class="cv"/);
  assert.match(html, /on ≥ 10 W/);
  assert.match(html, /This cycle/);
  assert.match(html, /Cost today/);
  assert.match(html, /€0\.11/);
  assert.match(html, /2 cycles today/);
  // The plug's switch turns it off.
  click(card, ".pw");
  assert.deepEqual(json(hass.calls.at(-1)), ["switch", "turn_off", { entity_id: "switch.fryer" }]);
});

test("states: done after a cycle, standby, idle, offline; a switched-off plug draws nothing", async () => {
  const done = make("power-device-card", { entity: "sensor.washer_power" }, makeHass({ history: [[-120, 0.5], [-71, 2000], [-6, 0.8]] }));
  await settle();
  assert.equal(done._items.state, "done");
  assert.match(done.shadowRoot.innerHTML, /Done 6 min ago/);
  assert.match(done.shadowRoot.innerHTML, /class="banner r-laundry"/);
  // Today's energy worked out from the power, the total-increasing sensor being no daily one.
  assert.ok(done._items.today > 2 && done._items.today < 2.3, String(done._items.today));
  const standby = make("power-device-card", { entity: "sensor.washer_power" }, makeHass({ washer: "3.2" }));
  assert.equal(standby._items.state, "standby");
  const idle = make("power-device-card", FRYER, makeHass({ watts: "0.2" }));
  assert.equal(idle._items.state, "idle");
  const off = make("power-device-card", FRYER, makeHass({ watts: "1240", sw: "off" }));
  assert.equal(off._items.state, "idle");
  assert.equal(off._items.watts, 0);
  const gone = make("power-device-card", FRYER, makeHass({ watts: "unavailable" }));
  assert.equal(gone._items.state, "offline");
  assert.doesNotMatch(gone.shadowRoot.innerHTML, /class="xt"/, "no tiles when the plug cannot report");
});

test("options: threshold, kind, a picture, the price as a sensor, no graph", async () => {
  const card = make("power-device-card", { ...FRYER, threshold: 2000, kind: "toaster", image: "/local/fryer.png", price: "sensor.price", show_graph: false }, makeHass({ history: HISTORY }));
  await settle();
  const m = card._items;
  assert.equal(m.state, "standby", "1240 W under a 2000 W threshold");
  assert.equal(m.kind, "toaster");
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<image href="\/local\/fryer\.png"/);
  assert.doesNotMatch(html, /class="cv"/);
  assert.match(html, /€0\.11/, "0.42 kWh at the sensor's 0.25");
});

test("no power sensor: says so", () => {
  const card = make("power-device-card", {}, makeHass({ states: {}, entities: {} }));
  assert.match(card.shadowRoot.innerHTML, /No power sensor found/);
});

test("mini card: the banner with the state, the power and today's energy as chips", async () => {
  const card = make("power-device-mini-card", FRYER, makeHass({ history: HISTORY }));
  await settle();
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /class="lvl-running bn"/);
  assert.match(html, /<span class="bpt">Running<\/span>/);
  assert.match(html, /<span>1\.2 kW<\/span>/);
  assert.match(html, /Today 0\.42 kWh/);
});

test("translations: every language has every key of English, with the same placeholders", () => {
  const LANGS = ["en", "fr", "de", "es", "sr", "sr-Latn", "it", "nl", "pt", "pl", "ro", "da", "sv", "bg", "ru", "uk", "hu", "sk", "cs", "sl", "lv", "el"];
  const vars = (s) => s.match(/\{\w+\}/g)?.sort() ?? [];
  for (const [name, table] of [["shared", pd.RC_I18N], ["pd", pd.PD_I18N]]) {
    assert.deepEqual(json(Object.keys(table)), LANGS, name);
    const ref = json(Object.keys(table.en)).sort();
    for (const lang of LANGS) {
      const keys = json(Object.keys(table[lang])).filter((k) => !["open_f", "closed_f"].includes(k) && !k.endsWith("_few"));
      assert.deepEqual(keys.sort(), ref, `${name}.${lang}`);
      for (const k of ref) assert.deepEqual(json(vars(table[lang][k])), json(vars(table.en[k])), `${name}.${lang}.${k}`);
    }
  }
  const fr = make("power-device-card", { ...FRYER, language: "fr" }, makeHass({ history: HISTORY }));
  assert.match(fr.shadowRoot.innerHTML, /En marche/);
});

test("editors: defaults stay out of the YAML, every field has a label", () => {
  const flat = (schema) => schema.flatMap((f) => (f.schema ? flat(f.schema) : [f]));
  for (const tag of ["power-device-card", "power-device-mini-card"]) {
    const ed = new (pd.customElements.get(`${tag}-editor`))();
    ed.appendChild = () => {};
    ed.setConfig({ type: `custom:${tag}`, ...FRYER });
    ed.hass = makeHass();
    const names = flat(ed._form.schema).map((f) => f.name);
    for (const n of ["entity", "kind", "image", "switch", "energy", "threshold", "standby", "price", "show_graph", "illustration_theme", "language"]) assert.ok(names.includes(n), `${tag}: ${n}`);
    for (const f of flat(ed._form.schema)) {
      assert.notEqual(ed._form.computeLabel(f), `ed_${f.name}`, `${tag}: no label for ${f.name}`);
      const helper = ed._form.computeHelper(f);
      if (helper !== undefined) assert.notEqual(helper, `ed_${f.name}_helper`, `${tag}: no helper for ${f.name}`);
    }
    let out;
    ed.dispatchEvent = (e) => (out = e.detail.config);
    ed._form.listeners["value-changed"]({ detail: { value: { type: `custom:${tag}`, ...FRYER, threshold: 10, kind: "auto", show_graph: true } } });
    assert.deepEqual(json(out), { type: `custom:${tag}`, ...FRYER });
  }
});
