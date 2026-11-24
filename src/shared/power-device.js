// ── Power device ─────────────────────────────────────────────────────────────
// A power device is any appliance read through a smart plug or a power meter: its power sensor (W) is the entity,
// the plug's switch (on the same device, or `switch`) turns it on and off, an energy sensor on the device (or
// `energy`) counts today's kWh. Nothing else is needed: its state comes from the power alone — running above
// `threshold`, standby above `standby`, idle below, done for a while after a cycle ends; `offline` when it cannot report.
import { rcPerRegistry } from "./core.js";

// The kinds of appliance, each with its illustration; found from the name (any of the card's languages), else `plug`.
// Most specific first: a dishwasher is not a washer, a phone charger is not a laptop.
export const PD_KIND_NAMES = [
  ["radiator", /radiat|convecteur|convector|chauffage|(?<!water.?|pool.?|aquarium.?)heater|heizk[oö]rper|heizl[uü]fter|bain.?d.?huile|[oö]lradiator|s[eè]che.?serviette|towel|handtuch|toallero|scaldasalviette|toalheiro|radiador|calorifer|grzejnik|kaloryfer|радиатор|радіатор|радијатор|рушникосуш|полотенцесуш|fűtőtest|radiátor|καλοριφέρ|θερμαντ/],
  ["airfryer", /air.?fr[iy]|friteuse|fritteuse|freidora|friggitrice|frytkownic|fritadeira|friteuz|frituregryde|fritös|фритюр|olajsüt|fritéz|cvrtnik|frituras|φριτέζα/],
  ["kettle", /kettle|bouilloire|wasserkocher|hervidor|bollitore|waterkoker|czajnik|chaleira|fierb[aă]tor|elkedel|vattenkokare|чайник|vízforral|kanvica|rychlovarn|grelnik|tējkanna|βραστήρ/],
  ["toaster", /toast|grille.?pain|tostad|tostapane|torradeira|pr[aă]jitor|brødrister|brödrost|тостер|kenyérpirít|hriankova|topinkova|opeka|φρυγανιέρ/],
  ["fridge", /fridge|frigo|r[eé]frig[eé]rat|refrigerator|k[uü]hl|nevera|frigor[ií]f|koelkast|lod[oó]wk|frigider|k[oø]leskab|kylsk[aå]p|хладилник|холодильник|хладњак|hladnjak|hűtő|chladni[cč]k|lednic|hladilnik|ledusskap|ψυγε/],
  ["freezer", /freez|cong[eé]la|gefrier|vriez|zamra[zż]ar|fryse|frys|морозил|фризер|замрзивач|zamrziva|fagyaszt|mrazni[cč]k|mraz[aá]k|zamrzoval|sald[eē]tav|καταψ/],
  ["coffee", /coffee|caf[eé]|espresso|kaffee|koffie|kawa|cafea|kaffe|кафе|кофе|кава|kávé|kávovar|kavni|kafij|καφ/],
  ["beer", /beer|bi[eè]re|tireuse|bier|kegerator|perfectdraft|cerveza|birra|piwo|cerveja|\bbere\b|\bøl\b|\böl\b|пиво|sör|pivo|alus|μπύρ/],
  ["dishwasher", /dish.?wash|lave.?vaisselle|sp[uü]lmaschine|lavavajillas|lavastoviglie|vaatwasser|zmywark|lavar loi[cç]a|sp[aă]lat vase|opvask|diskmaskin|съдомиял|посудомо|mosogatóg|umýva[cč]k|myčk|pomivaln|trauku|πλυντήριο πιάτων/],
  ["washer", /wash(ing)?.?machine|washer|lave.?linge|waschmaschine|lavadora|lavatrice|wasmachine|pralk|m[aá]quina de lavar|ma[sș]in[aă] de sp[aă]lat|vaskemaskine|tv[aä]ttmaskin|перал|стирал|пральн|mosógép|práčk|pračk|pralni|veļas|πλυντήριο/],
  ["dryer", /dryer|s[eè]che.?linge|trockner|secadora|asciugatrice|droger|suszark|tumble|usc[aă]tor|tørretumbler|torktumlare|сушил|szárító|sušičk|sušiln|žāvētāj|στεγνωτήρ/],
  ["tools", /\btools?\b|outil|werkzeug|herramient|utensil|gereedschap|narz[eę]dzi|ferrament|unelt|værktøj|verktyg|инструмент|szerszám|náradi|nářadí|orodj|instrument|εργαλ|drill|perceuse|ryobi|makita|dewalt|akku.?lade/],
  ["charger", /phone|t[ée]l[ée]phone|chargeur|charger|ladeger|cargador|caricabatter|oplader|ładowark|carregador|[iî]nc[aă]rc[aă]tor|laddare|зарядн|töltő|nabíja|polnil|lādētāj|φορτιστ|ipad|tablet|iphone|smartphone/],
  ["homelab", /home.?lab|\brack\b|server|serveur|\bnas\b|\bbaie\b|proxmox|servidor|сервер|szerver|serwer|διακομιστ/],
  ["laptop", /laptop|\bportable\b|notebook|macbook|port[aá]til|portatile|ноутбук|лаптоп|laptopa/],
  ["monitor", /monitor|[ée]cran|screen|display|bildschirm|pantalla|schermo|beeldscherm|ekran|ecr[aã]|sk[aæ]rm|монитор|képernyő|obrazovk|zaslon|ekrān|οθόν/],
  ["pc", /\bpc\b|computer|ordinat|desktop|gaming|tower|workstation|rechner|computador|calculator|komputer|компютър|компьютер|комп'ютер|számítógép|počítač|računalnik|dators|υπολογιστ/],
  ["piano", /piano|keyboard|clavier|synth|klavier|teclado|tastiera|pianino|klaver|пиано|фортепиано|zongora|klavír|klavir|klavieres|πιάνο/],
  ["outbuilding", /outbuilding|out.?house|\bshed\b|d[eé]pendance|\blocal\b|\babri\b|cabanon|\bannexe?\b|atelier|workshop|\bgarage\b|studio|pool.?house|gartenhaus|schuppen|werkstatt|nebengeb[aä]ude|poolhaus|caseta|cobertizo|\btaller\b|capanno|casetta|tuinhuis|schuur|werkplaats|poolhuis|altan[ae]|szopa|warsztat|domek|anexo|barrac[aã]o|oficina|magazi[ae]|\banex[aă]?\b|skur|udhus|v[æa]rk?st[eæ]d|f[oö]rr[aå]d|verkstad|uthus|friggebod|сарай|навес|флигел|майстерн|мастерск|работилниц|барака|шупа|радионица|kerti ház|fészer|műhely|melléképület|k[oô]ln[ae]|dieln[ae]|k[uů]ln[ae]|d[ií]ln[ae]|\blopa\b|delavnic|šķūn|darbnīc|αποθήκ|εργαστήρ|παράρτημα/],
  ["multiplug", /multiprise|power.?strip|steckdosenleiste|regleta|ciabatta|stekkerdoos|listwa|extens|prelungitor|stikdåse|grenuttag|разклонител|удлинител|подовжувач|elosztó|predlžova|prodlužova|podalj[sš]ek|pagarinātāj|πολύπριζο/],
];
export const PD_KINDS = [...PD_KIND_NAMES.map(([k]) => k), "plug"];
// Where each kind is drawn: the room behind it and the strip it stands on.
export const PD_ROOM = {
  radiator: "living",
  airfryer: "kitchen",
  kettle: "kitchen",
  toaster: "kitchen",
  coffee: "kitchen",
  fridge: "kitchen",
  freezer: "kitchen",
  beer: "kitchen",
  dishwasher: "kitchen",
  washer: "laundry",
  dryer: "laundry",
  tools: "garage",
  charger: "desk",
  homelab: "rack",
  laptop: "desk",
  monitor: "desk",
  pc: "desk",
  piano: "living",
  multiplug: "living",
  outbuilding: "garden",
  plug: "wall",
};
export const pdKindOf = (text) => PD_KIND_NAMES.find(([, re]) => re.test(String(text || "").toLowerCase()))?.[0] || "plug";

// The looks a kind can take (`model`), the first being the default; found from the name too.
export const PD_MODELS = {
  radiator: [
    ["column", null],
    ["oil", /bain.?d.?huile|\boil\b|[oö]lradiator|[oö]lheiz|radiatore a olio|de aceite|a óleo|масл|olejow|cu ulei|λαδιού/],
    ["towel", /towel|s[eè]che.?serviette|handtuch|toallero|scaldasalviette|toalheiro|рушникосуш|полотенцесуш|lira za|sušač|sušiak|sušák|törölköző|ręcznik|πετσετ/],
  ],
  fridge: [
    ["single", null],
    ["combi", /combi|fridge.?freezer|frigo.?cong|r[eé]frig[eé]rateur.?cong|k[uü]hl.?gefrier|kombi|koel.?vries|lod[oó]wko.?zamr|k[oø]le.?frys|kyl.?frys|двухкамер|двокамер|комбин|δίπορτ/],
    ["american", /am[eé]ric|side.?by|amerik|американ|америчк|αμερικ/],
    ["multi_door", /french|multi.?(door|porte|t[uü]r)|4.?(door|porte)|cross.?door|multiporte/],
  ],
  freezer: [
    ["drawers", null],
    ["chest", /chest|coffre|truhe|arc[oó]n|pozzetto|vrieskist|skrzyn|\barca\b|lad[aă]|kumme|frysbox|ракла|лар|скрин|láda|truhl|skrinj|lāde|μπαούλο/],
  ],
  outbuilding: [
    ["shed", null],
    ["workshop", /atelier|workshop|\bgarage\b|werkstatt|\btaller\b|officina|werkplaats|warsztat|oficina|v[æa]rkst[eæ]d|verkstad|майстерн|мастерск|работилниц|радионица|műhely|dieln|d[ií]ln|delavnic|darbnīc|εργαστήρ/],
    ["studio", /studio|d[eé]pendance|\bannexe?\b|g[iî]te|guest|bureau|office|nebengeb|g[aä]stehaus|anexo|casa de|dependenc|bijgebouw|gastenverblijf|gæstehus|gäststuga|флигел|гостев|melléképület|vendégház|παράρτημα|ξενών/],
    ["pool_house", /pool|piscin|schwimm|zwembad|basen|бассейн|басейн|басен|medence|baz[eé]n|baseins|πισίν/],
  ],
  coffee: [
    ["espresso", null],
    ["filter", /filter|filtre|drip|goteo|americana|filtro|przelew|bryggare|шварц|капельн|крапельн|filteres|prekvapk|překap|na filter|filtra|φίλτρου/],
  ],
};
export const pdModelOf = (kind, model, text) => {
  const list = PD_MODELS[kind];
  if (!list) return null;
  if (model && list.some(([m]) => m === model)) return model;
  const t = String(text || "").toLowerCase();
  return list.find(([, re]) => re?.test(t))?.[0] || list[0][0];
};
// Kinds that keep things cold: their compressor runs in short cycles all day, so they never show as done.
export const PD_COLD = new Set(["fridge", "freezer"]);
// Kinds kept warm by a thermostat: they heat in cycles all day too, so they never show as done either.
export const PD_WARM = new Set(["radiator"]);
// Buildings: what they draw comes and goes with the day, so they have no cycles and never show as done.
export const PD_BUILDING = new Set(["outbuilding"]);

export const pdNum = (st) => {
  const v = Number.parseFloat(st?.state);
  return Number.isFinite(v) ? v : null;
};
// A price typed by hand: a number, or text with a decimal comma or a currency ("0,1684", "0.25 €").
export const pdPrice = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const n = Number.parseFloat(v.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
// A power in W, an energy in kWh, whatever the sensor's unit.
export const pdWatts = (st) => {
  const v = pdNum(st);
  if (v == null) return null;
  const u = st.attributes.unit_of_measurement;
  return u === "kW" ? v * 1000 : u === "mW" ? v / 1000 : v;
};
export const pdKwh = (st) => {
  const v = pdNum(st);
  if (v == null) return null;
  const u = st.attributes.unit_of_measurement;
  return u === "Wh" ? v / 1000 : u === "MWh" ? v * 1000 : v;
};
export const pdLabel = (hass, id) => `${id} ${hass.states[id]?.attributes.friendly_name || ""}`;
export const pdDeviceOf = (hass, id) => hass.entities?.[id]?.device_id;
// Every visible entity of each device, in registry order.
export const pdDeviceEntities = rcPerRegistry((hass) => {
  const out = {};
  for (const [id, r] of Object.entries(hass.entities || {})) if (r.device_id && !r.hidden) (out[r.device_id] ||= []).push(id);
  return out;
});
export const pdIsPower = (hass, id) => {
  const st = hass.states[id];
  return !!st && id.startsWith("sensor.") && (st.attributes.device_class === "power" || ["W", "kW"].includes(st.attributes.unit_of_measurement));
};

// The power sensors of the home, most likely first: those of a device that also has a switch (a smart plug).
export const pdDevices = (hass) => {
  const ids = Object.keys(hass.states || {}).filter((id) => pdIsPower(hass, id) && !hass.entities?.[id]?.entity_category && !hass.entities?.[id]?.hidden);
  const plug = (id) => (pdDeviceEntities(hass)[pdDeviceOf(hass, id)] || []).some((e) => e.startsWith("switch."));
  return [...ids.filter(plug), ...ids.filter((id) => !plug(id))];
};

// The power sensor, the switch and the energy sensor of a device, from its `entity` (the power sensor or the plug's
// switch); `overrides` (`switch`, `energy`) win.
export const pdFind = (hass, entity, overrides = {}) => {
  const device = entity && pdDeviceOf(hass, entity);
  const ids = (device && pdDeviceEntities(hass)[device]) || [];
  const plain = (id) => hass.states[id] && !hass.entities?.[id]?.entity_category;
  const isSwitch = (id) => /^(switch|input_boolean)\./.test(id);
  const power = entity && pdIsPower(hass, entity) ? entity : ids.find((id) => pdIsPower(hass, id) && plain(id)) || ids.find((id) => pdIsPower(hass, id));
  const sw = entity && isSwitch(entity) ? entity : ids.find((id) => isSwitch(id) && plain(id));
  const energies = ids.filter((id) => hass.states[id]?.attributes.device_class === "energy");
  const daily = (id) => /today|daily|day|jour|heute|oggi|hoy|vandaag|dzi|hoje|azi|idag|i dag|днес|сегодня|сьогодні|ma\b|dnes|danes|šodien|σήμερα/i.test(pdLabel(hass, id));
  return {
    power: overrides.power || power,
    switch: overrides.switch || sw,
    energy: overrides.energy || energies.find(daily) || energies[0],
    dailyEnergy: overrides.energy ? daily(overrides.energy) : !!energies.find(daily),
  };
};

// Power history as points { t (ms), w (W) }, sorted, from Home Assistant's history (minimal response: `s` the state,
// `lu` the last update in seconds); unavailable stretches are left out.
export const pdPoints = (rows) =>
  (rows || [])
    .map((r) => ({ t: Math.round((r.lu ?? Date.parse(r.last_updated ?? r.last_changed) / 1000) * 1000), w: Number.parseFloat(r.s ?? r.state) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.w))
    .sort((a, b) => a.t - b.t);

// What the history says, up to `now`: the cycles (stretches at or above `threshold`, two of them merged when the power
// dropped below it for less than `gap` ms, as a washing machine soaks), each with its energy; the energy since
// `midnight`; and the curve's peak. Each point's power holds until the next one (a plug reports on change).
export const pdAnalyse = (points, { now, threshold, gap, midnight }) => {
  const cycles = [];
  let today = 0;
  let peak = 0;
  let onMs = 0;
  const first = points[0]?.t ?? now;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const end = Math.min(points[i + 1]?.t ?? now, now);
    if (end <= p.t) continue;
    peak = Math.max(peak, p.w);
    const from = Math.max(p.t, midnight);
    if (end > from) today += (p.w * (end - from)) / 3.6e9;
    if (p.w < threshold) continue;
    onMs += end - p.t;
    const kwh = (p.w * (end - p.t)) / 3.6e9;
    const last = cycles.at(-1);
    if (last && p.t - last.end < gap) {
      last.end = end;
      last.kwh += kwh;
    } else cycles.push({ start: p.t, end, kwh });
  }
  // The share of the time at or above the threshold, over what the history covers.
  const duty = now > first ? onMs / (now - first) : null;
  return { cycles, today, peak, duty };
};

// Whether `now` falls in `hours`, "HH:MM-HH:MM" (across midnight when the end comes first: "23:00-06:00").
export const pdQuiet = (hours, now) => {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*$/.exec(String(hours || ""));
  if (!m) return false;
  const from = Number(m[1]) * 60 + Number(m[2] || 0);
  const to = Number(m[3]) * 60 + Number(m[4] || 0);
  const d = new Date(now);
  const t = d.getHours() * 60 + d.getMinutes();
  return from <= to ? t >= from && t < to : t >= from || t < to;
};

// The energy (kWh) and its cost from `from` to `now`: each step of the power history (W) priced at the price in force
// at the time (`prices`, a price sensor's history as {t, w} steps), a step split where the price changes. A tariff
// that changes during the day (peak and off-peak hours, Tempo, a spot price) is priced right, not at today's last price.
export const pdCostOf = (points, prices, from, now) => {
  let kwh = 0;
  let cost = 0;
  if (!points?.length || !prices?.length) return { kwh, cost };
  for (let i = 0; i < points.length; i++) {
    let t = Math.max(points[i].t, from);
    const end = Math.min(points[i + 1]?.t ?? now, now);
    while (t < end) {
      const k = prices.findLastIndex((p) => p.t <= t);
      const price = prices[Math.max(k, 0)].w;
      const until = Math.min(end, prices[k + 1]?.t ?? end);
      const e = (points[i].w * (until - t)) / 3.6e9;
      kwh += e;
      cost += e * price;
      t = until;
    }
  }
  return { kwh, cost };
};
