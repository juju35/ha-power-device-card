// ── Card ─────────────────────────────────────────────────────────────────────
import { PD_AUTO_OFF_MIN, PD_BREW_MIN, PD_BUILDING_ICONS, PD_CUT_MS, PD_DAY_MS, PD_DONE_MS, PD_FROST_C, PD_GAPS, PD_HISTORY_MS, PD_KIND_ICONS, PD_LONG_RUN_MIN, PD_SILENT_MS, PD_WEEK_MS, pdPlacePill } from "./core.js";
import { PD_SVG, pdDur, pdIcon, pdPower, pdRoom, pdSame, pdScene } from "./illustration.js";

export class PowerDeviceCard extends RcCard {
  static tag = "power-device-card";
  static i18n = PD_I18N;
  static defaults = { illustration: true, illustration_theme: "auto", kind: "auto", model: "auto", threshold: 10, standby: 1, show_graph: true, animations: true, show_controls: true };

  // The most likely appliance of the home: the power sensor of a smart plug.
  static getStubConfig(hass) {
    const entity = hass ? pdDevices(hass)[0] : undefined;
    return entity ? { entity } : {};
  }

  getCardSize() {
    return this._config?.show_graph === false ? 4 : 6;
  }

  _cols() {
    return 3;
  }

  // The power sensor (or the plug's switch): `entity`, else the first smart plug of the home.
  _entityId() {
    const c = this._config;
    if (c.entity) return c.entity;
    const h = this._hass;
    const memo = (this._memo ||= {});
    let found = rcMemo(memo, "devices", [h.entities], () => pdDevices(h));
    if (!found.length) found = memo.devices.value = pdDevices(h);
    return found[0];
  }

  _fmt(v, digits) {
    try {
      return new Intl.NumberFormat(this._lang(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    } catch {
      return v.toFixed(digits);
    }
  }

  _kwh(v) {
    return this._fmt(v, v >= 100 ? 0 : v >= 10 ? 1 : 2);
  }

  // The price sensor: `price_entity`, else a sensor id in `price`.
  _priceEntity() {
    const c = this._config;
    return c.price_entity || (typeof c.price === "string" && /^[a-z_]+\.\w+$/.test(c.price.trim()) ? c.price.trim() : null);
  }

  // Today's cost, in Home Assistant's currency: today's energy at the price per kWh — `price` (a number; a decimal comma
  // is fine), or a price sensor whose every change today prices the power used while it was in force (`series`).
  _cost(kwh, series, midnight, now) {
    const c = this._config;
    if (kwh == null) return null;
    const ent = this._priceEntity();
    if (!ent && (c.price == null || c.price === "")) return null;
    const st = ent ? this._hass.states[ent] : null;
    if (ent && (!st || rcUnavailable(st))) return null;
    const price = st ? pdNum(st) : pdPrice(c.price);
    if (price == null) return null;
    let total = kwh * price;
    const prices = ent ? this._prices(ent, midnight) : null;
    if (prices?.length && series?.length) {
      // The power since midnight priced step by step, scaled to today's energy (a daily energy sensor may count a
      // little more or less than the power's history).
      const priced = pdCostOf(series, [...prices, { t: now, w: price }], midnight, now);
      if (priced.kwh > 0) total = (priced.cost / priced.kwh) * kwh;
    }
    return this._money(total);
  }

  _money(v) {
    const currency = this._hass.config?.currency || "EUR";
    try {
      return new Intl.NumberFormat(this._lang(), { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    } catch {
      return `${v.toFixed(2)} ${currency}`;
    }
  }

  // A price sensor's history since midnight, fetched again every PD_HISTORY_MS (null until it is there).
  _prices(id, midnight) {
    const h = this._hass;
    if (typeof h.callWS !== "function") return null;
    const now = Date.now();
    const cache = this._priceHist;
    if (cache?.id === id && cache.from === midnight && (cache.pending || now - cache.at < PD_HISTORY_MS)) return cache.points;
    this._priceHist = { id, from: midnight, at: now, pending: true, points: cache?.id === id && cache.from === midnight ? cache.points : null };
    Promise.resolve(h.callWS({ type: "history/history_during_period", start_time: new Date(midnight).toISOString(), entity_ids: [id], minimal_response: true, no_attributes: true, significant_changes_only: false }))
      .then((res) => {
        if (this._priceHist?.id !== id) return;
        this._priceHist = { id, from: midnight, at: Date.now(), points: pdPoints(res?.[id]) };
        this._sig = null;
        this._render();
      })
      .catch(() => {
        if (this._priceHist?.id === id) this._priceHist = { id, from: midnight, at: Date.now(), points: [] };
      });
    return this._priceHist.points;
  }

  // The energy of the six days before today, from the recorder's daily statistics: the energy sensor's change, else
  // the power's daily mean (W × 24 h). Fetched again every PD_WEEK_MS; null until it is there or with no statistics.
  _week(ids, midnight) {
    const h = this._hass;
    if (typeof h.callWS !== "function" || !ids.power) return null;
    const key = `${ids.energy || ""}|${ids.power}|${midnight}`;
    const now = Date.now();
    const cache = this._weekStats;
    if (cache?.key === key && (cache.pending || now - cache.at < PD_WEEK_MS)) return cache.kwh;
    this._weekStats = { key, at: now, pending: true, kwh: cache?.key === key ? cache.kwh : null };
    const start = new Date(midnight);
    start.setDate(start.getDate() - 6);
    const statistic_ids = [ids.energy, ids.power].filter(Boolean);
    Promise.resolve(
      h.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: new Date(midnight).toISOString(), statistic_ids, period: "day", types: ["change", "mean"], units: { energy: "kWh", power: "W" } }),
    )
      .then((res) => {
        if (this._weekStats?.key !== key) return;
        const sum = (rows, f) => (rows?.length ? rows.reduce((a, r) => a + (Number.isFinite(r[f]) ? r[f] : 0), 0) : null);
        const kwh = sum(ids.energy && res?.[ids.energy], "change") ?? (res?.[ids.power]?.length ? sum(res[ids.power], "mean") * 0.024 : null);
        this._weekStats = { key, at: Date.now(), kwh };
        this._sig = null;
        this._render();
      })
      .catch(() => {
        if (this._weekStats?.key === key) this._weekStats = { key, at: Date.now(), kwh: null };
      });
    return this._weekStats.kwh;
  }

  // The power history of the last 24 hours, fetched once and again every PD_HISTORY_MS (or for another sensor).
  _history(id) {
    const h = this._hass;
    if (!id || typeof h.callWS !== "function") return null;
    const now = Date.now();
    const hist = this._hist;
    if (hist?.id === id && (hist.pending || now - hist.at < PD_HISTORY_MS)) return hist.points;
    const start = new Date(now - PD_DAY_MS).toISOString();
    this._hist = { id, at: now, pending: true, points: hist?.id === id ? hist.points : null };
    Promise.resolve(h.callWS({ type: "history/history_during_period", start_time: start, entity_ids: [id], minimal_response: true, no_attributes: true, significant_changes_only: false }))
      .then((res) => {
        if (this._hist?.id !== id) return;
        this._hist = { id, at: Date.now(), points: pdPoints(res?.[id]) };
        this._sig = null;
        this._render();
      })
      .catch(() => {
        if (this._hist?.id === id) this._hist = { id, at: Date.now(), points: [] };
      });
    return this._hist.points;
  }

  // The appliance's state and readings.
  _collect() {
    const h = this._hass;
    const c = this._config;
    const id = this._entityId();
    const e = rcMemo((this._memo ||= {}), "find", [id, c.switch, c.energy, h.entities, h.devices], () => pdFind(h, id, { switch: c.switch, energy: c.energy }));
    const pst = e.power ? h.states[e.power] : undefined;
    const sst = e.switch ? h.states[e.switch] : undefined;
    const est = e.energy ? h.states[e.energy] : undefined;
    const dev = h.devices?.[pdDeviceOf(h, id || "")];
    const name = c.title || dev?.name_by_user || dev?.name || (id && h.states[id]?.attributes.friendly_name) || this._t("title");
    const kind = c.kind && c.kind !== "auto" && PD_KINDS.includes(c.kind) ? c.kind : pdKindOf([name, dev?.model, id].filter(Boolean).join(" "));
    const threshold = Number(c.threshold) >= 0 ? Number(c.threshold) : 10;
    const gap = (c.cycle_gap != null && Number(c.cycle_gap) >= 0 ? Number(c.cycle_gap) : (PD_GAPS[kind] ?? 1)) * 60000;
    const standbyAt = Number(c.standby) >= 0 ? Number(c.standby) : 1;
    const watts = pst && !rcUnavailable(pst) ? pdWatts(pst) : null;
    // A switched-off plug draws nothing, whatever its sensor last said.
    const switchedOff = sst?.state === "off";
    const w = switchedOff ? 0 : watts;
    const now = Date.now();
    const midnight = new Date(now).setHours(0, 0, 0, 0);
    const points = this._history(e.power);
    // The history, closed by the live reading.
    const series = points ? [...points.filter((p) => p.t >= now - PD_DAY_MS), ...(w != null ? [{ t: now, w }] : [])] : null;
    const a = series ? pdAnalyse(series, { now, threshold, gap, midnight }) : null;
    const last = a?.cycles.at(-1);
    let state;
    if (!pst || (rcUnavailable(pst) && !switchedOff)) state = "offline";
    else if (w >= threshold || (last && w != null && now - last.end < gap)) state = "running";
    else if (last && now - last.end < PD_DONE_MS && last.end - last.start >= 60000) state = "done";
    else if (w >= standbyAt) state = "standby";
    else state = "idle";
    const current = state === "running" && last && now - last.end < gap ? last : null;
    const model = pdModelOf(kind, c.model, [name, dev?.model, id].filter(Boolean).join(" "));
    const extra = this._extra(kind, model, { state, current, last, w, threshold, standbyAt, switchedOff, series, now });
    // A towel rail says so, not "Radiator".
    const kindName = this._t(kind === "radiator" && model === "towel" ? "m_towel" : `k_${kind}`);
    const todays = a ? a.cycles.filter((x) => x.end > midnight) : [];
    const energy = est && !rcUnavailable(est) && e.dailyEnergy ? pdKwh(est) : a ? a.today : null;
    // An outbuilding's last seven days: the six before today and today.
    const before = PD_BUILDING.has(kind) ? this._week(e, midnight) : null;
    return {
      id: e.power || id,
      none: !id,
      ids: e,
      ...extra,
      state: extra.state || state,
      kind,
      model,
      name,
      sub: [h.areas?.[dev?.area_id]?.name, pdSame(name, kindName) ? null : kindName].filter(Boolean).join(" · "),
      raw: pst ? h.formatEntityState?.(pst) || pst.state : "",
      watts: w,
      threshold,
      series,
      peak: a?.peak ?? null,
      since: current ? current.start : null,
      cycle: current || (state === "done" ? last : null),
      lastCycle: last || null,
      duty: a?.duty ?? null,
      cycles: todays.length,
      avg: todays.length ? todays.reduce((s, x) => s + x.end - x.start, 0) / todays.length : null,
      today: energy,
      cost: this._cost(energy, series, midnight, now),
      week: before != null && energy != null ? before + energy : null,
      switchId: sst && !rcUnavailable(sst) ? e.switch : null,
      switchOn: sst?.state === "on",
    };
  }

  // What a fridge, a freezer or a filter coffee maker adds: its compressor cooling or resting, its temperatures and
  // alerts (door open, too warm, no power, running non-stop); a filter coffee maker brewing, then keeping warm.
  _extra(kind, model, { state, current, last, w, threshold, standbyAt, switchedOff, series, now }) {
    const h = this._hass;
    const c = this._config;
    if (kind === "coffee" && model === "filter" && state === "running" && current) {
      const brew = (Number(c.brew_time) > 0 ? Number(c.brew_time) : PD_BREW_MIN) * 60000;
      const off = (Number(c.auto_off) > 0 ? Number(c.auto_off) : PD_AUTO_OFF_MIN) * 60000;
      const warm = now - current.start >= brew;
      return { phase: warm ? "warm" : "brewing", phaseSince: warm ? current.start + brew : current.start, offIn: c.auto_off === false ? null : current.start + off - now };
    }
    if (PD_WARM.has(kind)) return this._warm({ state });
    if (PD_BUILDING.has(kind)) return this._building({ state, w, standbyAt, switchedOff, series, now });
    if (!PD_COLD.has(kind)) return {};
    const temp = (id) => {
      const st = id && h.states[id];
      const v = st && !rcUnavailable(st) ? pdNum(st) : null;
      return v == null ? null : { v, unit: st.attributes.unit_of_measurement || "°C" };
    };
    const t1 = temp(c.temperature);
    const t2 = kind === "fridge" && model === "combi" ? temp(c.freezer_temperature) : null;
    const max = c.max_temp !== undefined && c.max_temp !== "" && Number.isFinite(Number(c.max_temp)) ? Number(c.max_temp) : kind === "freezer" ? -12 : 8;
    const doorSt = c.door ? h.states[c.door] : null;
    const cooling = state === "running";
    const longMs = (Number(c.long_run) > 0 ? Number(c.long_run) : PD_LONG_RUN_MIN) * 60000;
    const covered = series?.length ? now - series[0].t : 0;
    const silent = !cooling && covered > PD_SILENT_MS && (!last || now - last.end > PD_SILENT_MS) && (w ?? 0) < threshold;
    let alert = null;
    if (doorSt?.state === "on") alert = "door";
    else if ((t1 && t1.v > max) || (t2 && t2.v > -12)) alert = "warm";
    else if (state !== "offline" && (switchedOff || silent)) alert = "cut";
    else if (cooling && current && now - current.start > longMs) alert = "long";
    const out = { cold: true, cooling, temp: t1, temp2: t2, max, alert, doorSince: doorSt ? Date.parse(doorSt.last_changed) : null };
    if (alert) out.state = "alert";
    else if (cooling) out.state = "cooling";
    else if (state !== "offline") out.state = "standby";
    return out;
  }

  // What a radiator adds: its thermostat heating or holding, the room's temperature and its target (from its own
  // sensor, or a thermostat / pilot wire entity shared with ha-heating-card), its order, and the window left open.
  _warm({ state }) {
    const h = this._hass;
    const c = this._config;
    const num = (v) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
    const cl = c.climate ? h.states[c.climate] : null;
    const sensor = c.temperature ? h.states[c.temperature] : null;
    const tv = sensor && !rcUnavailable(sensor) ? pdNum(sensor) : num(cl?.attributes.current_temperature);
    const t1 = tv == null ? null : { v: tv, unit: sensor?.attributes.unit_of_measurement || h.config?.unit_system?.temperature || "°C" };
    const target = num(cl?.attributes.temperature);
    // The order: a pilot wire select's option, else the thermostat's preset or mode.
    const select = cl && !c.climate.startsWith("climate.");
    const raw = String(!cl ? "" : select ? cl.state : cl.state === "off" ? "off" : cl.attributes.preset_mode || "").toLowerCase();
    const mode = !cl || rcUnavailable(cl) ? null : /eco|sleep|away|night|nuit/.test(raw) ? "eco" : /frost|hors|gel|anti/.test(raw) ? "frost" : /^off$|arr[eê]t|stop/.test(raw) ? "off" : "comfort";
    const win = c.window ? h.states[c.window] : null;
    const heating = state === "running";
    const min = num(c.min_temp);
    let alert = null;
    if (win?.state === "on" && heating) alert = "window";
    else if (t1 && min != null && t1.v < min) alert = "cold";
    const out = { cold: true, warm: true, cooling: heating, temp: t1, target, mode, phase: mode, min, alert, windowSince: win ? Date.parse(win.last_changed) : null };
    if (alert) out.state = "alert";
    else if (heating) out.state = "heating";
    else if (state !== "offline") out.state = "holding";
    return out;
  }

  // What an outbuilding adds: in use or not (it has no cycles), its door and window, its temperature, and its alerts —
  // the door or the window left open, frost (below `min_temp`, 3 °C by default), something on during `quiet_hours`,
  // and a power cut when what `always_on` says always draws something draws nothing.
  _building({ state, w, standbyAt, switchedOff, series, now }) {
    const h = this._hass;
    const c = this._config;
    const sensor = c.temperature ? h.states[c.temperature] : null;
    const tv = sensor && !rcUnavailable(sensor) ? pdNum(sensor) : null;
    const t1 = tv == null ? null : { v: tv, unit: sensor.attributes.unit_of_measurement || "°C" };
    const min = c.min_temp !== undefined && c.min_temp !== "" && Number.isFinite(Number(c.min_temp)) ? Number(c.min_temp) : PD_FROST_C;
    const open = (id) => (id && h.states[id]?.state === "on" ? h.states[id] : null);
    const doorSt = open(c.door);
    const winSt = open(c.window);
    const on = state === "running" || state === "done";
    // Nothing drawn since: the first step below `standby` of the history's last run of them.
    let quietSince = null;
    if ((w ?? 0) < standbyAt && series?.length) {
      quietSince = now;
      for (let i = series.length - 1; i >= 0 && series[i].w < standbyAt; i--) quietSince = series[i].t;
    }
    let alert = null;
    if (doorSt) alert = "door";
    else if (winSt) alert = "window";
    else if (t1 && t1.v < min) alert = "frost";
    else if (state !== "offline" && c.always_on && (switchedOff || (quietSince != null && now - quietSince >= PD_CUT_MS))) alert = "cut";
    else if (on && pdQuiet(c.quiet_hours, now)) alert = "night";
    const out = { building: true, temp: t1, min, alert, doorSince: doorSt ? Date.parse(doorSt.last_changed) : null, windowSince: winSt ? Date.parse(winSt.last_changed) : null, quietSince };
    if (alert) out.state = "alert";
    else if (on) out.state = "running";
    return out;
  }

  // The status pill's words.
  _label(m) {
    if (m.state === "alert") return this._t(`al_${m.alert}`);
    if (m.building) return this._t(m.state === "running" ? "st_in_use" : m.state === "idle" ? "st_nothing_on" : `st_${m.state}`);
    if (m.state === "cooling") return this._t("st_cooling");
    if (m.state === "heating") return this._t("st_heating");
    if (m.state === "holding") return this._t(m.mode === "off" ? "pw_off" : "st_holding");
    if (m.cold && m.state === "standby") return this._t("st_resting");
    if (m.phase && !m.warm) return this._t(m.phase === "warm" ? "st_warm" : "st_brewing");
    return this._t(`st_${m.state}`);
  }

  _dark() {
    return !!this._hass.themes?.darkMode;
  }

  // The banner's night: forced by `illustration_theme`, else Home Assistant's dark theme alone (a light theme keeps the
  // day picture after sunset).
  _night() {
    const theme = this._config.illustration_theme;
    if (theme === "night" || theme === "day") return theme === "night";
    return this._dark();
  }

  _animate() {
    if (this._config.animations === false) return false;
    try {
      return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  }

  _id() {
    this._uid ||= Math.random().toString(36).slice(2, 8);
    return this._uid;
  }

  _icon(m) {
    if (m.state === "offline") return "mdi:power-plug-off-outline";
    return (m.building && PD_BUILDING_ICONS[m.model]) || PD_KIND_ICONS[m.kind] || "mdi:power-plug-outline";
  }

  // The line under the big reading: how long it has run, how long ago it finished, or the state.
  _line(m) {
    const now = Date.now();
    if (m.state === "alert" && m.building) {
      if (m.alert === "door") return m.doorSince ? this._t("door_for", { d: pdDur(now - m.doorSince) }) : this._t("al_door");
      if (m.alert === "window") return m.windowSince ? this._t("window_for", { d: pdDur(now - m.windowSince) }) : this._t("al_window");
      if (m.alert === "frost") return this._t("cold_line", { min: `${this._fmt(m.min, m.min % 1 ? 1 : 0)} ${m.temp?.unit || "°C"}` });
      if (m.alert === "cut") return m.quietSince ? this._t("no_power_for", { d: pdDur(now - m.quietSince) }) : this._t("cut_line");
      return this._t("night_line");
    }
    if (m.building) {
      if (m.state === "running" && m.since) return this._t("in_use_for", { d: pdDur(now - m.since) });
      if (m.state === "running") return this._t("st_in_use");
      if (m.state === "idle") return m.quietSince ? this._t("nothing_on_for", { d: pdDur(now - m.quietSince) }) : this._t("st_nothing_on");
      return this._t(`st_${m.state}`);
    }
    if (m.state === "alert") {
      if (m.alert === "window") return this._t("window_line");
      if (m.alert === "cold") return this._t("cold_line", { min: `${this._fmt(m.min, m.min % 1 ? 1 : 0)} ${m.temp?.unit || "°C"}` });
      if (m.alert === "door") return m.doorSince ? this._t("door_for", { d: pdDur(now - m.doorSince) }) : this._t("al_door");
      if (m.alert === "warm") return this._t("warm_line", { max: `${this._fmt(m.max, 0)} ${m.temp?.unit || "°C"}` });
      if (m.alert === "cut") return this._t("cut_line");
      return m.since ? this._t("long_for", { d: pdDur(now - m.since) }) : this._t("al_long");
    }
    if (m.state === "cooling" && m.since) return this._t("running_for", { d: pdDur(now - m.since) });
    if (m.state === "heating" && m.since) return this._t("heating_for", { d: pdDur(now - m.since) });
    if (m.state === "holding") return m.lastCycle ? this._t("hold_for", { d: pdDur(now - m.lastCycle.end) }) : this._t("st_holding");
    if (m.cold && m.state === "standby") return m.lastCycle ? this._t("rest_for", { d: pdDur(now - m.lastCycle.end) }) : this._t("st_resting");
    if (m.phase && !m.warm) return this._t(m.phase === "warm" ? "warm_for" : "brewing_for", { d: pdDur(now - m.phaseSince) });
    if (m.state === "running" && m.since) return this._t("running_for", { d: pdDur(now - m.since) });
    if (m.state === "done" && m.lastCycle) return this._t("done_ago", { d: pdDur(now - m.lastCycle.end) });
    return this._t(`st_${m.state}`);
  }

  // The illustrated header: the badge (the appliance's icon, in the state's colour), the title and `sub` on the room's
  // wall at the left, the appliance in its room at the right, a 10 px ground strip edge to edge.
  _banner(m, sub, night, pill = "") {
    const c = this._config;
    const nav = c.navigation_path;
    const dx = this._addZoom && c.zoom ? 22 : 0;
    const room = PD_ROOM[m.kind] || "wall";
    const chip = pill ? `<span class="bpill" title="${rcEsc(m.raw || pill)}" aria-label="${rcEsc(pill)}"><span class="bdot"></span><span class="bpt">${rcEsc(pill)}</span></span>` : "";
    const scene = m.none
      ? pdRoom(room, night)
      : pdScene({
          kind: m.kind,
          image: c.image,
          state: m.state,
          night,
          uid: this._id(),
          animate: this._animate(),
          dx,
          model: m.model,
          door: m.alert === "door" || (m.building && m.doorSince != null),
          win: m.building && m.windowSince != null,
          frost: m.alert === "frost",
          phase: m.phase,
          cooling: m.cooling,
          temp: m.temp ? `${Math.round(m.temp.v)}°` : "",
          hot: m.alert === "warm",
        });
    return `
      <div class="banner r-${room}${night ? " night" : ""}">
        <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}${m.sub ? ` title="${rcEsc(m.sub)}"` : ""}>
          <div class="badge"><ha-icon icon="${this._icon(m)}"></ha-icon></div>
          <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${chip}</div>${sub}</div>
        </div>
        <svg class="room" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax slice" role="img" aria-label="${rcEsc(`${m.name} · ${this._label(m)}`)}">${scene}</svg>
        <div class="ground"></div>
      </div>`;
  }

  // A redraw replaces the whole shadow root: the card keeps its height until the new content has settled (two
  // frames), so a browser does not shift the page when the card is above the viewport (Firefox, issue #8).
  _holdHeight() {
    const h = this.offsetHeight;
    if (!h || typeof requestAnimationFrame !== "function") return;
    cancelAnimationFrame(this._holdFrame);
    this.style.minHeight = `${h}px`;
    this._holdFrame = requestAnimationFrame(() => {
      this._holdFrame = requestAnimationFrame(() => {
        this._holdFrame = undefined;
        this.style.minHeight = "";
      });
    });
  }

  _fitPill() {
    for (const row of this.shadowRoot?.querySelectorAll?.(".trow") || []) {
      const banner = row.closest(".banner");
      pdPlacePill(banner || row.closest(".head"), row, banner?.querySelector(".ground"));
    }
  }

  connectedCallback() {
    super.connectedCallback?.();
    if (typeof ResizeObserver !== "function") return;
    this._resize ??= new ResizeObserver((entries) => {
      const w = Math.round(entries.at(-1).contentRect.width);
      if (w === this._fitWidth) return;
      this._fitWidth = w;
      cancelAnimationFrame(this._fitFrame);
      this._fitFrame = requestAnimationFrame(() => this._fitPill());
    });
    this._resize.observe(this);
    // The durations ("Running for 18 min") move on by the minute.
    this._tick ??= setInterval(() => {
      if (["running", "done", "cooling", "heating", "holding", "alert"].includes(this._items?.state) || this._items?.cold || this._items?.building) {
        this._sig = null;
        this._render();
      }
    }, 60000);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this._resize?.disconnect();
    this._fitWidth = undefined;
    if (this._fitFrame) cancelAnimationFrame(this._fitFrame);
    if (this._holdFrame) cancelAnimationFrame(this._holdFrame);
    this._holdFrame = undefined;
    this.style.minHeight = "";
    clearInterval(this._tick);
    this._tick = undefined;
  }

  // The 24-hour curve: the power as steps (a plug reports on change), its area, the running threshold dashed.
  _graph(m) {
    if (this._config.show_graph === false || !m.series?.length) return "";
    // Drawn to the minute: the curve (part of the redraw signature) only moves on once a minute, not on every update.
    const now = Math.floor(Date.now() / 60000) * 60000;
    const from = now - PD_DAY_MS;
    const top = Math.max(m.peak || 0, m.threshold * 2, 1) * 1.12;
    const x = (t) => (((Math.min(Math.max(t, from), now) - from) / PD_DAY_MS) * 300).toFixed(1);
    const y = (w) => (58 - (Math.max(0, w) / top) * 54).toFixed(1);
    let d = "";
    for (const [i, p] of m.series.entries()) {
      const next = m.series[i + 1]?.t ?? now;
      if (next <= from) continue;
      d += `${d ? "L" : "M"}${x(p.t)} ${y(p.w)}L${x(next)} ${y(p.w)}`;
    }
    if (!d) return "";
    const area = `${d}L300 58L${x(Math.max(m.series[0].t, from))} 58Z`;
    const ty = y(m.threshold);
    return `
      <div class="gr">
        <div class="gh">${pdIcon(PD_SVG.curve)}<span>${rcEsc(this._t("last_24h"))}</span><span class="gt">${rcEsc(this._t("on_from", { w: rcWatts(m.threshold, this._lang()) }))}</span></div>
        <svg class="cv" viewBox="0 0 300 60" preserveAspectRatio="none" role="img" aria-label="${rcEsc(this._t("last_24h"))}">
          <line x1="0" y1="58" x2="300" y2="58" class="base"/>
          <line x1="0" y1="${ty}" x2="300" y2="${ty}" class="thr"/>
          <path d="${area}" class="ar"/><path d="${d}" class="ln"/>
        </svg>
        <div class="gx"><span>−24 h</span><span>−12 h</span><span>${rcEsc(this._t("now"))}</span></div>
      </div>`;
  }

  // Three tiles: this cycle's (or the last one's) energy, today's energy, today's cost — or the cycles and the peak.
  _tileList(m) {
    const kwh = (v) => (v != null ? [this._kwh(v), "kWh"] : null);
    const all = {
      duty: ["cycle", "t_duty", m.duty != null ? [this._fmt(m.duty * 100, 0), "%"] : null],
      cycle: ["bolt", m.state === "running" || m.cooling ? "t_cycle" : "t_last_cycle", m.cycle ? kwh(m.cycle.kwh) : m.lastCycle ? kwh(m.lastCycle.kwh) : null],
      today: ["bars", "t_today", kwh(m.today)],
      cost: ["cost", "t_cost", m.cost ? [m.cost, ""] : null],
      peak: ["peak", "t_peak", m.peak ? rcWatts(m.peak, this._lang()).split(" ") : null],
      week: ["bars", "t_week", kwh(m.week)],
    };
    if (m.state === "offline") return [];
    return (m.building ? ["today", "cost", "week", "peak"] : m.cold ? ["duty", "today", "cost", "cycle"] : ["cycle", "today", "cost", "peak"])
      .map((k) => all[k])
      .filter((t) => t[2])
      .slice(0, 3);
  }

  _tile([icon, label, [value, unit]]) {
    return `<div class="xt"><span class="xh">${pdIcon(PD_SVG[icon])}<span class="xl">${rcEsc(this._t(label))}</span></span><span class="xv">${rcEsc(value)}${unit ? `<small>${rcEsc(unit)}</small>` : ""}</span></div>`;
  }

  // The chips under the tiles: today's cycles, their average, the last one's end.
  _chips(m) {
    const now = Date.now();
    const out = [];
    if (m.state === "offline") return "";
    // The order, with the target when no room temperature shows it beside the big reading.
    const aim = m.target != null && !m.temp ? ` · ${this._fmt(m.target, m.target % 1 ? 1 : 0)}°` : "";
    if (m.mode) out.push([PD_SVG.thermo, `${this._t(`pw_${m.mode}`)}${aim}`]);
    if (m.building) {
      if (m.temp) out.push([PD_SVG.thermo, `${this._fmt(m.temp.v, m.temp.v % 1 ? 1 : 0)} ${m.temp.unit}`]);
      return out.map(([icon, text]) => `<span class="chip">${pdIcon(icon)}<span>${rcEsc(text)}</span></span>`).join("");
    }
    if (m.phase && m.offIn > 0) out.push([PD_SVG.clock, this._t("auto_off_in", { d: pdDur(m.offIn) })]);
    if (m.cycles) out.push([PD_SVG.cycle, this._tn("cycles", m.cycles)]);
    if (m.avg) out.push([PD_SVG.clock, this._t("avg_cycle", { d: pdDur(m.avg) })]);
    if (m.lastCycle && !m.cold && m.state !== "running" && m.state !== "done") out.push([PD_SVG.clock, this._t("last_ago", { d: pdDur(now - m.lastCycle.end) })]);
    return out.map(([icon, text]) => `<span class="chip">${pdIcon(icon)}<span>${rcEsc(text)}</span></span>`).join("");
  }

  _draw(m) {
    const c = this._config;
    const banner = c.illustration !== false;
    const night = banner && this._night();
    const tiles = this._tileList(m);
    const minute = Math.floor(Date.now() / 60000);
    const graph = this._graph(m);
    const parts = [m.none, m.state, m.alert, m.phase, m.mode, m.target, m.model, m.temp?.v, m.temp2?.v, this._label(m), m.kind, m.name, m.sub, m.watts, m.raw, tiles, this._chips(m), graph, m.switchId, m.switchOn, banner, night, this._dark(), minute];
    if (!this._changed(parts)) return;
    this._holdHeight();
    const pill = m.none ? "" : this._label(m);
    const sub = m.sub ? `<div class="subt">${rcEsc(m.sub)}</div>` : "";
    const head = banner
      ? this._banner(m, sub, night, pill)
      : `
      <div class="head${c.navigation_path ? " nav" : ""}"${c.navigation_path ? ' role="link" tabindex="0"' : ""}>
        <div class="badge"><ha-icon icon="${this._icon(m)}"></ha-icon></div>
        <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${m.none ? "" : `<span class="pill" title="${rcEsc(m.raw || pill)}" aria-label="${rcEsc(pill)}"><span class="pt">${rcEsc(pill)}</span></span>`}</div>${sub}</div>
      </div>`;
    if (m.none) {
      this._paint("idle", `${head}<div class="none">${rcEsc(this._t("no_device"))}</div>`, "");
      this._fitPill();
      return;
    }
    const big = m.temp && !m.building
      ? [this._fmt(m.temp.v, (m.warm || Math.abs(m.temp.v) < 10) && m.temp.v % 1 ? 1 : 0), m.target != null ? `${m.temp.unit} ${this._t("to_target", { t: `${this._fmt(m.target, m.target % 1 ? 1 : 0)}°` })}` : m.temp2 ? `${m.temp.unit} · ${this._fmt(m.temp2.v, 0)} ${m.temp2.unit}` : m.temp.unit]
      : m.watts != null
        ? pdPower(m.watts, this._lang()).split(" ")
        : ["—", ""];
    const power =
      m.switchId && c.show_controls !== false
        ? `<button class="pw${m.switchOn ? " on" : ""}" data-k="power" aria-pressed="${m.switchOn}" aria-label="${rcEsc(this._t(m.switchOn ? "turn_off" : "turn_on"))}" title="${rcEsc(this._t(m.switchOn ? "turn_off" : "turn_on"))}">${pdIcon(PD_SVG.power)}</button>`
        : "";
    const readout = `
      <div class="rd">
        <button class="rv" title="${rcEsc(m.raw)}"><span class="big">${rcEsc(big[0])}</span><span class="u">${rcEsc(big[1])}</span><span class="rl">${rcEsc(this._line(m))}</span></button>
        ${power}
      </div>`;
    this._paint(m.state, head + readout + graph, tiles.map((t) => this._tile(t)).join(""));
    this._fitPill();
  }

  _afterGrid() {
    const m = this._items;
    if (!m || m.none) return "";
    const chips = this._chips(m);
    return chips ? `<div class="chips">${chips}</div>` : "";
  }

  _bindAfter(root) {
    const m = this._items;
    if (!m || m.none) return;
    root.querySelector(".rv")?.addEventListener("click", () => rcMoreInfo(this, m.id), this._on);
    root.querySelector(".pw")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      rcCall(this._hass, m.switchId.split(".")[0], m.switchOn ? "turn_off" : "turn_on", { entity_id: m.switchId });
    }, this._on);
  }

  static styles = `
    ha-card.lvl-running { --c: #f08c00; }
    ha-card.lvl-cooling { --c: #1c7ed6; }
    ha-card.lvl-heating { --c: #e8590c; }
    ha-card.lvl-holding { --c: var(--rc-ok); }
    ha-card.lvl-alert   { --c: #e03131; }
    ha-card.lvl-done    { --c: var(--rc-ok); }
    ha-card.lvl-standby { --c: #4f7fd6; }
    ha-card.lvl-idle, ha-card.lvl-offline { --c: var(--rc-idle); }
    .tt { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; }
    .tt .title { flex: none; }
    .subt { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :host([hide-title]) .head .tt { visibility: hidden; }
    .none { margin-top: 10px; padding: 12px; border-radius: 12px; font-size: 13px; color: var(--secondary-text-color);
            background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    /* The big reading: the power, its unit, how long it has run; the plug's switch at the right. */
    .rd { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
    .rv { all: unset; flex: 1; min-width: 0; cursor: pointer; display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 4px; border-radius: 10px; }
    .rv:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .big { font-size: 40px; font-weight: 300; line-height: 1; color: var(--primary-text-color); }
    .u { font-size: 16px; color: var(--secondary-text-color); }
    .rl { flex-basis: 100%; margin-top: 6px; font-size: 14px; font-weight: 500; color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color, #212121)); }
    .lvl-idle .rl, .lvl-offline .rl { color: var(--secondary-text-color); }
    .pw { all: unset; box-sizing: border-box; flex: none; cursor: pointer; width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center;
          color: var(--secondary-text-color); background: var(--secondary-background-color, rgba(127,127,127,.12)); }
    .pw.on { color: color-mix(in srgb, var(--c) 75%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--c) 18%, transparent); }
    .pw:hover { background: color-mix(in srgb, var(--c) 26%, transparent); }
    .pw:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .pw svg { width: 24px; height: 24px; }
    /* The 24-hour curve. */
    .gr { margin-top: 12px; }
    .gh { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase; color: var(--secondary-text-color); }
    .gh svg { width: 15px; height: 15px; flex: none; }
    .gt { margin-left: auto; font-size: 11px; letter-spacing: 0; text-transform: none; color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color, #212121)); white-space: nowrap; }
    .cv { display: block; width: 100%; height: 64px; margin-top: 6px; overflow: visible; }
    .cv .base { stroke: var(--divider-color, rgba(127,127,127,.25)); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .cv .thr { stroke: var(--c); stroke-opacity: .65; stroke-width: 1; stroke-dasharray: 3 4; vector-effect: non-scaling-stroke; }
    .cv .ln { fill: none; stroke: var(--c); stroke-width: 2; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
    .cv .ar { fill: var(--c); fill-opacity: .14; stroke: none; }
    .gx { display: flex; justify-content: space-between; font-size: 10px; color: var(--secondary-text-color); margin-top: 2px; }
    /* Three tiles. */
    .grid { margin-top: 12px; gap: 8px; }
    .xt { min-width: 0; border-radius: 12px; padding: 9px 11px; display: flex; flex-direction: column; gap: 5px;
          background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .xh { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--c); }
    .lvl-idle .xh, .lvl-offline .xh { color: var(--secondary-text-color); }
    .xh svg { flex: none; width: 15px; height: 15px; }
    .xl { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .xv { font-size: 18px; font-weight: 500; line-height: 1.15; color: var(--primary-text-color); overflow-wrap: anywhere; }
    .xv small { font-size: 12px; font-weight: 400; color: var(--secondary-text-color); margin-left: 3px; }
    @container (max-width: 300px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid > :nth-child(3):last-child { grid-column: 1 / -1; }
    }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .chip { display: inline-flex; align-items: center; gap: 5px; min-width: 0; max-width: 100%; padding: 4px 10px; border-radius: 12px; font-size: 12px;
            color: var(--secondary-text-color); background: var(--secondary-background-color, rgba(127,127,127,.1)); }
    .chip svg { flex: none; width: 13px; height: 13px; }
    .chip span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Illustrated header (banner): 90 px, edge to edge, the title on the room's wall, the appliance at the right, a 10 px
       ground strip (worktop, desk, floor) at the bottom. The badge's icon is in the state's colour, grey when off. */
    .banner { position: relative; display: flex; height: 90px; margin: -12px -12px 0; overflow: hidden; background: #e9eff1;
              --bt: #0d2a45; --bs: #3b5b78; --ic: color-mix(in srgb, var(--c) 85%, #10283f); --sw: min(200px, 56%);
              --gr: #c9a27a; --gl: #e4c7a2; }
    .banner.r-laundry { background: #eaf0f3; --gr: #b9c1c8; --gl: #d3d9de; }
    .banner.r-desk { background: #eceef5; --gr: #8d6748; --gl: #b08560; }
    .banner.r-living { background: #f3ece2; --gr: #b98a5e; --gl: #d4ab82; }
    .banner.r-garage { background: #e4e6e9; --gr: #9aa1a9; --gl: #b5bbc2; }
    .banner.r-rack { background: #e5e9ef; --gr: #8c959d; --gl: #a9b1b8; }
    .banner.r-wall { background: #eef1f4; --gr: #c4ad8f; --gl: #dcc8ad; }
    .banner.r-garden { background: #dcecf7; --gr: #6faa5c; --gl: #8cc07c; }
    .banner.night { background: #232a2f; --bt: #fff; --bs: rgba(255,255,255,.78); --ic: color-mix(in srgb, var(--c) 72%, #fff); --gr: #4a3a2c; --gl: #5d4a38; }
    .banner.night.r-laundry { background: #222a30; --gr: #3a4249; --gl: #4a535b; }
    .banner.night.r-desk { background: #1d2333; --gr: #4a3626; --gl: #5d4632; }
    .banner.night.r-living { background: #272320; --gr: #4f3a28; --gl: #634a34; }
    .banner.night.r-garage { background: #24272b; --gr: #2c3035; --gl: #3a4048; }
    .banner.night.r-rack { background: #1e232a; --gr: #2a3038; --gl: #383f48; }
    .banner.night.r-wall { background: #23272c; --gr: #4a4034; --gl: #5c5042; }
    .banner.night.r-garden { background: #142036; --gr: #24402c; --gl: #2f5238; }
    .lvl-idle .banner, .lvl-offline .banner { --ic: #6b7680; }
    .lvl-idle .banner.night, .lvl-offline .banner.night { --ic: #a7b0b8; }
    .banner .head { position: relative; z-index: 1; flex: 1; min-width: 0; height: 80px; box-sizing: border-box;
                    padding: 0 calc(var(--sw) + 4px) 0 14px; flex-wrap: nowrap; }
    .banner .head::after { content: none; }
    .banner .badge { position: relative; color: var(--ic); background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(13,42,69,.12); }
    .banner.night .badge { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
    .banner .title { color: var(--bt); }
    .banner .subt { color: var(--bs); font-size: 13px; }
    .banner .tt { min-width: 0; flex: 1 1 auto; }
    .banner .room { position: absolute; right: 0; bottom: 10px; width: var(--sw); height: calc(80px * var(--sk, 1)); }
    .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: var(--gr); box-shadow: inset 0 2px 0 var(--gl); }
    /* The mini card's expand / collapse button: 24 px, frosted, 5 px from the banner's top right corner. */
    .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; width: 24px; height: 24px; margin: 0; color: #33506b;
                    background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
    .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
    .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
    /* Status pill right after the title (see pdPlacePill). */
    .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .trow > .title { flex: 0 1 auto; min-width: 0; }
    .trow > .bpill, .trow > .pill { flex: none; max-width: none; }
    :host([hide-title]) .trow .title { visibility: hidden; }
    .head:has(.trow) { flex-wrap: nowrap; }
    .head:has(.trow)::after { content: none; }
    .bpill { display: inline-flex; align-items: center; gap: 4px; min-width: 0; box-sizing: border-box; overflow: hidden;
             white-space: nowrap; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; line-height: 16px;
             background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
    .banner.night .bpill { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
    .bdot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
    .bpt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    [data-wrap] .trow { display: contents; }
    [data-wrap] .trow > .bpill, [data-wrap] .trow > .pill { order: 9; align-self: flex-start; max-width: 100%; margin-top: 3px; }
    .banner[data-wrap] .trow > .bpill { max-width: calc(100cqw - 80px); }
    [data-wrap] .subt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [data-dot] .bpill { padding: 0; background: none; }
    [data-dot] .bpt, [data-dot] .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    [data-dot] .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    [data-dot] .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    @container (max-width: 200px) {
      .bpill { padding: 0; background: none; }
      .bpt, .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
      .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
      .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    }
    /* The mini card: the banner alone, its readings as chips on the wall. */
    ha-card.bn { padding: 0; }
    ha-card.bn > .banner { margin: 0; --sw: min(200px, 46%); }
    /* Narrower cards: the room is drawn smaller (75 %, 62 %, then 50 % of its height, its left part cropped). */
    @container (max-width: 420px) { .banner, ha-card.bn > .banner { --sw: 150px; --sk: .75; } }
    @container (max-width: 340px) { .banner, ha-card.bn > .banner { --sw: 112px; --sk: .62; } }
    @container (max-width: 260px) { .banner, ha-card.bn > .banner { --sw: 70px; --sk: .5; } }
    .banner .rs { display: flex; flex-wrap: wrap; gap: 4px; height: 20px; margin: 3px 0 0 -2px; min-width: 0; overflow: hidden; }
    .banner .r { flex: none; line-height: 20px; padding: 0 7px; color: var(--bt); background: rgba(255,255,255,.62); }
    .banner .r.pill { color: color-mix(in srgb, var(--c) 60%, #10283f); background: rgba(255,255,255,.78); }
    .banner.night .r { background: rgba(10,20,40,.4); }
    .banner.night .r.pill { color: color-mix(in srgb, var(--c) 45%, #fff); background: rgba(10,20,40,.55); }
  `;
}
