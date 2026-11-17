/**
 * power-device-card / power-device-mini-card: any appliance on a smart plug or a power meter, illustrated. Its power,
 * whether it runs, how long and since when; its last 24 hours as a curve with its cycles; this cycle's and today's
 * energy and cost; the plug's switch.
 * https://github.com/juju35/ha-power-device-card
 */

// Colour of each state: on the badge, the pill, the halo and the curve.
const PD_ACCENTS = { running: "#f08c00", done: "#2e9d5a", standby: "#4f7fd6", idle: "#9aa3ae", offline: "#9aa3ae" };
const PD_KIND_ICONS = {
  airfryer: "mdi:pot-steam-outline",
  kettle: "mdi:kettle-steam-outline",
  toaster: "mdi:toaster",
  coffee: "mdi:coffee-maker-outline",
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
};
// One loop of the illustrations' animations (s): steam rises, a drum turns, LEDs blink. The GIFs record one loop.
const PD_LOOP = 2.4;
// A cycle that ended less than this ago shows as done.
const PD_DONE_MS = 15 * 60000;
// The history is fetched again after this long.
const PD_HISTORY_MS = 5 * 60000;
const PD_DAY_MS = 24 * 3600000;
// A cycle's pauses (minutes) by kind: a washing machine soaks, a dishwasher dries; a kettle's cycle ends at once.
const PD_GAPS = { washer: 5, dryer: 5, dishwasher: 10, coffee: 2, airfryer: 2, homelab: 2, pc: 2 };

// The status pill's place, decided by measurement after each render and each new width (the same rule on every
// ha-* card): on the title row, right after the title, only when the whole title and the pill's whole label fit there;
// otherwise on its own line under the subtitle; when the label is still cut there, or the text leaves the banner or
// runs over its ground strip, its dot alone on the title row. A card of 200 px or less shows the dot alone (CSS).
const pdPlacePill = (head, row, ground) => {
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

// ── Illustration ─────────────────────────────────────────────────────────────
// The banner's room, 200 × 80, drawn to its right edge: the wall and what hangs on it, by room. The appliance stands
// on the banner's ground strip (a worktop, a desk, a floor) at x = 140. By night, darker.
const PD_WALLS = {
  kitchen: ["#e9eff1", "#dbe3e7", "#232a2f", "#2c3439"],
  laundry: ["#eaf0f3", "#dbe4e9", "#222a30", "#2b343a"],
  desk: ["#eceef5", "#e2e5f0", "#1d2333", "#262d40"],
  living: ["#f3ece2", "#eadfcf", "#272320", "#302a25"],
  garage: ["#e4e6e9", "#d6d9dd", "#24272b", "#2d3135"],
  rack: ["#e5e9ef", "#d8dee7", "#1e232a", "#272d35"],
  wall: ["#eef1f4", "#e3e7ec", "#23272c", "#2c3137"],
};

const pdRoom = (room, night) => {
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
    wall: `<rect x="0" y="74" width="200" height="6" fill="${night ? "#2f353d" : "#ffffff"}" stroke="${ink}" stroke-width=".6"/>
      <rect x="20" y="10" width="30" height="22" rx="2" fill="${pale}" stroke="${ink}"/><path d="M24 28l7-8 5 5 4-3 6 6z" fill="${night ? "#4b5a78" : "#b9c6d8"}"/>`,
  }[room];
  return `<rect width="200" height="80" fill="${wall}"/>${back}`;
};

// Steam rising above (x, y), when the appliance runs; still, three faint wisps; nothing otherwise.
const pdSteam = (x, y, on, moving, gap = 9) =>
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
const pdLed = (x, y, color, on, moving, phase = 0, r = 1.6) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${on ? color : "#59616b"}">${on && moving ? `<animate attributeName="opacity" values="1;.25;1" dur="${(PD_LOOP / 2).toFixed(2)}s" begin="${phase.toFixed(2)}s" repeatCount="indefinite"/>` : ""}</circle>`;
// A drum turning (washer, dryer): `parts` drawn around (cx, cy), one turn per loop.
const pdSpin = (cx, cy, parts, moving) =>
  `<g>${parts}${moving ? `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="${PD_LOOP}s" repeatCount="indefinite"/>` : ""}</g>`;

// The appliance, its feet on y = 80, centred on x = 140. `on`: running (or on standby for what has a screen),
// `moving`: animated. `uid` keeps the gradients of several cards apart.
const pdDevice = (kind, { on, standby, moving, uid, night, accent }) => {
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
    case "coffee":
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
const pdScene = ({ kind, image, state, night, uid, animate, dx = 0 }) => {
  const accent = PD_ACCENTS[state];
  const on = state === "running";
  const standby = state === "standby";
  const moving = animate && on;
  const defs = `<defs>
      <radialGradient id="h${uid}"><stop offset="0" stop-color="${accent}" stop-opacity=".3"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="g${uid}" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#ffd27a"/><stop offset=".6" stop-color="#ff9a3c"/><stop offset="1" stop-color="#c2410c"/></radialGradient>
      <linearGradient id="s${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8def"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
    </defs>`;
  const halo = on || state === "done" ? `<ellipse cx="140" cy="46" rx="64" ry="40" fill="url(#h${uid})"/>` : "";
  const thing = image
    ? `<image href="${rcEsc(image)}" x="108" y="16" width="64" height="64" preserveAspectRatio="xMidYMax meet"${state === "idle" || state === "offline" ? ' opacity=".75"' : ""}/>`
    : pdDevice(kind, { on, standby, moving, uid, night, accent });
  return `${defs}${pdRoom(PD_ROOM[kind] || "wall", night)}<g${dx ? ` transform="translate(${-dx} 0)"` : ""}>${halo}${thing}</g>`;
};

// Whether a name already says the kind ("Air fryer" and "Air fryer"): the subtitle does not repeat it.
const pdSame = (a, b) => {
  const n = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "");
  return n(a).includes(n(b)) || n(b).includes(n(a));
};

// A power, short: 0.8 W, 186 W, 1.2 kW.
const pdPower = (w, lang) => {
  if (w >= 10 || w === 0) return rcWatts(w, lang);
  try {
    return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(w)} W`;
  } catch {
    return `${w.toFixed(1)} W`;
  }
};

// A duration in ms, short: 45 s, 18 min, 1 h 05, 2 d.
const pdDur = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${String(m % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)} d`;
};

const pdIcon = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PD_SVG = {
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cost: '<path d="M17 6a7 7 0 1 0 0 12M4 10h9M4 14h9"/>',
  cycle: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  peak: '<path d="M3 20l6-10 4 5 8-12"/>',
  curve: '<path d="M3 17l5-6 4 3 6-8 3 3"/>',
  power: '<path d="M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0"/>',
};

// ── Card ─────────────────────────────────────────────────────────────────────
class PowerDeviceCard extends RcCard {
  static tag = "power-device-card";
  static i18n = PD_I18N;
  static defaults = { illustration: true, illustration_theme: "auto", kind: "auto", threshold: 10, standby: 1, show_graph: true, animations: true, show_controls: true };

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

  // Today's cost: the price per kWh (`price`, a number or a sensor) times today's energy, in Home Assistant's currency.
  _cost(kwh) {
    const c = this._config;
    if (kwh == null || c.price == null || c.price === "") return null;
    const st = typeof c.price === "string" && /^[a-z_]+\.\w+$/.test(c.price) ? this._hass.states[c.price] : null;
    if (typeof c.price === "string" && /^[a-z_]+\.\w+$/.test(c.price) && !st) return null;
    const price = st ? pdNum(st) : Number(c.price);
    if (!Number.isFinite(price)) return null;
    const currency = this._hass.config?.currency || "EUR";
    try {
      return new Intl.NumberFormat(this._lang(), { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kwh * price);
    } catch {
      return `${(kwh * price).toFixed(2)} ${currency}`;
    }
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
    const todays = a ? a.cycles.filter((x) => x.end > midnight) : [];
    const energy = est && !rcUnavailable(est) && e.dailyEnergy ? pdKwh(est) : a ? a.today : null;
    return {
      id: e.power || id,
      none: !id,
      ids: e,
      state,
      kind,
      name,
      sub: [h.areas?.[dev?.area_id]?.name, pdSame(name, this._t(`k_${kind}`)) ? null : this._t(`k_${kind}`)].filter(Boolean).join(" · "),
      raw: pst ? h.formatEntityState?.(pst) || pst.state : "",
      watts: w,
      threshold,
      series,
      peak: a?.peak ?? null,
      since: current ? current.start : null,
      cycle: current || (state === "done" ? last : null),
      lastCycle: last || null,
      cycles: todays.length,
      avg: todays.length ? todays.reduce((s, x) => s + x.end - x.start, 0) / todays.length : null,
      today: energy,
      cost: this._cost(energy),
      switchId: sst && !rcUnavailable(sst) ? e.switch : null,
      switchOn: sst?.state === "on",
      night: h.states["sun.sun"]?.state === "below_horizon",
    };
  }

  _dark() {
    return !!this._hass.themes?.darkMode;
  }

  // The banner's night: forced by `illustration_theme`, else the sun below the horizon or Home Assistant's dark theme.
  _night() {
    const theme = this._config.illustration_theme;
    if (theme === "night" || theme === "day") return theme === "night";
    return this._hass.states["sun.sun"]?.state === "below_horizon" || this._dark();
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
    return PD_KIND_ICONS[m.kind] || "mdi:power-plug-outline";
  }

  // The line under the big reading: how long it has run, how long ago it finished, or the state.
  _line(m) {
    const now = Date.now();
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
    const scene = m.none ? pdRoom(room, night) : pdScene({ kind: m.kind, image: c.image, state: m.state, night, uid: this._id(), animate: this._animate(), dx });
    return `
      <div class="banner r-${room}${night ? " night" : ""}">
        <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}${m.sub ? ` title="${rcEsc(m.sub)}"` : ""}>
          <div class="badge"><ha-icon icon="${this._icon(m)}"></ha-icon></div>
          <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${chip}</div>${sub}</div>
        </div>
        <svg class="room" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax slice" role="img" aria-label="${rcEsc(`${m.name} · ${this._t(`st_${m.state}`)}`)}">${scene}</svg>
        <div class="ground"></div>
      </div>`;
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
      if (this._items?.state === "running" || this._items?.state === "done") {
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
    clearInterval(this._tick);
    this._tick = undefined;
  }

  // The 24-hour curve: the power as steps (a plug reports on change), its area, the running threshold dashed.
  _graph(m) {
    if (this._config.show_graph === false || !m.series?.length) return "";
    const now = Date.now();
    const from = now - PD_DAY_MS;
    const top = Math.max(m.peak || 0, m.threshold * 2, 1) * 1.12;
    const x = (t) => (((Math.max(t, from) - from) / PD_DAY_MS) * 300).toFixed(1);
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
      cycle: ["bolt", m.state === "running" ? "t_cycle" : "t_last_cycle", m.cycle ? kwh(m.cycle.kwh) : m.lastCycle ? kwh(m.lastCycle.kwh) : null],
      today: ["bars", "t_today", kwh(m.today)],
      cost: ["cost", "t_cost", m.cost ? [m.cost, ""] : null],
      peak: ["peak", "t_peak", m.peak ? rcWatts(m.peak, this._lang()).split(" ") : null],
    };
    if (m.state === "offline") return [];
    return ["cycle", "today", "cost", "peak"]
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
    if (m.cycles) out.push([PD_SVG.cycle, this._tn("cycles", m.cycles)]);
    if (m.avg) out.push([PD_SVG.clock, this._t("avg_cycle", { d: pdDur(m.avg) })]);
    if (m.lastCycle && m.state !== "running" && m.state !== "done") out.push([PD_SVG.clock, this._t("last_ago", { d: pdDur(now - m.lastCycle.end) })]);
    return out.map(([icon, text]) => `<span class="chip">${pdIcon(icon)}<span>${rcEsc(text)}</span></span>`).join("");
  }

  _draw(m) {
    const c = this._config;
    const banner = c.illustration !== false;
    const night = banner && this._night();
    const tiles = this._tileList(m);
    const minute = Math.floor(Date.now() / 60000);
    const graph = this._graph(m);
    const parts = [m.none, m.state, m.kind, m.name, m.sub, m.watts, m.raw, tiles, this._chips(m), graph, m.switchId, m.switchOn, banner, night, this._dark(), minute];
    if (!this._changed(parts)) return;
    const pill = m.none ? "" : this._t(`st_${m.state}`);
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
    const big = m.watts != null ? pdPower(m.watts, this._lang()).split(" ") : ["—", ""];
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
    root.querySelector(".rv")?.addEventListener("click", () => rcMoreInfo(this, m.id));
    root.querySelector(".pw")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      rcCall(this._hass, m.switchId.split(".")[0], m.switchOn ? "turn_off" : "turn_on", { entity_id: m.switchId });
    });
  }

  static styles = `
    ha-card.lvl-running { --c: #f08c00; }
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
    .banner.night { background: #232a2f; --bt: #fff; --bs: rgba(255,255,255,.78); --ic: color-mix(in srgb, var(--c) 72%, #fff); --gr: #4a3a2c; --gl: #5d4a38; }
    .banner.night.r-laundry { background: #222a30; --gr: #3a4249; --gl: #4a535b; }
    .banner.night.r-desk { background: #1d2333; --gr: #4a3626; --gl: #5d4632; }
    .banner.night.r-living { background: #272320; --gr: #4f3a28; --gl: #634a34; }
    .banner.night.r-garage { background: #24272b; --gr: #2c3035; --gl: #3a4048; }
    .banner.night.r-rack { background: #1e232a; --gr: #2a3038; --gl: #383f48; }
    .banner.night.r-wall { background: #23272c; --gr: #4a4034; --gl: #5c5042; }
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
                    background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
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

// ── Editor ───────────────────────────────────────────────────────────────────
const pdSchema = (booleans) => (lang) => [
  { name: "entity", selector: { entity: { domain: ["sensor", "switch", "input_boolean"] } } },
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "kind", selector: { select: { mode: "dropdown", options: ["auto", ...PD_KINDS].map((value) => ({ value, label: rcT(PD_I18N, lang, `k_${value}`) })) } } },
  { name: "image", selector: { text: {} } },
  { name: "switch", selector: { entity: { domain: ["switch", "input_boolean"] } } },
  { name: "energy", selector: { entity: { domain: "sensor", device_class: "energy" } } },
  { name: "threshold", selector: { number: { min: 0, max: 5000, step: 1, mode: "box", unit_of_measurement: "W" } } },
  { name: "standby", selector: { number: { min: 0, max: 500, step: 0.1, mode: "box", unit_of_measurement: "W" } } },
  { name: "price", selector: { text: {} } },
  ...rcBooleans(...booleans),
  {
    name: "illustration_theme",
    selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(PD_I18N, lang, `ed_theme_${value}`) })) } },
  },
  ...rcAdvanced(PD_I18N, lang, "language"),
];

const PD_HELPERS = ["entity", "title", "switch", "energy", "image", "threshold", "standby", "price", "zoom", "language"];

const PowerDeviceCardEditor = rcEditor({
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

// ── Mini card ────────────────────────────────────────────────────────────────
// The appliance on its banner: the state as the status pill after the title, the power and today's energy as chips
// under it; the zoom button opens the full card in place.
class PowerDeviceMiniCard extends rcMini(PowerDeviceCard, "power-device-mini-card", ".r { --t: var(--c); } .r.dim { --t: var(--rc-idle); }") {
  getCardSize() {
    return this._zoomed ? super.getCardSize() : 1;
  }

  _drawMini(m) {
    const banner = this._config.illustration !== false;
    const night = banner && this._night();
    const minute = Math.floor(Date.now() / 60000);
    if (!this._changed(["mini", m.state, m.watts, m.today, m.kind, m.name, m.sub, banner, night, this._dark(), minute])) return;
    const chip = (text, dim) => `<button class="r pill${dim ? " dim" : ""}" data-id="${rcEsc(m.id || "")}" title="${rcEsc(text)}"><span>${rcEsc(text)}</span></button>`;
    const power = m.watts != null && (m.state === "running" || m.state === "standby") ? pdPower(m.watts, this._lang()) : null;
    const line = m.state === "running" || m.state === "done" ? this._line(m) : null;
    const today = m.today != null ? `${this._t("t_today")} ${this._kwh(m.today)} kWh` : null;
    const rest = [power, line, today].filter(Boolean);
    if (banner) {
      const c = this._config;
      this.shadowRoot.innerHTML = `<style>${RC_BASE_STYLES}${this.constructor.styles}</style>
        <ha-card class="lvl-${m.state} bn">${this._banner(m, rest.length ? `<div class="rs">${rest.map((t) => chip(t, true)).join("")}</div>` : "", night, m.none ? "" : this._t(`st_${m.state}`))}</ha-card>`;
      const root = this.shadowRoot;
      if (c.navigation_path) rcBindNav(root.querySelector(".head"), c.navigation_path);
      for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
      this._fitPill();
      return;
    }
    const chips = [this._t(`st_${m.state}`), ...rest].map((t, i) => chip(t, i > 0)).join("");
    this._paintMini({ level: m.state, icon: this._icon(m), status: "", chips });
    const title = this.shadowRoot.querySelector(".mini .title");
    if (title) title.textContent = m.name;
  }
}

const PowerDeviceMiniCardEditor = rcEditor({
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
