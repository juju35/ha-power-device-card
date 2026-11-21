import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass, st } from "./hass.mjs";
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
    Frigo: "fridge",
    "Fridge-freezer": "fridge",
    Kühlschrank: "fridge",
    Congélateur: "freezer",
    Gefriertruhe: "freezer",
    "Cafetière filtre": "coffee",
    "Radiateur salon": "radiator",
    "Sèche-serviettes": "radiator",
    Handtuchtrockner: "radiator",
    "Towel dryer": "radiator",
    "Bain d'huile": "radiator",
    Heizkörper: "radiator",
    "Water heater": "plug",
    "Chauffe-eau": "plug",
    "Four à convection": "plug",
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

test("the curve is drawn to the minute, so an update within the same minute leaves it unchanged (#8)", async () => {
  const card = make("power-device-card", FRYER, makeHass({ history: HISTORY.slice(1) }));
  await settle();
  const m = card._items;
  const realNow = pd.Date.now;
  try {
    const start = Math.floor(realNow() / 60000) * 60000;
    pd.Date.now = () => start + 1000;
    const graph = card._graph(m);
    assert.match(graph, /class="cv"/);
    pd.Date.now = () => start + 59000;
    assert.equal(card._graph(m), graph, "same curve within the minute");
    pd.Date.now = () => start + 61000;
    assert.notEqual(card._graph(m), graph, "moved on the next minute");
  } finally {
    pd.Date.now = realNow;
  }
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

test("price: a decimal comma, a currency, a price sensor (price_entity), an unavailable sensor", async () => {
  const cost = async (config, hass = makeHass({ history: HISTORY })) => {
    const card = make("power-device-card", { ...FRYER, ...config }, hass);
    await settle();
    return card._items.cost;
  };
  assert.equal(await cost({ price: "0,25" }), "€0.11", "a decimal comma, as typed in French (0.42 kWh)");
  assert.equal(await cost({ price: "0.25 €" }), "€0.11", "a currency after the number");
  assert.equal(await cost({ price: " sensor.price " }), "€0.11", "a sensor id in price, spaces trimmed");
  assert.equal(await cost({ price: 1, price_entity: "sensor.price" }), "€0.11", "the price sensor wins over a fixed price");
  assert.equal(await cost({ price: "abc" }), null, "no number, no cost");
  const h = makeHass({ history: HISTORY });
  const off = { ...h, states: { ...h.states, "sensor.price": st("sensor.price", "unavailable") } };
  assert.equal(await cost({ price_entity: "sensor.price" }, off), null, "an unavailable price sensor, no cost");
  assert.equal(pd.pdPrice("0,1684"), 0.1684);
});

test("banner night: the dark theme alone, unless illustration_theme forces it", () => {
  const night = (darkMode, sun, config = {}) => {
    const h = makeHass();
    const card = make("power-device-card", { ...FRYER, ...config }, { ...h, themes: { darkMode }, states: { ...h.states, "sun.sun": st("sun.sun", sun) } });
    return card._night();
  };
  assert.equal(night(false, "below_horizon"), false, "light theme after sunset: day");
  assert.equal(night(true, "above_horizon"), true, "dark theme while the sun is up: night");
  assert.equal(night(true, "below_horizon", { illustration_theme: "day" }), false);
  assert.equal(night(false, "above_horizon", { illustration_theme: "night" }), true);
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
    for (const n of ["entity", "kind", "model", "image", "switch", "energy", "threshold", "standby", "price", "price_entity", "temperature", "freezer_temperature", "max_temp", "door", "show_graph", "illustration_theme", "language"]) assert.ok(names.includes(n), `${tag}: ${n}`);
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

test("models: from the option, else from the name, else the kind's first", () => {
  assert.equal(pd.pdModelOf("fridge", "american", "Frigo"), "american");
  assert.equal(pd.pdModelOf("fridge", "auto", "Frigo combiné"), "combi");
  assert.equal(pd.pdModelOf("fridge", undefined, "Fridge-freezer"), "combi");
  assert.equal(pd.pdModelOf("fridge", undefined, "Frigo américain"), "american");
  assert.equal(pd.pdModelOf("fridge", undefined, "French door fridge"), "multi_door");
  assert.equal(pd.pdModelOf("fridge", undefined, "Frigo cuisine"), "single");
  assert.equal(pd.pdModelOf("freezer", undefined, "Congélateur coffre"), "chest");
  assert.equal(pd.pdModelOf("freezer", undefined, "Congélateur cellier"), "drawers");
  assert.equal(pd.pdModelOf("coffee", undefined, "Cafetière filtre"), "filter");
  assert.equal(pd.pdModelOf("coffee", undefined, "Coffee maker"), "espresso");
  assert.equal(pd.pdModelOf("fridge", "chest", "Frigo"), "single", "a model of another kind is ignored");
  assert.equal(pd.pdModelOf("radiator", undefined, "Radiateur salon"), "column");
  assert.equal(pd.pdModelOf("radiator", undefined, "Radiateur bain d'huile"), "oil");
  assert.equal(pd.pdModelOf("radiator", undefined, "Sèche-serviettes"), "towel");
  assert.equal(pd.pdModelOf("radiator", undefined, "Radiateur école"), "column", "no oil in a name holding \"ol\"");
  assert.equal(pd.pdModelOf("washer", "combi", "Lave-linge"), null);
  for (const m of Object.values(pd.PD_MODELS).flatMap((l) => l.map(([k]) => k))) assert.ok(pd.PD_I18N.en[`m_${m}`], `m_${m}`);
});

// A fridge's compressor: 15 min on, 25 min off, all day.
const COMPRESSOR = (on) => {
  const rows = [];
  for (let t = -1440; t < -40; t += 40) rows.push([t, 85], [t + 15, 1.2]);
  rows.push(...(on ? [[-6, 88]] : [[-45, 86], [-30, 1.1]]));
  return rows;
};
const FRIDGE = { ...FRYER, kind: "fridge", temperature: "sensor.fridge_temp" };
const fridgeHass = (opts = {}, extra = {}) => {
  const h = makeHass({ watts: opts.watts ?? "88", history: COMPRESSOR(opts.on ?? true), ...opts.hass });
  h.states = {
    ...h.states,
    "sensor.fridge_temp": st("sensor.fridge_temp", opts.temp ?? "4", { device_class: "temperature", unit_of_measurement: "°C" }),
    "sensor.freezer_temp": st("sensor.freezer_temp", opts.temp2 ?? "-18", { device_class: "temperature", unit_of_measurement: "°C" }),
    "binary_sensor.fridge_door": { ...st("binary_sensor.fridge_door", opts.door ?? "off", { device_class: "door" }), last_changed: new Date(Date.now() - 45000).toISOString() },
    ...extra,
  };
  return h;
};

test("fridge: cooling or resting, never done; its temperature big; the duty cycle over 24 h", async () => {
  const card = make("power-device-card", { ...FRIDGE, model: "combi", freezer_temperature: "sensor.freezer_temp", price: 0.25 }, fridgeHass());
  await settle();
  card._render();
  const m = card._items;
  assert.equal(m.state, "cooling");
  assert.equal(m.model, "combi");
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<span class="bpt">Cooling<\/span>/);
  assert.match(html, /<span class="big">4<\/span><span class="u">°C · −18 °C<\/span>|<span class="big">4<\/span><span class="u">°C · -18 °C<\/span>/);
  assert.match(html, /Duty cycle/);
  assert.ok(m.duty > 0.3 && m.duty < 0.45, String(m.duty));
  assert.match(html, /class="lvl-cooling|lvl-cooling/);
  const cool = make("power-device-card", FRIDGE, fridgeHass());
  await settle();
  cool._render();
  assert.match(cool.shadowRoot.innerHTML, /This cycle/, "without a price, the cycle under way is the third tile");
  const rest = make("power-device-card", FRIDGE, fridgeHass({ watts: "1.1", on: false }));
  await settle();
  rest._render();
  assert.equal(rest._items.state, "standby");
  assert.match(rest.shadowRoot.innerHTML, /<span class="bpt">Compressor off<\/span>/);
  assert.match(rest.shadowRoot.innerHTML, /Compressor off for 30 min/);
});

test("fridge alerts: the door, too warm, no power, running non-stop", async () => {
  const door = make("power-device-card", { ...FRIDGE, door: "binary_sensor.fridge_door" }, fridgeHass({ door: "on" }));
  await settle();
  door._render();
  assert.equal(door._items.state, "alert");
  assert.equal(door._items.alert, "door");
  assert.match(door.shadowRoot.innerHTML, /<span class="bpt">Door open<\/span>/);
  assert.match(door.shadowRoot.innerHTML, /Door open for 45 s/);
  assert.match(door.shadowRoot.innerHTML, /#fff6d6/, "the door is drawn open, the inside lit");
  const warm = make("power-device-card", FRIDGE, fridgeHass({ temp: "11" }));
  assert.equal(warm._items.alert, "warm");
  assert.match(warm.shadowRoot.innerHTML, /Above 8 °C/);
  const freezer = make("power-device-card", { ...FRIDGE, kind: "freezer", max_temp: -15 }, fridgeHass({ temp: "-14" }));
  assert.equal(freezer._items.alert, "warm", "a freezer at −14 above its −15 maximum");
  const cut = make("power-device-card", FRIDGE, fridgeHass({ hass: { sw: "off" } }));
  assert.equal(cut._items.alert, "cut");
  const silent = make("power-device-card", FRIDGE, fridgeHass({ watts: "0", hass: { history: [[-600, 0]] } }));
  await settle();
  assert.equal(silent._items.alert, "cut", "no compressor cycle for hours");
  const long = make("power-device-card", FRIDGE, fridgeHass({ hass: { history: [[-600, 1], [-150, 95]] } }));
  await settle();
  assert.equal(long._items.alert, "long");
  assert.match(long.shadowRoot.innerHTML, /Running non-stop for 2 h 30/);
});

test("filter coffee maker: brewing, then keeping warm, and when it turns itself off", async () => {
  const brewing = make("power-device-card", { ...FRYER, kind: "coffee", model: "filter" }, makeHass({ watts: "950", history: [[-600, 0], [-6, 950]] }));
  await settle();
  brewing._render();
  assert.equal(brewing._items.phase, "brewing");
  assert.match(brewing.shadowRoot.innerHTML, /<span class="bpt">Brewing<\/span>/);
  assert.match(brewing.shadowRoot.innerHTML, /Brewing for 6 min/);
  assert.match(brewing.shadowRoot.innerHTML, /Turns itself off in 34 min/);
  const warm = make("power-device-card", { ...FRYER, kind: "coffee", model: "filter" }, makeHass({ watts: "70", history: [[-600, 0], [-25, 950], [-15, 70]] }));
  await settle();
  warm._render();
  assert.equal(warm._items.phase, "warm");
  assert.match(warm.shadowRoot.innerHTML, /Keeping warm for 15 min/);
  assert.match(warm.shadowRoot.innerHTML, /fill="#ff6b6b"/, "the plate glows");
});

test("mini card of a fridge: its temperature and how long the compressor rests", async () => {
  const card = make("power-device-mini-card", FRIDGE, fridgeHass({ watts: "1.1", on: false }));
  await settle();
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /class="lvl-standby bn"/);
  assert.match(html, /<span>4 °C<\/span>/);
  assert.match(html, /Compressor off for 30 min/);
});

// A radiator's thermostat: 20 min heating, 20 min holding, all day.
const THERMOSTAT = (on) => {
  const rows = [];
  for (let t = -1440; t < -40; t += 40) rows.push([t, 1490], [t + 20, 0.4]);
  rows.push(...(on ? [[-9, 1480]] : [[-50, 1490], [-30, 0.4]]));
  return rows;
};
const RADIATOR = { ...FRYER, kind: "radiator" };
const radiatorHass = (opts = {}, extra = {}) => {
  const h = makeHass({ watts: opts.watts ?? "1480", history: THERMOSTAT(opts.on ?? true) });
  h.states = {
    ...h.states,
    "sensor.room_temp": st("sensor.room_temp", opts.temp ?? "19.6", { device_class: "temperature", unit_of_measurement: "°C" }),
    "climate.office": st("climate.office", opts.hvac ?? "heat", { current_temperature: 18.4, temperature: 19, preset_mode: opts.preset ?? "eco" }),
    "select.office_pilot_wire": st("select.office_pilot_wire", opts.order ?? "frost_protection", { options: ["comfort", "eco", "frost_protection", "off"] }),
    "binary_sensor.window": { ...st("binary_sensor.window", opts.window ?? "off", { device_class: "window" }), last_changed: new Date(Date.now() - 120000).toISOString() },
    ...extra,
  };
  return h;
};

test("radiator: heating or at temperature, never done; the room's temperature big, to one decimal", async () => {
  const card = make("power-device-card", { ...RADIATOR, temperature: "sensor.room_temp" }, radiatorHass());
  await settle();
  card._render();
  const m = card._items;
  assert.equal(m.state, "heating");
  assert.equal(m.model, "column");
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<span class="bpt">Heating<\/span>/);
  assert.match(html, /<span class="big">19\.6<\/span><span class="u">°C<\/span>/);
  assert.match(html, /Heating for 9 min/);
  assert.match(html, /Duty cycle/);
  assert.match(html, /lvl-heating/);
  assert.match(html, /mdi:radiator/);
  const hold = make("power-device-card", RADIATOR, radiatorHass({ watts: "0.4", on: false }));
  await settle();
  hold._render();
  assert.equal(hold._items.state, "holding");
  assert.match(hold.shadowRoot.innerHTML, /<span class="bpt">At temperature<\/span>/);
  assert.match(hold.shadowRoot.innerHTML, /At temperature for 30 min/);
  assert.match(hold.shadowRoot.innerHTML, /lvl-holding/);
});

test("radiator with its thermostat or pilot wire: target, order and its colour; window open; too cold", async () => {
  const eco = make("power-device-card", { ...RADIATOR, climate: "climate.office" }, radiatorHass());
  await settle();
  eco._render();
  assert.equal(eco._items.mode, "eco");
  assert.equal(eco._items.target, 19);
  const html = eco.shadowRoot.innerHTML;
  assert.match(html, /<span class="big">18\.4<\/span><span class="u">°C → 19°<\/span>/);
  assert.match(html, /<span>Eco<\/span>/);
  assert.match(html, /#2e9d5a/, "the eco order glows green");
  assert.doesNotMatch(html, /<stop offset="0" stop-color="#e8590c" stop-opacity=".3"\/>/, "its halo too");
  const off = make("power-device-card", { ...RADIATOR, climate: "climate.office" }, radiatorHass({ hvac: "off", watts: "0", on: false }));
  assert.equal(off._items.mode, "off");
  const pilot = make("power-device-card", { ...RADIATOR, climate: "select.office_pilot_wire" }, radiatorHass());
  assert.equal(pilot._items.mode, "frost");
  const win = make("power-device-card", { ...RADIATOR, window: "binary_sensor.window" }, radiatorHass({ window: "on" }));
  await settle();
  win._render();
  assert.equal(win._items.alert, "window");
  assert.match(win.shadowRoot.innerHTML, /<span class="bpt">Window open<\/span>/);
  assert.match(win.shadowRoot.innerHTML, /Heating with the window open/);
  const shut = make("power-device-card", { ...RADIATOR, window: "binary_sensor.window" }, radiatorHass({ window: "on", watts: "0.4", on: false }));
  assert.equal(shut._items.alert, null, "an open window only matters while it heats");
  const cold = make("power-device-card", { ...RADIATOR, temperature: "sensor.room_temp", min_temp: 12 }, radiatorHass({ temp: "10.5" }));
  assert.equal(cold._items.alert, "cold");
  assert.match(cold.shadowRoot.innerHTML, /Below 12 °C/);
  const half = make("power-device-card", { ...RADIATOR, temperature: "sensor.room_temp", min_temp: 12.5 }, radiatorHass({ temp: "10.5" }));
  assert.match(half.shadowRoot.innerHTML, /Below 12\.5 °C/);
});

test("towel rail: drawn and named as one", async () => {
  const card = make("power-device-card", { ...RADIATOR, model: "towel" }, radiatorHass());
  await settle();
  card._render();
  assert.equal(card._items.model, "towel");
  assert.match(card._items.sub, /Towel rail/);
  assert.match(card.shadowRoot.innerHTML, /#ff922b/, "the towel over its bars");
});

test("radiator mini card: the room's temperature and its target as a chip", async () => {
  const card = make("power-device-mini-card", { ...RADIATOR, climate: "climate.office" }, radiatorHass());
  await settle();
  card._render();
  assert.match(card.shadowRoot.innerHTML, /18\.4 °C → 19°/);
});

test("radiator: a target with no room temperature still shows", async () => {
  const h = radiatorHass({ watts: "980" }, { "climate.office": st("climate.office", "heat", { temperature: 19.5, preset_mode: "comfort" }) });
  const card = make("power-device-card", { ...RADIATOR, climate: "climate.office" }, h);
  await settle();
  card._render();
  assert.equal(card._items.temp, null);
  assert.match(card.shadowRoot.innerHTML, /<span>Comfort · 19\.5°<\/span>/);
  const mini = make("power-device-mini-card", { ...RADIATOR, climate: "climate.office" }, h);
  await settle();
  mini._render();
  assert.match(mini.shadowRoot.innerHTML, /→ 19\.5°/);
});
