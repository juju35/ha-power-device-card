// ── Mini card ────────────────────────────────────────────────────────────────
// The appliance on its banner: the state as the status pill after the title, the power and today's energy as chips
// under it; the zoom button opens the full card in place.
import { pdPower } from "./illustration.js";
import { PowerDeviceCard } from "./card.js";
import { PD_HELPERS, pdSchema } from "./editor.js";

export class PowerDeviceMiniCard extends rcMini(PowerDeviceCard, "power-device-mini-card", ".r { --t: var(--c); } .r.dim { --t: var(--rc-idle); }") {
  getCardSize() {
    return this._zoomed ? super.getCardSize() : 1;
  }

  _drawMini(m) {
    const banner = this._config.illustration !== false;
    const night = banner && this._night();
    const minute = Math.floor(Date.now() / 60000);
    if (!this._changed(["mini", m.state, m.alert, m.phase, m.model, m.temp?.v, m.target, m.watts, m.today, m.kind, m.name, m.sub, banner, night, this._dark(), minute])) return;
    this._holdHeight();
    const chip = (text, dim) => `<button class="r pill${dim ? " dim" : ""}" data-id="${rcEsc(m.id || "")}" title="${rcEsc(text)}"><span>${rcEsc(text)}</span></button>`;
    const power = m.temp && !m.building
      ? `${this._fmt(m.temp.v, (m.warm || Math.abs(m.temp.v) < 10) && m.temp.v % 1 ? 1 : 0)} ${m.temp.unit}${m.target != null ? ` ${this._t("to_target", { t: `${this._fmt(m.target, m.target % 1 ? 1 : 0)}°` })}` : ""}`
      : m.watts != null && (m.state === "running" || m.state === "standby" || m.state === "cooling" || m.state === "heating" || m.state === "holding")
        ? pdPower(m.watts, this._lang())
        : null;
    const line = ["running", "done", "cooling", "heating", "holding", "alert"].includes(m.state) || m.cold ? this._line(m) : null;
    // An outbuilding's temperature, beside what it draws.
    const inside = m.building && m.temp ? `${this._fmt(m.temp.v, m.temp.v % 1 ? 1 : 0)} ${m.temp.unit}` : null;
    const today = m.today != null ? `${this._t("t_today")} ${this._kwh(m.today)} kWh` : null;
    // A radiator's target with no room temperature to show it beside.
    const aim = m.target != null && !m.temp ? this._t("to_target", { t: `${this._fmt(m.target, m.target % 1 ? 1 : 0)}°` }) : null;
    const rest = [power, inside, aim, line, today].filter(Boolean);
    if (banner) {
      const c = this._config;
      this.shadowRoot.innerHTML = `<style>${RC_BASE_STYLES}${this.constructor.styles}</style>
        <ha-card class="lvl-${m.state} bn">${this._banner(m, rest.length ? `<div class="rs">${rest.map((t) => chip(t, true)).join("")}</div>` : "", night, m.none ? "" : this._label(m))}</ha-card>`;
      const root = this.shadowRoot;
      if (c.navigation_path) rcBindNav(root.querySelector(".head"), c.navigation_path);
      for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
      this._fitPill();
      return;
    }
    const chips = [this._label(m), ...rest].map((t, i) => chip(t, i > 0)).join("");
    this._paintMini({ level: m.state, icon: this._icon(m), status: "", chips });
    const title = this.shadowRoot.querySelector(".mini .title");
    if (title) title.textContent = m.name;
  }
}

export const PowerDeviceMiniCardEditor = rcEditor({
  card: PowerDeviceMiniCard,
  helpers: PD_HELPERS,
  schema: pdSchema(["show_title", "illustration", "show_graph", "animations", "show_controls", "zoom"]),
});

rcRegister(
  PowerDeviceMiniCard,
  PowerDeviceMiniCardEditor,
  "Power Device Mini Card",
  "The appliance on its illustrated banner: its state, power and today's energy, with a zoom to the full card",
);
