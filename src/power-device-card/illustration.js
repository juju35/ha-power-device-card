// ── Illustration ─────────────────────────────────────────────────────────────
// The banner's room, 200 × 80, drawn to its right edge: the wall and what hangs on it, by room. The appliance stands
// on the banner's ground strip (a worktop, a desk, a floor) at x = 140. By night, darker.
import { PD_ACCENTS, PD_LOOP, PD_PILOT_COLORS } from "./core.js";

export const PD_WALLS = {
  kitchen: ["#e9eff1", "#dbe3e7", "#232a2f", "#2c3439"],
  laundry: ["#eaf0f3", "#dbe4e9", "#222a30", "#2b343a"],
  desk: ["#eceef5", "#e2e5f0", "#1d2333", "#262d40"],
  living: ["#f3ece2", "#eadfcf", "#272320", "#302a25"],
  garage: ["#e4e6e9", "#d6d9dd", "#24272b", "#2d3135"],
  rack: ["#e5e9ef", "#d8dee7", "#1e232a", "#272d35"],
  wall: ["#eef1f4", "#e3e7ec", "#23272c", "#2c3137"],
  garden: ["#dcecf7", "#cfe3f1", "#142036", "#1b2942"],
};

export const pdRoom = (room, night) => {
  const [wall, joint] = night ? PD_WALLS[room].slice(2) : PD_WALLS[room];
  const ink = night ? "#3a424b" : "#c4ccd3";
  const pale = night ? "#323a42" : "#ffffff";
  const grid = (y0, step) =>
    Array.from({ length: Math.ceil((80 - y0) / step) }, (_, i) => `<line x1="0" y1="${y0 + i * step}" x2="200" y2="${y0 + i * step}"/>`).join("") +
    Array.from({ length: Math.ceil(200 / step) }, (_, i) => `<line x1="${i * step}" y1="${y0}" x2="${i * step}" y2="80"/>`).join("");
  const back = {
    kitchen: `<g stroke="${joint}" stroke-width=".8">${grid(36, 11)}</g>
      <rect x="6" y="0" width="64" height="20" rx="2" fill="${pale}" stroke="${ink}"/><path d="M38 0v20" stroke="${ink}"/>
      <rect x="30" y="13" width="5" height="2" rx="1" fill="${ink}"/><rect x="41" y="13" width="5" height="2" rx="1" fill="${ink}"/>
      <rect x="22" y="62" width="12" height="18" rx="3" fill="${night ? "#4a5560" : "#cfd8dc"}"/><rect x="24" y="58" width="8" height="5" rx="1" fill="${night ? "#6b4c3a" : "#c49a6c"}"/>
      <rect x="40" y="66" width="20" height="14" rx="2" fill="${night ? "#5a4636" : "#d8b48a"}"/>`,
    laundry: `<g stroke="${joint}" stroke-width=".8">${grid(36, 11)}</g>
      <rect x="10" y="28" width="56" height="2.4" fill="${night ? "#4a4f56" : "#b9a68a"}"/>
      <rect x="14" y="16" width="9" height="12" rx="2" fill="#5aa9e6" opacity=".85"/><rect x="27" y="18" width="9" height="10" rx="2" fill="#d4537e" opacity=".85"/><rect x="40" y="15" width="8" height="13" rx="2" fill="#7cb87a" opacity=".85"/>
      <path d="M18 80l3-16h26l3 16z" fill="${night ? "#5b4a3a" : "#d9c3a0"}"/><path d="M22 64h24" stroke="${ink}"/>`,
    desk: `<rect x="12" y="8" width="34" height="26" rx="2" fill="${pale}" stroke="${ink}"/><path d="M16 30l9-11 6 6 5-4 7 9z" fill="${night ? "#4b5a78" : "#b9c6d8"}"/>
      <rect x="56" y="66" width="12" height="14" rx="3" fill="${night ? "#6b4c3a" : "#c49a6c"}"/><path d="M62 66c-8-9-2-16 0-18 2 2 8 9 0 18z" fill="#6fae6a"/>`,
    living: `<rect x="8" y="6" width="38" height="46" rx="2" fill="${night ? "#0d1a30" : "#cfe3f5"}" stroke="${pale}" stroke-width="3"/><path d="M27 6v46M8 29h38" stroke="${pale}" stroke-width="2"/>
      ${night ? '<circle cx="38" cy="16" r="5" fill="#e9e4c9"/><circle cx="40.5" cy="14.5" r="5" fill="#0d1a30"/>' : '<circle cx="38" cy="16" r="4" fill="#ffd166"/>'}
      <rect x="54" y="60" width="14" height="20" rx="3" fill="${night ? "#6b4c3a" : "#d8b48a"}"/><path d="M61 60c-9-10-3-18 0-20 3 2 9 10 0 20z" fill="#7fb47a"/>`,
    garage: `<rect x="6" y="6" width="66" height="44" rx="2" fill="${night ? "#3a3530" : "#d8c3a2"}"/>
      <g fill="${night ? "#2a2622" : "#b59c78"}">${Array.from({ length: 24 }, (_, i) => `<circle cx="${11 + (i % 8) * 8}" cy="${12 + Math.floor(i / 8) * 13}" r="1"/>`).join("")}</g>
      <path d="M18 14v22M14 14h8" stroke="${night ? "#8c96a3" : "#5b6470"}" stroke-width="3" stroke-linecap="round"/>
      <path d="M36 14l10 20M44 12l-6 4" stroke="${night ? "#8c96a3" : "#5b6470"}" stroke-width="3" stroke-linecap="round"/>
      <rect x="54" y="16" width="12" height="20" rx="2" fill="#e5484d"/>`,
    rack: `<rect x="0" y="0" width="200" height="5" fill="${night ? "#2f353e" : "#c4ccd6"}"/><path d="M10 5v14M40 5v10M70 5v18" stroke="${night ? "#4a5563" : "#9aa7b6"}" stroke-width="2"/>
      <rect x="14" y="40" width="40" height="28" rx="3" fill="${pale}" stroke="${ink}"/><path d="M20 48h28M20 54h20M20 60h24" stroke="${ink}" stroke-width="2"/>`,
    garden: night
      ? `<g fill="#e9e4c9">${[[14, 10], [36, 22], [58, 8], [80, 18], [70, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9"/>`).join("")}</g>
      <circle cx="90" cy="12" r="5" fill="#e9e4c9"/><circle cx="92.5" cy="10.5" r="5" fill="${wall}"/>
      <path d="M0 80V68q10-6 20 0t20 0 20 0 20 0 14 2V80z" fill="#1f3326"/><path d="M84 80V52q-6-2-6-9t8-10 10 6 2 9-8 6v26z" fill="#22382a"/>`
      : `<g fill="#ffffff" opacity=".85"><ellipse cx="22" cy="14" rx="12" ry="4"/><ellipse cx="30" cy="11" rx="7" ry="4"/><ellipse cx="70" cy="22" rx="10" ry="3.4"/></g>
      <path d="M0 80V68q10-6 20 0t20 0 20 0 20 0 14 2V80z" fill="#a9cf9a"/><path d="M86 80V58" stroke="#8a6a4a" stroke-width="2.2"/><circle cx="86" cy="50" r="9" fill="#8cc07c"/><circle cx="80" cy="54" r="6" fill="#9ccb8b"/>`,
    wall: `<rect x="0" y="74" width="200" height="6" fill="${night ? "#2f353d" : "#ffffff"}" stroke="${ink}" stroke-width=".6"/>
      <rect x="20" y="10" width="30" height="22" rx="2" fill="${pale}" stroke="${ink}"/><path d="M24 28l7-8 5 5 4-3 6 6z" fill="${night ? "#4b5a78" : "#b9c6d8"}"/>`,
  }[room];
  return `<rect width="200" height="80" fill="${wall}"/>${back}`;
};

// Steam rising above (x, y), when the appliance runs; still, three faint wisps; nothing otherwise.
export const pdSteam = (x, y, on, moving, gap = 9) =>
  on
    ? [0, 1, 2]
        .map((k) => {
          const d = `M${x + (k - 1) * gap} ${y}c-3-4 3-7 0-11`;
          if (!moving) return `<path d="${d}" stroke="#b7c3ca" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`;
          const begin = ((k * PD_LOOP) / 3).toFixed(2);
          return `<path d="${d}" stroke="#b7c3ca" stroke-width="2" fill="none" stroke-linecap="round" opacity="0"><animate attributeName="opacity" values="0;.85;0" dur="${PD_LOOP}s" begin="${begin}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 3;0 -5" dur="${PD_LOOP}s" begin="${begin}s" repeatCount="indefinite"/></path>`;
        })
        .join("")
    : "";
// A blinking LED: `on` steady, `moving` blinking (each its own phase).
export const pdLed = (x, y, color, on, moving, phase = 0, r = 1.6) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${on ? color : "#59616b"}">${on && moving ? `<animate attributeName="opacity" values="1;.25;1" dur="${(PD_LOOP / 2).toFixed(2)}s" begin="${phase.toFixed(2)}s" repeatCount="indefinite"/>` : ""}</circle>`;
// A drum turning (washer, dryer): `parts` drawn around (cx, cy), one turn per loop.
export const pdSpin = (cx, cy, parts, moving) =>
  `<g>${parts}${moving ? `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : ""}</g>`;

// Frost: small crystals by (x, y) pairs, twinkling while the compressor runs; none when it rests.
export const pdFrost = (pts, on, moving) =>
  on
    ? pts
        .map(([x, y], k) => {
          const d = `M${x} ${y - 4}l3 4-3 4-3-4z`;
          return `<path d="${d}" fill="#74c0fc" opacity=".9">${moving ? `<animate attributeName="opacity" values=".15;.95;.15" dur="${PD_LOOP}s" begin="${((k * PD_LOOP) / pts.length).toFixed(2)}s" repeatCount="indefinite"/>` : ""}</path>`;
        })
        .join("")
    : "";
// A display: the temperature (or nothing) in blue, red when it is too warm.
export const pdLcd = (x, y, text, hot) =>
  `<rect x="${x}" y="${y}" width="15" height="7.5" rx="1.5" fill="#1d2128"/>${text ? `<text x="${x + 7.5}" y="${y + 5.8}" text-anchor="middle" font-family="Roboto,sans-serif" font-weight="700" font-size="5.5" fill="${hot ? "#ff8787" : "#74c0fc"}">${rcEsc(text)}</text>` : ""}`;
export const pdHandle = (x, y, l, horizontal = false) =>
  horizontal ? `<rect x="${x}" y="${y}" width="${l}" height="2.6" rx="1.3" fill="#adb5bd"/>` : `<rect x="${x}" y="${y}" width="2.6" height="${l}" rx="1.3" fill="#adb5bd"/>`;
// A door left open on the right of (x, y, w, h): the lit inside with its shelves, the door swung towards us.
export const pdOpenDoor = (x, y, w, h, moving) => {
  const shelves = [0.3, 0.55, 0.8].map((f) => `<path d="M${x + 2} ${y + h * f}h${w - 4}" stroke="#e9d8a6" stroke-width="1.2"/>`).join("");
  const out = w * 0.42;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff6d6"/>${shelves}
    <rect x="${x + 4}" y="${y + h * 0.55 - 6}" width="6" height="6" rx="1" fill="#ffa94d"/><rect x="${x + 12}" y="${y + h * 0.8 - 8}" width="5" height="8" rx="1" fill="#69db7c"/>
    <path d="M${x + w} ${y}l${out} -3v${h + 6}l-${out} -3z" fill="#f1f3f5" stroke="#adb5bd" stroke-width=".8"/>
    <rect x="${x + w + out - 5}" y="${y + 8}" width="2.4" height="${Math.min(22, h * 0.4)}" rx="1.2" fill="#adb5bd"/>
    <circle cx="${x + w / 2}" cy="${y + 4}" r="2" fill="#ffe066">${moving ? `<animate attributeName="opacity" values="1;.55;1" dur="${(PD_LOOP / 2).toFixed(2)}s" repeatCount="indefinite"/>` : ""}</circle>`;
};
// A fridge by model, centred on x = 140: white panels, handles, a display, frost while the compressor runs.
export const pdFridge = (model, { on, moving, door, night, temp, hot }) => {
  const body = night ? "#c3cad2" : "#f8f9fb";
  const edge = night ? "#8a939d" : "#c3cad2";
  const shine = `opacity="${night ? 0.12 : 0.55}"`;
  if (model === "american" || model === "multi_door") {
    const top = model === "american" ? 76 : 42;
    const doors =
      model === "american"
        ? `<rect x="114" y="18" width="16" height="22" rx="3" fill="#1d2128"/><path d="M122 28v7" stroke="#74c0fc" stroke-width="1.8" stroke-linecap="round"/>${pdHandle(134, 18, 30)}${door ? "" : pdHandle(143.4, 18, 30)}`
        : `${pdHandle(134, 14, 22)}${door ? "" : pdHandle(143.4, 14, 22)}<path d="M108 46h64M108 63h64" stroke="${edge}" stroke-width="1.3"/>${pdHandle(128, 51, 24, true)}${pdHandle(128, 69, 24, true)}`;
    return `<rect x="108" y="4" width="64" height="76" rx="5" fill="${model === "american" ? (night ? "#9aa3ad" : "#dfe4ea") : body}" stroke="${edge}"/>
      <rect x="109" y="5" width="12" height="74" rx="4" fill="#fff" ${shine}/><path d="M140 4v${top}" stroke="${edge}" stroke-width="1.3"/>${doors}
      ${pdLcd(150, 9, temp, hot)}${door ? pdOpenDoor(141, 5, 30, top - 2, moving) : ""}${pdFrost([[180, 22], [184, 40], [178, 56]], on && !door, moving)}`;
  }
  const split = model === "combi" ? 52 : null;
  return `<rect x="120" y="${split ? 4 : 8}" width="40" height="${split ? 76 : 72}" rx="5" fill="${body}" stroke="${edge}"/>
    <rect x="121" y="${split ? 5 : 9}" width="9" height="${split ? 74 : 70}" rx="4" fill="#fff" ${shine}/>
    ${split ? `<path d="M120 ${split}h40" stroke="${edge}" stroke-width="1.4"/>${pdHandle(152, 57, 14)}` : ""}
    ${door ? "" : pdHandle(152, split ? 14 : 20, 24)}${pdLcd(125, split ? 9 : 13, temp, hot)}
    ${door ? pdOpenDoor(121, split ? 5 : 9, 38, (split || 80) - (split ? 6 : 10), moving) : ""}${pdFrost([[168, 24], [172, 42], [166, 58]], on && !door, moving)}`;
};
// A freezer: a chest (a lid on a low box) or an upright one with three drawers.
export const pdFreezer = (model, { on, moving, night, temp, hot }) => {
  const body = night ? "#c3cad2" : "#f8f9fb";
  const edge = night ? "#8a939d" : "#c3cad2";
  if (model === "chest")
    return `<rect x="98" y="44" width="84" height="36" rx="5" fill="${body}" stroke="${edge}"/><rect x="94" y="37" width="92" height="9" rx="3.5" fill="${night ? "#d0d6dd" : "#ffffff"}" stroke="${edge}"/>
      ${pdHandle(132, 47, 16, true)}${pdLcd(160, 54, temp, hot)}${pdLed(106, 56, "#34d399", true, false)}
      <rect x="100" y="66" width="80" height="2" rx="1" fill="${edge}" opacity=".5"/>${pdFrost([[112, 28], [128, 24], [144, 28], [160, 24], [176, 28]], on, moving)}`;
  const drawers = [0, 1, 2].map((k) => `<path d="M119 ${24 + k * 18.6}h42" stroke="${edge}" stroke-width="1.3"/>${pdHandle(131, 29 + k * 18.6, 18, true)}`).join("");
  return `<rect x="119" y="6" width="42" height="74" rx="5" fill="${body}" stroke="${edge}"/><rect x="120" y="7" width="9" height="72" rx="4" fill="#fff" opacity="${night ? 0.12 : 0.55}"/>
    ${pdLcd(125, 11, temp, hot)}${drawers}${pdFrost([[170, 26], [174, 44], [168, 60]], on, moving)}`;
};
// A filter coffee maker: coffee drips into the jug while it brews (the jug fills), then its plate glows red.
export const pdFilterCoffee = ({ on, moving, phase, night, uid }) => {
  const brewing = on && phase === "brewing";
  const warm = on && phase === "warm";
  const dark = night ? "#1b1f25" : "#343a40";
  const level = brewing
    ? `<rect x="122" y="58" width="22" height="11" fill="#6f4518">${moving ? `<animate attributeName="y" values="66;56;66" dur="${PD_LOOP}s" repeatCount="indefinite"/><animate attributeName="height" values="3;13;3" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : ""}</rect>`
    : warm
      ? '<rect x="122" y="55" width="22" height="14" fill="#6f4518"/>'
      : "";
  const drip = brewing
    ? `<path d="M133 29v26" stroke="#6f4518" stroke-width="1.8" stroke-dasharray="2 3">${moving ? `<animate attributeName="stroke-dashoffset" values="10;0" dur="${(PD_LOOP / 4).toFixed(2)}s" repeatCount="indefinite"/>` : ""}</path>`
    : "";
  const plate = `<rect x="118" y="69" width="30" height="3" rx="1" fill="${warm ? "#ff6b6b" : "#59616b"}">${warm && moving ? `<animate attributeName="opacity" values="1;.55;1" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : ""}</rect>`;
  return `${pdSteam(133, 40, warm, moving, 6)}<rect x="114" y="13" width="52" height="16" rx="5" fill="${dark}"/><rect x="150" y="29" width="16" height="44" fill="${dark}"/>
    <rect x="112" y="72" width="56" height="8" rx="3" fill="${dark}"/>${plate}${pdLed(158, 38, "#ff6b6b", on, false)}
    <clipPath id="j${uid}"><path d="M120 44h26l-2.4 25h-21.2z"/></clipPath><g clip-path="url(#j${uid})">${level}</g>
    <path d="M120 44h26l-2.4 25h-21.2z" fill="#e7f5ff" fill-opacity=".35" stroke="#adb5bd" stroke-width=".9"/>
    <path d="M146 48h3.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H145" stroke="#adb5bd" fill="none" stroke-width="2"/><rect x="127" y="41" width="12" height="3" rx="1" fill="${dark}"/>${drip}`;
};

// A radiator, drawn as the heating card draws it (ha-heating-card), in this card's room: a column radiator on the wall
// (`column`), an oil-filled one on its casters (`oil`) or a towel rail (`towel`). Its columns glow from the bottom up
// and heat rises while it heats, in `color` (orange heating; green eco, blue frost protection from its pilot wire).
export const pdRadiator = (model, { on, moving, uid, color, night }) => {
  const id = (n) => `${n}${uid}`;
  const steel = night ? ["#5b636e", "#8a94a0", "#4a525c"] : ["#d5dbe2", "#ffffff", "#c9d0d8"];
  const line = night ? "#6b7480" : "#c3cad2";
  const defs = `<defs><linearGradient id="${id("rc")}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${steel[0]}"/><stop offset=".45" stop-color="${steel[1]}"/><stop offset="1" stop-color="${steel[2]}"/></linearGradient>
    <linearGradient id="${id("rg")}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${color}" stop-opacity=".75"/><stop offset=".7" stop-color="${color}" stop-opacity=".18"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id("rh")}" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>`;
  const glowAnim = moving ? `<animate attributeName="opacity" values=".55;1;.55" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : "";
  const glow = (x, y, w, h, r) => (on ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#${id("rg")})">${glowAnim}</rect>` : "");
  const col = (x, y1, y2, w = 7) => `<rect x="${x}" y="${y1}" width="${w}" height="${y2 - y1}" rx="${w / 2}" fill="url(#${id("rc")})" stroke="${line}" stroke-width=".9"/>${glow(x, y1, w, y2 - y1, w / 2)}`;
  const waves = (xs, y) =>
    on
      ? `<g stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".75">${xs
          .map((x, i) => {
            const a = moving ? `<animateTransform attributeName="transform" type="translate" values="0 3;0 -4" dur="${PD_LOOP}s" begin="${((i * PD_LOOP) / xs.length).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="${PD_LOOP}s" begin="${((i * PD_LOOP) / xs.length).toFixed(2)}s" repeatCount="indefinite"/>` : "";
            return `<path d="M${x} ${y}q-2-2.5 0-5t0-5">${a}</path>`;
          })
          .join("")}</g>`
      : "";
  const led = `<circle cx="0" cy="0" r="1.3" fill="${on ? color : "#9aa5b1"}">${on && moving ? `<animate attributeName="opacity" values="1;.35;1" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : ""}</circle>`;
  const ledAt = (x, y) => led.replace('cx="0" cy="0"', `cx="${x}" cy="${y}"`);
  if (model === "towel") {
    const bars = Array.from({ length: 11 }, (_, i) => {
      const y = 10 + i * 7;
      return `<rect x="17" y="${y}" width="46" height="3.2" rx="1.6" fill="url(#${id("rc")})" stroke="${line}" stroke-width=".5"/>${glow(17, y, 46, 3.2, 1.6)}`;
    }).join("");
    return `${defs}<svg x="117" y="16" width="46" height="64" viewBox="8 2 64 90" overflow="visible">
      ${on ? `<circle cx="40" cy="46" r="34" fill="url(#${id("rh")})"/>` : ""}${waves([10, 70], 40)}
      <rect x="14" y="6" width="5" height="80" rx="2.5" fill="url(#${id("rc")})" stroke="${line}" stroke-width=".6"/>
      <rect x="61" y="6" width="5" height="80" rx="2.5" fill="url(#${id("rc")})" stroke="${line}" stroke-width=".6"/>${bars}
      <path d="M27 22h26v38c-4 5-22 5-26 0z" fill="#ff922b"/><path d="M27 22h26v5H27z" fill="#e8590c"/>
      <path d="M33 29v28M40 29v30M47 29v28" fill="none" stroke="#fff" stroke-width=".8" opacity=".4"/>
      <rect x="57" y="79" width="12" height="8" rx="2" fill="#3a434e"/>${ledAt(63, 83)}</svg>`;
  }
  if (model === "oil") {
    const fins = Array.from({ length: 7 }, (_, i) => col(12 + i * 8.4, 30, 80)).join("");
    return `${defs}<svg x="108" y="18" width="64" height="62" viewBox="4 26 76 66" overflow="visible">${waves([22, 40, 58], 22)}
      <rect x="10" y="78" width="62" height="4" rx="2" fill="#8f9aa6"/>${fins}
      <rect x="4" y="44" width="9" height="18" rx="2.5" fill="#3a434e"/>${ledAt(8.5, 48)}<circle cx="8.5" cy="56" r="2.4" fill="#5d6874" stroke="#8f9aa6" stroke-width=".5"/>
      <circle cx="16" cy="87" r="3.4" fill="#3a434e"/><circle cx="66" cy="87" r="3.4" fill="#3a434e"/>
      <path d="M16 82v2M66 82v2" stroke="#8f9aa6" stroke-width="2"/></svg>`;
  }
  const columns = Array.from({ length: 7 }, (_, i) => col(8 + i * 8.6, 28, 84)).join("");
  return `${defs}<svg x="109" y="18" width="62" height="62" viewBox="4 26 75 63" overflow="visible">${waves([22, 40, 58], 22)}
    <rect x="12" y="82" width="4" height="6" rx="1" fill="#8f9aa6"/><rect x="60" y="82" width="4" height="6" rx="1" fill="#8f9aa6"/>${columns}
    <rect x="6" y="31" width="64" height="3.4" rx="1.7" fill="${steel[1]}" stroke="${line}" stroke-width=".6"/>
    <rect x="6" y="77" width="64" height="3.4" rx="1.7" fill="${steel[1]}" stroke="${line}" stroke-width=".6"/>
    <rect x="70" y="42" width="7" height="22" rx="2.2" fill="#3a434e"/>${ledAt(73.5, 47)}
    <circle cx="73.5" cy="56" r="2.2" fill="#5d6874" stroke="#8f9aa6" stroke-width=".5"/></svg>`;
};

// An outbuilding at the bottom of the garden, its feet on y = 80: a garden shed (`shed`), a workshop or garage
// (`workshop`), a lived-in annex or studio (`studio`) or a pool house (`pool_house`). Its windows light up with what it
// draws — dimly on standby, brightly in use — and in use it comes alive: a lamp flickers in the shed, the workshop's
// vent turns, smoke rises from the studio's chimney, the pool's water ripples. The door and the window open with their
// sensors; frost forms on the glass when it is too cold.
export const pdBuilding = (model, { on, standby, moving, night, door, win, frost }) => {
  const lit = on ? "#ffd27a" : standby ? (night ? "#d9b46a" : "#f3dfa6") : night ? "#1b2532" : "#a9c3d6";
  const inside = on || standby ? (night ? "#e7b75d" : "#ffe1a0") : night ? "#141a22" : "#3d4651";
  const frame = night ? "#c9d1d8" : "#ffffff";
  const flicker = on && moving ? `<animate attributeName="opacity" values="1;.78;1;.9;1" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : "";
  // A window at (x, y), w × h: lit glass, its frame and cross bar; open, the sash swung out to the right.
  const pane = (x, y, w, h, bar = true) => {
    const glass = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${win ? inside : lit}">${flicker}</rect>`;
    const sash = win
      ? `<path d="M${x + w} ${y}l${(w * 0.45).toFixed(1)} 3v${h - 6}l-${(w * 0.45).toFixed(1)} 3z" fill="${night ? "#2a3644" : "#cfe0ec"}" stroke="${frame}" stroke-width="1.4"/>`
      : bar
        ? `<path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="${frame}" stroke-width="1.2"/>`
        : "";
    const ice = frost ? pdFrost([[x + w * 0.3, y + h * 0.55], [x + w * 0.72, y + h * 0.4]], true, moving) : "";
    return `${glass}<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${frame}" stroke-width="1.6"/>${sash}${ice}`;
  };
  // A door at (x, y), w × h ending on the ground: closed, its leaf and handle; open, the inside and the leaf swung out.
  const leaf = (x, y, w, h, color, glass = false) =>
    door
      ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${inside}">${flicker}</rect><path d="M${x} ${y}l-${(w * 0.55).toFixed(1)} -3v${h + 3}l${(w * 0.55).toFixed(1)} 0z" fill="${color}" stroke="${night ? "#1b2027" : "#5b4636"}" stroke-width=".8"/>`
      : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="${night ? "#1b2027" : "#5b4636"}" stroke-width=".8"/>${glass ? `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h * 0.42}" fill="${lit}">${flicker}</rect>` : ""}<circle cx="${x + w - 3.5}" cy="${y + h * 0.55}" r="1.3" fill="${night ? "#c9d1d8" : "#e8d9b0"}"/>`;
  // The light spilling on the ground from the lit windows and the open door.
  const spill = on || standby ? `<ellipse cx="140" cy="80" rx="40" ry="3" fill="#ffd27a" opacity="${on ? 0.45 : 0.22}"/>` : "";
  if (model === "workshop") {
    const wall = night ? "#59616b" : "#cfd4d9";
    const gate = night ? "#7a838d" : "#eef1f3";
    const slats = [0, 1, 2, 3, 4].map((k) => `<path d="M104 ${55 + k * 5}h40" stroke="${night ? "#5c646e" : "#c3cad1"}" stroke-width="1"/>`).join("");
    const opening = door
      ? `<rect x="104" y="50" width="40" height="30" fill="${inside}">${flicker}</rect><rect x="104" y="50" width="40" height="5" fill="${gate}" stroke="${night ? "#3d434b" : "#aab3bc"}" stroke-width=".8"/>`
      : `<rect x="104" y="50" width="40" height="30" fill="${gate}" stroke="${night ? "#3d434b" : "#aab3bc"}" stroke-width=".8"/>${slats}`;
    const blades = '<path d="M165 70l0-5M165 70l4.3 2.5M165 70l-4.3 2.5" stroke="#5b6470" stroke-width="2" stroke-linecap="round"/>';
    return `${spill}<rect x="98" y="38" width="86" height="42" fill="${wall}"/><path d="M93 41l96-12v7l-96 11z" fill="${night ? "#3a4048" : "#6b7480"}"/>
      ${opening}${pane(152, 46, 24, 13)}<rect x="157" y="62" width="16" height="16" rx="2" fill="${night ? "#3a4048" : "#e3e7ea"}" stroke="${night ? "#2a2f36" : "#9aa3ae"}"/>
      <circle cx="165" cy="70" r="6" fill="none" stroke="#5b6470" stroke-width="1"/>${pdSpin(165, 70, blades, on && moving)}`;
  }
  if (model === "studio") {
    const wall = night ? "#8c857a" : "#f4efe6";
    return `${pdSteam(164, 10, on, moving, 4)}${spill}<rect x="158" y="14" width="10" height="20" fill="${night ? "#5a4e46" : "#b46a4e"}"/><rect x="156" y="12" width="14" height="4" fill="${night ? "#4a403a" : "#8f513b"}"/>
      <rect x="102" y="40" width="76" height="40" fill="${wall}"/><path d="M94 42L140 13l46 29z" fill="${night ? "#3f4852" : "#5f6b78"}"/>
      <path d="M100 42h80" stroke="${night ? "#2c333b" : "#46505b"}" stroke-width="2"/>
      ${leaf(110, 52, 16, 28, night ? "#4b5a6a" : "#5b7ea6", true)}${pane(134, 50, 36, 18)}
      <rect x="132" y="68" width="40" height="2.4" fill="${night ? "#b9b2a6" : "#e0d8ca"}"/>`;
  }
  if (model === "pool_house") {
    const clad = night ? "#6b5640" : "#c99a6b";
    const water = `<rect x="174" y="72" width="30" height="8" fill="${night ? "#1f5f86" : "#5ec1ea"}"/>${
      on
        ? `<path d="M176 75q3-2 6 0t6 0 6 0 6 0" stroke="#e8f7ff" stroke-width="1" fill="none" opacity=".85">${moving ? `<animateTransform attributeName="transform" type="translate" values="0 0;-6 0;0 0" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : ""}</path>`
        : ""
    }<rect x="172" y="71" width="32" height="2" fill="${night ? "#9aa3ae" : "#eef1f3"}"/>`;
    const slide = door
      ? `<rect x="110" y="48" width="36" height="32" fill="${inside}">${flicker}</rect><rect x="128" y="48" width="18" height="32" fill="${lit}" opacity=".55" stroke="${frame}" stroke-width="1.4"/>`
      : `<rect x="110" y="48" width="36" height="32" fill="${lit}">${flicker}</rect><path d="M128 48v32" stroke="${frame}" stroke-width="1.6"/>`;
    const beams = [0, 1, 2, 3].map((k) => `<rect x="${170 + k * 7}" y="33" width="3" height="4" fill="${night ? "#8a939d" : "#ffffff"}"/>`).join("");
    return `${spill}<rect x="104" y="40" width="64" height="40" fill="${clad}"/><g stroke="${night ? "#5a4733" : "#b5885c"}" stroke-width=".8">${[46, 52, 58, 64, 70, 76].map((y) => `<path d="M104 ${y}h64"/>`).join("")}</g>
      <rect x="98" y="34" width="76" height="6" rx="1" fill="${night ? "#c9d1d8" : "#ffffff"}" stroke="${night ? "#8a939d" : "#c9d1d8"}" stroke-width=".6"/>
      <rect x="170" y="33" width="28" height="2" fill="${night ? "#8a939d" : "#ffffff"}"/>${beams}<path d="M196 35v37" stroke="${night ? "#8a939d" : "#ffffff"}" stroke-width="2"/>
      ${slide}<rect x="110" y="48" width="36" height="32" fill="none" stroke="${frame}" stroke-width="1.6"/>${pane(152, 50, 11, 12, false)}${water}`;
  }
  // The garden shed: wooden planks, a gabled roof, a plank door and a small window; a lamp hangs inside.
  const wood = night ? "#5a4330" : "#b07d4f";
  const planks = Array.from({ length: 11 }, (_, i) => `<path d="M${110 + i * 6} 42v38" stroke="${night ? "#4a3626" : "#9a6a40"}" stroke-width=".9"/>`).join("");
  return `${spill}<rect x="106" y="42" width="68" height="38" fill="${wood}"/>${planks}
    <path d="M98 44L140 18l42 26z" fill="${night ? "#3d3530" : "#6b4a3a"}"/><path d="M98 44L140 18l42 26" stroke="${night ? "#2a2420" : "#523628"}" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
    <circle cx="140" cy="33" r="3.2" fill="${on ? "#ffd27a" : night ? "#2a3644" : "#f2e6d0"}" stroke="${night ? "#2a2420" : "#523628"}" stroke-width="1">${flicker}</circle>
    ${leaf(118, 50, 18, 30, night ? "#6b5039" : "#c79566")}${pane(148, 52, 16, 13)}`;
};

// The appliance, its feet on y = 80, centred on x = 140. `on`: running (or on standby for what has a screen),
// `moving`: animated. `uid` keeps the gradients of several cards apart.
export const pdDevice = (kind, { on, standby, moving, uid, night, accent, model, door, win, frost, phase, temp, hot }) => {
  const steel = night ? ["#4a515b", "#30353c", "#666e79"] : ["#fbfcfe", "#dfe4ea", "#b9c1cb"];
  const dark = night ? "#1b1f25" : "#2b2f36";
  const glow = `url(#g${uid})`;
  const screen = on ? `url(#s${uid})` : standby ? (night ? "#20283a" : "#3a4458") : night ? "#111418" : "#1d2128";
  switch (kind) {
    case "airfryer":
      return `${pdSteam(140, 18, on, moving)}<rect x="114" y="24" width="52" height="56" rx="13" fill="${dark}"/>
        <rect x="124" y="30" width="32" height="9" rx="2" fill="#12151b"/>${on ? '<rect x="130" y="33" width="20" height="3" rx="1.5" fill="#ff9a3c"/>' : ""}
        <rect x="121" y="44" width="38" height="24" rx="7" fill="${on ? glow : "#3a3f47"}" stroke="#454b55" stroke-width="2"/>
        <rect x="132" y="70" width="16" height="5" rx="2.5" fill="#4a505a"/>`;
    case "kettle":
      return `${pdSteam(128, 28, on, moving, 6)}<path d="M124 34h32l5 42h-42z" fill="${steel[1]}" stroke="${steel[2]}" stroke-width="1.5"/>
        <rect x="128" y="42" width="8" height="28" rx="3" fill="#a9d6f5"/>${on ? '<rect x="128" y="56" width="8" height="14" rx="3" fill="#ff9a3c"/>' : ""}
        <path d="M161 40c13 2 13 26 1 30" stroke="${steel[2]}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M124 36l-11-6" stroke="${steel[2]}" stroke-width="4" stroke-linecap="round"/>
        <rect x="116" y="76" width="50" height="4" rx="2" fill="#5b6470"/>${pdLed(158, 78, "#ff7a1a", on, false)}`;
    case "toaster":
      return `${pdSteam(140, 36, on, moving, 12)}<rect x="110" y="46" width="60" height="34" rx="10" fill="${steel[1]}" stroke="${steel[2]}"/>
        <rect x="120" y="44" width="16" height="5" rx="2" fill="${on ? "#ff8a3c" : "#3b4048"}"/><rect x="144" y="44" width="16" height="5" rx="2" fill="${on ? "#ff8a3c" : "#3b4048"}"/>
        ${on ? "" : '<path d="M122 45v-7q0-5 6-5t6 5v7zM146 45v-7q0-5 6-5t6 5v7z" fill="#e2b57a" stroke="#b9854a"/>'}
        <rect x="168" y="${on ? 66 : 54}" width="6" height="4" rx="1.5" fill="#5b6470"/><rect x="118" y="64" width="44" height="2" rx="1" fill="${steel[2]}" opacity=".7"/>`;
    case "outbuilding":
      return pdBuilding(model, { on, standby, moving, night, door, win, frost });
    case "radiator":
      return pdRadiator(model, { on, moving, uid, night, color: PD_PILOT_COLORS[phase] || PD_ACCENTS.heating });
    case "fridge":
      return pdFridge(model, { on, moving, door, night, temp, hot });
    case "freezer":
      return pdFreezer(model, { on, moving, night, temp, hot });
    case "coffee":
      if (model === "filter") return pdFilterCoffee({ on, moving, phase, night, uid });
      return `${pdSteam(140, 50, on, moving, 5)}<rect x="116" y="14" width="48" height="66" rx="6" fill="${dark}"/><rect x="116" y="14" width="48" height="16" rx="6" fill="#3d434d"/>
        <rect x="128" y="34" width="24" height="6" rx="2" fill="#4a505a"/>${on ? `<line x1="140" y1="40" x2="140" y2="64" stroke="#6b3e1f" stroke-width="2">${moving ? `<animate attributeName="stroke-dasharray" values="0 30;24 30" dur="${PD_LOOP / 2}s" repeatCount="indefinite"/>` : ""}</line>` : ""}
        <path d="M131 62h18l-2 14h-14z" fill="#ffffff" stroke="#c9d1d8"/><rect x="118" y="76" width="44" height="4" rx="1" fill="#4a505a"/>${pdLed(158, 22, "#34d399", on, false)}`;
    case "beer":
      return `<rect x="112" y="36" width="56" height="44" rx="8" fill="${steel[1]}" stroke="${steel[2]}"/><path d="M120 36q20-20 40 0z" fill="${steel[0]}" stroke="${steel[2]}"/>
        <rect x="134" y="20" width="12" height="8" rx="3" fill="${dark}"/><rect x="138" y="8" width="4" height="14" rx="2" fill="#9aa3ae"/>
        <rect x="124" y="46" width="32" height="12" rx="3" fill="#12151b"/><text x="140" y="55" text-anchor="middle" font-family="Roboto,sans-serif" font-size="8" font-weight="700" fill="${on ? "#7cc4ff" : "#59616b"}">3°</text>
        ${on ? `<g stroke="#7cc4ff" stroke-width="1.4" stroke-linecap="round" opacity=".8"><path d="M172 44v10M167 46.5l10 5M167 51.5l10-5"/></g>` : ""}
        <path d="M128 62h24l-2 16h-20z" fill="#f2a93b" stroke="#c9d1d8"/><rect x="128" y="62" width="24" height="4" fill="#fff8e7"/>`;
    case "dishwasher":
      return `<rect x="112" y="10" width="56" height="70" rx="4" fill="${steel[1]}" stroke="${steel[2]}"/><rect x="112" y="10" width="56" height="10" rx="4" fill="${steel[2]}"/>
        <rect x="118" y="13" width="20" height="4" rx="1" fill="#12151b"/>${pdLed(160, 15, accent, on, moving)}
        <rect x="120" y="30" width="40" height="5" rx="2.5" fill="${steel[0]}" stroke="${steel[2]}"/>
        ${on ? `<rect x="118" y="78" width="44" height="3" rx="1.5" fill="#5aa9e6">${moving ? `<animate attributeName="opacity" values=".4;1;.4" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : ""}</rect>` : ""}`;
    case "washer":
    case "dryer": {
      const inside =
        kind === "washer"
          ? `<circle cx="140" cy="54" r="12" fill="${on ? "#7cbcf0" : night ? "#2c3440" : "#dfe8ef"}"/>${pdSpin(140, 54, '<circle cx="134" cy="50" r="4" fill="#d4537e"/><circle cx="146" cy="58" r="4.5" fill="#f5b400"/><circle cx="144" cy="48" r="3" fill="#7cb87a"/>', moving)}`
          : `<circle cx="140" cy="54" r="12" fill="${on ? "#ffe0c2" : night ? "#2c3440" : "#eef1f4"}"/>${pdSpin(140, 54, '<rect x="132" y="50" width="9" height="6" rx="2" fill="#5aa9e6"/><rect x="141" y="54" width="8" height="6" rx="2" fill="#d4537e"/>', moving)}`;
      return `<rect x="112" y="16" width="56" height="64" rx="4" fill="${steel[0]}" stroke="${steel[2]}"/><rect x="112" y="16" width="56" height="12" rx="4" fill="${steel[1]}"/>
        <rect x="117" y="19" width="16" height="5" rx="1" fill="#12151b"/><circle cx="158" cy="22" r="3.5" fill="${steel[1]}" stroke="${steel[2]}"/>${pdLed(150, 22, accent, on, false, 0, 1.4)}
        <circle cx="140" cy="54" r="17" fill="${steel[1]}" stroke="${steel[2]}" stroke-width="2"/>${inside}
        <circle cx="140" cy="54" r="12" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="2"/>`;
    }
    case "tools":
      return `<rect x="106" y="62" width="44" height="18" rx="4" fill="${dark}"/>${pdLed(116, 70, accent, on, moving)}${pdLed(124, 70, "#34d399", on, moving, PD_LOOP / 4)}
        <rect x="114" y="44" width="28" height="20" rx="3" fill="#f08c00"/><rect x="114" y="44" width="28" height="6" rx="3" fill="#2b2f36"/>
        <path d="M152 80v-14h10l4-10h14v8h-8v16z" fill="#2e9d5a"/><rect x="162" y="52" width="22" height="10" rx="3" fill="#2b2f36"/><rect x="184" y="55" width="10" height="4" fill="#9aa3ae"/>`;
    case "charger":
      return `<rect x="122" y="70" width="36" height="10" rx="5" fill="${steel[2]}"/>
        <rect x="128" y="22" width="26" height="50" rx="5" fill="${dark}" transform="rotate(-8 141 47)"/>
        <rect x="131" y="27" width="20" height="40" rx="3" fill="${on ? "#1f3b2d" : "#12151b"}" transform="rotate(-8 141 47)"/>
        ${on ? `<path d="M143 37l-6 10h5l-2 9 7-11h-5z" fill="#34d399" transform="rotate(-8 141 47)">${moving ? `<animate attributeName="opacity" values="1;.4;1" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : ""}</path>` : ""}
        <path d="M158 76c14 0 8 4 26 4" stroke="${steel[2]}" stroke-width="2" fill="none"/>`;
    case "homelab": {
      const units = [0, 1, 2, 3, 4, 5]
        .map((k) => {
          const y = 12 + k * 11;
          return `<rect x="118" y="${y}" width="44" height="8" rx="1.5" fill="${night ? "#2a3039" : "#3a414b"}"/>${pdLed(123, y + 4, "#34d399", on || standby, moving, (k * PD_LOOP) / 7)}${pdLed(128, y + 4, accent, on, moving, (k * PD_LOOP) / 5 + 0.3)}<rect x="136" y="${y + 3}" width="22" height="2" rx="1" fill="#59616b"/>`;
        })
        .join("");
      return `<rect x="112" y="4" width="56" height="76" rx="3" fill="${dark}"/>${units}<rect x="114" y="76" width="6" height="4" fill="#12151b"/><rect x="160" y="76" width="6" height="4" fill="#12151b"/>`;
    }
    case "laptop":
      return `<path d="M118 30h44v40h-44z" fill="${dark}"/><rect x="121" y="33" width="38" height="34" rx="1" fill="${screen}"/>
        ${on ? '<path d="M125 58l8-8 6 5 8-10 8 6" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" fill="none"/>' : ""}
        <path d="M108 70h64l-6 10h-52z" fill="${steel[1]}" stroke="${steel[2]}"/>`;
    case "monitor":
      return `<rect x="88" y="16" width="52" height="34" rx="3" fill="${dark}"/><rect x="91" y="19" width="46" height="28" rx="1" fill="${screen}"/>
        <rect x="144" y="16" width="52" height="34" rx="3" fill="${dark}"/><rect x="147" y="19" width="46" height="28" rx="1" fill="${screen}"/>
        ${on ? '<path d="M95 40l9-8 7 5 9-10 12 8M151 26h30M151 32h22M151 38h26" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none"/>' : ""}
        <rect x="110" y="50" width="8" height="22" fill="${dark}"/><rect x="166" y="50" width="8" height="22" fill="${dark}"/><rect x="100" y="72" width="28" height="4" rx="2" fill="${dark}"/><rect x="156" y="72" width="28" height="4" rx="2" fill="${dark}"/>`;
    case "pc": {
      const fan = (cy, color) =>
        `<circle cx="174" cy="${cy}" r="8" fill="none" stroke="${on ? color : "#4a505a"}" stroke-width="2.5"/>${pdSpin(174, cy, `<path d="M174 ${cy}l0-6M174 ${cy}l5 3M174 ${cy}l-5 3" stroke="${on ? color : "#4a505a"}" stroke-width="2" stroke-linecap="round"/>`, moving)}`;
      return `<rect x="96" y="14" width="56" height="38" rx="3" fill="${dark}"/><rect x="99" y="17" width="50" height="32" rx="1" fill="${screen}"/>
        ${on ? '<path d="M104 42l10-9 7 6 10-12 12 8" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none"/>' : ""}
        <rect x="120" y="52" width="8" height="22" fill="${dark}"/><rect x="110" y="74" width="28" height="3" rx="1.5" fill="${dark}"/>
        <rect x="160" y="14" width="30" height="66" rx="3" fill="${dark}"/>${fan(32, "#a78bfa")}${fan(56, "#60a5fa")}${pdLed(166, 74, "#34d399", on || standby, false, 0, 1.4)}`;
    }
    case "piano": {
      const white = Array.from({ length: 10 }, (_, i) => `<rect x="${102 + i * 7.6}" y="44" width="7" height="14" rx="1" fill="#fff" stroke="#c9d1d8" stroke-width=".6"/>`).join("");
      const black = [0, 1, 3, 4, 5, 7, 8].map((i) => `<rect x="${107 + i * 7.6}" y="44" width="4" height="8" rx="1" fill="#1d2128"/>`).join("");
      const notes = on
        ? [0, 1]
            .map((k) => {
              const n = `<g transform="translate(${150 + k * 16} 24)"><circle cx="0" cy="8" r="3" fill="${accent}"/><path d="M3 8V0" stroke="${accent}" stroke-width="1.6"/></g>`;
              return moving ? `<g opacity="0">${n}<animate attributeName="opacity" values="0;1;0" dur="${PD_LOOP}s" begin="${(k * PD_LOOP) / 2}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 6;0 -6" dur="${PD_LOOP}s" begin="${(k * PD_LOOP) / 2}s" repeatCount="indefinite"/></g>` : n;
            })
            .join("")
        : "";
      return `${notes}<rect x="96" y="36" width="88" height="24" rx="3" fill="${dark}"/>${white}${black}${pdLed(178, 40, "#e5484d", on, false, 0, 1.3)}
        <path d="M104 60l-4 20M176 60l4 20M100 74h80" stroke="${dark}" stroke-width="3"/>`;
    }
    case "multiplug": {
      const plugs = [0, 1, 2, 3]
        .map((k) => `<rect x="${108 + k * 14}" y="64" width="10" height="9" rx="2" fill="${k < 3 ? (night ? "#cfd6dd" : "#ffffff") : steel[1]}" stroke="${steel[2]}"/>${k < 3 ? `<path d="M${113 + k * 14} 64c0-14 ${8 - k * 6} -22 ${10 - k * 7} -40" stroke="${night ? "#8c96a3" : "#9aa3ae"}" stroke-width="2" fill="none"/>` : ""}`)
        .join("");
      return `<rect x="102" y="60" width="76" height="20" rx="5" fill="${night ? "#d5dbe1" : "#ffffff"}" stroke="${steel[2]}"/>${plugs}
        <rect x="166" y="65" width="8" height="10" rx="2" fill="${on ? "#e5484d" : "#9aa3ae"}"/>${on ? '<rect x="166" y="65" width="8" height="10" rx="2" fill="#ff8a8a" opacity=".5"/>' : ""}`;
    }
    default:
      return `<rect x="124" y="18" width="34" height="34" rx="4" fill="${night ? "#d5dbe1" : "#ffffff"}" stroke="${steel[2]}"/><circle cx="135" cy="35" r="2.6" fill="#59616b"/><circle cx="147" cy="35" r="2.6" fill="#59616b"/>
        <rect x="120" y="26" width="42" height="42" rx="10" fill="${night ? "#e6eaee" : "#fbfcfe"}" stroke="${steel[2]}"/>
        <circle cx="141" cy="47" r="9" fill="none" stroke="${on ? accent : standby ? "#4f7fd6" : "#c9d1d8"}" stroke-width="3">${on && moving ? `<animate attributeName="stroke-opacity" values="1;.35;1" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : ""}</circle>
        <path d="M141 68c0 8-4 12 16 12" stroke="${steel[2]}" stroke-width="2.5" fill="none"/>`;
  }
};

// The illustration: the room, a halo in the state's colour while it runs, the appliance (or `image`, the user's own
// picture, fitted in a 64 px box on the ground).
export const pdScene = ({ kind, image, state, night, uid, animate, dx = 0, model, door, win, frost, phase, temp, hot, cooling }) => {
  const accent = (kind === "radiator" && state === "heating" && PD_PILOT_COLORS[phase]) || PD_ACCENTS[state];
  const on = state === "running" || state === "cooling" || state === "heating" || !!cooling;
  const standby = state === "standby";
  const moving = animate && (on || !!door || !!frost);
  const defs = `<defs>
      <radialGradient id="h${uid}"><stop offset="0" stop-color="${accent}" stop-opacity=".3"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="g${uid}" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#ffd27a"/><stop offset=".6" stop-color="#ff9a3c"/><stop offset="1" stop-color="#c2410c"/></radialGradient>
      <linearGradient id="s${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8def"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
    </defs>`;
  const blink = moving && state === "alert" ? `<animate attributeName="opacity" values="1;.35;1" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : "";
  const halo = on || state === "done" || state === "alert" ? `<ellipse cx="140" cy="46" rx="64" ry="40" fill="url(#h${uid})">${blink}</ellipse>` : "";
  const thing = image
    ? `<image href="${rcEsc(image)}" x="108" y="16" width="64" height="64" preserveAspectRatio="xMidYMax meet"${state === "idle" || state === "offline" ? ' opacity=".75"' : ""}/>`
    : pdDevice(kind, { on, standby, moving, uid, night, accent, model, door, win, frost, phase, temp, hot });
  return `${defs}${pdRoom(PD_ROOM[kind] || "wall", night)}<g${dx ? ` transform="translate(${-dx} 0)"` : ""}>${halo}${thing}</g>`;
};

// Whether a name already says the kind ("Air fryer" and "Air fryer"): the subtitle does not repeat it.
export const pdSame = (a, b) => {
  const n = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "");
  return n(a).includes(n(b)) || n(b).includes(n(a));
};

// A power, short: 0.8 W, 186 W, 1.2 kW.
export const pdPower = (w, lang) => {
  if (w >= 10 || w === 0) return rcWatts(w, lang);
  try {
    return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(w)} W`;
  } catch {
    return `${w.toFixed(1)} W`;
  }
};

// A duration in ms, short: 45 s, 18 min, 1 h 05, 2 d.
export const pdDur = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${String(m % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)} d`;
};

export const pdIcon = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const PD_SVG = {
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cost: '<path d="M17 6a7 7 0 1 0 0 12M4 10h9M4 14h9"/>',
  cycle: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  peak: '<path d="M3 20l6-10 4 5 8-12"/>',
  curve: '<path d="M3 17l5-6 4 3 6-8 3 3"/>',
  power: '<path d="M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0"/>',
  thermo: '<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0zM12 9v7"/>',
};
