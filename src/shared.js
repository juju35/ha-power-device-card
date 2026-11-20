/**
 * Shared by the power device cards (its names are used by the other src/ files): the appliance's entities, cycles and
 * strings, i18n helpers, the base card (header, tiles, tap / hold), the mini card, the visual editor and the common
 * styles. Same base as ha-room-card.
 * https://github.com/juju35/ha-power-device-card
 */
const RC_VERSION = "__VERSION__";

// ── Discovery rules ──────────────────────────────────────────────────────────
const RC_OPENING_CLASSES = ["moisture", "smoke", "carbon_monoxide", "gas", "door", "window", "opening", "garage_door"];
// Safety sensors: an active state is an alarm, not an opening. Most serious first: it names the room's status.
const RC_ALERT_KINDS = {
  smoke: { dc: "smoke", on: "mdi:smoke-detector-alert", off: "mdi:smoke-detector" },
  co: { dc: "carbon_monoxide", on: "mdi:molecule-co", off: "mdi:molecule-co" },
  gas: { dc: "gas", on: "mdi:gas-cylinder", off: "mdi:gas-cylinder" },
  leak: { dc: "moisture", on: "mdi:water-alert", off: "mdi:water-check" },
};
const RC_ALERT_ORDER = Object.keys(RC_ALERT_KINDS);
// Alert kind of a device class (`leak`, `smoke`, `co`, `gas`), or undefined for any other class.
const rcAlertKind = (dc) => RC_ALERT_ORDER.find((k) => RC_ALERT_KINDS[k].dc === dc);
// The most serious alert kind among `kinds`, `leak` when none is known.
const rcTopAlert = (kinds) => RC_ALERT_ORDER.find((k) => kinds.includes(k)) || "leak";
const RC_PRESENCE_CLASSES = ["occupancy", "presence", "motion"];
// A switch driving a light belongs to the lights card, a switch that is a plug to the plugs card.
const RC_LIGHT_NAME = /(^|\s)(lumi[eè]re|lampe|lamp|light|veilleuse|guirlande)(\s|$)/i;
const RC_PLUG_NAME = /(^|\s)(prise|multiprise|plug|outlet|socket)(\s|$)/i;
const RC_HOLD_MS = 500;
const RC_MOVE_PX = 8;
// A held arrow key repeats some 30 times a second: one brightness step every RC_REPEAT_MS at most.
const RC_REPEAT_MS = 150;

const rcIsLightSwitch = (st) => RC_LIGHT_NAME.test(st.attributes.friendly_name || "");
const rcIsPlug = (st) =>
  !rcIsLightSwitch(st) && (st.attributes.device_class === "outlet" || RC_PLUG_NAME.test(st.attributes.friendly_name || ""));

// What each room card shows, shared with the Overview so that both count the same entities.
// Detections that are not about people, which cameras report as motion: pets never count, vehicles only outdoors.
const RC_PET = /(^|[\s_.-])(pets?|animals?|animaux|chiens?|chats?|dogs?|cats?)($|[\s_-])/i;
const RC_VEHICLE = /(^|[\s_.-])(vehicles?|v[ée]hicules?|voitures?|cars?)($|[\s_-])/i;
// An outdoor room, from its name: garden, terrace, balcony, patio, yard, driveway, porch, gate, parking…
const RC_OUTDOOR =
  /jardin|terrasse|balcon|patio|ext[ée]rieur|cour(\s|$)|all[ée]e|porche|portail|parking|garden|terrace|balcony|outdoor|outside|yard|driveway|porch|gate/i;
const rcIsOutdoor = (area) => !!area && RC_OUTDOOR.test(`${area.name || ""} ${area.area_id || ""}`);

// Sensors card: leak, door, window and opening sensors, plus presence and motion unless `presence` is false. Camera
// detections count, except pets, and vehicles outside an `outdoor` room.
const rcMatchSensor = (hass, id, { presence = true, outdoor = false } = {}) => {
  if (!id.startsWith("binary_sensor.")) return false;
  const st = hass.states[id];
  const dc = st?.attributes.device_class;
  if (RC_OPENING_CLASSES.includes(dc)) return true;
  if (presence === false || !RC_PRESENCE_CLASSES.includes(dc)) return false;
  const name = `${id} ${st.attributes.friendly_name || ""}`;
  if (RC_PET.test(name)) return false;
  return outdoor || !RC_VEHICLE.test(name);
};
// Lights card: lights (groups excepted) and switches driving a light, configuration and diagnostic entities excepted.
const rcMatchLight = (hass, id) => {
  const st = hass.states[id];
  if (!st || hass.entities?.[id]?.entity_category) return false;
  if (id.startsWith("light.")) return !Array.isArray(st.attributes.entity_id);
  return id.startsWith("switch.") && rcIsLightSwitch(st);
};
// Plugs card: switches that are plugs, configuration and diagnostic entities excepted.
const rcMatchPlug = (hass, id) => {
  const st = hass.states[id];
  if (!st || !id.startsWith("switch.") || hass.entities?.[id]?.entity_category) return false;
  return rcIsPlug(st);
};

const RC_ROOM_ICONS = [
  [/chambre|bedroom|nursery/i, "mdi:bed-outline"],
  [/s[ée]jour|salon|living|lounge/i, "mdi:sofa-outline"],
  [/cuisine|kitchen/i, "mdi:silverware-fork-knife"],
  [/salle (de )?bains?|bath|douche|shower/i, "mdi:shower-head"],
  [/toilettes?|wc|toilet/i, "mdi:toilet"],
  [/entr[ée]e|entrance|hall d.entr|entry/i, "mdi:door"],
  [/couloir|hall|corridor/i, "mdi:arrow-left-right"],
  [/bureau|office|study/i, "mdi:desk"],
  [/garage/i, "mdi:garage"],
  [/terrasse|jardin|balcon|garden|terrace|balcony|patio|ext[ée]rieur|outdoor/i, "mdi:flower-outline"],
  [/buanderie|cellier|laundry|utility/i, "mdi:washing-machine"],
  [/salle [àa] manger|dining/i, "mdi:table-chair"],
];

// Icon of a room in the overviews: the area's own icon, or one picked from its name.
const rcRoomIcon = (area) => {
  if (area.icon) return area.icon;
  const hit = RC_ROOM_ICONS.find(([re]) => re.test(area.name || area.area_id || ""));
  return hit ? hit[1] : "mdi:home-outline";
};

// `fn(hass)` computed once per entity registry: HA replaces hass.entities only when the registry changes,
// whereas a new hass (and hass.states) comes with every state change of the whole instance.
const rcPerRegistry = (fn) => {
  const cache = new WeakMap();
  const none = {};
  return (hass) => {
    const reg = hass.entities || none;
    if (!cache.has(reg)) cache.set(reg, fn(hass));
    return cache.get(reg);
  };
};

// The sensor entities of each device, in registry order.
const rcDeviceSensors = rcPerRegistry((hass) => {
  const out = {};
  for (const [id, r] of Object.entries(hass.entities || {})) {
    if (r.device_id && id.startsWith("sensor.")) (out[r.device_id] ||= []).push(id);
  }
  return out;
});

// Power sensor (device class power, W or kW) of each device; only the device's own sensors are read.
// Settled per registry like rcDeviceSensors (a device_class next to never changes), except for the devices with a
// sensor that has no state yet (an integration still loading after a restart): those are looked at again on every
// call until all their sensors report, so their power sensor is not missed until the next registry change.
const rcPowerCache = rcPerRegistry((hass) => ({ found: {}, pending: new Set(Object.keys(rcDeviceSensors(hass))) }));
const rcPowerSensors = (hass) => {
  const cache = rcPowerCache(hass);
  if (!cache.pending.size) return cache.found;
  const sensors = rcDeviceSensors(hass);
  for (const device of cache.pending) {
    const ids = sensors[device] || [];
    const id = ids.find((s) => hass.states[s]?.attributes.device_class === "power");
    if (id) cache.found[device] = id;
    if (id || ids.every((s) => hass.states[s])) cache.pending.delete(device);
  }
  return cache.found;
};

const rcWattsOf = (hass, sensorId) => {
  const st = sensorId && hass.states[sensorId];
  const v = st ? Number.parseFloat(st.state) : Number.NaN;
  if (!Number.isFinite(v)) return null;
  return st.attributes.unit_of_measurement === "kW" ? v * 1000 : v;
};

// ── Overviews ────────────────────────────────────────────────────────────────
// Shared by room-overview-card and room-environment-overview-card.

// Visible entities accepted by `match(id)`, with their area, minus the config's `exclude`: the registries are
// scanned again only when they or the config change.
const rcByArea = (card, match) => {
  const h = card._hass;
  const c = card._config;
  return rcMemo((card._memo ||= {}), "byArea", [c, h.entities, h.devices], () => {
    const excluded = new Set(c.exclude || []);
    const out = [];
    for (const [id, r] of Object.entries(h.entities || {})) {
      if (r.hidden || excluded.has(id) || !match(id)) continue;
      const aid = card._areaOf(id);
      if (aid) out.push([id, aid]);
    }
    return out;
  });
};

// Rooms in the order of the config's `rooms` list, then, with `sort: state`, the highest `rank(room)` first,
// then by name.
const rcSortRooms = (list, config, rank) => {
  const order = (config.rooms || []).map((x) => x.area);
  return list.sort((a, b) => {
    if (order.length) {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia !== ib) return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    }
    return (config.sort === "state" ? rank(b) - rank(a) : 0) || a.name.localeCompare(b.name);
  });
};

// The overviews only show the rooms needing a look until their detail button (`zoom`, on by default) is pressed;
// `zoom: false` shows every room, with no button.
const rcCompact = (card) => card._config.zoom !== false && !card._zoomed;

// The zoom / detail button: the same icons on the overviews and the mini cards.
const rcZoomIcon = (card) => (card._zoomed ? "mdi:arrow-collapse" : "mdi:arrow-expand");

// The detail button of an overview header, at its end.
const rcZoomButton = (card) =>
  card._config.zoom === false
    ? ""
    : `<button class="zoom" title="${rcEsc(card._t(card._zoomed ? "rooms_check" : "rooms_all"))}"><ha-icon icon="${rcZoomIcon(card)}"></ha-icon></button>`;

// Back to the compact view (mini card, or overview showing the rooms needing a look), when zoomed in.
const rcUnzoom = (card) => {
  if (!card._zoomed) return;
  card._zoomed = false;
  card._sig = null;
  card._render();
};

// True for a click outside `card` that is not in a dialog opened from it (more-info, say): it folds the card back.
const rcOutside = (card, ev) => !ev.composedPath().includes(card) && !rcInDialog(ev);

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. The handler runs when the press and the release are both outside the card (a slider dragged out of the
// card does not count), and a scroll does not count (the browser cancels the pointer); keyboard clicks still go
// through the click event. The handler keeps its own checks (outside of the card, not in a dialog).
const watchOutside = (card, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = !ev.composedPath().includes(card);
  };
  const onUp = (ev) => {
    if (downOutside) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
  };
};

// A click on the detail button: every room, or back to the rooms needing a look. True when handled.
const rcZoomClick = (card, ev) => {
  if (!ev.target.closest?.(".zoom")) return false;
  ev.stopPropagation();
  card._zoomed = !card._zoomed;
  card._sig = null;
  card._render();
  if (ev.detail === 0) card.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
  return true;
};

// Editor fields shared by the overviews: title, columns and sort.
const rcOverviewFields = (i18n, lang) => [
  { name: "title", selector: { text: {} } },
  { name: "columns", selector: { number: { min: 1, max: 6, mode: "box" } } },
  {
    name: "sort",
    selector: {
      select: {
        mode: "dropdown",
        options: ["name", "state"].map((value) => ({ value, label: rcT(i18n, lang, `ed_sort_${value}`) })),
      },
    },
  },
];

// ── i18n ─────────────────────────────────────────────────────────────────────
// Strings shared by the cards; a card's own dictionary wins over these.
const RC_I18N = {
  en: {
    all_closed: "All closed",
    all_quiet: "All quiet",
    open_one: "{n} open",
    open_many: "{n} open",
    unavail_one: "{n} unavailable",
    unavail_many: "{n} unavailable",
    leak: "Water leak",
    smoke: "Smoke detected",
    gas: "Gas detected",
    co: "Carbon monoxide",
    detected: "Detected",
    clear: "Clear",
    unavailable: "Unavailable",
    on: "On",
    off: "Off",
    turn_all_off: "Turn everything off",
    ed_area: "Area",
    ed_title: "Title",
    ed_show_title: "Show title",
    ed_title_helper: "Leave empty for the area name",
    ed_columns: "Columns",
    ed_layout: "Layout",
    ed_layout_helper: "Tiles: one large tile per entity, like the Tile card, easier to tap on a phone",
    ed_layout_compact: "Compact",
    ed_layout_tiles: "Tiles",
    ed_advanced: "Advanced",
    ed_language: "Language",
    ed_language_helper: "Empty: the Home Assistant language",
    ed_language_auto: "Automatic",
    ed_entities: "Explicit entities (YAML)",
    ed_entities_helper: "Replaces the automatic discovery: entity IDs, or {entity, name, icon}",
    ed_thresholds: "Comfort thresholds (YAML)",
    ed_thresholds_helper: "Per kind, in the sensor's unit, e.g. co2: [800, 1200] or humidity: [25, 35, 70, 80]",
    ed_rooms: "Rooms (YAML)",
    ed_rooms_helper: "Order and overrides: a list of {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigation path",
    ed_all_off_button: "“Turn everything off” button",
    err_config: "Set `area` or `entities`",
    zoom_in: "Show the full card",
    zoom_out: "Back to the compact view",
    ed_zoom: "Zoom button",
    ed_zoom_helper: "Switches the mini card to the full card and back",
    rooms_all: "Show every room",
    rooms_check: "Only the rooms needing a look",
    ed_sort: "Sort",
    ed_sort_name: "By name",
    ed_exclude_areas: "Rooms to exclude",
  },
  fr: {
    all_closed: "Tout est fermé",
    all_quiet: "Tout est calme",
    open_one: "{n} ouverture",
    open_many: "{n} ouvertures",
    unavail_one: "{n} indisponible",
    unavail_many: "{n} indisponibles",
    leak: "Fuite d'eau",
    smoke: "Fumée détectée",
    gas: "Gaz détecté",
    co: "Monoxyde de carbone",
    detected: "Détecté",
    clear: "Non détecté",
    unavailable: "Indisponible",
    on: "Allumée",
    off: "Éteinte",
    turn_all_off: "Tout éteindre",
    ed_area: "Pièce",
    ed_title: "Titre",
    ed_show_title: "Afficher le titre",
    ed_title_helper: "Laisser vide pour le nom de la pièce",
    ed_columns: "Colonnes",
    ed_layout: "Disposition",
    ed_layout_helper: "Tuiles : une grande tuile par entité, comme la carte Tuile, plus facile à toucher sur téléphone",
    ed_layout_compact: "Compacte",
    ed_layout_tiles: "Tuiles",
    ed_advanced: "Avancé",
    ed_language: "Langue",
    ed_language_helper: "Vide : la langue de Home Assistant",
    ed_language_auto: "Automatique",
    ed_entities: "Entités explicites (YAML)",
    ed_entities_helper: "Remplace la découverte automatique : des identifiants d'entités, ou {entity, name, icon}",
    ed_thresholds: "Seuils de confort (YAML)",
    ed_thresholds_helper: "Par type, dans l'unité du capteur, par exemple co2: [800, 1200] ou humidity: [25, 35, 70, 80]",
    ed_rooms: "Pièces (YAML)",
    ed_rooms_helper: "Ordre et personnalisation : une liste de {area, name, icon, navigation_path}",
    ed_navigation_path: "Chemin de navigation",
    ed_all_off_button: "Bouton « Tout éteindre »",
    err_config: "Définis `area` ou `entities`",
    zoom_in: "Afficher la carte complète",
    zoom_out: "Revenir à la vue compacte",
    ed_zoom: "Bouton zoom",
    ed_zoom_helper: "Bascule la mini-carte en carte complète, et inversement",
    rooms_all: "Afficher toutes les pièces",
    rooms_check: "Seulement les pièces à surveiller",
    ed_sort: "Tri",
    ed_sort_name: "Par nom",
    ed_exclude_areas: "Pièces à exclure",
  },
  de: {
    all_closed: "Alles geschlossen",
    all_quiet: "Alles ruhig",
    open_one: "{n} offen",
    open_many: "{n} offen",
    unavail_one: "{n} nicht verfügbar",
    unavail_many: "{n} nicht verfügbar",
    leak: "Wasserleck",
    smoke: "Rauch erkannt",
    gas: "Gas erkannt",
    co: "Kohlenmonoxid",
    detected: "Erkannt",
    clear: "Nicht erkannt",
    unavailable: "Nicht verfügbar",
    on: "An",
    off: "Aus",
    turn_all_off: "Alles ausschalten",
    ed_area: "Bereich",
    ed_title: "Titel",
    ed_show_title: "Titel anzeigen",
    ed_title_helper: "Leer lassen für den Namen des Bereichs",
    ed_columns: "Spalten",
    ed_layout: "Layout",
    ed_layout_helper: "Kacheln: eine große Kachel pro Entität wie die Kachel-Karte, auf dem Handy leichter anzutippen",
    ed_layout_compact: "Kompakt",
    ed_layout_tiles: "Kacheln",
    ed_advanced: "Erweitert",
    ed_language: "Sprache",
    ed_language_helper: "Leer: die Sprache von Home Assistant",
    ed_language_auto: "Automatisch",
    ed_entities: "Explizite Entitäten (YAML)",
    ed_entities_helper: "Ersetzt die automatische Erkennung: Entitäts-IDs oder {entity, name, icon}",
    ed_thresholds: "Komfortschwellen (YAML)",
    ed_thresholds_helper: "Pro Art, in der Einheit des Sensors, z. B. co2: [800, 1200] oder humidity: [25, 35, 70, 80]",
    ed_rooms: "Räume (YAML)",
    ed_rooms_helper: "Reihenfolge und Anpassungen: eine Liste von {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigationspfad",
    ed_all_off_button: "Schaltfläche „Alles ausschalten“",
    err_config: "Lege `area` oder `entities` fest",
    zoom_in: "Vollständige Karte anzeigen",
    zoom_out: "Zurück zur kompakten Ansicht",
    ed_zoom: "Zoom-Schaltfläche",
    ed_zoom_helper: "Wechselt von der Mini-Karte zur vollständigen Karte und zurück",
    rooms_all: "Alle Räume anzeigen",
    rooms_check: "Nur die Räume, die Aufmerksamkeit brauchen",
    ed_sort: "Sortierung",
    ed_sort_name: "Nach Name",
    ed_exclude_areas: "Auszuschließende Räume",
  },
  es: {
    all_closed: "Todo cerrado",
    all_quiet: "Todo tranquilo",
    open_one: "{n} abierto",
    open_many: "{n} abiertos",
    unavail_one: "{n} no disponible",
    unavail_many: "{n} no disponibles",
    leak: "Fuga de agua",
    smoke: "Humo detectado",
    gas: "Gas detectado",
    co: "Monóxido de carbono",
    detected: "Detectado",
    clear: "No detectado",
    unavailable: "No disponible",
    on: "Encendido",
    off: "Apagado",
    turn_all_off: "Apagar todo",
    ed_area: "Área",
    ed_title: "Título",
    ed_show_title: "Mostrar el título",
    ed_title_helper: "Déjalo vacío para usar el nombre del área",
    ed_columns: "Columnas",
    ed_layout: "Diseño",
    ed_layout_helper: "Mosaicos: un mosaico grande por entidad, como la tarjeta Mosaico, más fácil de tocar en el móvil",
    ed_layout_compact: "Compacto",
    ed_layout_tiles: "Mosaicos",
    ed_advanced: "Avanzado",
    ed_language: "Idioma",
    ed_language_helper: "Vacío: el idioma de Home Assistant",
    ed_language_auto: "Automático",
    ed_entities: "Entidades explícitas (YAML)",
    ed_entities_helper: "Sustituye la detección automática: IDs de entidad, o {entity, name, icon}",
    ed_thresholds: "Umbrales de confort (YAML)",
    ed_thresholds_helper: "Por tipo, en la unidad del sensor, p. ej. co2: [800, 1200] o humidity: [25, 35, 70, 80]",
    ed_rooms: "Habitaciones (YAML)",
    ed_rooms_helper: "Orden y personalización: una lista de {area, name, icon, navigation_path}",
    ed_navigation_path: "Ruta de navegación",
    ed_all_off_button: "Botón «Apagar todo»",
    err_config: "Define `area` o `entities`",
    zoom_in: "Mostrar la tarjeta completa",
    zoom_out: "Volver a la vista compacta",
    ed_zoom: "Botón de zoom",
    ed_zoom_helper: "Cambia de la minitarjeta a la tarjeta completa y viceversa",
    rooms_all: "Mostrar todas las habitaciones",
    rooms_check: "Solo las habitaciones que requieren atención",
    ed_sort: "Orden",
    ed_sort_name: "Por nombre",
    ed_exclude_areas: "Habitaciones a excluir",
  },
  sr: {
    all_closed: "Све је затворено",
    all_quiet: "Све је мирно",
    open_one: "{n} отворено",
    open_few: "{n} отворена",
    open_many: "{n} отворених",
    unavail_one: "Недоступно: {n}",
    unavail_many: "Недоступно: {n}",
    leak: "Цурење воде",
    smoke: "Откривен дим",
    gas: "Откривен гас",
    co: "Угљен-моноксид",
    detected: "Откривено",
    clear: "Није откривено",
    unavailable: "Недоступно",
    on: "Укључено",
    off: "Искључено",
    turn_all_off: "Искључи све",
    ed_area: "Просторија",
    ed_title: "Наслов",
    ed_show_title: "Прикажи наслов",
    ed_title_helper: "Остави празно за назив просторије",
    ed_columns: "Колоне",
    ed_layout: "Распоред",
    ed_layout_helper: "Плочице: једна велика плочица по ентитету, као картица Плочица, лакше за додир на телефону",
    ed_layout_compact: "Збијено",
    ed_layout_tiles: "Плочице",
    ed_advanced: "Напредно",
    ed_language: "Језик",
    ed_language_helper: "Празно: језик Home Assistant-а",
    ed_language_auto: "Аутоматски",
    ed_entities: "Експлицитни ентитети (YAML)",
    ed_entities_helper: "Замењује аутоматско проналажење: ID-ови ентитета или {entity, name, icon}",
    ed_thresholds: "Прагови комфора (YAML)",
    ed_thresholds_helper: "По врсти, у јединици сензора, нпр. co2: [800, 1200] или humidity: [25, 35, 70, 80]",
    ed_rooms: "Собе/Просторије (YAML)",
    ed_rooms_helper: "Редослед и измене: листа са {area, name, icon, navigation_path}",
    ed_navigation_path: "Путања за навигацију",
    ed_all_off_button: "Дугме „Искључи све“",
    err_config: "Подесите `area` или `entities`",
    zoom_in: "Прикажи целу картицу",
    zoom_out: "Назад на компактни приказ",
    ed_zoom: "Дугме за увећање",
    ed_zoom_helper: "Пребацује мини картицу на пун приказ и назад",
    rooms_all: "Прикажи сваку собу",
    rooms_check: "Само собе које захтевају пажњу",
    ed_sort: "Сортирање",
    ed_sort_name: "По имену",
    ed_exclude_areas: "Изостави собе",
  },
  "sr-Latn": {
    all_closed: "Sve je zatvoreno",
    all_quiet: "Sve je mirno",
    open_one: "{n} otvoreno",
    open_few: "{n} otvorena",
    open_many: "{n} otvorenih",
    unavail_one: "Nedostupno: {n}",
    unavail_many: "Nedostupno: {n}",
    leak: "Curenje vode",
    smoke: "Otkriven dim",
    gas: "Otkriven gas",
    co: "Ugljen-monoksid",
    detected: "Otkriveno",
    clear: "Nije otkriveno",
    unavailable: "Nedostupno",
    on: "Uključeno",
    off: "Isključeno",
    turn_all_off: "Isključi sve",
    ed_area: "Prostorija",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_title_helper: "Ostavi prazno za naziv prostorije",
    ed_columns: "Kolone",
    ed_layout: "Raspored",
    ed_layout_helper: "Pločice: jedna velika pločica po entitetu, kao kartica Pločica, lakše za dodir na telefonu",
    ed_layout_compact: "Zbijeno",
    ed_layout_tiles: "Pločice",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistant-a",
    ed_language_auto: "Automatski",
    ed_entities: "Eksplicitni entiteti (YAML)",
    ed_entities_helper: "Zamenjuje automatsko pronalaženje: ID-ovi entiteta ili {entity, name, icon}",
    ed_thresholds: "Pragovi komfora (YAML)",
    ed_thresholds_helper: "Po vrsti, u jedinici senzora, npr. co2: [800, 1200] ili humidity: [25, 35, 70, 80]",
    ed_rooms: "Sobe/Prostorije (YAML)",
    ed_rooms_helper: "Redosled i izmene: lista sa {area, name, icon, navigation_path}",
    ed_navigation_path: "Putanja za navigaciju",
    ed_all_off_button: "Dugme „Isključi sve“",
    err_config: "Podesite `area` ili `entities`",
    zoom_in: "Prikaži celu karticu",
    zoom_out: "Nazad na kompaktni prikaz",
    ed_zoom: "Dugme za uvećanje",
    ed_zoom_helper: "Prebacuje mini karticu na pun prikaz i nazad",
    rooms_all: "Prikaži svaku sobu",
    rooms_check: "Samo sobe koje zahtevaju pažnju",
    ed_sort: "Sortiranje",
    ed_sort_name: "Po imenu",
    ed_exclude_areas: "Izostavi sobe",
  },
  it: {
    all_closed: "Tutto chiuso",
    all_quiet: "Tutto calmo",
    open_one: "{n} apertura",
    open_many: "{n} aperture",
    unavail_one: "{n} non disponibile",
    unavail_many: "{n} non disponibili",
    leak: "Perdita d'acqua",
    smoke: "Fumo rilevato",
    gas: "Gas rilevato",
    co: "Monossido di carbonio",
    detected: "Rilevato",
    clear: "Non rilevato",
    unavailable: "Non disponibile",
    on: "Accesa",
    off: "Spenta",
    turn_all_off: "Spegni tutto",
    ed_area: "Area",
    ed_title: "Titolo",
    ed_show_title: "Mostra il titolo",
    ed_title_helper: "Lascia vuoto per usare il nome dell'area",
    ed_columns: "Colonne",
    ed_layout: "Layout",
    ed_layout_helper: "Riquadri: un riquadro grande per entità, come la scheda Riquadro, più facile da toccare sul telefono",
    ed_layout_compact: "Compatto",
    ed_layout_tiles: "Riquadri",
    ed_advanced: "Avanzate",
    ed_language: "Lingua",
    ed_language_helper: "Vuoto: la lingua di Home Assistant",
    ed_language_auto: "Automatica",
    ed_entities: "Entità esplicite (YAML)",
    ed_entities_helper: "Sostituisce il rilevamento automatico: ID entità o {entity, name, icon}",
    ed_thresholds: "Soglie di comfort (YAML)",
    ed_thresholds_helper: "Per tipo, nell'unità del sensore, ad es. co2: [800, 1200] o humidity: [25, 35, 70, 80]",
    ed_rooms: "Stanze (YAML)",
    ed_rooms_helper: "Ordine e personalizzazioni: un elenco di {area, name, icon, navigation_path}",
    ed_navigation_path: "Percorso di navigazione",
    ed_all_off_button: "Pulsante «Spegni tutto»",
    err_config: "Imposta `area` o `entities`",
    zoom_in: "Mostra la scheda completa",
    zoom_out: "Torna alla vista compatta",
    ed_zoom: "Pulsante zoom",
    ed_zoom_helper: "Passa dalla mini scheda alla scheda completa e viceversa",
    rooms_all: "Mostra tutte le stanze",
    rooms_check: "Solo le stanze da controllare",
    ed_sort: "Ordinamento",
    ed_sort_name: "Per nome",
    ed_exclude_areas: "Stanze da escludere",
  },
  nl: {
    all_closed: "Alles dicht",
    all_quiet: "Alles rustig",
    open_one: "{n} open",
    open_many: "{n} open",
    unavail_one: "{n} niet beschikbaar",
    unavail_many: "{n} niet beschikbaar",
    leak: "Waterlek",
    smoke: "Rook gedetecteerd",
    gas: "Gas gedetecteerd",
    co: "Koolmonoxide",
    detected: "Gedetecteerd",
    clear: "Niet gedetecteerd",
    unavailable: "Niet beschikbaar",
    on: "Aan",
    off: "Uit",
    turn_all_off: "Alles uitschakelen",
    ed_area: "Ruimte",
    ed_title: "Titel",
    ed_show_title: "Titel tonen",
    ed_title_helper: "Leeg laten voor de naam van de ruimte",
    ed_columns: "Kolommen",
    ed_layout: "Indeling",
    ed_layout_helper: "Tegels: één grote tegel per entiteit, zoals de Tegel-kaart, makkelijker aan te tikken op een telefoon",
    ed_layout_compact: "Compact",
    ed_layout_tiles: "Tegels",
    ed_advanced: "Geavanceerd",
    ed_language: "Taal",
    ed_language_helper: "Leeg: de taal van Home Assistant",
    ed_language_auto: "Automatisch",
    ed_entities: "Expliciete entiteiten (YAML)",
    ed_entities_helper: "Vervangt de automatische detectie: entiteit-ID's of {entity, name, icon}",
    ed_thresholds: "Comfortdrempels (YAML)",
    ed_thresholds_helper: "Per soort, in de eenheid van de sensor, bijv. co2: [800, 1200] of humidity: [25, 35, 70, 80]",
    ed_rooms: "Ruimtes (YAML)",
    ed_rooms_helper: "Volgorde en aanpassingen: een lijst van {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigatiepad",
    ed_all_off_button: "Knop “Alles uitschakelen”",
    err_config: "Stel `area` of `entities` in",
    zoom_in: "Volledige kaart tonen",
    zoom_out: "Terug naar de compacte weergave",
    ed_zoom: "Zoomknop",
    ed_zoom_helper: "Schakelt de minikaart naar de volledige kaart en terug",
    rooms_all: "Alle ruimtes tonen",
    rooms_check: "Alleen de ruimtes die aandacht nodig hebben",
    ed_sort: "Sortering",
    ed_sort_name: "Op naam",
    ed_exclude_areas: "Uit te sluiten ruimtes",
  },
  pt: {
    all_closed: "Tudo fechado",
    all_quiet: "Tudo calmo",
    open_one: "{n} abertura",
    open_many: "{n} aberturas",
    unavail_one: "{n} indisponível",
    unavail_many: "{n} indisponíveis",
    leak: "Fuga de água",
    smoke: "Fumo detetado",
    gas: "Gás detetado",
    co: "Monóxido de carbono",
    detected: "Detetado",
    clear: "Não detetado",
    unavailable: "Indisponível",
    on: "Ligada",
    off: "Desligada",
    turn_all_off: "Desligar tudo",
    ed_area: "Área",
    ed_title: "Título",
    ed_show_title: "Mostrar o título",
    ed_title_helper: "Deixe vazio para usar o nome da área",
    ed_columns: "Colunas",
    ed_layout: "Disposição",
    ed_layout_helper: "Mosaicos: um mosaico grande por entidade, como o cartão Mosaico, mais fácil de tocar no telemóvel",
    ed_layout_compact: "Compacta",
    ed_layout_tiles: "Mosaicos",
    ed_advanced: "Avançado",
    ed_language: "Idioma",
    ed_language_helper: "Vazio: o idioma do Home Assistant",
    ed_language_auto: "Automático",
    ed_entities: "Entidades explícitas (YAML)",
    ed_entities_helper: "Substitui a deteção automática: IDs de entidade, ou {entity, name, icon}",
    ed_thresholds: "Limiares de conforto (YAML)",
    ed_thresholds_helper: "Por tipo, na unidade do sensor, p. ex. co2: [800, 1200] ou humidity: [25, 35, 70, 80]",
    ed_rooms: "Divisões (YAML)",
    ed_rooms_helper: "Ordem e personalização: uma lista de {area, name, icon, navigation_path}",
    ed_navigation_path: "Caminho de navegação",
    ed_all_off_button: "Botão «Desligar tudo»",
    err_config: "Defina `area` ou `entities`",
    zoom_in: "Mostrar o cartão completo",
    zoom_out: "Voltar à vista compacta",
    ed_zoom: "Botão de zoom",
    ed_zoom_helper: "Alterna entre o minicartão e o cartão completo",
    rooms_all: "Mostrar todas as divisões",
    rooms_check: "Só as divisões que precisam de atenção",
    ed_sort: "Ordenação",
    ed_sort_name: "Por nome",
    ed_exclude_areas: "Divisões a excluir",
  },
  pl: {
    all_closed: "Zamknięte",
    all_quiet: "Spokojnie",
    open_one: "Otwarte: {n}",
    open_many: "Otwarte: {n}",
    unavail_one: "Niedostępne: {n}",
    unavail_many: "Niedostępne: {n}",
    leak: "Wyciek wody",
    smoke: "Wykryto dym",
    gas: "Wykryto gaz",
    co: "Tlenek węgla",
    detected: "Wykryto",
    clear: "Nie wykryto",
    unavailable: "Niedostępne",
    on: "Włączone",
    off: "Wyłączone",
    turn_all_off: "Wyłącz wszystko",
    ed_area: "Obszar",
    ed_title: "Tytuł",
    ed_show_title: "Pokaż tytuł",
    ed_title_helper: "Pozostaw puste, aby użyć nazwy obszaru",
    ed_columns: "Kolumny",
    ed_layout: "Układ",
    ed_layout_helper: "Kafelki: jeden duży kafelek na encję, jak karta Kafelek, łatwiejszy do dotknięcia na telefonie",
    ed_layout_compact: "Kompaktowy",
    ed_layout_tiles: "Kafelki",
    ed_advanced: "Zaawansowane",
    ed_language: "Język",
    ed_language_helper: "Puste: język Home Assistanta",
    ed_language_auto: "Automatyczny",
    ed_entities: "Jawnie podane encje (YAML)",
    ed_entities_helper: "Zastępuje automatyczne wykrywanie: identyfikatory encji lub {entity, name, icon}",
    ed_thresholds: "Progi komfortu (YAML)",
    ed_thresholds_helper: "Dla każdego rodzaju, w jednostce czujnika, np. co2: [800, 1200] lub humidity: [25, 35, 70, 80]",
    ed_rooms: "Pomieszczenia (YAML)",
    ed_rooms_helper: "Kolejność i nadpisania: lista {area, name, icon, navigation_path}",
    ed_navigation_path: "Ścieżka nawigacji",
    ed_all_off_button: "Przycisk „Wyłącz wszystko”",
    err_config: "Ustaw `area` lub `entities`",
    zoom_in: "Pokaż pełną kartę",
    zoom_out: "Wróć do widoku kompaktowego",
    ed_zoom: "Przycisk powiększenia",
    ed_zoom_helper: "Przełącza minikartę na pełną kartę i z powrotem",
    rooms_all: "Pokaż wszystkie pomieszczenia",
    rooms_check: "Tylko pomieszczenia wymagające uwagi",
    ed_sort: "Sortowanie",
    ed_sort_name: "Według nazwy",
    ed_exclude_areas: "Pomieszczenia do wykluczenia",
  },
  ro: {
    all_closed: "Totul închis",
    all_quiet: "Totul liniștit",
    open_one: "Deschise: {n}",
    open_many: "Deschise: {n}",
    unavail_one: "Indisponibile: {n}",
    unavail_many: "Indisponibile: {n}",
    leak: "Scurgere",
    smoke: "Fum detectat",
    gas: "Gaz detectat",
    co: "Monoxid de carbon",
    detected: "Detectat",
    clear: "Nedetectat",
    unavailable: "Indisponibil",
    on: "Pornită",
    off: "Oprită",
    turn_all_off: "Oprește tot",
    ed_area: "Zonă",
    ed_title: "Titlu",
    ed_show_title: "Afișează titlul",
    ed_title_helper: "Lasă gol pentru numele zonei",
    ed_columns: "Coloane",
    ed_layout: "Aspect",
    ed_layout_helper: "Plăci: o placă mare pentru fiecare entitate, ca fișa Placă, mai ușor de atins pe telefon",
    ed_layout_compact: "Compact",
    ed_layout_tiles: "Plăci",
    ed_advanced: "Avansat",
    ed_language: "Limbă",
    ed_language_helper: "Gol: limba Home Assistant",
    ed_language_auto: "Automată",
    ed_entities: "Entități explicite (YAML)",
    ed_entities_helper: "Înlocuiește detectarea automată: ID-uri de entitate sau {entity, name, icon}",
    ed_thresholds: "Praguri de confort (YAML)",
    ed_thresholds_helper: "Pe tip, în unitatea senzorului, de ex. co2: [800, 1200] sau humidity: [25, 35, 70, 80]",
    ed_rooms: "Camere (YAML)",
    ed_rooms_helper: "Ordine și personalizări: o listă de {area, name, icon, navigation_path}",
    ed_navigation_path: "Cale de navigare",
    ed_all_off_button: "Butonul „Oprește tot”",
    err_config: "Setează `area` sau `entities`",
    zoom_in: "Afișează cardul complet",
    zoom_out: "Înapoi la vizualizarea compactă",
    ed_zoom: "Buton de zoom",
    ed_zoom_helper: "Comută între mini-card și cardul complet",
    rooms_all: "Afișează toate camerele",
    rooms_check: "Doar camerele care necesită atenție",
    ed_sort: "Sortare",
    ed_sort_name: "După nume",
    ed_exclude_areas: "Camere excluse",
  },
  da: {
    all_closed: "Alt lukket",
    all_quiet: "Alt roligt",
    open_one: "{n} åben",
    open_many: "{n} åbne",
    unavail_one: "{n} utilgængelig",
    unavail_many: "{n} utilgængelige",
    leak: "Vandlækage",
    smoke: "Røg registreret",
    gas: "Gas registreret",
    co: "Kulilte",
    detected: "Registreret",
    clear: "Ikke registreret",
    unavailable: "Utilgængelig",
    on: "Tændt",
    off: "Slukket",
    turn_all_off: "Sluk alt",
    ed_area: "Område",
    ed_title: "Titel",
    ed_show_title: "Vis titel",
    ed_title_helper: "Lad stå tomt for at bruge områdets navn",
    ed_columns: "Kolonner",
    ed_layout: "Layout",
    ed_layout_helper: "Fliser: én stor flise pr. entitet som Flise-kortet, nemmere at trykke på en telefon",
    ed_layout_compact: "Kompakt",
    ed_layout_tiles: "Fliser",
    ed_advanced: "Avanceret",
    ed_language: "Sprog",
    ed_language_helper: "Tomt: Home Assistants sprog",
    ed_language_auto: "Automatisk",
    ed_entities: "Eksplicitte enheder (YAML)",
    ed_entities_helper: "Erstatter den automatiske registrering: enheds-id'er eller {entity, name, icon}",
    ed_thresholds: "Komforttærskler (YAML)",
    ed_thresholds_helper: "Pr. type, i sensorens enhed, f.eks. co2: [800, 1200] eller humidity: [25, 35, 70, 80]",
    ed_rooms: "Rum (YAML)",
    ed_rooms_helper: "Rækkefølge og tilpasninger: en liste med {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigationssti",
    ed_all_off_button: "Knappen »Sluk alt«",
    err_config: "Angiv `area` eller `entities`",
    zoom_in: "Vis hele kortet",
    zoom_out: "Tilbage til den kompakte visning",
    ed_zoom: "Zoomknap",
    ed_zoom_helper: "Skifter fra minikortet til hele kortet og tilbage",
    rooms_all: "Vis alle rum",
    rooms_check: "Kun rum, der kræver opmærksomhed",
    ed_sort: "Sortering",
    ed_sort_name: "Efter navn",
    ed_exclude_areas: "Rum, der udelades",
  },
  sv: {
    all_closed: "Allt stängt",
    all_quiet: "Allt lugnt",
    open_one: "{n} öppen",
    open_many: "{n} öppna",
    unavail_one: "{n} ej tillgänglig",
    unavail_many: "{n} ej tillgängliga",
    leak: "Vattenläcka",
    smoke: "Rök upptäckt",
    gas: "Gas upptäckt",
    co: "Kolmonoxid",
    detected: "Upptäckt",
    clear: "Inte upptäckt",
    unavailable: "Ej tillgänglig",
    on: "På",
    off: "Av",
    turn_all_off: "Stäng av allt",
    ed_area: "Område",
    ed_title: "Titel",
    ed_show_title: "Visa rubrik",
    ed_title_helper: "Lämna tomt för områdets namn",
    ed_columns: "Kolumner",
    ed_layout: "Layout",
    ed_layout_helper: "Rutor: en stor ruta per entitet, som Ruta-kortet, lättare att trycka på i mobilen",
    ed_layout_compact: "Kompakt",
    ed_layout_tiles: "Rutor",
    ed_advanced: "Avancerat",
    ed_language: "Språk",
    ed_language_helper: "Tomt: Home Assistants språk",
    ed_language_auto: "Automatiskt",
    ed_entities: "Explicita entiteter (YAML)",
    ed_entities_helper: "Ersätter den automatiska identifieringen: entitets-ID:n eller {entity, name, icon}",
    ed_thresholds: "Komfortgränser (YAML)",
    ed_thresholds_helper: "Per typ, i sensorns enhet, t.ex. co2: [800, 1200] eller humidity: [25, 35, 70, 80]",
    ed_rooms: "Rum (YAML)",
    ed_rooms_helper: "Ordning och anpassningar: en lista med {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigeringssökväg",
    ed_all_off_button: "Knappen ”Stäng av allt”",
    err_config: "Ange `area` eller `entities`",
    zoom_in: "Visa hela kortet",
    zoom_out: "Tillbaka till kompakt vy",
    ed_zoom: "Zoomknapp",
    ed_zoom_helper: "Växlar mellan minikortet och hela kortet",
    rooms_all: "Visa alla rum",
    rooms_check: "Bara rum som behöver ses över",
    ed_sort: "Sortering",
    ed_sort_name: "Efter namn",
    ed_exclude_areas: "Rum att utesluta",
  },
  bg: {
    all_closed: "Всичко е затворено",
    all_quiet: "Всичко е спокойно",
    open_one: "Отворени: {n}",
    open_many: "Отворени: {n}",
    unavail_one: "Недостъпни: {n}",
    unavail_many: "Недостъпни: {n}",
    leak: "Теч на вода",
    smoke: "Открит дим",
    gas: "Открит газ",
    co: "Въглероден оксид",
    detected: "Открито",
    clear: "Не е открито",
    unavailable: "Недостъпно",
    on: "Включен",
    off: "Изключен",
    turn_all_off: "Изключи всичко",
    ed_area: "Зона",
    ed_title: "Заглавие",
    ed_show_title: "Показване на заглавието",
    ed_title_helper: "Оставете празно за името на зоната",
    ed_columns: "Колони",
    ed_layout: "Оформление",
    ed_layout_helper: "Плочки: по една голяма плочка за обект, като картата Плочка, по-лесна за докосване на телефон",
    ed_layout_compact: "Компактно",
    ed_layout_tiles: "Плочки",
    ed_advanced: "Разширени",
    ed_language: "Език",
    ed_language_helper: "Празно: езикът на Home Assistant",
    ed_language_auto: "Автоматично",
    ed_entities: "Изрично зададени обекти (YAML)",
    ed_entities_helper: "Заменя автоматичното откриване: ID на обекти или {entity, name, icon}",
    ed_thresholds: "Прагове на комфорт (YAML)",
    ed_thresholds_helper: "По вид, в мерната единица на сензора, напр. co2: [800, 1200] или humidity: [25, 35, 70, 80]",
    ed_rooms: "Стаи (YAML)",
    ed_rooms_helper: "Ред и персонализиране: списък от {area, name, icon, navigation_path}",
    ed_navigation_path: "Път за навигация",
    ed_all_off_button: "Бутон „Изключи всичко“",
    err_config: "Задайте `area` или `entities`",
    zoom_in: "Покажи пълната карта",
    zoom_out: "Обратно към компактния изглед",
    ed_zoom: "Бутон за увеличение",
    ed_zoom_helper: "Превключва от мини картата към пълната карта и обратно",
    rooms_all: "Покажи всички стаи",
    rooms_check: "Само стаите, които изискват внимание",
    ed_sort: "Сортиране",
    ed_sort_name: "По име",
    ed_exclude_areas: "Стаи за пропускане",
  },
  ru: {
    all_closed: "Всё закрыто",
    all_quiet: "Всё спокойно",
    open_one: "Открыто: {n}",
    open_many: "Открыто: {n}",
    unavail_one: "Недоступно: {n}",
    unavail_many: "Недоступно: {n}",
    leak: "Протечка",
    smoke: "Обнаружен дым",
    gas: "Обнаружен газ",
    co: "Угарный газ",
    detected: "Обнаружено",
    clear: "Не обнаружено",
    unavailable: "Недоступно",
    on: "Включено",
    off: "Выключено",
    turn_all_off: "Выключить всё",
    ed_area: "Пространство",
    ed_title: "Заголовок",
    ed_show_title: "Показывать заголовок",
    ed_title_helper: "Оставьте пустым, чтобы использовать название пространства",
    ed_columns: "Столбцы",
    ed_layout: "Макет",
    ed_layout_helper: "Плитки: одна большая плитка на объект, как карточка «Плитка», удобнее нажимать на телефоне",
    ed_layout_compact: "Компактный",
    ed_layout_tiles: "Плитки",
    ed_advanced: "Дополнительно",
    ed_language: "Язык",
    ed_language_helper: "Пусто: язык Home Assistant",
    ed_language_auto: "Автоматически",
    ed_entities: "Явно заданные объекты (YAML)",
    ed_entities_helper: "Заменяет автоматическое обнаружение: ID объектов или {entity, name, icon}",
    ed_thresholds: "Пороги комфорта (YAML)",
    ed_thresholds_helper: "Для каждого типа, в единицах датчика, например co2: [800, 1200] или humidity: [25, 35, 70, 80]",
    ed_rooms: "Комнаты (YAML)",
    ed_rooms_helper: "Порядок и настройки: список {area, name, icon, navigation_path}",
    ed_navigation_path: "Путь навигации",
    ed_all_off_button: "Кнопка «Выключить всё»",
    err_config: "Укажите `area` или `entities`",
    zoom_in: "Показать полную карточку",
    zoom_out: "Вернуться к компактному виду",
    ed_zoom: "Кнопка масштаба",
    ed_zoom_helper: "Переключает мини-карточку на полную карточку и обратно",
    rooms_all: "Показать все комнаты",
    rooms_check: "Только комнаты, требующие внимания",
    ed_sort: "Сортировка",
    ed_sort_name: "По названию",
    ed_exclude_areas: "Исключить комнаты",
  },
  uk: {
    all_closed: "Усе зачинено",
    all_quiet: "Усе спокійно",
    open_one: "Відчинено: {n}",
    open_many: "Відчинено: {n}",
    unavail_one: "Недоступно: {n}",
    unavail_many: "Недоступно: {n}",
    leak: "Витік води",
    smoke: "Виявлено дим",
    gas: "Виявлено газ",
    co: "Чадний газ",
    detected: "Виявлено",
    clear: "Не виявлено",
    unavailable: "Недоступно",
    on: "Увімкнено",
    off: "Вимкнено",
    turn_all_off: "Вимкнути все",
    ed_area: "Простір",
    ed_title: "Заголовок",
    ed_show_title: "Показувати заголовок",
    ed_title_helper: "Залиште порожнім, щоб використати назву простору",
    ed_columns: "Стовпці",
    ed_layout: "Макет",
    ed_layout_helper: "Плитки: одна велика плитка на сутність, як картка «Плитка», зручніше торкатися на телефоні",
    ed_layout_compact: "Компактний",
    ed_layout_tiles: "Плитки",
    ed_advanced: "Додатково",
    ed_language: "Мова",
    ed_language_helper: "Порожньо: мова Home Assistant",
    ed_language_auto: "Автоматично",
    ed_entities: "Явно задані сутності (YAML)",
    ed_entities_helper: "Замінює автоматичне виявлення: ID сутностей або {entity, name, icon}",
    ed_thresholds: "Пороги комфорту (YAML)",
    ed_thresholds_helper: "Для кожного типу, в одиницях датчика, наприклад co2: [800, 1200] або humidity: [25, 35, 70, 80]",
    ed_rooms: "Кімнати (YAML)",
    ed_rooms_helper: "Порядок і налаштування: список {area, name, icon, navigation_path}",
    ed_navigation_path: "Шлях навігації",
    ed_all_off_button: "Кнопка «Вимкнути все»",
    err_config: "Вкажіть `area` або `entities`",
    zoom_in: "Показати повну картку",
    zoom_out: "Повернутися до компактного вигляду",
    ed_zoom: "Кнопка масштабу",
    ed_zoom_helper: "Перемикає міні-картку на повну картку й назад",
    rooms_all: "Показати всі кімнати",
    rooms_check: "Лише кімнати, що потребують уваги",
    ed_sort: "Сортування",
    ed_sort_name: "За назвою",
    ed_exclude_areas: "Виключити кімнати",
  },
  hu: {
    all_closed: "Minden zárva",
    all_quiet: "Minden nyugodt",
    open_one: "{n} nyitva",
    open_many: "{n} nyitva",
    unavail_one: "{n} nem elérhető",
    unavail_many: "{n} nem elérhető",
    leak: "Vízszivárgás",
    smoke: "Füst észlelve",
    gas: "Gáz észlelve",
    co: "Szén-monoxid",
    detected: "Észlelve",
    clear: "Nincs észlelés",
    unavailable: "Nem elérhető",
    on: "Be",
    off: "Ki",
    turn_all_off: "Minden kikapcsolása",
    ed_area: "Terület",
    ed_title: "Cím",
    ed_show_title: "Cím megjelenítése",
    ed_title_helper: "Hagyd üresen a terület nevéhez",
    ed_columns: "Oszlopok",
    ed_layout: "Elrendezés",
    ed_layout_helper: "Csempék: entitásonként egy nagy csempe, mint a Csempe kártya, telefonon könnyebb megérinteni",
    ed_layout_compact: "Tömör",
    ed_layout_tiles: "Csempék",
    ed_advanced: "Speciális",
    ed_language: "Nyelv",
    ed_language_helper: "Üres: a Home Assistant nyelve",
    ed_language_auto: "Automatikus",
    ed_entities: "Kifejezetten megadott entitások (YAML)",
    ed_entities_helper: "Felülírja az automatikus felismerést: entitásazonosítók vagy {entity, name, icon}",
    ed_thresholds: "Komfortküszöbök (YAML)",
    ed_thresholds_helper: "Típusonként, az érzékelő mértékegységében, pl. co2: [800, 1200] vagy humidity: [25, 35, 70, 80]",
    ed_rooms: "Helyiségek (YAML)",
    ed_rooms_helper: "Sorrend és testreszabás: {area, name, icon, navigation_path} elemek listája",
    ed_navigation_path: "Navigációs útvonal",
    ed_all_off_button: "„Minden kikapcsolása” gomb",
    err_config: "Állítsd be az `area` vagy az `entities` értékét",
    zoom_in: "A teljes kártya megjelenítése",
    zoom_out: "Vissza a kompakt nézethez",
    ed_zoom: "Nagyítás gomb",
    ed_zoom_helper: "Vált a mini kártya és a teljes kártya között",
    rooms_all: "Minden helyiség megjelenítése",
    rooms_check: "Csak a figyelmet igénylő helyiségek",
    ed_sort: "Rendezés",
    ed_sort_name: "Név szerint",
    ed_exclude_areas: "Kihagyott helyiségek",
  },
  sk: {
    all_closed: "Všetko zatvorené",
    all_quiet: "Všetko pokojné",
    open_one: "Otvorené: {n}",
    open_many: "Otvorené: {n}",
    unavail_one: "Nedostupné: {n}",
    unavail_many: "Nedostupné: {n}",
    leak: "Únik vody",
    smoke: "Zistený dym",
    gas: "Zistený plyn",
    co: "Oxid uhoľnatý",
    detected: "Zistené",
    clear: "Nezistené",
    unavailable: "Nedostupné",
    on: "Zapnuté",
    off: "Vypnuté",
    turn_all_off: "Vypnúť všetko",
    ed_area: "Oblasť",
    ed_title: "Názov",
    ed_show_title: "Zobraziť názov",
    ed_title_helper: "Nechajte prázdne pre názov oblasti",
    ed_columns: "Stĺpce",
    ed_layout: "Rozloženie",
    ed_layout_helper: "Dlaždice: jedna veľká dlaždica na entitu ako karta Dlaždica, na telefóne sa ľahšie ťuká",
    ed_layout_compact: "Kompaktné",
    ed_layout_tiles: "Dlaždice",
    ed_advanced: "Rozšírené",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdne: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_entities: "Explicitné entity (YAML)",
    ed_entities_helper: "Nahrádza automatické vyhľadávanie: ID entít alebo {entity, name, icon}",
    ed_thresholds: "Prahy komfortu (YAML)",
    ed_thresholds_helper: "Podľa druhu, v jednotke senzora, napr. co2: [800, 1200] alebo humidity: [25, 35, 70, 80]",
    ed_rooms: "Miestnosti (YAML)",
    ed_rooms_helper: "Poradie a úpravy: zoznam {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigačná cesta",
    ed_all_off_button: "Tlačidlo „Vypnúť všetko“",
    err_config: "Nastavte `area` alebo `entities`",
    zoom_in: "Zobraziť celú kartu",
    zoom_out: "Späť na kompaktné zobrazenie",
    ed_zoom: "Tlačidlo priblíženia",
    ed_zoom_helper: "Prepína minikartu na celú kartu a späť",
    rooms_all: "Zobraziť všetky miestnosti",
    rooms_check: "Len miestnosti vyžadujúce pozornosť",
    ed_sort: "Zoradenie",
    ed_sort_name: "Podľa názvu",
    ed_exclude_areas: "Vynechané miestnosti",
  },
  cs: {
    all_closed: "Vše zavřeno",
    all_quiet: "Vše v klidu",
    open_one: "Otevřeno: {n}",
    open_many: "Otevřeno: {n}",
    unavail_one: "Nedostupné: {n}",
    unavail_many: "Nedostupné: {n}",
    leak: "Únik vody",
    smoke: "Zjištěn kouř",
    gas: "Zjištěn plyn",
    co: "Oxid uhelnatý",
    detected: "Zjištěno",
    clear: "Nezjištěno",
    unavailable: "Nedostupné",
    on: "Zapnuto",
    off: "Vypnuto",
    turn_all_off: "Vypnout vše",
    ed_area: "Oblast",
    ed_title: "Název",
    ed_show_title: "Zobrazit název",
    ed_title_helper: "Ponechte prázdné pro název oblasti",
    ed_columns: "Sloupce",
    ed_layout: "Rozložení",
    ed_layout_helper: "Dlaždice: jedna velká dlaždice na entitu jako karta Dlaždice, na telefonu se snáz ťuká",
    ed_layout_compact: "Kompaktní",
    ed_layout_tiles: "Dlaždice",
    ed_advanced: "Pokročilé",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdné: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_entities: "Explicitní entity (YAML)",
    ed_entities_helper: "Nahrazuje automatické vyhledávání: ID entit nebo {entity, name, icon}",
    ed_thresholds: "Prahy komfortu (YAML)",
    ed_thresholds_helper: "Podle druhu, v jednotce senzoru, např. co2: [800, 1200] nebo humidity: [25, 35, 70, 80]",
    ed_rooms: "Místnosti (YAML)",
    ed_rooms_helper: "Pořadí a úpravy: seznam {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigační cesta",
    ed_all_off_button: "Tlačítko „Vypnout vše“",
    err_config: "Nastavte `area` nebo `entities`",
    zoom_in: "Zobrazit celou kartu",
    zoom_out: "Zpět na kompaktní zobrazení",
    ed_zoom: "Tlačítko přiblížení",
    ed_zoom_helper: "Přepíná minikartu na celou kartu a zpět",
    rooms_all: "Zobrazit všechny místnosti",
    rooms_check: "Jen místnosti vyžadující pozornost",
    ed_sort: "Řazení",
    ed_sort_name: "Podle názvu",
    ed_exclude_areas: "Vynechané místnosti",
  },
  sl: {
    all_closed: "Vse zaprto",
    all_quiet: "Vse mirno",
    open_one: "Odprto: {n}",
    open_many: "Odprto: {n}",
    unavail_one: "Ni na voljo: {n}",
    unavail_many: "Ni na voljo: {n}",
    leak: "Puščanje vode",
    smoke: "Zaznan dim",
    gas: "Zaznan plin",
    co: "Ogljikov monoksid",
    detected: "Zaznano",
    clear: "Ni zaznano",
    unavailable: "Ni na voljo",
    on: "Vklopljeno",
    off: "Izklopljeno",
    turn_all_off: "Izklopi vse",
    ed_area: "Območje",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_title_helper: "Pustite prazno za ime območja",
    ed_columns: "Stolpci",
    ed_layout: "Postavitev",
    ed_layout_helper: "Ploščice: ena velika ploščica na entiteto, kot kartica Ploščica, lažje za dotik na telefonu",
    ed_layout_compact: "Strnjena",
    ed_layout_tiles: "Ploščice",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistanta",
    ed_language_auto: "Samodejno",
    ed_entities: "Izrecno navedene entitete (YAML)",
    ed_entities_helper: "Nadomesti samodejno zaznavanje: ID-ji entitet ali {entity, name, icon}",
    ed_thresholds: "Pragovi udobja (YAML)",
    ed_thresholds_helper: "Po vrsti, v enoti senzorja, npr. co2: [800, 1200] ali humidity: [25, 35, 70, 80]",
    ed_rooms: "Prostori (YAML)",
    ed_rooms_helper: "Vrstni red in prilagoditve: seznam {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigacijska pot",
    ed_all_off_button: "Gumb »Izklopi vse«",
    err_config: "Nastavite `area` ali `entities`",
    zoom_in: "Prikaži celotno kartico",
    zoom_out: "Nazaj na strnjen pogled",
    ed_zoom: "Gumb za povečavo",
    ed_zoom_helper: "Preklopi mini kartico v celotno kartico in nazaj",
    rooms_all: "Prikaži vse prostore",
    rooms_check: "Samo prostori, ki potrebujejo pozornost",
    ed_sort: "Razvrščanje",
    ed_sort_name: "Po imenu",
    ed_exclude_areas: "Izpuščeni prostori",
  },
  lv: {
    all_closed: "Viss aizvērts",
    all_quiet: "Viss mierīgi",
    open_one: "Atvērti: {n}",
    open_many: "Atvērti: {n}",
    unavail_one: "Nav pieejami: {n}",
    unavail_many: "Nav pieejami: {n}",
    leak: "Ūdens noplūde",
    smoke: "Konstatēti dūmi",
    gas: "Konstatēta gāze",
    co: "Tvana gāze",
    detected: "Konstatēts",
    clear: "Nav konstatēts",
    unavailable: "Nav pieejams",
    on: "Ieslēgts",
    off: "Izslēgts",
    turn_all_off: "Izslēgt visu",
    ed_area: "Zona",
    ed_title: "Virsraksts",
    ed_show_title: "Rādīt virsrakstu",
    ed_title_helper: "Atstājiet tukšu, lai izmantotu zonas nosaukumu",
    ed_columns: "Kolonnas",
    ed_layout: "Izkārtojums",
    ed_layout_helper: "Flīzes: viena liela flīze katrai entītijai kā kartītē Flīze, tālrunī vieglāk pieskarties",
    ed_layout_compact: "Kompakts",
    ed_layout_tiles: "Flīzes",
    ed_advanced: "Papildu",
    ed_language: "Valoda",
    ed_language_helper: "Tukšs: Home Assistant valoda",
    ed_language_auto: "Automātiski",
    ed_entities: "Tieši norādītas vienības (YAML)",
    ed_entities_helper: "Aizstāj automātisko noteikšanu: vienību ID vai {entity, name, icon}",
    ed_thresholds: "Komforta sliekšņi (YAML)",
    ed_thresholds_helper: "Pēc veida, sensora mērvienībā, piem., co2: [800, 1200] vai humidity: [25, 35, 70, 80]",
    ed_rooms: "Telpas (YAML)",
    ed_rooms_helper: "Secība un pielāgojumi: saraksts ar {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigācijas ceļš",
    ed_all_off_button: "Poga “Izslēgt visu”",
    err_config: "Iestatiet `area` vai `entities`",
    zoom_in: "Rādīt pilno karti",
    zoom_out: "Atpakaļ uz kompakto skatu",
    ed_zoom: "Tālummaiņas poga",
    ed_zoom_helper: "Pārslēdz mini karti uz pilno karti un atpakaļ",
    rooms_all: "Rādīt visas telpas",
    rooms_check: "Tikai telpas, kurām jāpievērš uzmanība",
    ed_sort: "Kārtošana",
    ed_sort_name: "Pēc nosaukuma",
    ed_exclude_areas: "Izslēdzamās telpas",
  },
  el: {
    all_closed: "Όλα κλειστά",
    all_quiet: "Όλα ήσυχα",
    open_one: "{n} ανοιχτό",
    open_many: "{n} ανοιχτά",
    unavail_one: "Μη διαθέσιμα: {n}",
    unavail_many: "Μη διαθέσιμα: {n}",
    leak: "Διαρροή νερού",
    smoke: "Ανιχνεύθηκε καπνός",
    gas: "Ανιχνεύθηκε αέριο",
    co: "Μονοξείδιο του άνθρακα",
    detected: "Ανιχνεύθηκε",
    clear: "Δεν ανιχνεύθηκε",
    unavailable: "Μη διαθέσιμο",
    on: "Ενεργή",
    off: "Ανενεργή",
    turn_all_off: "Απενεργοποίηση όλων",
    ed_area: "Περιοχή",
    ed_title: "Τίτλος",
    ed_show_title: "Εμφάνιση τίτλου",
    ed_title_helper: "Αφήστε το κενό για το όνομα της περιοχής",
    ed_columns: "Στήλες",
    ed_layout: "Διάταξη",
    ed_layout_helper: "Πλακίδια: ένα μεγάλο πλακίδιο ανά οντότητα, όπως η κάρτα Πλακίδιο, πιο εύκολο στο πάτημα στο κινητό",
    ed_layout_compact: "Συμπαγής",
    ed_layout_tiles: "Πλακίδια",
    ed_advanced: "Για προχωρημένους",
    ed_language: "Γλώσσα",
    ed_language_helper: "Κενό: η γλώσσα του Home Assistant",
    ed_language_auto: "Αυτόματα",
    ed_entities: "Ρητές οντότητες (YAML)",
    ed_entities_helper: "Αντικαθιστά τον αυτόματο εντοπισμό: αναγνωριστικά οντοτήτων ή {entity, name, icon}",
    ed_thresholds: "Όρια άνεσης (YAML)",
    ed_thresholds_helper: "Ανά είδος, στη μονάδα του αισθητήρα, π.χ. co2: [800, 1200] ή humidity: [25, 35, 70, 80]",
    ed_rooms: "Δωμάτια (YAML)",
    ed_rooms_helper: "Σειρά και προσαρμογές: μια λίστα με {area, name, icon, navigation_path}",
    ed_navigation_path: "Διαδρομή πλοήγησης",
    ed_all_off_button: "Κουμπί «Απενεργοποίηση όλων»",
    err_config: "Ορίστε `area` ή `entities`",
    zoom_in: "Εμφάνιση της πλήρους κάρτας",
    zoom_out: "Επιστροφή στη συμπαγή προβολή",
    ed_zoom: "Κουμπί ζουμ",
    ed_zoom_helper: "Εναλλάσσει τη μίνι κάρτα με την πλήρη κάρτα",
    rooms_all: "Εμφάνιση όλων των δωματίων",
    rooms_check: "Μόνο τα δωμάτια που χρειάζονται έλεγχο",
    ed_sort: "Ταξινόμηση",
    ed_sort_name: "Κατά όνομα",
    ed_exclude_areas: "Δωμάτια προς εξαίρεση",
  },
};

// ── Power device ─────────────────────────────────────────────────────────────
// A power device is any appliance read through a smart plug or a power meter: its power sensor (W) is the entity,
// the plug's switch (on the same device, or `switch`) turns it on and off, an energy sensor on the device (or
// `energy`) counts today's kWh. Nothing else is needed: its state comes from the power alone — running above
// `threshold`, standby above `standby`, idle below, done for a while after a cycle ends; `offline` when it cannot report.

// The kinds of appliance, each with its illustration; found from the name (any of the card's languages), else `plug`.
// Most specific first: a dishwasher is not a washer, a phone charger is not a laptop.
const PD_KIND_NAMES = [
  ["radiator", /radiat|convect|chauffage|heater|heizk[oö]rper|heizl[uü]fter|bain.?d.?huile|[oö]lradiator|s[eè]che.?serviette|towel|handtuch|toallero|scaldasalviette|toalheiro|radiador|calorifer|grzejnik|kaloryfer|радиатор|радіатор|радијатор|рушникосуш|полотенцесуш|fűtőtest|radiátor|καλοριφέρ|θερμαντ/],
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
  ["multiplug", /multiprise|power.?strip|steckdosenleiste|regleta|ciabatta|stekkerdoos|listwa|extens|prelungitor|stikdåse|grenuttag|разклонител|удлинител|подовжувач|elosztó|predlžova|prodlužova|podalj[sš]ek|pagarinātāj|πολύπριζο/],
];
const PD_KINDS = [...PD_KIND_NAMES.map(([k]) => k), "plug"];
// Where each kind is drawn: the room behind it and the strip it stands on.
const PD_ROOM = {
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
  plug: "wall",
};
const pdKindOf = (text) => PD_KIND_NAMES.find(([, re]) => re.test(String(text || "").toLowerCase()))?.[0] || "plug";

// The looks a kind can take (`model`), the first being the default; found from the name too.
const PD_MODELS = {
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
  coffee: [
    ["espresso", null],
    ["filter", /filter|filtre|drip|goteo|americana|filtro|przelew|bryggare|шварц|капельн|крапельн|filteres|prekvapk|překap|na filter|filtra|φίλτρου/],
  ],
};
const pdModelOf = (kind, model, text) => {
  const list = PD_MODELS[kind];
  if (!list) return null;
  if (model && list.some(([m]) => m === model)) return model;
  const t = String(text || "").toLowerCase();
  return list.find(([, re]) => re?.test(t))?.[0] || list[0][0];
};
// Kinds that keep things cold: their compressor runs in short cycles all day, so they never show as done.
const PD_COLD = new Set(["fridge", "freezer"]);
// Kinds kept warm by a thermostat: they heat in cycles all day too, so they never show as done either.
const PD_WARM = new Set(["radiator"]);

const pdNum = (st) => {
  const v = Number.parseFloat(st?.state);
  return Number.isFinite(v) ? v : null;
};
// A power in W, an energy in kWh, whatever the sensor's unit.
const pdWatts = (st) => {
  const v = pdNum(st);
  if (v == null) return null;
  const u = st.attributes.unit_of_measurement;
  return u === "kW" ? v * 1000 : u === "mW" ? v / 1000 : v;
};
const pdKwh = (st) => {
  const v = pdNum(st);
  if (v == null) return null;
  const u = st.attributes.unit_of_measurement;
  return u === "Wh" ? v / 1000 : u === "MWh" ? v * 1000 : v;
};
const pdLabel = (hass, id) => `${id} ${hass.states[id]?.attributes.friendly_name || ""}`;
const pdDeviceOf = (hass, id) => hass.entities?.[id]?.device_id;
// Every visible entity of each device, in registry order.
const pdDeviceEntities = rcPerRegistry((hass) => {
  const out = {};
  for (const [id, r] of Object.entries(hass.entities || {})) if (r.device_id && !r.hidden) (out[r.device_id] ||= []).push(id);
  return out;
});
const pdIsPower = (hass, id) => {
  const st = hass.states[id];
  return !!st && id.startsWith("sensor.") && (st.attributes.device_class === "power" || ["W", "kW"].includes(st.attributes.unit_of_measurement));
};

// The power sensors of the home, most likely first: those of a device that also has a switch (a smart plug).
const pdDevices = (hass) => {
  const ids = Object.keys(hass.states || {}).filter((id) => pdIsPower(hass, id) && !hass.entities?.[id]?.entity_category && !hass.entities?.[id]?.hidden);
  const plug = (id) => (pdDeviceEntities(hass)[pdDeviceOf(hass, id)] || []).some((e) => e.startsWith("switch."));
  return [...ids.filter(plug), ...ids.filter((id) => !plug(id))];
};

// The power sensor, the switch and the energy sensor of a device, from its `entity` (the power sensor or the plug's
// switch); `overrides` (`switch`, `energy`) win.
const pdFind = (hass, entity, overrides = {}) => {
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
const pdPoints = (rows) =>
  (rows || [])
    .map((r) => ({ t: Math.round((r.lu ?? Date.parse(r.last_updated ?? r.last_changed) / 1000) * 1000), w: Number.parseFloat(r.s ?? r.state) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.w))
    .sort((a, b) => a.t - b.t);

// What the history says, up to `now`: the cycles (stretches at or above `threshold`, two of them merged when the power
// dropped below it for less than `gap` ms, as a washing machine soaks), each with its energy; the energy since
// `midnight`; and the curve's peak. Each point's power holds until the next one (a plug reports on change).
const pdAnalyse = (points, { now, threshold, gap, midnight }) => {
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

// Strings of the power device cards; the shared ones above (unavailable, editor basics) complete them.
const PD_I18N = {
  en: {
    title: "Appliance",
    st_running: "Running",
    st_done: "Done",
    st_standby: "Standby",
    st_idle: "Off",
    st_offline: "Offline",
    running_for: "Running for {d}",
    done_ago: "Done {d} ago",
    last_24h: "Last 24 hours",
    on_from: "on ≥ {w}",
    now: "now",
    t_cycle: "This cycle",
    t_last_cycle: "Last cycle",
    t_today: "Today",
    t_cost: "Cost today",
    t_cycles: "Cycles today",
    t_peak: "Peak",
    cycles_one: "{n} cycle today",
    cycles_many: "{n} cycles today",
    avg_cycle: "Avg cycle {d}",
    last_ago: "Last cycle {d} ago",
    turn_on: "Turn on",
    turn_off: "Turn off",
    no_device: "No power sensor found",
    k_auto: "Automatic (from the name)",
    k_airfryer: "Air fryer",
    k_kettle: "Kettle",
    k_toaster: "Toaster",
    k_coffee: "Coffee maker",
    k_beer: "Beer tap",
    k_washer: "Washing machine",
    k_dryer: "Tumble dryer",
    k_dishwasher: "Dishwasher",
    k_tools: "Tool charger",
    k_charger: "Phone charger",
    k_homelab: "Homelab rack",
    k_laptop: "Laptop",
    k_monitor: "Computer screens",
    k_pc: "Desktop PC",
    k_piano: "Digital piano",
    k_multiplug: "Power strip",
    k_plug: "Smart plug",
    k_fridge: "Fridge",
    k_freezer: "Freezer",
    st_cooling: "Cooling",
    st_resting: "Compressor off",
    st_brewing: "Brewing",
    st_warm: "Keeping warm",
    al_door: "Door open",
    al_warm: "Too warm",
    al_cut: "Power cut",
    al_long: "Running non-stop",
    rest_for: "Compressor off for {d}",
    door_for: "Door open for {d}",
    long_for: "Running non-stop for {d}",
    warm_line: "Above {max}",
    cut_line: "The plug gives no power",
    brewing_for: "Brewing for {d}",
    warm_for: "Keeping warm for {d}",
    auto_off_in: "Turns itself off in {d}",
    t_duty: "Duty cycle",
    m_auto: "Automatic (from the name)",
    m_single: "Single door",
    m_combi: "Fridge-freezer",
    m_american: "American (side by side)",
    m_multi_door: "French door",
    m_chest: "Chest freezer",
    m_drawers: "Upright, with drawers",
    m_espresso: "Espresso machine",
    m_filter: "Filter coffee maker",
    k_radiator: "Radiator",
    st_heating: "Heating",
    st_holding: "At temperature",
    heating_for: "Heating for {d}",
    hold_for: "At temperature for {d}",
    al_window: "Window open",
    window_line: "Heating with the window open",
    al_cold: "Too cold",
    cold_line: "Below {min}",
    pw_comfort: "Comfort",
    pw_eco: "Eco",
    pw_frost: "Frost protection",
    pw_off: "Off",
    m_column: "Column radiator",
    m_oil: "Oil-filled radiator",
    m_towel: "Towel rail",
    ed_climate: "Thermostat or pilot wire",
    ed_climate_helper: "Optional: a radiator's climate or pilot wire select (as in ha-heating-card): the room's temperature, its target and its order",
    ed_window: "Window sensor",
    ed_window_helper: "Optional: a radiator's alert while it heats with the window open",
    ed_min_temp: "Minimum temperature",
    ed_min_temp_helper: "Optional: a radiator's too-cold alert below it",
    to_target: "→ {t}",
    ed_model: "Model",
    ed_model_helper: "The look of a fridge, a freezer or a coffee maker",
    ed_door: "Door sensor",
    ed_door_helper: "Optional: an alert when the door stays open",
    ed_temperature: "Temperature sensor",
    ed_temperature_helper: "Optional: shown big, an alert above the maximum",
    ed_freezer_temperature: "Freezer temperature",
    ed_freezer_temperature_helper: "A fridge-freezer's second sensor, for its freezer",
    ed_max_temp: "Maximum temperature",
    ed_max_temp_helper: "Above it, a too-warm alert; empty: 8 for a fridge, −12 for a freezer",
    ed_entity: "Power sensor",
    ed_entity_helper: "The appliance's power sensor (W), or the switch of its smart plug",
    ed_switch: "Switch",
    ed_switch_helper: "To turn the appliance on and off; found on the plug when empty",
    ed_energy: "Energy sensor",
    ed_energy_helper: "Today's kWh; worked out from the power when empty",
    ed_kind: "Appliance",
    ed_image: "Picture",
    ed_image_helper: "Your own picture of the appliance (/local/…), drawn in place of the illustration",
    ed_threshold: "Running above",
    ed_threshold_helper: "Watts: above this, the appliance is running",
    ed_standby: "Standby above",
    ed_standby_helper: "Watts: between this and the running threshold, the appliance is on standby",
    ed_price: "Price per kWh",
    ed_price_helper: "A number, or a sensor with the current price, to show today's cost",
    ed_show_graph: "24-hour curve",
    ed_animations: "Animations",
    ed_show_controls: "Controls",
    ed_title_helper: "Empty: the appliance's name",
    ed_illustration: "Illustrated header",
    ed_illustration_theme: "Header theme",
    ed_theme_auto: "Automatic (follows the theme)",
    ed_theme_day: "Day",
    ed_theme_night: "Night",
  },
  fr: {
    title: "Appareil",
    st_running: "En marche",
    st_done: "Terminé",
    st_standby: "En veille",
    st_idle: "Éteint",
    st_offline: "Hors ligne",
    running_for: "En marche depuis {d}",
    done_ago: "Terminé il y a {d}",
    last_24h: "Dernières 24 heures",
    on_from: "marche ≥ {w}",
    now: "maint.",
    t_cycle: "Ce cycle",
    t_last_cycle: "Dernier cycle",
    t_today: "Aujourd'hui",
    t_cost: "Coût du jour",
    t_cycles: "Cycles du jour",
    t_peak: "Pic",
    cycles_one: "{n} cycle aujourd'hui",
    cycles_many: "{n} cycles aujourd'hui",
    avg_cycle: "Cycle moyen {d}",
    last_ago: "Dernier cycle il y a {d}",
    turn_on: "Allumer",
    turn_off: "Éteindre",
    no_device: "Aucun capteur de puissance trouvé",
    k_auto: "Automatique (d'après le nom)",
    k_airfryer: "Friteuse à air",
    k_kettle: "Bouilloire",
    k_toaster: "Grille-pain",
    k_coffee: "Cafetière",
    k_beer: "Tireuse à bière",
    k_washer: "Lave-linge",
    k_dryer: "Sèche-linge",
    k_dishwasher: "Lave-vaisselle",
    k_tools: "Chargeur d'outils",
    k_charger: "Chargeur de téléphone",
    k_homelab: "Baie homelab",
    k_laptop: "PC portable",
    k_monitor: "Écrans PC",
    k_pc: "PC fixe",
    k_piano: "Piano numérique",
    k_multiplug: "Multiprise",
    k_plug: "Prise connectée",
    k_fridge: "Réfrigérateur",
    k_freezer: "Congélateur",
    st_cooling: "Refroidit",
    st_resting: "Compresseur à l'arrêt",
    st_brewing: "Infusion",
    st_warm: "Maintien au chaud",
    al_door: "Porte ouverte",
    al_warm: "Trop chaud",
    al_cut: "Coupure de courant",
    al_long: "Tourne sans arrêt",
    rest_for: "Compresseur à l'arrêt depuis {d}",
    door_for: "Porte ouverte depuis {d}",
    long_for: "Tourne sans arrêt depuis {d}",
    warm_line: "Au-dessus de {max}",
    cut_line: "La prise ne fournit plus de courant",
    brewing_for: "Infusion depuis {d}",
    warm_for: "Au chaud depuis {d}",
    auto_off_in: "S'éteint seule dans {d}",
    t_duty: "Taux de marche",
    m_auto: "Automatique (d'après le nom)",
    m_single: "Une porte",
    m_combi: "Combiné",
    m_american: "Américain",
    m_multi_door: "Multi-portes",
    m_chest: "Congélateur coffre",
    m_drawers: "Armoire à tiroirs",
    m_espresso: "Machine expresso",
    m_filter: "Cafetière filtre",
    k_radiator: "Radiateur",
    st_heating: "Chauffe",
    st_holding: "À température",
    heating_for: "Chauffe depuis {d}",
    hold_for: "À température depuis {d}",
    al_window: "Fenêtre ouverte",
    window_line: "Chauffe fenêtre ouverte",
    al_cold: "Trop froid",
    cold_line: "Sous {min}",
    pw_comfort: "Confort",
    pw_eco: "Éco",
    pw_frost: "Hors-gel",
    pw_off: "Arrêt",
    m_column: "Radiateur à colonnes",
    m_oil: "Bain d'huile",
    m_towel: "Sèche-serviettes",
    ed_climate: "Thermostat ou fil pilote",
    ed_climate_helper: "Facultatif : le climate ou le select fil pilote d'un radiateur (comme dans ha-heating-card) : la température de la pièce, sa consigne et son ordre",
    ed_window: "Capteur de fenêtre",
    ed_window_helper: "Facultatif : une alerte quand le radiateur chauffe fenêtre ouverte",
    ed_min_temp: "Température minimale",
    ed_min_temp_helper: "Facultatif : une alerte trop froid en dessous, pour un radiateur",
    to_target: "→ {t}",
    ed_model: "Modèle",
    ed_model_helper: "L'allure d'un réfrigérateur, d'un congélateur ou d'une cafetière",
    ed_door: "Capteur de porte",
    ed_door_helper: "Facultatif : une alerte quand la porte reste ouverte",
    ed_temperature: "Capteur de température",
    ed_temperature_helper: "Facultatif : affichée en grand, une alerte au-dessus du maximum",
    ed_freezer_temperature: "Température du congélateur",
    ed_freezer_temperature_helper: "Le second capteur d'un combiné, pour son congélateur",
    ed_max_temp: "Température maximale",
    ed_max_temp_helper: "Au-dessus, une alerte « trop chaud » ; vide : 8 pour un réfrigérateur, −12 pour un congélateur",
    ed_entity: "Capteur de puissance",
    ed_entity_helper: "Le capteur de puissance (W) de l'appareil, ou l'interrupteur de sa prise connectée",
    ed_switch: "Interrupteur",
    ed_switch_helper: "Pour allumer et éteindre l'appareil ; trouvé sur la prise si vide",
    ed_energy: "Capteur d'énergie",
    ed_energy_helper: "Les kWh du jour ; calculés depuis la puissance si vide",
    ed_kind: "Appareil",
    ed_image: "Image",
    ed_image_helper: "Votre propre image de l'appareil (/local/…), dessinée à la place de l'illustration",
    ed_threshold: "En marche au-dessus de",
    ed_threshold_helper: "Watts : au-dessus, l'appareil est en marche",
    ed_standby: "En veille au-dessus de",
    ed_standby_helper: "Watts : entre cette valeur et le seuil de marche, l'appareil est en veille",
    ed_price: "Prix du kWh",
    ed_price_helper: "Un nombre, ou un capteur du prix actuel, pour afficher le coût du jour",
    ed_show_graph: "Courbe sur 24 heures",
    ed_animations: "Animations",
    ed_show_controls: "Commandes",
    ed_title_helper: "Vide : le nom de l'appareil",
    ed_illustration: "En-tête illustré",
    ed_illustration_theme: "Thème de l'en-tête",
    ed_theme_auto: "Automatique (suit le thème)",
    ed_theme_day: "Jour",
    ed_theme_night: "Nuit",
  },
  de: {
    title: "Gerät",
    st_running: "Läuft",
    st_done: "Fertig",
    st_standby: "Standby",
    st_idle: "Aus",
    st_offline: "Offline",
    running_for: "Läuft seit {d}",
    done_ago: "Fertig vor {d}",
    last_24h: "Letzte 24 Stunden",
    on_from: "an ≥ {w}",
    now: "jetzt",
    t_cycle: "Dieser Zyklus",
    t_last_cycle: "Letzter Zyklus",
    t_today: "Heute",
    t_cost: "Kosten heute",
    t_cycles: "Zyklen heute",
    t_peak: "Spitze",
    cycles_one: "{n} Zyklus heute",
    cycles_many: "{n} Zyklen heute",
    avg_cycle: "Ø Zyklus {d}",
    last_ago: "Letzter Zyklus vor {d}",
    turn_on: "Einschalten",
    turn_off: "Ausschalten",
    no_device: "Kein Leistungssensor gefunden",
    k_auto: "Automatisch (nach dem Namen)",
    k_airfryer: "Heißluftfritteuse",
    k_kettle: "Wasserkocher",
    k_toaster: "Toaster",
    k_coffee: "Kaffeemaschine",
    k_beer: "Bierzapfanlage",
    k_washer: "Waschmaschine",
    k_dryer: "Wäschetrockner",
    k_dishwasher: "Geschirrspüler",
    k_tools: "Werkzeug-Ladegerät",
    k_charger: "Handy-Ladegerät",
    k_homelab: "Homelab-Rack",
    k_laptop: "Laptop",
    k_monitor: "Computerbildschirme",
    k_pc: "Desktop-PC",
    k_piano: "Digitalpiano",
    k_multiplug: "Steckdosenleiste",
    k_plug: "Smarte Steckdose",
    k_fridge: "Kühlschrank",
    k_freezer: "Gefrierschrank",
    st_cooling: "Kühlt",
    st_resting: "Kompressor aus",
    st_brewing: "Brüht",
    st_warm: "Warmhalten",
    al_door: "Tür offen",
    al_warm: "Zu warm",
    al_cut: "Stromausfall",
    al_long: "Läuft ununterbrochen",
    rest_for: "Kompressor aus seit {d}",
    door_for: "Tür offen seit {d}",
    long_for: "Läuft ununterbrochen seit {d}",
    warm_line: "Über {max}",
    cut_line: "Die Steckdose liefert keinen Strom",
    brewing_for: "Brüht seit {d}",
    warm_for: "Warmhalten seit {d}",
    auto_off_in: "Schaltet sich in {d} ab",
    t_duty: "Laufzeitanteil",
    m_auto: "Automatisch (aus dem Namen)",
    m_single: "Eintürig",
    m_combi: "Kühl-Gefrier-Kombination",
    m_american: "Amerikanisch (Side-by-Side)",
    m_multi_door: "French Door",
    m_chest: "Gefriertruhe",
    m_drawers: "Gefrierschrank mit Schubladen",
    m_espresso: "Espressomaschine",
    m_filter: "Filterkaffeemaschine",
    k_radiator: "Heizkörper",
    st_heating: "Heizt",
    st_holding: "Auf Temperatur",
    heating_for: "Heizt seit {d}",
    hold_for: "Auf Temperatur seit {d}",
    al_window: "Fenster offen",
    window_line: "Heizt bei offenem Fenster",
    al_cold: "Zu kalt",
    cold_line: "Unter {min}",
    pw_comfort: "Komfort",
    pw_eco: "Eco",
    pw_frost: "Frostschutz",
    pw_off: "Aus",
    m_column: "Röhrenheizkörper",
    m_oil: "Ölradiator",
    m_towel: "Handtuchheizkörper",
    ed_climate: "Thermostat oder Steuerdraht",
    ed_climate_helper: "Optional: das climate oder der Steuerdraht-select eines Heizkörpers (wie in ha-heating-card): Raumtemperatur, Sollwert und Modus",
    ed_window: "Fenstersensor",
    ed_window_helper: "Optional: ein Alarm, wenn der Heizkörper bei offenem Fenster heizt",
    ed_min_temp: "Mindesttemperatur",
    ed_min_temp_helper: "Optional: ein Zu-kalt-Alarm darunter, für einen Heizkörper",
    to_target: "→ {t}",
    ed_model: "Modell",
    ed_model_helper: "Das Aussehen eines Kühlschranks, Gefriergeräts oder einer Kaffeemaschine",
    ed_door: "Türsensor",
    ed_door_helper: "Optional: ein Alarm, wenn die Tür offen bleibt",
    ed_temperature: "Temperatursensor",
    ed_temperature_helper: "Optional: groß angezeigt, ein Alarm über dem Maximum",
    ed_freezer_temperature: "Gefrierfachtemperatur",
    ed_freezer_temperature_helper: "Der zweite Sensor einer Kühl-Gefrier-Kombination, für ihr Gefrierteil",
    ed_max_temp: "Höchsttemperatur",
    ed_max_temp_helper: "Darüber ein Alarm „zu warm“; leer: 8 für einen Kühlschrank, −12 für ein Gefriergerät",
    ed_entity: "Leistungssensor",
    ed_entity_helper: "Der Leistungssensor (W) des Geräts oder der Schalter seiner smarten Steckdose",
    ed_switch: "Schalter",
    ed_switch_helper: "Zum Ein- und Ausschalten des Geräts; leer: an der Steckdose gefunden",
    ed_energy: "Energiesensor",
    ed_energy_helper: "Die kWh von heute; leer: aus der Leistung berechnet",
    ed_kind: "Gerät",
    ed_image: "Bild",
    ed_image_helper: "Ein eigenes Bild des Geräts (/local/…), anstelle der Illustration gezeichnet",
    ed_threshold: "Läuft ab",
    ed_threshold_helper: "Watt: darüber läuft das Gerät",
    ed_standby: "Standby ab",
    ed_standby_helper: "Watt: zwischen diesem Wert und der Laufschwelle ist das Gerät im Standby",
    ed_price: "Preis pro kWh",
    ed_price_helper: "Eine Zahl oder ein Sensor mit dem aktuellen Preis, für die Kosten von heute",
    ed_show_graph: "24-Stunden-Kurve",
    ed_animations: "Animationen",
    ed_show_controls: "Bedienelemente",
    ed_title_helper: "Leer: der Name des Geräts",
    ed_illustration: "Illustrierte Kopfzeile",
    ed_illustration_theme: "Thema der Kopfzeile",
    ed_theme_auto: "Automatisch (folgt dem Thema)",
    ed_theme_day: "Tag",
    ed_theme_night: "Nacht",
  },
  es: {
    title: "Aparato",
    st_running: "En marcha",
    st_done: "Terminado",
    st_standby: "En espera",
    st_idle: "Apagado",
    st_offline: "Sin conexión",
    running_for: "En marcha desde hace {d}",
    done_ago: "Terminado hace {d}",
    last_24h: "Últimas 24 horas",
    on_from: "en marcha ≥ {w}",
    now: "ahora",
    t_cycle: "Este ciclo",
    t_last_cycle: "Último ciclo",
    t_today: "Hoy",
    t_cost: "Coste de hoy",
    t_cycles: "Ciclos de hoy",
    t_peak: "Pico",
    cycles_one: "{n} ciclo hoy",
    cycles_many: "{n} ciclos hoy",
    avg_cycle: "Ciclo medio {d}",
    last_ago: "Último ciclo hace {d}",
    turn_on: "Encender",
    turn_off: "Apagar",
    no_device: "No se encontró ningún sensor de potencia",
    k_auto: "Automático (según el nombre)",
    k_airfryer: "Freidora de aire",
    k_kettle: "Hervidor",
    k_toaster: "Tostadora",
    k_coffee: "Cafetera",
    k_beer: "Grifo de cerveza",
    k_washer: "Lavadora",
    k_dryer: "Secadora",
    k_dishwasher: "Lavavajillas",
    k_tools: "Cargador de herramientas",
    k_charger: "Cargador de móvil",
    k_homelab: "Rack homelab",
    k_laptop: "Portátil",
    k_monitor: "Pantallas de ordenador",
    k_pc: "PC de sobremesa",
    k_piano: "Piano digital",
    k_multiplug: "Regleta",
    k_plug: "Enchufe inteligente",
    k_fridge: "Frigorífico",
    k_freezer: "Congelador",
    st_cooling: "Enfriando",
    st_resting: "Compresor parado",
    st_brewing: "Preparando",
    st_warm: "Manteniendo caliente",
    al_door: "Puerta abierta",
    al_warm: "Demasiado caliente",
    al_cut: "Corte de corriente",
    al_long: "Funciona sin parar",
    rest_for: "Compresor parado desde hace {d}",
    door_for: "Puerta abierta desde hace {d}",
    long_for: "Funciona sin parar desde hace {d}",
    warm_line: "Por encima de {max}",
    cut_line: "El enchufe no da corriente",
    brewing_for: "Preparando desde hace {d}",
    warm_for: "Caliente desde hace {d}",
    auto_off_in: "Se apaga solo en {d}",
    t_duty: "Tiempo en marcha",
    m_auto: "Automático (según el nombre)",
    m_single: "Una puerta",
    m_combi: "Combi",
    m_american: "Americano (side by side)",
    m_multi_door: "Puerta francesa",
    m_chest: "Arcón congelador",
    m_drawers: "Vertical con cajones",
    m_espresso: "Cafetera espresso",
    m_filter: "Cafetera de goteo",
    k_radiator: "Radiador",
    st_heating: "Calentando",
    st_holding: "A temperatura",
    heating_for: "Calentando desde hace {d}",
    hold_for: "A temperatura desde hace {d}",
    al_window: "Ventana abierta",
    window_line: "Calienta con la ventana abierta",
    al_cold: "Demasiado frío",
    cold_line: "Por debajo de {min}",
    pw_comfort: "Confort",
    pw_eco: "Eco",
    pw_frost: "Antihielo",
    pw_off: "Apagado",
    m_column: "Radiador de columnas",
    m_oil: "Radiador de aceite",
    m_towel: "Toallero",
    ed_climate: "Termostato o hilo piloto",
    ed_climate_helper: "Opcional: el climate o el select de hilo piloto de un radiador (como en ha-heating-card): la temperatura de la habitación, su consigna y su modo",
    ed_window: "Sensor de ventana",
    ed_window_helper: "Opcional: una alerta cuando el radiador calienta con la ventana abierta",
    ed_min_temp: "Temperatura mínima",
    ed_min_temp_helper: "Opcional: una alerta de demasiado frío por debajo, para un radiador",
    to_target: "→ {t}",
    ed_model: "Modelo",
    ed_model_helper: "El aspecto de un frigorífico, un congelador o una cafetera",
    ed_door: "Sensor de puerta",
    ed_door_helper: "Opcional: una alerta cuando la puerta queda abierta",
    ed_temperature: "Sensor de temperatura",
    ed_temperature_helper: "Opcional: en grande, una alerta por encima del máximo",
    ed_freezer_temperature: "Temperatura del congelador",
    ed_freezer_temperature_helper: "El segundo sensor de un combi, para su congelador",
    ed_max_temp: "Temperatura máxima",
    ed_max_temp_helper: "Por encima, una alerta de demasiado calor; vacío: 8 para un frigorífico, −12 para un congelador",
    ed_entity: "Sensor de potencia",
    ed_entity_helper: "El sensor de potencia (W) del aparato, o el interruptor de su enchufe inteligente",
    ed_switch: "Interruptor",
    ed_switch_helper: "Para encender y apagar el aparato; vacío: se busca en el enchufe",
    ed_energy: "Sensor de energía",
    ed_energy_helper: "Los kWh de hoy; vacío: calculados a partir de la potencia",
    ed_kind: "Aparato",
    ed_image: "Imagen",
    ed_image_helper: "Tu propia imagen del aparato (/local/…), dibujada en lugar de la ilustración",
    ed_threshold: "En marcha por encima de",
    ed_threshold_helper: "Vatios: por encima, el aparato está en marcha",
    ed_standby: "En espera por encima de",
    ed_standby_helper: "Vatios: entre este valor y el umbral de marcha, el aparato está en espera",
    ed_price: "Precio por kWh",
    ed_price_helper: "Un número, o un sensor con el precio actual, para mostrar el coste de hoy",
    ed_show_graph: "Curva de 24 horas",
    ed_animations: "Animaciones",
    ed_show_controls: "Controles",
    ed_title_helper: "Vacío: el nombre del aparato",
    ed_illustration: "Cabecera ilustrada",
    ed_illustration_theme: "Tema de la cabecera",
    ed_theme_auto: "Automático (sigue el tema)",
    ed_theme_day: "Día",
    ed_theme_night: "Noche",
  },
  sr: {
    title: "Уређај",
    st_running: "Ради",
    st_done: "Завршено",
    st_standby: "Стање приправности",
    st_idle: "Искључен",
    st_offline: "Ван мреже",
    running_for: "Ради већ {d}",
    done_ago: "Завршено пре {d}",
    last_24h: "Последња 24 сата",
    on_from: "ради ≥ {w}",
    now: "сада",
    t_cycle: "Овај циклус",
    t_last_cycle: "Последњи циклус",
    t_today: "Данас",
    t_cost: "Трошак данас",
    t_cycles: "Циклуси данас",
    t_peak: "Врх",
    cycles_one: "{n} циклус данас",
    cycles_few: "{n} циклуса данас",
    cycles_many: "{n} циклуса данас",
    avg_cycle: "Просечан циклус {d}",
    last_ago: "Последњи циклус пре {d}",
    turn_on: "Укључи",
    turn_off: "Искључи",
    no_device: "Није пронађен сензор снаге",
    k_auto: "Аутоматски (према имену)",
    k_airfryer: "Фритеза на врући ваздух",
    k_kettle: "Кувало за воду",
    k_toaster: "Тостер",
    k_coffee: "Апарат за кафу",
    k_beer: "Точилица за пиво",
    k_washer: "Машина за веш",
    k_dryer: "Машина за сушење веша",
    k_dishwasher: "Машина за судове",
    k_tools: "Пуњач за алат",
    k_charger: "Пуњач за телефон",
    k_homelab: "Homelab орман",
    k_laptop: "Лаптоп",
    k_monitor: "Рачунарски екрани",
    k_pc: "Стони рачунар",
    k_piano: "Дигитални клавир",
    k_multiplug: "Продужни кабл",
    k_plug: "Паметна утичница",
    k_fridge: "Фрижидер",
    k_freezer: "Замрзивач",
    st_cooling: "Хлади",
    st_resting: "Компресор угашен",
    st_brewing: "Кува",
    st_warm: "Одржава топлим",
    al_door: "Врата отворена",
    al_warm: "Превише топло",
    al_cut: "Нестанак струје",
    al_long: "Ради без престанка",
    rest_for: "Компресор угашен {d}",
    door_for: "Врата отворена {d}",
    long_for: "Ради без престанка {d}",
    warm_line: "Изнад {max}",
    cut_line: "Утичница не даје струју",
    brewing_for: "Кува {d}",
    warm_for: "Одржава топлим {d}",
    auto_off_in: "Сам се гаси за {d}",
    t_duty: "Удео рада",
    m_auto: "Аутоматски (по имену)",
    m_single: "Једна врата",
    m_combi: "Комбиновани",
    m_american: "Амерички (side by side)",
    m_multi_door: "Француска врата",
    m_chest: "Замрзивач сандук",
    m_drawers: "Усправни са фиокама",
    m_espresso: "Еспресо апарат",
    m_filter: "Апарат за филтер кафу",
    k_radiator: "Радијатор",
    st_heating: "Греје",
    st_holding: "На температури",
    heating_for: "Греје {d}",
    hold_for: "На температури {d}",
    al_window: "Прозор отворен",
    window_line: "Греје са отвореним прозором",
    al_cold: "Сувише хладно",
    cold_line: "Испод {min}",
    pw_comfort: "Комфор",
    pw_eco: "Еко",
    pw_frost: "Заштита од мраза",
    pw_off: "Искључено",
    m_column: "Радијатор са ребрима",
    m_oil: "Уљни радијатор",
    m_towel: "Сушач пешкира",
    ed_climate: "Термостат или пилот жица",
    ed_climate_helper: "Опционо: climate или select пилот жице радијатора (као у ha-heating-card): температура собе, задата вредност и режим",
    ed_window: "Сензор прозора",
    ed_window_helper: "Опционо: упозорење кад радијатор греје са отвореним прозором",
    ed_min_temp: "Минимална температура",
    ed_min_temp_helper: "Опционо: упозорење да је сувише хладно испод ње, за радијатор",
    to_target: "→ {t}",
    ed_model: "Модел",
    ed_model_helper: "Изглед фрижидера, замрзивача или апарата за кафу",
    ed_door: "Сензор врата",
    ed_door_helper: "Опционо: упозорење када врата остану отворена",
    ed_temperature: "Сензор температуре",
    ed_temperature_helper: "Опционо: приказана крупно, упозорење изнад максимума",
    ed_freezer_temperature: "Температура замрзивача",
    ed_freezer_temperature_helper: "Други сензор комбинованог, за замрзивач",
    ed_max_temp: "Највиша температура",
    ed_max_temp_helper: "Изнад ње упозорење; празно: 8 за фрижидер, −12 за замрзивач",
    ed_entity: "Сензор снаге",
    ed_entity_helper: "Сензор снаге (W) уређаја, или прекидач његове паметне утичнице",
    ed_switch: "Прекидач",
    ed_switch_helper: "За укључивање и искључивање уређаја; празно: пронађен на утичници",
    ed_energy: "Сензор енергије",
    ed_energy_helper: "Данашњи kWh; празно: израчунато из снаге",
    ed_kind: "Уређај",
    ed_image: "Слика",
    ed_image_helper: "Ваша слика уређаја (/local/…), приказана уместо илустрације",
    ed_threshold: "Ради изнад",
    ed_threshold_helper: "Вати: изнад ове вредности уређај ради",
    ed_standby: "Приправност изнад",
    ed_standby_helper: "Вати: између ове вредности и прага рада уређај је у приправности",
    ed_price: "Цена по kWh",
    ed_price_helper: "Број, или сензор са тренутном ценом, за приказ данашњег трошка",
    ed_show_graph: "Крива за 24 сата",
    ed_animations: "Анимације",
    ed_show_controls: "Команде",
    ed_title_helper: "Празно: име уређаја",
    ed_illustration: "Илустровано заглавље",
    ed_illustration_theme: "Тема заглавља",
    ed_theme_auto: "Аутоматски (прати тему)",
    ed_theme_day: "Дан",
    ed_theme_night: "Ноћ",
  },
  "sr-Latn": {
    title: "Uređaj",
    st_running: "Radi",
    st_done: "Završeno",
    st_standby: "Stanje pripravnosti",
    st_idle: "Isključen",
    st_offline: "Van mreže",
    running_for: "Radi već {d}",
    done_ago: "Završeno pre {d}",
    last_24h: "Poslednja 24 sata",
    on_from: "radi ≥ {w}",
    now: "sada",
    t_cycle: "Ovaj ciklus",
    t_last_cycle: "Poslednji ciklus",
    t_today: "Danas",
    t_cost: "Trošak danas",
    t_cycles: "Ciklusi danas",
    t_peak: "Vrh",
    cycles_one: "{n} ciklus danas",
    cycles_few: "{n} ciklusa danas",
    cycles_many: "{n} ciklusa danas",
    avg_cycle: "Prosečan ciklus {d}",
    last_ago: "Poslednji ciklus pre {d}",
    turn_on: "Uključi",
    turn_off: "Isključi",
    no_device: "Nije pronađen senzor snage",
    k_auto: "Automatski (prema imenu)",
    k_airfryer: "Friteza na vrući vazduh",
    k_kettle: "Kuvalo za vodu",
    k_toaster: "Toster",
    k_coffee: "Aparat za kafu",
    k_beer: "Točilica za pivo",
    k_washer: "Mašina za veš",
    k_dryer: "Mašina za sušenje veša",
    k_dishwasher: "Mašina za sudove",
    k_tools: "Punjač za alat",
    k_charger: "Punjač za telefon",
    k_homelab: "Homelab orman",
    k_laptop: "Laptop",
    k_monitor: "Računarski ekrani",
    k_pc: "Stoni računar",
    k_piano: "Digitalni klavir",
    k_multiplug: "Produžni kabl",
    k_plug: "Pametna utičnica",
    k_fridge: "Frižider",
    k_freezer: "Zamrzivač",
    st_cooling: "Hladi",
    st_resting: "Kompresor ugašen",
    st_brewing: "Kuva",
    st_warm: "Održava toplim",
    al_door: "Vrata otvorena",
    al_warm: "Previše toplo",
    al_cut: "Nestanak struje",
    al_long: "Radi bez prestanka",
    rest_for: "Kompresor ugašen {d}",
    door_for: "Vrata otvorena {d}",
    long_for: "Radi bez prestanka {d}",
    warm_line: "Iznad {max}",
    cut_line: "Utičnica ne daje struju",
    brewing_for: "Kuva {d}",
    warm_for: "Održava toplim {d}",
    auto_off_in: "Sam se gasi za {d}",
    t_duty: "Udeo rada",
    m_auto: "Automatski (po imenu)",
    m_single: "Jedna vrata",
    m_combi: "Kombinovani",
    m_american: "Američki (side by side)",
    m_multi_door: "Francuska vrata",
    m_chest: "Zamrzivač sanduk",
    m_drawers: "Uspravni sa fiokama",
    m_espresso: "Espreso aparat",
    m_filter: "Aparat za filter kafu",
    k_radiator: "Radijator",
    st_heating: "Greje",
    st_holding: "Na temperaturi",
    heating_for: "Greje {d}",
    hold_for: "Na temperaturi {d}",
    al_window: "Prozor otvoren",
    window_line: "Greje sa otvorenim prozorom",
    al_cold: "Suviše hladno",
    cold_line: "Ispod {min}",
    pw_comfort: "Komfor",
    pw_eco: "Eko",
    pw_frost: "Zaštita od mraza",
    pw_off: "Isključeno",
    m_column: "Radijator sa rebrima",
    m_oil: "Uljni radijator",
    m_towel: "Sušač peškira",
    ed_climate: "Termostat ili pilot žica",
    ed_climate_helper: "Opciono: climate ili select pilot žice radijatora (kao u ha-heating-card): temperatura sobe, zadata vrednost i režim",
    ed_window: "Senzor prozora",
    ed_window_helper: "Opciono: upozorenje kad radijator greje sa otvorenim prozorom",
    ed_min_temp: "Minimalna temperatura",
    ed_min_temp_helper: "Opciono: upozorenje da je suviše hladno ispod nje, za radijator",
    to_target: "→ {t}",
    ed_model: "Model",
    ed_model_helper: "Izgled frižidera, zamrzivača ili aparata za kafu",
    ed_door: "Senzor vrata",
    ed_door_helper: "Opciono: upozorenje kada vrata ostanu otvorena",
    ed_temperature: "Senzor temperature",
    ed_temperature_helper: "Opciono: prikazana krupno, upozorenje iznad maksimuma",
    ed_freezer_temperature: "Temperatura zamrzivača",
    ed_freezer_temperature_helper: "Drugi senzor kombinovanog, za zamrzivač",
    ed_max_temp: "Najviša temperatura",
    ed_max_temp_helper: "Iznad nje upozorenje; prazno: 8 za frižider, −12 za zamrzivač",
    ed_entity: "Senzor snage",
    ed_entity_helper: "Senzor snage (W) uređaja, ili prekidač njegove pametne utičnice",
    ed_switch: "Prekidač",
    ed_switch_helper: "Za uključivanje i isključivanje uređaja; prazno: pronađen na utičnici",
    ed_energy: "Senzor energije",
    ed_energy_helper: "Današnji kWh; prazno: izračunato iz snage",
    ed_kind: "Uređaj",
    ed_image: "Slika",
    ed_image_helper: "Vaša slika uređaja (/local/…), prikazana umesto ilustracije",
    ed_threshold: "Radi iznad",
    ed_threshold_helper: "Vati: iznad ove vrednosti uređaj radi",
    ed_standby: "Pripravnost iznad",
    ed_standby_helper: "Vati: između ove vrednosti i praga rada uređaj je u pripravnosti",
    ed_price: "Cena po kWh",
    ed_price_helper: "Broj, ili senzor sa trenutnom cenom, za prikaz današnjeg troška",
    ed_show_graph: "Kriva za 24 sata",
    ed_animations: "Animacije",
    ed_show_controls: "Komande",
    ed_title_helper: "Prazno: ime uređaja",
    ed_illustration: "Ilustrovano zaglavlje",
    ed_illustration_theme: "Tema zaglavlja",
    ed_theme_auto: "Automatski (prati temu)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noć",
  },
  it: {
    title: "Apparecchio",
    st_running: "In funzione",
    st_done: "Finito",
    st_standby: "In standby",
    st_idle: "Spento",
    st_offline: "Non in linea",
    running_for: "In funzione da {d}",
    done_ago: "Finito {d} fa",
    last_24h: "Ultime 24 ore",
    on_from: "acceso ≥ {w}",
    now: "ora",
    t_cycle: "Questo ciclo",
    t_last_cycle: "Ultimo ciclo",
    t_today: "Oggi",
    t_cost: "Costo di oggi",
    t_cycles: "Cicli di oggi",
    t_peak: "Picco",
    cycles_one: "{n} ciclo oggi",
    cycles_many: "{n} cicli oggi",
    avg_cycle: "Ciclo medio {d}",
    last_ago: "Ultimo ciclo {d} fa",
    turn_on: "Accendi",
    turn_off: "Spegni",
    no_device: "Nessun sensore di potenza trovato",
    k_auto: "Automatico (dal nome)",
    k_airfryer: "Friggitrice ad aria",
    k_kettle: "Bollitore",
    k_toaster: "Tostapane",
    k_coffee: "Macchina del caffè",
    k_beer: "Spillatore di birra",
    k_washer: "Lavatrice",
    k_dryer: "Asciugatrice",
    k_dishwasher: "Lavastoviglie",
    k_tools: "Caricabatterie per utensili",
    k_charger: "Caricabatterie del telefono",
    k_homelab: "Rack homelab",
    k_laptop: "Portatile",
    k_monitor: "Schermi del computer",
    k_pc: "PC fisso",
    k_piano: "Pianoforte digitale",
    k_multiplug: "Ciabatta",
    k_plug: "Presa intelligente",
    k_fridge: "Frigorifero",
    k_freezer: "Congelatore",
    st_cooling: "Raffredda",
    st_resting: "Compressore fermo",
    st_brewing: "Erogazione",
    st_warm: "Mantiene caldo",
    al_door: "Porta aperta",
    al_warm: "Troppo caldo",
    al_cut: "Interruzione di corrente",
    al_long: "In funzione senza sosta",
    rest_for: "Compressore fermo da {d}",
    door_for: "Porta aperta da {d}",
    long_for: "In funzione senza sosta da {d}",
    warm_line: "Sopra {max}",
    cut_line: "La presa non dà corrente",
    brewing_for: "In erogazione da {d}",
    warm_for: "In caldo da {d}",
    auto_off_in: "Si spegne da sola tra {d}",
    t_duty: "Tempo di funzionamento",
    m_auto: "Automatico (dal nome)",
    m_single: "Una porta",
    m_combi: "Combinato",
    m_american: "Americano (side by side)",
    m_multi_door: "Porta alla francese",
    m_chest: "Congelatore a pozzetto",
    m_drawers: "Verticale a cassetti",
    m_espresso: "Macchina espresso",
    m_filter: "Macchina da caffè americano",
    k_radiator: "Radiatore",
    st_heating: "Riscalda",
    st_holding: "In temperatura",
    heating_for: "Riscalda da {d}",
    hold_for: "In temperatura da {d}",
    al_window: "Finestra aperta",
    window_line: "Riscalda con la finestra aperta",
    al_cold: "Troppo freddo",
    cold_line: "Sotto {min}",
    pw_comfort: "Comfort",
    pw_eco: "Eco",
    pw_frost: "Antigelo",
    pw_off: "Spento",
    m_column: "Radiatore a colonne",
    m_oil: "Radiatore a olio",
    m_towel: "Scaldasalviette",
    ed_climate: "Termostato o filo pilota",
    ed_climate_helper: "Facoltativo: il climate o il select filo pilota di un radiatore (come in ha-heating-card): temperatura della stanza, consegna e modalità",
    ed_window: "Sensore finestra",
    ed_window_helper: "Facoltativo: un avviso quando il radiatore riscalda con la finestra aperta",
    ed_min_temp: "Temperatura minima",
    ed_min_temp_helper: "Facoltativo: un avviso di troppo freddo sotto questa, per un radiatore",
    to_target: "→ {t}",
    ed_model: "Modello",
    ed_model_helper: "L'aspetto di un frigorifero, un congelatore o una macchina da caffè",
    ed_door: "Sensore porta",
    ed_door_helper: "Facoltativo: un avviso quando la porta resta aperta",
    ed_temperature: "Sensore di temperatura",
    ed_temperature_helper: "Facoltativo: in grande, un avviso sopra il massimo",
    ed_freezer_temperature: "Temperatura del congelatore",
    ed_freezer_temperature_helper: "Il secondo sensore di un combinato, per il congelatore",
    ed_max_temp: "Temperatura massima",
    ed_max_temp_helper: "Sopra, un avviso di troppo caldo; vuoto: 8 per un frigorifero, −12 per un congelatore",
    ed_entity: "Sensore di potenza",
    ed_entity_helper: "Il sensore di potenza (W) dell'apparecchio, o l'interruttore della sua presa intelligente",
    ed_switch: "Interruttore",
    ed_switch_helper: "Per accendere e spegnere l'apparecchio; vuoto: trovato sulla presa",
    ed_energy: "Sensore di energia",
    ed_energy_helper: "I kWh di oggi; vuoto: calcolati dalla potenza",
    ed_kind: "Apparecchio",
    ed_image: "Immagine",
    ed_image_helper: "Una tua immagine dell'apparecchio (/local/…), disegnata al posto dell'illustrazione",
    ed_threshold: "In funzione sopra",
    ed_threshold_helper: "Watt: sopra questo valore, l'apparecchio è in funzione",
    ed_standby: "In standby sopra",
    ed_standby_helper: "Watt: tra questo valore e la soglia di funzionamento, l'apparecchio è in standby",
    ed_price: "Prezzo per kWh",
    ed_price_helper: "Un numero, o un sensore con il prezzo attuale, per mostrare il costo di oggi",
    ed_show_graph: "Curva di 24 ore",
    ed_animations: "Animazioni",
    ed_show_controls: "Comandi",
    ed_title_helper: "Vuoto: il nome dell'apparecchio",
    ed_illustration: "Intestazione illustrata",
    ed_illustration_theme: "Tema dell'intestazione",
    ed_theme_auto: "Automatico (segue il tema)",
    ed_theme_day: "Giorno",
    ed_theme_night: "Notte",
  },
  nl: {
    title: "Apparaat",
    st_running: "Bezig",
    st_done: "Klaar",
    st_standby: "Stand-by",
    st_idle: "Uit",
    st_offline: "Offline",
    running_for: "Bezig sinds {d}",
    done_ago: "{d} geleden klaar",
    last_24h: "Laatste 24 uur",
    on_from: "aan ≥ {w}",
    now: "nu",
    t_cycle: "Deze cyclus",
    t_last_cycle: "Laatste cyclus",
    t_today: "Vandaag",
    t_cost: "Kosten vandaag",
    t_cycles: "Cycli vandaag",
    t_peak: "Piek",
    cycles_one: "{n} cyclus vandaag",
    cycles_many: "{n} cycli vandaag",
    avg_cycle: "Gem. cyclus {d}",
    last_ago: "Laatste cyclus {d} geleden",
    turn_on: "Aanzetten",
    turn_off: "Uitzetten",
    no_device: "Geen vermogenssensor gevonden",
    k_auto: "Automatisch (op naam)",
    k_airfryer: "Airfryer",
    k_kettle: "Waterkoker",
    k_toaster: "Broodrooster",
    k_coffee: "Koffiezetapparaat",
    k_beer: "Biertap",
    k_washer: "Wasmachine",
    k_dryer: "Droger",
    k_dishwasher: "Vaatwasser",
    k_tools: "Gereedschapslader",
    k_charger: "Telefoonlader",
    k_homelab: "Homelab-rack",
    k_laptop: "Laptop",
    k_monitor: "Computerschermen",
    k_pc: "Desktop-pc",
    k_piano: "Digitale piano",
    k_multiplug: "Stekkerdoos",
    k_plug: "Slimme stekker",
    k_fridge: "Koelkast",
    k_freezer: "Vriezer",
    st_cooling: "Koelt",
    st_resting: "Compressor uit",
    st_brewing: "Zet koffie",
    st_warm: "Houdt warm",
    al_door: "Deur open",
    al_warm: "Te warm",
    al_cut: "Stroomstoring",
    al_long: "Draait non-stop",
    rest_for: "Compressor uit sinds {d}",
    door_for: "Deur open sinds {d}",
    long_for: "Draait non-stop sinds {d}",
    warm_line: "Boven {max}",
    cut_line: "Het stopcontact geeft geen stroom",
    brewing_for: "Zet koffie sinds {d}",
    warm_for: "Houdt warm sinds {d}",
    auto_off_in: "Schakelt zichzelf uit over {d}",
    t_duty: "Inschakelduur",
    m_auto: "Automatisch (uit de naam)",
    m_single: "Eendeurs",
    m_combi: "Koel-vriescombinatie",
    m_american: "Amerikaans (side-by-side)",
    m_multi_door: "French door",
    m_chest: "Vrieskist",
    m_drawers: "Staande vriezer met laden",
    m_espresso: "Espressomachine",
    m_filter: "Filterkoffiezetapparaat",
    k_radiator: "Radiator",
    st_heating: "Verwarmt",
    st_holding: "Op temperatuur",
    heating_for: "Verwarmt sinds {d}",
    hold_for: "Op temperatuur sinds {d}",
    al_window: "Raam open",
    window_line: "Verwarmt met het raam open",
    al_cold: "Te koud",
    cold_line: "Onder {min}",
    pw_comfort: "Comfort",
    pw_eco: "Eco",
    pw_frost: "Vorstbeveiliging",
    pw_off: "Uit",
    m_column: "Ledenradiator",
    m_oil: "Oliegevulde radiator",
    m_towel: "Handdoekradiator",
    ed_climate: "Thermostaat of stuurdraad",
    ed_climate_helper: "Optioneel: de climate of stuurdraad-select van een radiator (zoals in ha-heating-card): kamertemperatuur, doel en modus",
    ed_window: "Raamsensor",
    ed_window_helper: "Optioneel: een melding als de radiator verwarmt met het raam open",
    ed_min_temp: "Minimumtemperatuur",
    ed_min_temp_helper: "Optioneel: een te-koud-melding daaronder, voor een radiator",
    to_target: "→ {t}",
    ed_model: "Model",
    ed_model_helper: "Het uiterlijk van een koelkast, een vriezer of een koffiezetapparaat",
    ed_door: "Deursensor",
    ed_door_helper: "Optioneel: een melding als de deur open blijft",
    ed_temperature: "Temperatuursensor",
    ed_temperature_helper: "Optioneel: groot getoond, een melding boven het maximum",
    ed_freezer_temperature: "Vriezertemperatuur",
    ed_freezer_temperature_helper: "De tweede sensor van een combinatie, voor de vriezer",
    ed_max_temp: "Maximumtemperatuur",
    ed_max_temp_helper: "Daarboven een melding te warm; leeg: 8 voor een koelkast, −12 voor een vriezer",
    ed_entity: "Vermogenssensor",
    ed_entity_helper: "De vermogenssensor (W) van het apparaat, of de schakelaar van zijn slimme stekker",
    ed_switch: "Schakelaar",
    ed_switch_helper: "Om het apparaat aan en uit te zetten; leeg: gevonden op de stekker",
    ed_energy: "Energiesensor",
    ed_energy_helper: "De kWh van vandaag; leeg: berekend uit het vermogen",
    ed_kind: "Apparaat",
    ed_image: "Afbeelding",
    ed_image_helper: "Je eigen afbeelding van het apparaat (/local/…), getekend in plaats van de illustratie",
    ed_threshold: "Bezig boven",
    ed_threshold_helper: "Watt: daarboven is het apparaat bezig",
    ed_standby: "Stand-by boven",
    ed_standby_helper: "Watt: tussen deze waarde en de drempel is het apparaat stand-by",
    ed_price: "Prijs per kWh",
    ed_price_helper: "Een getal, of een sensor met de huidige prijs, om de kosten van vandaag te tonen",
    ed_show_graph: "Curve van 24 uur",
    ed_animations: "Animaties",
    ed_show_controls: "Bediening",
    ed_title_helper: "Leeg: de naam van het apparaat",
    ed_illustration: "Geïllustreerde kop",
    ed_illustration_theme: "Thema van de kop",
    ed_theme_auto: "Automatisch (volgt het thema)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nacht",
  },
  pt: {
    title: "Aparelho",
    st_running: "A funcionar",
    st_done: "Concluído",
    st_standby: "Em espera",
    st_idle: "Desligado",
    st_offline: "Offline",
    running_for: "A funcionar há {d}",
    done_ago: "Concluído há {d}",
    last_24h: "Últimas 24 horas",
    on_from: "ligado ≥ {w}",
    now: "agora",
    t_cycle: "Este ciclo",
    t_last_cycle: "Último ciclo",
    t_today: "Hoje",
    t_cost: "Custo de hoje",
    t_cycles: "Ciclos de hoje",
    t_peak: "Pico",
    cycles_one: "{n} ciclo hoje",
    cycles_many: "{n} ciclos hoje",
    avg_cycle: "Ciclo médio {d}",
    last_ago: "Último ciclo há {d}",
    turn_on: "Ligar",
    turn_off: "Desligar",
    no_device: "Nenhum sensor de potência encontrado",
    k_auto: "Automático (pelo nome)",
    k_airfryer: "Fritadeira de ar",
    k_kettle: "Chaleira",
    k_toaster: "Torradeira",
    k_coffee: "Máquina de café",
    k_beer: "Torneira de cerveja",
    k_washer: "Máquina de lavar roupa",
    k_dryer: "Máquina de secar roupa",
    k_dishwasher: "Máquina de lavar loiça",
    k_tools: "Carregador de ferramentas",
    k_charger: "Carregador de telemóvel",
    k_homelab: "Bastidor homelab",
    k_laptop: "Portátil",
    k_monitor: "Ecrãs de computador",
    k_pc: "PC de secretária",
    k_piano: "Piano digital",
    k_multiplug: "Extensão múltipla",
    k_plug: "Tomada inteligente",
    k_fridge: "Frigorífico",
    k_freezer: "Congelador",
    st_cooling: "A arrefecer",
    st_resting: "Compressor parado",
    st_brewing: "A preparar",
    st_warm: "A manter quente",
    al_door: "Porta aberta",
    al_warm: "Demasiado quente",
    al_cut: "Corte de energia",
    al_long: "A funcionar sem parar",
    rest_for: "Compressor parado há {d}",
    door_for: "Porta aberta há {d}",
    long_for: "A funcionar sem parar há {d}",
    warm_line: "Acima de {max}",
    cut_line: "A tomada não dá energia",
    brewing_for: "A preparar há {d}",
    warm_for: "Quente há {d}",
    auto_off_in: "Desliga-se sozinha em {d}",
    t_duty: "Tempo em funcionamento",
    m_auto: "Automático (pelo nome)",
    m_single: "Uma porta",
    m_combi: "Combinado",
    m_american: "Americano (side by side)",
    m_multi_door: "Portas francesas",
    m_chest: "Arca congeladora",
    m_drawers: "Vertical com gavetas",
    m_espresso: "Máquina de café expresso",
    m_filter: "Máquina de café de filtro",
    k_radiator: "Radiador",
    st_heating: "A aquecer",
    st_holding: "À temperatura",
    heating_for: "A aquecer há {d}",
    hold_for: "À temperatura há {d}",
    al_window: "Janela aberta",
    window_line: "Aquece com a janela aberta",
    al_cold: "Demasiado frio",
    cold_line: "Abaixo de {min}",
    pw_comfort: "Conforto",
    pw_eco: "Eco",
    pw_frost: "Anticongelamento",
    pw_off: "Desligado",
    m_column: "Radiador de colunas",
    m_oil: "Radiador a óleo",
    m_towel: "Toalheiro",
    ed_climate: "Termóstato ou fio piloto",
    ed_climate_helper: "Opcional: o climate ou o select de fio piloto de um radiador (como no ha-heating-card): temperatura da divisão, objetivo e modo",
    ed_window: "Sensor de janela",
    ed_window_helper: "Opcional: um alerta quando o radiador aquece com a janela aberta",
    ed_min_temp: "Temperatura mínima",
    ed_min_temp_helper: "Opcional: um alerta de demasiado frio abaixo dela, para um radiador",
    to_target: "→ {t}",
    ed_model: "Modelo",
    ed_model_helper: "O aspeto de um frigorífico, um congelador ou uma máquina de café",
    ed_door: "Sensor de porta",
    ed_door_helper: "Opcional: um alerta quando a porta fica aberta",
    ed_temperature: "Sensor de temperatura",
    ed_temperature_helper: "Opcional: em grande, um alerta acima do máximo",
    ed_freezer_temperature: "Temperatura do congelador",
    ed_freezer_temperature_helper: "O segundo sensor de um combinado, para o congelador",
    ed_max_temp: "Temperatura máxima",
    ed_max_temp_helper: "Acima dela, um alerta de calor; vazio: 8 para um frigorífico, −12 para um congelador",
    ed_entity: "Sensor de potência",
    ed_entity_helper: "O sensor de potência (W) do aparelho, ou o interruptor da sua tomada inteligente",
    ed_switch: "Interruptor",
    ed_switch_helper: "Para ligar e desligar o aparelho; vazio: encontrado na tomada",
    ed_energy: "Sensor de energia",
    ed_energy_helper: "Os kWh de hoje; vazio: calculados a partir da potência",
    ed_kind: "Aparelho",
    ed_image: "Imagem",
    ed_image_helper: "A sua própria imagem do aparelho (/local/…), desenhada em vez da ilustração",
    ed_threshold: "A funcionar acima de",
    ed_threshold_helper: "Watts: acima disto, o aparelho está a funcionar",
    ed_standby: "Em espera acima de",
    ed_standby_helper: "Watts: entre este valor e o limiar de funcionamento, o aparelho está em espera",
    ed_price: "Preço por kWh",
    ed_price_helper: "Um número, ou um sensor com o preço atual, para mostrar o custo de hoje",
    ed_show_graph: "Curva de 24 horas",
    ed_animations: "Animações",
    ed_show_controls: "Comandos",
    ed_title_helper: "Vazio: o nome do aparelho",
    ed_illustration: "Cabeçalho ilustrado",
    ed_illustration_theme: "Tema do cabeçalho",
    ed_theme_auto: "Automático (segue o tema)",
    ed_theme_day: "Dia",
    ed_theme_night: "Noite",
  },
  pl: {
    title: "Urządzenie",
    st_running: "Pracuje",
    st_done: "Zakończono",
    st_standby: "Czuwanie",
    st_idle: "Wyłączone",
    st_offline: "Offline",
    running_for: "Pracuje od {d}",
    done_ago: "Zakończono {d} temu",
    last_24h: "Ostatnie 24 godziny",
    on_from: "praca ≥ {w}",
    now: "teraz",
    t_cycle: "Ten cykl",
    t_last_cycle: "Ostatni cykl",
    t_today: "Dziś",
    t_cost: "Koszt dziś",
    t_cycles: "Cykle dziś",
    t_peak: "Szczyt",
    cycles_one: "{n} cykl dziś",
    cycles_few: "{n} cykle dziś",
    cycles_many: "{n} cykli dziś",
    avg_cycle: "Średni cykl {d}",
    last_ago: "Ostatni cykl {d} temu",
    turn_on: "Włącz",
    turn_off: "Wyłącz",
    no_device: "Nie znaleziono czujnika mocy",
    k_auto: "Automatycznie (z nazwy)",
    k_airfryer: "Frytkownica beztłuszczowa",
    k_kettle: "Czajnik",
    k_toaster: "Toster",
    k_coffee: "Ekspres do kawy",
    k_beer: "Nalewak do piwa",
    k_washer: "Pralka",
    k_dryer: "Suszarka",
    k_dishwasher: "Zmywarka",
    k_tools: "Ładowarka do narzędzi",
    k_charger: "Ładowarka telefonu",
    k_homelab: "Szafa homelab",
    k_laptop: "Laptop",
    k_monitor: "Monitory komputerowe",
    k_pc: "Komputer stacjonarny",
    k_piano: "Pianino cyfrowe",
    k_multiplug: "Listwa zasilająca",
    k_plug: "Inteligentne gniazdko",
    k_fridge: "Lodówka",
    k_freezer: "Zamrażarka",
    st_cooling: "Chłodzi",
    st_resting: "Sprężarka wyłączona",
    st_brewing: "Parzy",
    st_warm: "Podtrzymuje ciepło",
    al_door: "Drzwi otwarte",
    al_warm: "Za ciepło",
    al_cut: "Brak zasilania",
    al_long: "Pracuje bez przerwy",
    rest_for: "Sprężarka wyłączona od {d}",
    door_for: "Drzwi otwarte od {d}",
    long_for: "Pracuje bez przerwy od {d}",
    warm_line: "Powyżej {max}",
    cut_line: "Gniazdko nie daje prądu",
    brewing_for: "Parzy od {d}",
    warm_for: "Podtrzymuje ciepło od {d}",
    auto_off_in: "Wyłączy się za {d}",
    t_duty: "Czas pracy",
    m_auto: "Automatycznie (z nazwy)",
    m_single: "Jednodrzwiowa",
    m_combi: "Lodówko-zamrażarka",
    m_american: "Amerykańska (side by side)",
    m_multi_door: "French door",
    m_chest: "Zamrażarka skrzyniowa",
    m_drawers: "Szufladowa",
    m_espresso: "Ekspres ciśnieniowy",
    m_filter: "Ekspres przelewowy",
    k_radiator: "Grzejnik",
    st_heating: "Grzeje",
    st_holding: "W temperaturze",
    heating_for: "Grzeje od {d}",
    hold_for: "W temperaturze od {d}",
    al_window: "Okno otwarte",
    window_line: "Grzeje przy otwartym oknie",
    al_cold: "Za zimno",
    cold_line: "Poniżej {min}",
    pw_comfort: "Komfort",
    pw_eco: "Eko",
    pw_frost: "Ochrona przed mrozem",
    pw_off: "Wyłączony",
    m_column: "Grzejnik członowy",
    m_oil: "Grzejnik olejowy",
    m_towel: "Grzejnik łazienkowy",
    ed_climate: "Termostat lub przewód sterujący",
    ed_climate_helper: "Opcjonalnie: climate lub select przewodu sterującego grzejnika (jak w ha-heating-card): temperatura pokoju, zadana i tryb",
    ed_window: "Czujnik okna",
    ed_window_helper: "Opcjonalnie: alert, gdy grzejnik grzeje przy otwartym oknie",
    ed_min_temp: "Temperatura minimalna",
    ed_min_temp_helper: "Opcjonalnie: alert za zimno poniżej niej, dla grzejnika",
    to_target: "→ {t}",
    ed_model: "Model",
    ed_model_helper: "Wygląd lodówki, zamrażarki lub ekspresu",
    ed_door: "Czujnik drzwi",
    ed_door_helper: "Opcjonalnie: alert, gdy drzwi zostaną otwarte",
    ed_temperature: "Czujnik temperatury",
    ed_temperature_helper: "Opcjonalnie: duży odczyt, alert powyżej maksimum",
    ed_freezer_temperature: "Temperatura zamrażarki",
    ed_freezer_temperature_helper: "Drugi czujnik lodówko-zamrażarki, dla zamrażarki",
    ed_max_temp: "Temperatura maksymalna",
    ed_max_temp_helper: "Powyżej alert; puste: 8 dla lodówki, −12 dla zamrażarki",
    ed_entity: "Czujnik mocy",
    ed_entity_helper: "Czujnik mocy (W) urządzenia lub przełącznik jego inteligentnego gniazdka",
    ed_switch: "Przełącznik",
    ed_switch_helper: "Do włączania i wyłączania urządzenia; puste: znaleziony w gniazdku",
    ed_energy: "Czujnik energii",
    ed_energy_helper: "Dzisiejsze kWh; puste: obliczone z mocy",
    ed_kind: "Urządzenie",
    ed_image: "Obraz",
    ed_image_helper: "Własny obraz urządzenia (/local/…), rysowany zamiast ilustracji",
    ed_threshold: "Pracuje powyżej",
    ed_threshold_helper: "Waty: powyżej urządzenie pracuje",
    ed_standby: "Czuwanie powyżej",
    ed_standby_helper: "Waty: między tą wartością a progiem pracy urządzenie jest w czuwaniu",
    ed_price: "Cena za kWh",
    ed_price_helper: "Liczba lub czujnik z bieżącą ceną, aby pokazać dzisiejszy koszt",
    ed_show_graph: "Krzywa z 24 godzin",
    ed_animations: "Animacje",
    ed_show_controls: "Sterowanie",
    ed_title_helper: "Puste: nazwa urządzenia",
    ed_illustration: "Ilustrowany nagłówek",
    ed_illustration_theme: "Motyw nagłówka",
    ed_theme_auto: "Automatycznie (według motywu)",
    ed_theme_day: "Dzień",
    ed_theme_night: "Noc",
  },
  ro: {
    title: "Aparat",
    st_running: "Funcționează",
    st_done: "Terminat",
    st_standby: "În așteptare",
    st_idle: "Oprit",
    st_offline: "Offline",
    running_for: "Funcționează de {d}",
    done_ago: "Terminat acum {d}",
    last_24h: "Ultimele 24 de ore",
    on_from: "pornit ≥ {w}",
    now: "acum",
    t_cycle: "Acest ciclu",
    t_last_cycle: "Ultimul ciclu",
    t_today: "Azi",
    t_cost: "Cost azi",
    t_cycles: "Cicluri azi",
    t_peak: "Vârf",
    cycles_one: "{n} ciclu azi",
    cycles_few: "{n} cicluri azi",
    cycles_many: "{n} de cicluri azi",
    avg_cycle: "Ciclu mediu {d}",
    last_ago: "Ultimul ciclu acum {d}",
    turn_on: "Pornește",
    turn_off: "Oprește",
    no_device: "Niciun senzor de putere găsit",
    k_auto: "Automat (după nume)",
    k_airfryer: "Friteuză cu aer cald",
    k_kettle: "Fierbător",
    k_toaster: "Prăjitor de pâine",
    k_coffee: "Espressor",
    k_beer: "Dozator de bere",
    k_washer: "Mașină de spălat rufe",
    k_dryer: "Uscător de rufe",
    k_dishwasher: "Mașină de spălat vase",
    k_tools: "Încărcător de scule",
    k_charger: "Încărcător de telefon",
    k_homelab: "Rack homelab",
    k_laptop: "Laptop",
    k_monitor: "Monitoare de calculator",
    k_pc: "Calculator desktop",
    k_piano: "Pian digital",
    k_multiplug: "Prelungitor",
    k_plug: "Priză inteligentă",
    k_fridge: "Frigider",
    k_freezer: "Congelator",
    st_cooling: "Răcește",
    st_resting: "Compresor oprit",
    st_brewing: "Prepară",
    st_warm: "Menține cald",
    al_door: "Ușă deschisă",
    al_warm: "Prea cald",
    al_cut: "Pană de curent",
    al_long: "Funcționează non-stop",
    rest_for: "Compresor oprit de {d}",
    door_for: "Ușă deschisă de {d}",
    long_for: "Funcționează non-stop de {d}",
    warm_line: "Peste {max}",
    cut_line: "Priza nu dă curent",
    brewing_for: "Prepară de {d}",
    warm_for: "Menține cald de {d}",
    auto_off_in: "Se oprește singur în {d}",
    t_duty: "Timp de funcționare",
    m_auto: "Automat (după nume)",
    m_single: "O ușă",
    m_combi: "Combină frigorifică",
    m_american: "American (side by side)",
    m_multi_door: "French door",
    m_chest: "Lada frigorifică",
    m_drawers: "Vertical cu sertare",
    m_espresso: "Espressor",
    m_filter: "Cafetieră cu filtru",
    k_radiator: "Calorifer",
    st_heating: "Încălzește",
    st_holding: "La temperatură",
    heating_for: "Încălzește de {d}",
    hold_for: "La temperatură de {d}",
    al_window: "Fereastră deschisă",
    window_line: "Încălzește cu fereastra deschisă",
    al_cold: "Prea frig",
    cold_line: "Sub {min}",
    pw_comfort: "Confort",
    pw_eco: "Eco",
    pw_frost: "Protecție la îngheț",
    pw_off: "Oprit",
    m_column: "Calorifer cu elemenți",
    m_oil: "Calorifer cu ulei",
    m_towel: "Port-prosop",
    ed_climate: "Termostat sau fir pilot",
    ed_climate_helper: "Opțional: climate-ul sau select-ul fir pilot al unui calorifer (ca în ha-heating-card): temperatura camerei, consemnul și modul",
    ed_window: "Senzor de fereastră",
    ed_window_helper: "Opțional: o alertă când caloriferul încălzește cu fereastra deschisă",
    ed_min_temp: "Temperatură minimă",
    ed_min_temp_helper: "Opțional: o alertă de prea frig sub ea, pentru un calorifer",
    to_target: "→ {t}",
    ed_model: "Model",
    ed_model_helper: "Aspectul unui frigider, congelator sau aparat de cafea",
    ed_door: "Senzor de ușă",
    ed_door_helper: "Opțional: o alertă când ușa rămâne deschisă",
    ed_temperature: "Senzor de temperatură",
    ed_temperature_helper: "Opțional: afișată mare, o alertă peste maxim",
    ed_freezer_temperature: "Temperatura congelatorului",
    ed_freezer_temperature_helper: "Al doilea senzor al unei combine, pentru congelator",
    ed_max_temp: "Temperatură maximă",
    ed_max_temp_helper: "Peste ea, o alertă; gol: 8 pentru frigider, −12 pentru congelator",
    ed_entity: "Senzor de putere",
    ed_entity_helper: "Senzorul de putere (W) al aparatului, sau comutatorul prizei sale inteligente",
    ed_switch: "Comutator",
    ed_switch_helper: "Pentru pornirea și oprirea aparatului; gol: găsit pe priză",
    ed_energy: "Senzor de energie",
    ed_energy_helper: "kWh de azi; gol: calculați din putere",
    ed_kind: "Aparat",
    ed_image: "Imagine",
    ed_image_helper: "Propria imagine a aparatului (/local/…), desenată în locul ilustrației",
    ed_threshold: "Funcționează peste",
    ed_threshold_helper: "Wați: peste această valoare, aparatul funcționează",
    ed_standby: "În așteptare peste",
    ed_standby_helper: "Wați: între această valoare și pragul de funcționare, aparatul este în așteptare",
    ed_price: "Preț pe kWh",
    ed_price_helper: "Un număr, sau un senzor cu prețul curent, pentru a afișa costul de azi",
    ed_show_graph: "Curbă pe 24 de ore",
    ed_animations: "Animații",
    ed_show_controls: "Comenzi",
    ed_title_helper: "Gol: numele aparatului",
    ed_illustration: "Antet ilustrat",
    ed_illustration_theme: "Tema antetului",
    ed_theme_auto: "Automat (urmează tema)",
    ed_theme_day: "Zi",
    ed_theme_night: "Noapte",
  },
  da: {
    title: "Apparat",
    st_running: "Kører",
    st_done: "Færdig",
    st_standby: "Standby",
    st_idle: "Slukket",
    st_offline: "Offline",
    running_for: "Kører i {d}",
    done_ago: "Færdig for {d} siden",
    last_24h: "Sidste 24 timer",
    on_from: "tændt ≥ {w}",
    now: "nu",
    t_cycle: "Denne cyklus",
    t_last_cycle: "Seneste cyklus",
    t_today: "I dag",
    t_cost: "Pris i dag",
    t_cycles: "Cyklusser i dag",
    t_peak: "Spids",
    cycles_one: "{n} cyklus i dag",
    cycles_many: "{n} cyklusser i dag",
    avg_cycle: "Gns. cyklus {d}",
    last_ago: "Seneste cyklus for {d} siden",
    turn_on: "Tænd",
    turn_off: "Sluk",
    no_device: "Ingen effektsensor fundet",
    k_auto: "Automatisk (ud fra navnet)",
    k_airfryer: "Airfryer",
    k_kettle: "Elkedel",
    k_toaster: "Brødrister",
    k_coffee: "Kaffemaskine",
    k_beer: "Ølhane",
    k_washer: "Vaskemaskine",
    k_dryer: "Tørretumbler",
    k_dishwasher: "Opvaskemaskine",
    k_tools: "Værktøjslader",
    k_charger: "Telefonoplader",
    k_homelab: "Homelab-rack",
    k_laptop: "Bærbar",
    k_monitor: "Computerskærme",
    k_pc: "Stationær pc",
    k_piano: "Digitalt klaver",
    k_multiplug: "Stikdåse",
    k_plug: "Smart stikkontakt",
    k_fridge: "Køleskab",
    k_freezer: "Fryser",
    st_cooling: "Køler",
    st_resting: "Kompressor slukket",
    st_brewing: "Brygger",
    st_warm: "Holder varm",
    al_door: "Dør åben",
    al_warm: "For varmt",
    al_cut: "Strømafbrydelse",
    al_long: "Kører uafbrudt",
    rest_for: "Kompressor slukket i {d}",
    door_for: "Dør åben i {d}",
    long_for: "Kører uafbrudt i {d}",
    warm_line: "Over {max}",
    cut_line: "Stikket giver ingen strøm",
    brewing_for: "Brygger i {d}",
    warm_for: "Holder varm i {d}",
    auto_off_in: "Slukker selv om {d}",
    t_duty: "Driftstid",
    m_auto: "Automatisk (fra navnet)",
    m_single: "Én dør",
    m_combi: "Kølefryseskab",
    m_american: "Amerikansk (side by side)",
    m_multi_door: "French door",
    m_chest: "Frysekumme",
    m_drawers: "Fryseskab med skuffer",
    m_espresso: "Espressomaskine",
    m_filter: "Filterkaffemaskine",
    k_radiator: "Radiator",
    st_heating: "Varmer",
    st_holding: "På temperatur",
    heating_for: "Varmer i {d}",
    hold_for: "På temperatur i {d}",
    al_window: "Vindue åbent",
    window_line: "Varmer med vinduet åbent",
    al_cold: "For koldt",
    cold_line: "Under {min}",
    pw_comfort: "Komfort",
    pw_eco: "Eco",
    pw_frost: "Frostsikring",
    pw_off: "Slukket",
    m_column: "Ribberadiator",
    m_oil: "Olieradiator",
    m_towel: "Håndklædetørrer",
    ed_climate: "Termostat eller styreledning",
    ed_climate_helper: "Valgfrit: en radiators climate eller styrelednings-select (som i ha-heating-card): rummets temperatur, mål og tilstand",
    ed_window: "Vinduessensor",
    ed_window_helper: "Valgfrit: en alarm, når radiatoren varmer med vinduet åbent",
    ed_min_temp: "Minimumstemperatur",
    ed_min_temp_helper: "Valgfrit: en for-koldt-alarm under den, for en radiator",
    to_target: "→ {t}",
    ed_model: "Model",
    ed_model_helper: "Udseendet af et køleskab, en fryser eller en kaffemaskine",
    ed_door: "Dørsensor",
    ed_door_helper: "Valgfri: en alarm, når døren står åben",
    ed_temperature: "Temperatursensor",
    ed_temperature_helper: "Valgfri: vist stort, en alarm over maksimum",
    ed_freezer_temperature: "Frysertemperatur",
    ed_freezer_temperature_helper: "Kølefryseskabets anden sensor, til fryseren",
    ed_max_temp: "Maksimal temperatur",
    ed_max_temp_helper: "Over den en alarm; tom: 8 for et køleskab, −12 for en fryser",
    ed_entity: "Effektsensor",
    ed_entity_helper: "Apparatets effektsensor (W), eller kontakten på dets smarte stikkontakt",
    ed_switch: "Kontakt",
    ed_switch_helper: "Til at tænde og slukke apparatet; tom: fundet på stikkontakten",
    ed_energy: "Energisensor",
    ed_energy_helper: "Dagens kWh; tom: beregnet ud fra effekten",
    ed_kind: "Apparat",
    ed_image: "Billede",
    ed_image_helper: "Dit eget billede af apparatet (/local/…), vist i stedet for illustrationen",
    ed_threshold: "Kører over",
    ed_threshold_helper: "Watt: over denne værdi kører apparatet",
    ed_standby: "Standby over",
    ed_standby_helper: "Watt: mellem denne værdi og driftstærsklen er apparatet på standby",
    ed_price: "Pris pr. kWh",
    ed_price_helper: "Et tal, eller en sensor med den aktuelle pris, til at vise dagens pris",
    ed_show_graph: "Kurve over 24 timer",
    ed_animations: "Animationer",
    ed_show_controls: "Betjening",
    ed_title_helper: "Tom: apparatets navn",
    ed_illustration: "Illustreret overskrift",
    ed_illustration_theme: "Overskriftens tema",
    ed_theme_auto: "Automatisk (følger temaet)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nat",
  },
  sv: {
    title: "Apparat",
    st_running: "Igång",
    st_done: "Klar",
    st_standby: "Viloläge",
    st_idle: "Av",
    st_offline: "Offline",
    running_for: "Igång i {d}",
    done_ago: "Klar för {d} sedan",
    last_24h: "Senaste 24 timmarna",
    on_from: "på ≥ {w}",
    now: "nu",
    t_cycle: "Denna cykel",
    t_last_cycle: "Senaste cykeln",
    t_today: "I dag",
    t_cost: "Kostnad i dag",
    t_cycles: "Cykler i dag",
    t_peak: "Topp",
    cycles_one: "{n} cykel i dag",
    cycles_many: "{n} cykler i dag",
    avg_cycle: "Snittcykel {d}",
    last_ago: "Senaste cykeln för {d} sedan",
    turn_on: "Slå på",
    turn_off: "Stäng av",
    no_device: "Ingen effektsensor hittades",
    k_auto: "Automatiskt (från namnet)",
    k_airfryer: "Airfryer",
    k_kettle: "Vattenkokare",
    k_toaster: "Brödrost",
    k_coffee: "Kaffebryggare",
    k_beer: "Ölkran",
    k_washer: "Tvättmaskin",
    k_dryer: "Torktumlare",
    k_dishwasher: "Diskmaskin",
    k_tools: "Verktygsladdare",
    k_charger: "Telefonladdare",
    k_homelab: "Homelab-rack",
    k_laptop: "Bärbar dator",
    k_monitor: "Datorskärmar",
    k_pc: "Stationär dator",
    k_piano: "Digitalpiano",
    k_multiplug: "Grenuttag",
    k_plug: "Smart kontakt",
    k_fridge: "Kylskåp",
    k_freezer: "Frys",
    st_cooling: "Kyler",
    st_resting: "Kompressor av",
    st_brewing: "Brygger",
    st_warm: "Håller varmt",
    al_door: "Dörr öppen",
    al_warm: "För varmt",
    al_cut: "Strömavbrott",
    al_long: "Går oavbrutet",
    rest_for: "Kompressor av i {d}",
    door_for: "Dörr öppen i {d}",
    long_for: "Går oavbrutet i {d}",
    warm_line: "Över {max}",
    cut_line: "Uttaget ger ingen ström",
    brewing_for: "Brygger i {d}",
    warm_for: "Håller varmt i {d}",
    auto_off_in: "Stänger av sig om {d}",
    t_duty: "Drifttid",
    m_auto: "Automatiskt (från namnet)",
    m_single: "En dörr",
    m_combi: "Kyl-frys",
    m_american: "Amerikansk (side by side)",
    m_multi_door: "French door",
    m_chest: "Frysbox",
    m_drawers: "Frysskåp med lådor",
    m_espresso: "Espressomaskin",
    m_filter: "Bryggare",
    k_radiator: "Radiator",
    st_heating: "Värmer",
    st_holding: "På temperatur",
    heating_for: "Värmer i {d}",
    hold_for: "På temperatur i {d}",
    al_window: "Fönster öppet",
    window_line: "Värmer med fönstret öppet",
    al_cold: "För kallt",
    cold_line: "Under {min}",
    pw_comfort: "Komfort",
    pw_eco: "Eco",
    pw_frost: "Frostskydd",
    pw_off: "Av",
    m_column: "Sektionsradiator",
    m_oil: "Oljefylld radiator",
    m_towel: "Handdukstork",
    ed_climate: "Termostat eller styrtråd",
    ed_climate_helper: "Valfritt: en radiators climate eller styrtråds-select (som i ha-heating-card): rummets temperatur, mål och läge",
    ed_window: "Fönstersensor",
    ed_window_helper: "Valfritt: ett larm när radiatorn värmer med fönstret öppet",
    ed_min_temp: "Lägsta temperatur",
    ed_min_temp_helper: "Valfritt: ett för-kallt-larm under den, för en radiator",
    to_target: "→ {t}",
    ed_model: "Modell",
    ed_model_helper: "Utseendet på ett kylskåp, en frys eller en kaffebryggare",
    ed_door: "Dörrsensor",
    ed_door_helper: "Valfri: ett larm när dörren står öppen",
    ed_temperature: "Temperatursensor",
    ed_temperature_helper: "Valfri: visas stort, ett larm över max",
    ed_freezer_temperature: "Frystemperatur",
    ed_freezer_temperature_helper: "Kyl-frysens andra sensor, för frysen",
    ed_max_temp: "Maxtemperatur",
    ed_max_temp_helper: "Över den ett larm; tom: 8 för ett kylskåp, −12 för en frys",
    ed_entity: "Effektsensor",
    ed_entity_helper: "Apparatens effektsensor (W), eller brytaren på dess smarta kontakt",
    ed_switch: "Brytare",
    ed_switch_helper: "För att slå på och stänga av apparaten; tomt: hittas på kontakten",
    ed_energy: "Energisensor",
    ed_energy_helper: "Dagens kWh; tomt: beräknat från effekten",
    ed_kind: "Apparat",
    ed_image: "Bild",
    ed_image_helper: "Din egen bild av apparaten (/local/…), ritad i stället för illustrationen",
    ed_threshold: "Igång över",
    ed_threshold_helper: "Watt: över detta är apparaten igång",
    ed_standby: "Viloläge över",
    ed_standby_helper: "Watt: mellan detta värde och gränsen för drift är apparaten i viloläge",
    ed_price: "Pris per kWh",
    ed_price_helper: "Ett tal, eller en sensor med aktuellt pris, för att visa dagens kostnad",
    ed_show_graph: "Kurva över 24 timmar",
    ed_animations: "Animationer",
    ed_show_controls: "Reglage",
    ed_title_helper: "Tomt: apparatens namn",
    ed_illustration: "Illustrerad rubrik",
    ed_illustration_theme: "Rubrikens tema",
    ed_theme_auto: "Automatiskt (följer temat)",
    ed_theme_day: "Dag",
    ed_theme_night: "Natt",
  },
  bg: {
    title: "Уред",
    st_running: "Работи",
    st_done: "Готово",
    st_standby: "Режим на готовност",
    st_idle: "Изключен",
    st_offline: "Офлайн",
    running_for: "Работи от {d}",
    done_ago: "Готово преди {d}",
    last_24h: "Последните 24 часа",
    on_from: "работи ≥ {w}",
    now: "сега",
    t_cycle: "Този цикъл",
    t_last_cycle: "Последен цикъл",
    t_today: "Днес",
    t_cost: "Разход днес",
    t_cycles: "Цикли днес",
    t_peak: "Пик",
    cycles_one: "{n} цикъл днес",
    cycles_many: "{n} цикъла днес",
    avg_cycle: "Среден цикъл {d}",
    last_ago: "Последен цикъл преди {d}",
    turn_on: "Включи",
    turn_off: "Изключи",
    no_device: "Не е намерен сензор за мощност",
    k_auto: "Автоматично (по името)",
    k_airfryer: "Фритюрник с горещ въздух",
    k_kettle: "Електрическа кана",
    k_toaster: "Тостер",
    k_coffee: "Кафемашина",
    k_beer: "Наливна бира",
    k_washer: "Пералня",
    k_dryer: "Сушилня",
    k_dishwasher: "Съдомиялна",
    k_tools: "Зарядно за инструменти",
    k_charger: "Зарядно за телефон",
    k_homelab: "Homelab шкаф",
    k_laptop: "Лаптоп",
    k_monitor: "Компютърни екрани",
    k_pc: "Настолен компютър",
    k_piano: "Дигитално пиано",
    k_multiplug: "Разклонител",
    k_plug: "Смарт контакт",
    k_fridge: "Хладилник",
    k_freezer: "Фризер",
    st_cooling: "Охлажда",
    st_resting: "Компресорът е спрян",
    st_brewing: "Приготвя",
    st_warm: "Поддържа топло",
    al_door: "Отворена врата",
    al_warm: "Твърде топло",
    al_cut: "Спиране на тока",
    al_long: "Работи непрекъснато",
    rest_for: "Компресорът е спрян от {d}",
    door_for: "Вратата е отворена от {d}",
    long_for: "Работи непрекъснато от {d}",
    warm_line: "Над {max}",
    cut_line: "Контактът не подава ток",
    brewing_for: "Приготвя от {d}",
    warm_for: "Поддържа топло от {d}",
    auto_off_in: "Изключва се сам след {d}",
    t_duty: "Време на работа",
    m_auto: "Автоматично (по името)",
    m_single: "С една врата",
    m_combi: "Комбиниран",
    m_american: "Американски (side by side)",
    m_multi_door: "Френски врати",
    m_chest: "Фризер ракла",
    m_drawers: "Вертикален с чекмеджета",
    m_espresso: "Еспресо машина",
    m_filter: "Шварц машина",
    k_radiator: "Радиатор",
    st_heating: "Отоплява",
    st_holding: "На температура",
    heating_for: "Отоплява от {d}",
    hold_for: "На температура от {d}",
    al_window: "Отворен прозорец",
    window_line: "Отоплява при отворен прозорец",
    al_cold: "Твърде студено",
    cold_line: "Под {min}",
    pw_comfort: "Комфорт",
    pw_eco: "Еко",
    pw_frost: "Защита от замръзване",
    pw_off: "Изключено",
    m_column: "Радиатор с ребра",
    m_oil: "Маслен радиатор",
    m_towel: "Лира за кърпи",
    ed_climate: "Термостат или пилотен проводник",
    ed_climate_helper: "По избор: climate или select на пилотен проводник на радиатора (както в ha-heating-card): температура на стаята, зададена стойност и режим",
    ed_window: "Сензор за прозорец",
    ed_window_helper: "По избор: аларма, когато радиаторът отоплява при отворен прозорец",
    ed_min_temp: "Минимална температура",
    ed_min_temp_helper: "По избор: аларма за твърде студено под нея, за радиатор",
    to_target: "→ {t}",
    ed_model: "Модел",
    ed_model_helper: "Видът на хладилник, фризер или кафемашина",
    ed_door: "Сензор за врата",
    ed_door_helper: "По избор: сигнал, когато вратата остане отворена",
    ed_temperature: "Сензор за температура",
    ed_temperature_helper: "По избор: показана едро, сигнал над максимума",
    ed_freezer_temperature: "Температура на фризера",
    ed_freezer_temperature_helper: "Вторият сензор на комбиниран хладилник, за фризера",
    ed_max_temp: "Максимална температура",
    ed_max_temp_helper: "Над нея сигнал; празно: 8 за хладилник, −12 за фризер",
    ed_entity: "Сензор за мощност",
    ed_entity_helper: "Сензорът за мощност (W) на уреда или ключът на неговия смарт контакт",
    ed_switch: "Ключ",
    ed_switch_helper: "За включване и изключване на уреда; празно: намерен на контакта",
    ed_energy: "Сензор за енергия",
    ed_energy_helper: "kWh за днес; празно: изчислени от мощността",
    ed_kind: "Уред",
    ed_image: "Изображение",
    ed_image_helper: "Ваше изображение на уреда (/local/…), показано вместо илюстрацията",
    ed_threshold: "Работи над",
    ed_threshold_helper: "Ватове: над тази стойност уредът работи",
    ed_standby: "Готовност над",
    ed_standby_helper: "Ватове: между тази стойност и прага на работа уредът е в готовност",
    ed_price: "Цена за kWh",
    ed_price_helper: "Число или сензор с текущата цена, за показване на разхода за днес",
    ed_show_graph: "Крива за 24 часа",
    ed_animations: "Анимации",
    ed_show_controls: "Управление",
    ed_title_helper: "Празно: името на уреда",
    ed_illustration: "Илюстрирано заглавие",
    ed_illustration_theme: "Тема на заглавието",
    ed_theme_auto: "Автоматично (следва темата)",
    ed_theme_day: "Ден",
    ed_theme_night: "Нощ",
  },
  ru: {
    title: "Прибор",
    st_running: "Работает",
    st_done: "Готово",
    st_standby: "Ожидание",
    st_idle: "Выключен",
    st_offline: "Не в сети",
    running_for: "Работает уже {d}",
    done_ago: "Готово {d} назад",
    last_24h: "Последние 24 часа",
    on_from: "вкл. ≥ {w}",
    now: "сейчас",
    t_cycle: "Этот цикл",
    t_last_cycle: "Последний цикл",
    t_today: "Сегодня",
    t_cost: "Стоимость сегодня",
    t_cycles: "Циклы сегодня",
    t_peak: "Пик",
    cycles_one: "{n} цикл сегодня",
    cycles_few: "{n} цикла сегодня",
    cycles_many: "{n} циклов сегодня",
    avg_cycle: "Средний цикл {d}",
    last_ago: "Последний цикл {d} назад",
    turn_on: "Включить",
    turn_off: "Выключить",
    no_device: "Датчик мощности не найден",
    k_auto: "Автоматически (по названию)",
    k_airfryer: "Аэрогриль",
    k_kettle: "Чайник",
    k_toaster: "Тостер",
    k_coffee: "Кофеварка",
    k_beer: "Пивной кран",
    k_washer: "Стиральная машина",
    k_dryer: "Сушильная машина",
    k_dishwasher: "Посудомоечная машина",
    k_tools: "Зарядка для инструмента",
    k_charger: "Зарядка для телефона",
    k_homelab: "Стойка homelab",
    k_laptop: "Ноутбук",
    k_monitor: "Мониторы компьютера",
    k_pc: "Настольный компьютер",
    k_piano: "Цифровое пианино",
    k_multiplug: "Удлинитель",
    k_plug: "Умная розетка",
    k_fridge: "Холодильник",
    k_freezer: "Морозильник",
    st_cooling: "Охлаждает",
    st_resting: "Компрессор выключен",
    st_brewing: "Варит",
    st_warm: "Подогрев",
    al_door: "Дверь открыта",
    al_warm: "Слишком тепло",
    al_cut: "Нет питания",
    al_long: "Работает без остановки",
    rest_for: "Компрессор выключен {d}",
    door_for: "Дверь открыта {d}",
    long_for: "Работает без остановки {d}",
    warm_line: "Выше {max}",
    cut_line: "Розетка не даёт тока",
    brewing_for: "Варит {d}",
    warm_for: "Подогрев {d}",
    auto_off_in: "Выключится сама через {d}",
    t_duty: "Доля работы",
    m_auto: "Автоматически (по названию)",
    m_single: "Однокамерный",
    m_combi: "Двухкамерный",
    m_american: "Американский (side by side)",
    m_multi_door: "French door",
    m_chest: "Морозильный ларь",
    m_drawers: "Вертикальный с ящиками",
    m_espresso: "Эспрессо-машина",
    m_filter: "Капельная кофеварка",
    k_radiator: "Радиатор",
    st_heating: "Нагрев",
    st_holding: "Температура достигнута",
    heating_for: "Нагрев {d}",
    hold_for: "Температура достигнута {d} назад",
    al_window: "Окно открыто",
    window_line: "Нагрев при открытом окне",
    al_cold: "Слишком холодно",
    cold_line: "Ниже {min}",
    pw_comfort: "Комфорт",
    pw_eco: "Эко",
    pw_frost: "Защита от замерзания",
    pw_off: "Выключено",
    m_column: "Секционный радиатор",
    m_oil: "Масляный радиатор",
    m_towel: "Полотенцесушитель",
    ed_climate: "Термостат или пилотный провод",
    ed_climate_helper: "Необязательно: climate или select пилотного провода радиатора (как в ha-heating-card): температура комнаты, уставка и режим",
    ed_window: "Датчик окна",
    ed_window_helper: "Необязательно: оповещение, когда радиатор греет при открытом окне",
    ed_min_temp: "Минимальная температура",
    ed_min_temp_helper: "Необязательно: оповещение «слишком холодно» ниже неё, для радиатора",
    to_target: "→ {t}",
    ed_model: "Модель",
    ed_model_helper: "Вид холодильника, морозильника или кофеварки",
    ed_door: "Датчик двери",
    ed_door_helper: "Необязательно: оповещение, если дверь остаётся открытой",
    ed_temperature: "Датчик температуры",
    ed_temperature_helper: "Необязательно: крупно, оповещение выше максимума",
    ed_freezer_temperature: "Температура морозильника",
    ed_freezer_temperature_helper: "Второй датчик двухкамерного, для морозилки",
    ed_max_temp: "Максимальная температура",
    ed_max_temp_helper: "Выше — оповещение; пусто: 8 для холодильника, −12 для морозильника",
    ed_entity: "Датчик мощности",
    ed_entity_helper: "Датчик мощности (W) прибора или выключатель его умной розетки",
    ed_switch: "Выключатель",
    ed_switch_helper: "Для включения и выключения прибора; пусто: найден на розетке",
    ed_energy: "Датчик энергии",
    ed_energy_helper: "кВт·ч за сегодня; пусто: вычисляются по мощности",
    ed_kind: "Прибор",
    ed_image: "Изображение",
    ed_image_helper: "Ваше изображение прибора (/local/…), показанное вместо иллюстрации",
    ed_threshold: "Работает выше",
    ed_threshold_helper: "Ватты: выше этого значения прибор работает",
    ed_standby: "Ожидание выше",
    ed_standby_helper: "Ватты: между этим значением и порогом работы прибор в режиме ожидания",
    ed_price: "Цена за кВт·ч",
    ed_price_helper: "Число или датчик с текущей ценой, чтобы показать стоимость за сегодня",
    ed_show_graph: "Кривая за 24 часа",
    ed_animations: "Анимации",
    ed_show_controls: "Управление",
    ed_title_helper: "Пусто: название прибора",
    ed_illustration: "Иллюстрированный заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматически (по теме)",
    ed_theme_day: "День",
    ed_theme_night: "Ночь",
  },
  uk: {
    title: "Прилад",
    st_running: "Працює",
    st_done: "Готово",
    st_standby: "Очікування",
    st_idle: "Вимкнено",
    st_offline: "Не в мережі",
    running_for: "Працює вже {d}",
    done_ago: "Готово {d} тому",
    last_24h: "Останні 24 години",
    on_from: "увімк. ≥ {w}",
    now: "зараз",
    t_cycle: "Цей цикл",
    t_last_cycle: "Останній цикл",
    t_today: "Сьогодні",
    t_cost: "Вартість сьогодні",
    t_cycles: "Цикли сьогодні",
    t_peak: "Пік",
    cycles_one: "{n} цикл сьогодні",
    cycles_few: "{n} цикли сьогодні",
    cycles_many: "{n} циклів сьогодні",
    avg_cycle: "Середній цикл {d}",
    last_ago: "Останній цикл {d} тому",
    turn_on: "Увімкнути",
    turn_off: "Вимкнути",
    no_device: "Датчик потужності не знайдено",
    k_auto: "Автоматично (за назвою)",
    k_airfryer: "Аерогриль",
    k_kettle: "Чайник",
    k_toaster: "Тостер",
    k_coffee: "Кавоварка",
    k_beer: "Пивний кран",
    k_washer: "Пральна машина",
    k_dryer: "Сушильна машина",
    k_dishwasher: "Посудомийна машина",
    k_tools: "Зарядний пристрій для інструменту",
    k_charger: "Зарядний пристрій для телефона",
    k_homelab: "Стійка homelab",
    k_laptop: "Ноутбук",
    k_monitor: "Монітори комп'ютера",
    k_pc: "Настільний комп'ютер",
    k_piano: "Цифрове піаніно",
    k_multiplug: "Подовжувач",
    k_plug: "Розумна розетка",
    k_fridge: "Холодильник",
    k_freezer: "Морозильник",
    st_cooling: "Охолоджує",
    st_resting: "Компресор вимкнено",
    st_brewing: "Варить",
    st_warm: "Підігрів",
    al_door: "Двері відчинені",
    al_warm: "Занадто тепло",
    al_cut: "Немає живлення",
    al_long: "Працює без зупинки",
    rest_for: "Компресор вимкнено {d}",
    door_for: "Двері відчинені {d}",
    long_for: "Працює без зупинки {d}",
    warm_line: "Вище {max}",
    cut_line: "Розетка не дає струму",
    brewing_for: "Варить {d}",
    warm_for: "Підігрів {d}",
    auto_off_in: "Вимкнеться сама через {d}",
    t_duty: "Частка роботи",
    m_auto: "Автоматично (за назвою)",
    m_single: "Однокамерний",
    m_combi: "Двокамерний",
    m_american: "Американський (side by side)",
    m_multi_door: "French door",
    m_chest: "Морозильна скриня",
    m_drawers: "Вертикальний із шухлядами",
    m_espresso: "Еспресо-машина",
    m_filter: "Крапельна кавоварка",
    k_radiator: "Радіатор",
    st_heating: "Нагрівання",
    st_holding: "Температура досягнута",
    heating_for: "Нагрівання {d}",
    hold_for: "Температура досягнута {d} тому",
    al_window: "Вікно відчинене",
    window_line: "Нагрівання з відчиненим вікном",
    al_cold: "Занадто холодно",
    cold_line: "Нижче {min}",
    pw_comfort: "Комфорт",
    pw_eco: "Еко",
    pw_frost: "Захист від замерзання",
    pw_off: "Вимкнено",
    m_column: "Секційний радіатор",
    m_oil: "Масляний радіатор",
    m_towel: "Рушникосушарка",
    ed_climate: "Термостат або пілотний провід",
    ed_climate_helper: "Необов'язково: climate або select пілотного проводу радіатора (як у ha-heating-card): температура кімнати, уставка й режим",
    ed_window: "Датчик вікна",
    ed_window_helper: "Необов'язково: сповіщення, коли радіатор гріє з відчиненим вікном",
    ed_min_temp: "Мінімальна температура",
    ed_min_temp_helper: "Необов'язково: сповіщення «занадто холодно» нижче неї, для радіатора",
    to_target: "→ {t}",
    ed_model: "Модель",
    ed_model_helper: "Вигляд холодильника, морозильника або кавоварки",
    ed_door: "Датчик дверей",
    ed_door_helper: "Необов'язково: сповіщення, коли двері лишаються відчиненими",
    ed_temperature: "Датчик температури",
    ed_temperature_helper: "Необов'язково: великим, сповіщення вище максимуму",
    ed_freezer_temperature: "Температура морозильника",
    ed_freezer_temperature_helper: "Другий датчик двокамерного, для морозилки",
    ed_max_temp: "Максимальна температура",
    ed_max_temp_helper: "Вище — сповіщення; порожньо: 8 для холодильника, −12 для морозильника",
    ed_entity: "Датчик потужності",
    ed_entity_helper: "Датчик потужності (W) приладу або вимикач його розумної розетки",
    ed_switch: "Вимикач",
    ed_switch_helper: "Для вмикання і вимикання приладу; порожньо: знайдено на розетці",
    ed_energy: "Датчик енергії",
    ed_energy_helper: "кВт·год за сьогодні; порожньо: обчислюються з потужності",
    ed_kind: "Прилад",
    ed_image: "Зображення",
    ed_image_helper: "Ваше зображення приладу (/local/…), показане замість ілюстрації",
    ed_threshold: "Працює понад",
    ed_threshold_helper: "Вати: понад це значення прилад працює",
    ed_standby: "Очікування понад",
    ed_standby_helper: "Вати: між цим значенням і порогом роботи прилад в режимі очікування",
    ed_price: "Ціна за кВт·год",
    ed_price_helper: "Число або датчик з поточною ціною, щоб показати вартість за сьогодні",
    ed_show_graph: "Крива за 24 години",
    ed_animations: "Анімації",
    ed_show_controls: "Керування",
    ed_title_helper: "Порожньо: назва приладу",
    ed_illustration: "Ілюстрований заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматично (за темою)",
    ed_theme_day: "День",
    ed_theme_night: "Ніч",
  },
  hu: {
    title: "Készülék",
    st_running: "Működik",
    st_done: "Kész",
    st_standby: "Készenlét",
    st_idle: "Kikapcsolva",
    st_offline: "Offline",
    running_for: "{d} óta működik",
    done_ago: "Kész {d} ezelőtt",
    last_24h: "Utolsó 24 óra",
    on_from: "be ≥ {w}",
    now: "most",
    t_cycle: "Ez a ciklus",
    t_last_cycle: "Utolsó ciklus",
    t_today: "Ma",
    t_cost: "Mai költség",
    t_cycles: "Mai ciklusok",
    t_peak: "Csúcs",
    cycles_one: "{n} ciklus ma",
    cycles_many: "{n} ciklus ma",
    avg_cycle: "Átlagos ciklus {d}",
    last_ago: "Utolsó ciklus {d} ezelőtt",
    turn_on: "Bekapcsolás",
    turn_off: "Kikapcsolás",
    no_device: "Nem található teljesítményérzékelő",
    k_auto: "Automatikus (a név alapján)",
    k_airfryer: "Forrólevegős sütő",
    k_kettle: "Vízforraló",
    k_toaster: "Kenyérpirító",
    k_coffee: "Kávéfőző",
    k_beer: "Sörcsap",
    k_washer: "Mosógép",
    k_dryer: "Szárítógép",
    k_dishwasher: "Mosogatógép",
    k_tools: "Szerszámtöltő",
    k_charger: "Telefontöltő",
    k_homelab: "Homelab rack",
    k_laptop: "Laptop",
    k_monitor: "Számítógép-képernyők",
    k_pc: "Asztali számítógép",
    k_piano: "Digitális zongora",
    k_multiplug: "Elosztó",
    k_plug: "Okos konnektor",
    k_fridge: "Hűtőszekrény",
    k_freezer: "Fagyasztó",
    st_cooling: "Hűt",
    st_resting: "Kompresszor áll",
    st_brewing: "Főz",
    st_warm: "Melegen tart",
    al_door: "Nyitott ajtó",
    al_warm: "Túl meleg",
    al_cut: "Áramszünet",
    al_long: "Megállás nélkül megy",
    rest_for: "Kompresszor áll {d} óta",
    door_for: "Az ajtó nyitva {d} óta",
    long_for: "Megállás nélkül megy {d} óta",
    warm_line: "{max} fölött",
    cut_line: "A konnektor nem ad áramot",
    brewing_for: "Főz {d} óta",
    warm_for: "Melegen tart {d} óta",
    auto_off_in: "{d} múlva magától kikapcsol",
    t_duty: "Működési arány",
    m_auto: "Automatikus (a névből)",
    m_single: "Egyajtós",
    m_combi: "Kombinált hűtő",
    m_american: "Amerikai (side by side)",
    m_multi_door: "French door",
    m_chest: "Fagyasztóláda",
    m_drawers: "Fiókos fagyasztószekrény",
    m_espresso: "Eszpresszógép",
    m_filter: "Filteres kávéfőző",
    k_radiator: "Radiátor",
    st_heating: "Fűt",
    st_holding: "Hőmérsékleten",
    heating_for: "Fűt {d} óta",
    hold_for: "Hőmérsékleten {d} óta",
    al_window: "Nyitott ablak",
    window_line: "Nyitott ablaknál fűt",
    al_cold: "Túl hideg",
    cold_line: "{min} alatt",
    pw_comfort: "Komfort",
    pw_eco: "Eco",
    pw_frost: "Fagyvédelem",
    pw_off: "Ki",
    m_column: "Tagos radiátor",
    m_oil: "Olajradiátor",
    m_towel: "Törölközőszárító",
    ed_climate: "Termosztát vagy vezérlővezeték",
    ed_climate_helper: "Opcionális: egy radiátor climate vagy vezérlővezeték select entitása (mint a ha-heating-cardban): a szoba hőmérséklete, célértéke és módja",
    ed_window: "Ablakérzékelő",
    ed_window_helper: "Opcionális: riasztás, ha a radiátor nyitott ablaknál fűt",
    ed_min_temp: "Minimális hőmérséklet",
    ed_min_temp_helper: "Opcionális: túl hideg riasztás alatta, radiátornál",
    to_target: "→ {t}",
    ed_model: "Modell",
    ed_model_helper: "Egy hűtő, fagyasztó vagy kávéfőző kinézete",
    ed_door: "Ajtóérzékelő",
    ed_door_helper: "Opcionális: riasztás, ha az ajtó nyitva marad",
    ed_temperature: "Hőmérséklet-érzékelő",
    ed_temperature_helper: "Opcionális: nagyban, riasztás a maximum fölött",
    ed_freezer_temperature: "Fagyasztó hőmérséklete",
    ed_freezer_temperature_helper: "A kombinált hűtő második érzékelője, a fagyasztóhoz",
    ed_max_temp: "Legmagasabb hőmérséklet",
    ed_max_temp_helper: "Fölötte riasztás; üresen: hűtőnél 8, fagyasztónál −12",
    ed_entity: "Teljesítményérzékelő",
    ed_entity_helper: "A készülék teljesítményérzékelője (W), vagy az okos konnektorának kapcsolója",
    ed_switch: "Kapcsoló",
    ed_switch_helper: "A készülék be- és kikapcsolásához; üres: a konnektoron keresve",
    ed_energy: "Energiaérzékelő",
    ed_energy_helper: "A mai kWh; üres: a teljesítményből számolva",
    ed_kind: "Készülék",
    ed_image: "Kép",
    ed_image_helper: "Saját kép a készülékről (/local/…), az illusztráció helyett",
    ed_threshold: "Működik e felett",
    ed_threshold_helper: "Watt: e felett a készülék működik",
    ed_standby: "Készenlét e felett",
    ed_standby_helper: "Watt: e érték és a működési küszöb között a készülék készenlétben van",
    ed_price: "kWh ár",
    ed_price_helper: "Egy szám, vagy egy érzékelő az aktuális árral, a mai költség megjelenítéséhez",
    ed_show_graph: "24 órás görbe",
    ed_animations: "Animációk",
    ed_show_controls: "Vezérlők",
    ed_title_helper: "Üres: a készülék neve",
    ed_illustration: "Illusztrált fejléc",
    ed_illustration_theme: "Fejléc témája",
    ed_theme_auto: "Automatikus (a témát követi)",
    ed_theme_day: "Nappal",
    ed_theme_night: "Éjszaka",
  },
  sk: {
    title: "Spotrebič",
    st_running: "Beží",
    st_done: "Hotovo",
    st_standby: "Pohotovosť",
    st_idle: "Vypnutý",
    st_offline: "Offline",
    running_for: "Beží {d}",
    done_ago: "Hotovo pred {d}",
    last_24h: "Posledných 24 hodín",
    on_from: "zap. ≥ {w}",
    now: "teraz",
    t_cycle: "Tento cyklus",
    t_last_cycle: "Posledný cyklus",
    t_today: "Dnes",
    t_cost: "Náklady dnes",
    t_cycles: "Cykly dnes",
    t_peak: "Špička",
    cycles_one: "{n} cyklus dnes",
    cycles_few: "{n} cykly dnes",
    cycles_many: "{n} cyklov dnes",
    avg_cycle: "Priemerný cyklus {d}",
    last_ago: "Posledný cyklus pred {d}",
    turn_on: "Zapnúť",
    turn_off: "Vypnúť",
    no_device: "Nenašiel sa žiadny snímač výkonu",
    k_auto: "Automaticky (podľa názvu)",
    k_airfryer: "Teplovzdušná fritéza",
    k_kettle: "Rýchlovarná kanvica",
    k_toaster: "Hriankovač",
    k_coffee: "Kávovar",
    k_beer: "Pivný výčap",
    k_washer: "Práčka",
    k_dryer: "Sušička",
    k_dishwasher: "Umývačka riadu",
    k_tools: "Nabíjačka náradia",
    k_charger: "Nabíjačka telefónu",
    k_homelab: "Homelab rack",
    k_laptop: "Notebook",
    k_monitor: "Počítačové obrazovky",
    k_pc: "Stolový počítač",
    k_piano: "Digitálne piano",
    k_multiplug: "Predlžovačka",
    k_plug: "Inteligentná zásuvka",
    k_fridge: "Chladnička",
    k_freezer: "Mraznička",
    st_cooling: "Chladí",
    st_resting: "Kompresor vypnutý",
    st_brewing: "Pripravuje",
    st_warm: "Udržiava teplé",
    al_door: "Dvere otvorené",
    al_warm: "Príliš teplo",
    al_cut: "Výpadok prúdu",
    al_long: "Beží bez prestávky",
    rest_for: "Kompresor vypnutý {d}",
    door_for: "Dvere otvorené {d}",
    long_for: "Beží bez prestávky {d}",
    warm_line: "Nad {max}",
    cut_line: "Zásuvka nedáva prúd",
    brewing_for: "Pripravuje {d}",
    warm_for: "Udržiava teplé {d}",
    auto_off_in: "Sám sa vypne o {d}",
    t_duty: "Podiel chodu",
    m_auto: "Automaticky (podľa názvu)",
    m_single: "Jednodverová",
    m_combi: "Kombinovaná",
    m_american: "Americká (side by side)",
    m_multi_door: "French door",
    m_chest: "Truhlicová mraznička",
    m_drawers: "Zásuvková mraznička",
    m_espresso: "Espresso kávovar",
    m_filter: "Prekvapkávací kávovar",
    k_radiator: "Radiátor",
    st_heating: "Kúri",
    st_holding: "Na teplote",
    heating_for: "Kúri {d}",
    hold_for: "Na teplote {d}",
    al_window: "Otvorené okno",
    window_line: "Kúri pri otvorenom okne",
    al_cold: "Príliš chladno",
    cold_line: "Pod {min}",
    pw_comfort: "Komfort",
    pw_eco: "Eco",
    pw_frost: "Ochrana pred mrazom",
    pw_off: "Vypnuté",
    m_column: "Článkový radiátor",
    m_oil: "Olejový radiátor",
    m_towel: "Sušiak na uteráky",
    ed_climate: "Termostat alebo pilotný vodič",
    ed_climate_helper: "Voliteľné: climate alebo select pilotného vodiča radiátora (ako v ha-heating-card): teplota miestnosti, cieľ a režim",
    ed_window: "Snímač okna",
    ed_window_helper: "Voliteľné: upozornenie, keď radiátor kúri pri otvorenom okne",
    ed_min_temp: "Minimálna teplota",
    ed_min_temp_helper: "Voliteľné: upozornenie príliš chladno pod ňou, pre radiátor",
    to_target: "→ {t}",
    ed_model: "Model",
    ed_model_helper: "Vzhľad chladničky, mrazničky alebo kávovaru",
    ed_door: "Senzor dverí",
    ed_door_helper: "Voliteľné: upozornenie, keď dvere zostanú otvorené",
    ed_temperature: "Senzor teploty",
    ed_temperature_helper: "Voliteľné: veľkým písmom, upozornenie nad maximom",
    ed_freezer_temperature: "Teplota mrazničky",
    ed_freezer_temperature_helper: "Druhý senzor kombinovanej chladničky, pre mrazničku",
    ed_max_temp: "Maximálna teplota",
    ed_max_temp_helper: "Nad ňou upozornenie; prázdne: 8 pre chladničku, −12 pre mrazničku",
    ed_entity: "Snímač výkonu",
    ed_entity_helper: "Snímač výkonu (W) spotrebiča alebo vypínač jeho inteligentnej zásuvky",
    ed_switch: "Vypínač",
    ed_switch_helper: "Na zapnutie a vypnutie spotrebiča; prázdne: nájdený na zásuvke",
    ed_energy: "Snímač energie",
    ed_energy_helper: "Dnešné kWh; prázdne: vypočítané z výkonu",
    ed_kind: "Spotrebič",
    ed_image: "Obrázok",
    ed_image_helper: "Vlastný obrázok spotrebiča (/local/…), zobrazený namiesto ilustrácie",
    ed_threshold: "Beží nad",
    ed_threshold_helper: "Watty: nad touto hodnotou spotrebič beží",
    ed_standby: "Pohotovosť nad",
    ed_standby_helper: "Watty: medzi touto hodnotou a prahom chodu je spotrebič v pohotovosti",
    ed_price: "Cena za kWh",
    ed_price_helper: "Číslo alebo snímač s aktuálnou cenou, na zobrazenie dnešných nákladov",
    ed_show_graph: "Krivka za 24 hodín",
    ed_animations: "Animácie",
    ed_show_controls: "Ovládanie",
    ed_title_helper: "Prázdne: názov spotrebiča",
    ed_illustration: "Ilustrovaná hlavička",
    ed_illustration_theme: "Téma hlavičky",
    ed_theme_auto: "Automaticky (podľa témy)",
    ed_theme_day: "Deň",
    ed_theme_night: "Noc",
  },
  cs: {
    title: "Spotřebič",
    st_running: "Běží",
    st_done: "Hotovo",
    st_standby: "Pohotovost",
    st_idle: "Vypnuto",
    st_offline: "Offline",
    running_for: "Běží {d}",
    done_ago: "Hotovo před {d}",
    last_24h: "Posledních 24 hodin",
    on_from: "zap. ≥ {w}",
    now: "nyní",
    t_cycle: "Tento cyklus",
    t_last_cycle: "Poslední cyklus",
    t_today: "Dnes",
    t_cost: "Náklady dnes",
    t_cycles: "Cykly dnes",
    t_peak: "Špička",
    cycles_one: "{n} cyklus dnes",
    cycles_few: "{n} cykly dnes",
    cycles_many: "{n} cyklů dnes",
    avg_cycle: "Průměrný cyklus {d}",
    last_ago: "Poslední cyklus před {d}",
    turn_on: "Zapnout",
    turn_off: "Vypnout",
    no_device: "Nenalezen žádný snímač výkonu",
    k_auto: "Automaticky (podle názvu)",
    k_airfryer: "Horkovzdušná fritéza",
    k_kettle: "Rychlovarná konvice",
    k_toaster: "Topinkovač",
    k_coffee: "Kávovar",
    k_beer: "Pivní výčep",
    k_washer: "Pračka",
    k_dryer: "Sušička",
    k_dishwasher: "Myčka nádobí",
    k_tools: "Nabíječka nářadí",
    k_charger: "Nabíječka telefonu",
    k_homelab: "Homelab rack",
    k_laptop: "Notebook",
    k_monitor: "Počítačové obrazovky",
    k_pc: "Stolní počítač",
    k_piano: "Digitální piano",
    k_multiplug: "Prodlužovačka",
    k_plug: "Chytrá zásuvka",
    k_fridge: "Lednice",
    k_freezer: "Mraznička",
    st_cooling: "Chladí",
    st_resting: "Kompresor vypnutý",
    st_brewing: "Připravuje",
    st_warm: "Udržuje teplé",
    al_door: "Dveře otevřené",
    al_warm: "Příliš teplo",
    al_cut: "Výpadek proudu",
    al_long: "Běží bez přestávky",
    rest_for: "Kompresor vypnutý {d}",
    door_for: "Dveře otevřené {d}",
    long_for: "Běží bez přestávky {d}",
    warm_line: "Nad {max}",
    cut_line: "Zásuvka nedává proud",
    brewing_for: "Připravuje {d}",
    warm_for: "Udržuje teplé {d}",
    auto_off_in: "Sám se vypne za {d}",
    t_duty: "Podíl chodu",
    m_auto: "Automaticky (podle názvu)",
    m_single: "Jednodveřová",
    m_combi: "Kombinovaná",
    m_american: "Americká (side by side)",
    m_multi_door: "French door",
    m_chest: "Truhlicová mraznička",
    m_drawers: "Šuplíková mraznička",
    m_espresso: "Espresso kávovar",
    m_filter: "Překapávač",
    k_radiator: "Radiátor",
    st_heating: "Topí",
    st_holding: "Na teplotě",
    heating_for: "Topí {d}",
    hold_for: "Na teplotě {d}",
    al_window: "Otevřené okno",
    window_line: "Topí při otevřeném okně",
    al_cold: "Příliš chladno",
    cold_line: "Pod {min}",
    pw_comfort: "Komfort",
    pw_eco: "Eco",
    pw_frost: "Ochrana proti mrazu",
    pw_off: "Vypnuto",
    m_column: "Článkový radiátor",
    m_oil: "Olejový radiátor",
    m_towel: "Sušák na ručníky",
    ed_climate: "Termostat nebo pilotní vodič",
    ed_climate_helper: "Volitelné: climate nebo select pilotního vodiče radiátoru (jako v ha-heating-card): teplota místnosti, cíl a režim",
    ed_window: "Čidlo okna",
    ed_window_helper: "Volitelné: upozornění, když radiátor topí při otevřeném okně",
    ed_min_temp: "Minimální teplota",
    ed_min_temp_helper: "Volitelné: upozornění příliš chladno pod ní, pro radiátor",
    to_target: "→ {t}",
    ed_model: "Model",
    ed_model_helper: "Vzhled lednice, mrazničky nebo kávovaru",
    ed_door: "Senzor dveří",
    ed_door_helper: "Volitelné: upozornění, když dveře zůstanou otevřené",
    ed_temperature: "Senzor teploty",
    ed_temperature_helper: "Volitelné: velkým písmem, upozornění nad maximem",
    ed_freezer_temperature: "Teplota mrazničky",
    ed_freezer_temperature_helper: "Druhý senzor kombinované lednice, pro mrazák",
    ed_max_temp: "Maximální teplota",
    ed_max_temp_helper: "Nad ní upozornění; prázdné: 8 pro lednici, −12 pro mrazničku",
    ed_entity: "Snímač výkonu",
    ed_entity_helper: "Snímač výkonu (W) spotřebiče, nebo vypínač jeho chytré zásuvky",
    ed_switch: "Vypínač",
    ed_switch_helper: "K zapnutí a vypnutí spotřebiče; prázdné: nalezen na zásuvce",
    ed_energy: "Snímač energie",
    ed_energy_helper: "Dnešní kWh; prázdné: vypočteno z výkonu",
    ed_kind: "Spotřebič",
    ed_image: "Obrázek",
    ed_image_helper: "Vlastní obrázek spotřebiče (/local/…), zobrazený místo ilustrace",
    ed_threshold: "Běží nad",
    ed_threshold_helper: "Watty: nad touto hodnotou spotřebič běží",
    ed_standby: "Pohotovost nad",
    ed_standby_helper: "Watty: mezi touto hodnotou a prahem chodu je spotřebič v pohotovosti",
    ed_price: "Cena za kWh",
    ed_price_helper: "Číslo, nebo snímač s aktuální cenou, pro zobrazení dnešních nákladů",
    ed_show_graph: "Křivka za 24 hodin",
    ed_animations: "Animace",
    ed_show_controls: "Ovládání",
    ed_title_helper: "Prázdné: název spotřebiče",
    ed_illustration: "Ilustrovaná hlavička",
    ed_illustration_theme: "Motiv hlavičky",
    ed_theme_auto: "Automaticky (podle motivu)",
    ed_theme_day: "Den",
    ed_theme_night: "Noc",
  },
  sl: {
    title: "Naprava",
    st_running: "Deluje",
    st_done: "Končano",
    st_standby: "Pripravljenost",
    st_idle: "Izklopljeno",
    st_offline: "Brez povezave",
    running_for: "Deluje že {d}",
    done_ago: "Končano pred {d}",
    last_24h: "Zadnjih 24 ur",
    on_from: "vklop ≥ {w}",
    now: "zdaj",
    t_cycle: "Ta cikel",
    t_last_cycle: "Zadnji cikel",
    t_today: "Danes",
    t_cost: "Strošek danes",
    t_cycles: "Cikli danes",
    t_peak: "Vrh",
    cycles_one: "{n} cikel danes",
    cycles_few: "{n} cikli danes",
    cycles_many: "{n} ciklov danes",
    avg_cycle: "Povprečni cikel {d}",
    last_ago: "Zadnji cikel pred {d}",
    turn_on: "Vklopi",
    turn_off: "Izklopi",
    no_device: "Senzor moči ni bil najden",
    k_auto: "Samodejno (po imenu)",
    k_airfryer: "Cvrtnik na vroč zrak",
    k_kettle: "Grelnik vode",
    k_toaster: "Opekač kruha",
    k_coffee: "Kavni aparat",
    k_beer: "Pivska pipa",
    k_washer: "Pralni stroj",
    k_dryer: "Sušilni stroj",
    k_dishwasher: "Pomivalni stroj",
    k_tools: "Polnilnik orodja",
    k_charger: "Polnilnik telefona",
    k_homelab: "Homelab omara",
    k_laptop: "Prenosnik",
    k_monitor: "Računalniški zasloni",
    k_pc: "Namizni računalnik",
    k_piano: "Digitalni klavir",
    k_multiplug: "Podaljšek",
    k_plug: "Pametna vtičnica",
    k_fridge: "Hladilnik",
    k_freezer: "Zamrzovalnik",
    st_cooling: "Hladi",
    st_resting: "Kompresor ugasnjen",
    st_brewing: "Kuha",
    st_warm: "Ohranja toplo",
    al_door: "Vrata odprta",
    al_warm: "Pretoplo",
    al_cut: "Izpad elektrike",
    al_long: "Deluje brez prestanka",
    rest_for: "Kompresor ugasnjen {d}",
    door_for: "Vrata odprta {d}",
    long_for: "Deluje brez prestanka {d}",
    warm_line: "Nad {max}",
    cut_line: "Vtičnica ne daje toka",
    brewing_for: "Kuha {d}",
    warm_for: "Ohranja toplo {d}",
    auto_off_in: "Sam se izklopi čez {d}",
    t_duty: "Delež delovanja",
    m_auto: "Samodejno (iz imena)",
    m_single: "Enovratni",
    m_combi: "Kombinirani",
    m_american: "Ameriški (side by side)",
    m_multi_door: "French door",
    m_chest: "Skrinja",
    m_drawers: "Pokončni s predali",
    m_espresso: "Espresso aparat",
    m_filter: "Kavni aparat na filter",
    k_radiator: "Radiator",
    st_heating: "Greje",
    st_holding: "Na temperaturi",
    heating_for: "Greje {d}",
    hold_for: "Na temperaturi {d}",
    al_window: "Okno odprto",
    window_line: "Greje pri odprtem oknu",
    al_cold: "Prehladno",
    cold_line: "Pod {min}",
    pw_comfort: "Udobje",
    pw_eco: "Eko",
    pw_frost: "Zaščita pred zmrzaljo",
    pw_off: "Izklopljeno",
    m_column: "Členasti radiator",
    m_oil: "Oljni radiator",
    m_towel: "Sušilnik za brisače",
    ed_climate: "Termostat ali pilotna žica",
    ed_climate_helper: "Neobvezno: climate ali select pilotne žice radiatorja (kot v ha-heating-card): temperatura prostora, cilj in način",
    ed_window: "Senzor okna",
    ed_window_helper: "Neobvezno: opozorilo, ko radiator greje pri odprtem oknu",
    ed_min_temp: "Najnižja temperatura",
    ed_min_temp_helper: "Neobvezno: opozorilo prehladno pod njo, za radiator",
    to_target: "→ {t}",
    ed_model: "Model",
    ed_model_helper: "Videz hladilnika, zamrzovalnika ali kavnega aparata",
    ed_door: "Senzor vrat",
    ed_door_helper: "Neobvezno: opozorilo, ko vrata ostanejo odprta",
    ed_temperature: "Senzor temperature",
    ed_temperature_helper: "Neobvezno: veliko, opozorilo nad najvišjo",
    ed_freezer_temperature: "Temperatura zamrzovalnika",
    ed_freezer_temperature_helper: "Drugi senzor kombiniranega, za zamrzovalnik",
    ed_max_temp: "Najvišja temperatura",
    ed_max_temp_helper: "Nad njo opozorilo; prazno: 8 za hladilnik, −12 za zamrzovalnik",
    ed_entity: "Senzor moči",
    ed_entity_helper: "Senzor moči (W) naprave ali stikalo njene pametne vtičnice",
    ed_switch: "Stikalo",
    ed_switch_helper: "Za vklop in izklop naprave; prazno: najdeno na vtičnici",
    ed_energy: "Senzor energije",
    ed_energy_helper: "Današnji kWh; prazno: izračunano iz moči",
    ed_kind: "Naprava",
    ed_image: "Slika",
    ed_image_helper: "Vaša slika naprave (/local/…), prikazana namesto ilustracije",
    ed_threshold: "Deluje nad",
    ed_threshold_helper: "Vati: nad to vrednostjo naprava deluje",
    ed_standby: "Pripravljenost nad",
    ed_standby_helper: "Vati: med to vrednostjo in pragom delovanja je naprava v pripravljenosti",
    ed_price: "Cena za kWh",
    ed_price_helper: "Število ali senzor s trenutno ceno, za prikaz današnjega stroška",
    ed_show_graph: "Krivulja za 24 ur",
    ed_animations: "Animacije",
    ed_show_controls: "Upravljanje",
    ed_title_helper: "Prazno: ime naprave",
    ed_illustration: "Ilustrirana glava",
    ed_illustration_theme: "Tema glave",
    ed_theme_auto: "Samodejno (sledi temi)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noč",
  },
  lv: {
    title: "Ierīce",
    st_running: "Darbojas",
    st_done: "Pabeigts",
    st_standby: "Gaidstāve",
    st_idle: "Izslēgts",
    st_offline: "Bezsaistē",
    running_for: "Darbojas jau {d}",
    done_ago: "Pabeigts pirms {d}",
    last_24h: "Pēdējās 24 stundas",
    on_from: "iesl. ≥ {w}",
    now: "tagad",
    t_cycle: "Šis cikls",
    t_last_cycle: "Pēdējais cikls",
    t_today: "Šodien",
    t_cost: "Izmaksas šodien",
    t_cycles: "Cikli šodien",
    t_peak: "Maksimums",
    cycles_one: "{n} cikls šodien",
    cycles_many: "{n} cikli šodien",
    avg_cycle: "Vidējais cikls {d}",
    last_ago: "Pēdējais cikls pirms {d}",
    turn_on: "Ieslēgt",
    turn_off: "Izslēgt",
    no_device: "Jaudas sensors nav atrasts",
    k_auto: "Automātiski (pēc nosaukuma)",
    k_airfryer: "Karstā gaisa katls",
    k_kettle: "Tējkanna",
    k_toaster: "Tosteris",
    k_coffee: "Kafijas automāts",
    k_beer: "Alus krāns",
    k_washer: "Veļas mašīna",
    k_dryer: "Veļas žāvētājs",
    k_dishwasher: "Trauku mazgājamā mašīna",
    k_tools: "Instrumentu lādētājs",
    k_charger: "Telefona lādētājs",
    k_homelab: "Homelab statne",
    k_laptop: "Klēpjdators",
    k_monitor: "Datora ekrāni",
    k_pc: "Galddators",
    k_piano: "Digitālās klavieres",
    k_multiplug: "Pagarinātājs",
    k_plug: "Viedā kontaktligzda",
    k_fridge: "Ledusskapis",
    k_freezer: "Saldētava",
    st_cooling: "Dzesē",
    st_resting: "Kompresors izslēgts",
    st_brewing: "Gatavo",
    st_warm: "Uztur siltu",
    al_door: "Durvis atvērtas",
    al_warm: "Pārāk silts",
    al_cut: "Strāvas pārrāvums",
    al_long: "Strādā bez pārtraukuma",
    rest_for: "Kompresors izslēgts {d}",
    door_for: "Durvis atvērtas {d}",
    long_for: "Strādā bez pārtraukuma {d}",
    warm_line: "Virs {max}",
    cut_line: "Kontaktligzda nedod strāvu",
    brewing_for: "Gatavo {d}",
    warm_for: "Uztur siltu {d}",
    auto_off_in: "Pats izslēgsies pēc {d}",
    t_duty: "Darbības daļa",
    m_auto: "Automātiski (pēc nosaukuma)",
    m_single: "Vienas durvis",
    m_combi: "Kombinētais",
    m_american: "Amerikāņu (side by side)",
    m_multi_door: "French door",
    m_chest: "Saldētava lāde",
    m_drawers: "Vertikāla ar atvilktnēm",
    m_espresso: "Espresso automāts",
    m_filter: "Filtra kafijas automāts",
    k_radiator: "Radiators",
    st_heating: "Silda",
    st_holding: "Temperatūra sasniegta",
    heating_for: "Silda {d}",
    hold_for: "Temperatūra sasniegta pirms {d}",
    al_window: "Atvērts logs",
    window_line: "Silda ar atvērtu logu",
    al_cold: "Pārāk auksts",
    cold_line: "Zem {min}",
    pw_comfort: "Komforts",
    pw_eco: "Eko",
    pw_frost: "Aizsardzība pret salu",
    pw_off: "Izslēgts",
    m_column: "Sekciju radiators",
    m_oil: "Eļļas radiators",
    m_towel: "Dvieļu žāvētājs",
    ed_climate: "Termostats vai vadības vads",
    ed_climate_helper: "Pēc izvēles: radiatora climate vai vadības vada select (kā ha-heating-card): telpas temperatūra, mērķis un režīms",
    ed_window: "Loga sensors",
    ed_window_helper: "Pēc izvēles: brīdinājums, kad radiators silda ar atvērtu logu",
    ed_min_temp: "Minimālā temperatūra",
    ed_min_temp_helper: "Pēc izvēles: brīdinājums par pārāk aukstu zem tās, radiatoram",
    to_target: "→ {t}",
    ed_model: "Modelis",
    ed_model_helper: "Ledusskapja, saldētavas vai kafijas automāta izskats",
    ed_door: "Durvju sensors",
    ed_door_helper: "Neobligāti: brīdinājums, ja durvis paliek atvērtas",
    ed_temperature: "Temperatūras sensors",
    ed_temperature_helper: "Neobligāti: lielā izmērā, brīdinājums virs maksimuma",
    ed_freezer_temperature: "Saldētavas temperatūra",
    ed_freezer_temperature_helper: "Kombinētā otrais sensors, saldētavai",
    ed_max_temp: "Maksimālā temperatūra",
    ed_max_temp_helper: "Virs tās brīdinājums; tukšs: 8 ledusskapim, −12 saldētavai",
    ed_entity: "Jaudas sensors",
    ed_entity_helper: "Ierīces jaudas sensors (W) vai tās viedās kontaktligzdas slēdzis",
    ed_switch: "Slēdzis",
    ed_switch_helper: "Ierīces ieslēgšanai un izslēgšanai; tukšs: atrasts kontaktligzdā",
    ed_energy: "Enerģijas sensors",
    ed_energy_helper: "Šodienas kWh; tukšs: aprēķināts no jaudas",
    ed_kind: "Ierīce",
    ed_image: "Attēls",
    ed_image_helper: "Jūsu attēls ar ierīci (/local/…), parādīts ilustrācijas vietā",
    ed_threshold: "Darbojas virs",
    ed_threshold_helper: "Vati: virs šīs vērtības ierīce darbojas",
    ed_standby: "Gaidstāve virs",
    ed_standby_helper: "Vati: starp šo vērtību un darbības slieksni ierīce ir gaidstāvē",
    ed_price: "Cena par kWh",
    ed_price_helper: "Skaitlis vai sensors ar pašreizējo cenu, lai parādītu šodienas izmaksas",
    ed_show_graph: "24 stundu līkne",
    ed_animations: "Animācijas",
    ed_show_controls: "Vadība",
    ed_title_helper: "Tukšs: ierīces nosaukums",
    ed_illustration: "Ilustrēta galvene",
    ed_illustration_theme: "Galvenes tēma",
    ed_theme_auto: "Automātiski (seko tēmai)",
    ed_theme_day: "Diena",
    ed_theme_night: "Nakts",
  },
  el: {
    title: "Συσκευή",
    st_running: "Σε λειτουργία",
    st_done: "Ολοκληρώθηκε",
    st_standby: "Αναμονή",
    st_idle: "Απενεργοποιημένη",
    st_offline: "Εκτός σύνδεσης",
    running_for: "Σε λειτουργία εδώ και {d}",
    done_ago: "Ολοκληρώθηκε πριν από {d}",
    last_24h: "Τελευταίες 24 ώρες",
    on_from: "ενεργή ≥ {w}",
    now: "τώρα",
    t_cycle: "Αυτός ο κύκλος",
    t_last_cycle: "Τελευταίος κύκλος",
    t_today: "Σήμερα",
    t_cost: "Κόστος σήμερα",
    t_cycles: "Κύκλοι σήμερα",
    t_peak: "Αιχμή",
    cycles_one: "{n} κύκλος σήμερα",
    cycles_many: "{n} κύκλοι σήμερα",
    avg_cycle: "Μέσος κύκλος {d}",
    last_ago: "Τελευταίος κύκλος πριν από {d}",
    turn_on: "Ενεργοποίηση",
    turn_off: "Απενεργοποίηση",
    no_device: "Δεν βρέθηκε αισθητήρας ισχύος",
    k_auto: "Αυτόματα (από το όνομα)",
    k_airfryer: "Φριτέζα αέρος",
    k_kettle: "Βραστήρας",
    k_toaster: "Φρυγανιέρα",
    k_coffee: "Καφετιέρα",
    k_beer: "Βρύση μπύρας",
    k_washer: "Πλυντήριο ρούχων",
    k_dryer: "Στεγνωτήριο",
    k_dishwasher: "Πλυντήριο πιάτων",
    k_tools: "Φορτιστής εργαλείων",
    k_charger: "Φορτιστής τηλεφώνου",
    k_homelab: "Ικρίωμα homelab",
    k_laptop: "Φορητός υπολογιστής",
    k_monitor: "Οθόνες υπολογιστή",
    k_pc: "Επιτραπέζιος υπολογιστής",
    k_piano: "Ψηφιακό πιάνο",
    k_multiplug: "Πολύπριζο",
    k_plug: "Έξυπνη πρίζα",
    k_fridge: "Ψυγείο",
    k_freezer: "Καταψύκτης",
    st_cooling: "Ψύχει",
    st_resting: "Συμπιεστής σβηστός",
    st_brewing: "Παρασκευάζει",
    st_warm: "Διατηρεί ζεστό",
    al_door: "Πόρτα ανοιχτή",
    al_warm: "Πολύ ζεστό",
    al_cut: "Διακοπή ρεύματος",
    al_long: "Λειτουργεί χωρίς διακοπή",
    rest_for: "Συμπιεστής σβηστός εδώ και {d}",
    door_for: "Πόρτα ανοιχτή εδώ και {d}",
    long_for: "Λειτουργεί χωρίς διακοπή εδώ και {d}",
    warm_line: "Πάνω από {max}",
    cut_line: "Η πρίζα δεν δίνει ρεύμα",
    brewing_for: "Παρασκευάζει εδώ και {d}",
    warm_for: "Ζεστό εδώ και {d}",
    auto_off_in: "Σβήνει μόνη σε {d}",
    t_duty: "Χρόνος λειτουργίας",
    m_auto: "Αυτόματα (από το όνομα)",
    m_single: "Μονόπορτο",
    m_combi: "Δίπορτο",
    m_american: "Αμερικάνικο (side by side)",
    m_multi_door: "French door",
    m_chest: "Καταψύκτης μπαούλο",
    m_drawers: "Όρθιος με συρτάρια",
    m_espresso: "Μηχανή espresso",
    m_filter: "Καφετιέρα φίλτρου",
    k_radiator: "Καλοριφέρ",
    st_heating: "Θερμαίνει",
    st_holding: "Σε θερμοκρασία",
    heating_for: "Θερμαίνει για {d}",
    hold_for: "Σε θερμοκρασία για {d}",
    al_window: "Ανοιχτό παράθυρο",
    window_line: "Θερμαίνει με ανοιχτό παράθυρο",
    al_cold: "Πολύ κρύο",
    cold_line: "Κάτω από {min}",
    pw_comfort: "Άνεση",
    pw_eco: "Eco",
    pw_frost: "Αντιπαγετική προστασία",
    pw_off: "Απενεργοποιημένο",
    m_column: "Καλοριφέρ με φέτες",
    m_oil: "Καλοριφέρ λαδιού",
    m_towel: "Πετσετοκρεμάστρα",
    ed_climate: "Θερμοστάτης ή πιλοτικό καλώδιο",
    ed_climate_helper: "Προαιρετικό: το climate ή το select πιλοτικού καλωδίου ενός καλοριφέρ (όπως στο ha-heating-card): θερμοκρασία δωματίου, στόχος και λειτουργία",
    ed_window: "Αισθητήρας παραθύρου",
    ed_window_helper: "Προαιρετικό: ειδοποίηση όταν το καλοριφέρ θερμαίνει με ανοιχτό παράθυρο",
    ed_min_temp: "Ελάχιστη θερμοκρασία",
    ed_min_temp_helper: "Προαιρετικό: ειδοποίηση πολύ κρύου κάτω από αυτή, για καλοριφέρ",
    to_target: "→ {t}",
    ed_model: "Μοντέλο",
    ed_model_helper: "Η εμφάνιση ψυγείου, καταψύκτη ή καφετιέρας",
    ed_door: "Αισθητήρας πόρτας",
    ed_door_helper: "Προαιρετικό: ειδοποίηση όταν η πόρτα μένει ανοιχτή",
    ed_temperature: "Αισθητήρας θερμοκρασίας",
    ed_temperature_helper: "Προαιρετικό: μεγάλα, ειδοποίηση πάνω από το μέγιστο",
    ed_freezer_temperature: "Θερμοκρασία καταψύκτη",
    ed_freezer_temperature_helper: "Ο δεύτερος αισθητήρας δίπορτου, για τον καταψύκτη",
    ed_max_temp: "Μέγιστη θερμοκρασία",
    ed_max_temp_helper: "Πάνω από αυτή ειδοποίηση· κενό: 8 για ψυγείο, −12 για καταψύκτη",
    ed_entity: "Αισθητήρας ισχύος",
    ed_entity_helper: "Ο αισθητήρας ισχύος (W) της συσκευής ή ο διακόπτης της έξυπνης πρίζας της",
    ed_switch: "Διακόπτης",
    ed_switch_helper: "Για ενεργοποίηση και απενεργοποίηση της συσκευής· κενό: βρίσκεται στην πρίζα",
    ed_energy: "Αισθητήρας ενέργειας",
    ed_energy_helper: "Οι σημερινές kWh· κενό: υπολογίζονται από την ισχύ",
    ed_kind: "Συσκευή",
    ed_image: "Εικόνα",
    ed_image_helper: "Δική σας εικόνα της συσκευής (/local/…), στη θέση της εικονογράφησης",
    ed_threshold: "Σε λειτουργία πάνω από",
    ed_threshold_helper: "Watt: πάνω από αυτό, η συσκευή λειτουργεί",
    ed_standby: "Αναμονή πάνω από",
    ed_standby_helper: "Watt: μεταξύ αυτής της τιμής και του ορίου λειτουργίας, η συσκευή είναι σε αναμονή",
    ed_price: "Τιμή ανά kWh",
    ed_price_helper: "Ένας αριθμός ή ένας αισθητήρας με την τρέχουσα τιμή, για το σημερινό κόστος",
    ed_show_graph: "Καμπύλη 24 ωρών",
    ed_animations: "Κινούμενα σχέδια",
    ed_show_controls: "Χειρισμός",
    ed_title_helper: "Κενό: το όνομα της συσκευής",
    ed_illustration: "Εικονογραφημένη κεφαλίδα",
    ed_illustration_theme: "Θέμα κεφαλίδας",
    ed_theme_auto: "Αυτόματο (ακολουθεί το θέμα)",
    ed_theme_day: "Ημέρα",
    ed_theme_night: "Νύχτα",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const rcLang = (i18n, hass, config) => {
  // The full tag when the card has it (sr-Latn), else its base language (fr-FR → fr, pt-BR → pt), else English.
  const l = config?.language || hass?.locale?.language || hass?.language || "en";
  const base = l.split("-")[0];
  return i18n[l] ? l : i18n[base] ? base : "en";
};

const rcT = (i18n, lang, key, vars = {}) => {
  const s = i18n[lang]?.[key] ?? RC_I18N[lang]?.[key] ?? i18n.en[key] ?? RC_I18N.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
};

// Plural key for `n` items: `<base>_one`, `<base>_few` or `<base>_many` (the "other" form), from the CLDR category of
// `n` in `lang` (Serbian 1 / 2-4 / 5+, 21 / 22…). `_few` is optional: without it, `_many` is used. A `_one` text without
// {n} ("Turn this plug off?") only means exactly one.
const rcPluralKey = (i18n, lang, base, n) => {
  let cat;
  try {
    cat = new Intl.PluralRules(lang).select(n);
  } catch {
    cat = n === 1 ? "one" : "other";
  }
  const text = (k) => i18n[lang]?.[k] ?? RC_I18N[lang]?.[k];
  if (cat === "one" && (n === 1 || text(`${base}_one`)?.includes("{n}"))) return `${base}_one`;
  if (cat === "few" && text(`${base}_few`) != null) return `${base}_few`;
  return `${base}_many`;
};

const rcEsc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const rcEscRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A power in the card's language (*1,2 kW* in French), from `lang` (defaults to the browser's).
const rcWatts = (w, lang) => {
  const kw = w >= 1000;
  const digits = kw && w < 10000 ? 1 : 0;
  let text;
  try {
    text = new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(kw ? w / 1000 : w);
  } catch {
    text = (kw ? w / 1000 : w).toFixed(digits);
  }
  return `${text} ${kw ? "kW" : "W"}`;
};

// Strips a prefix, a suffix and the area name from an entity name, then capitalises it.
const rcCleanName = (name, areaName, prefix, suffix) => {
  let n = (name || "").replace(prefix, "").replace(suffix, "").trim();
  if (areaName && n.toLowerCase() !== areaName.toLowerCase()) {
    n = n.replace(new RegExp(`(^${rcEscRe(areaName)}\\s+|\\s+${rcEscRe(areaName)}$)`, "i"), "");
  }
  return n.charAt(0).toUpperCase() + n.slice(1);
};

const rcMoreInfo = (node, entityId) => {
  const ev = new Event("hass-more-info", { bubbles: true, composed: true });
  ev.detail = { entityId };
  node.dispatchEvent(ev);
};

const rcNavigate = (path) => {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
};

// Wires a card header to its `navigation_path`: click, and Enter on the header itself.
const rcBindNav = (head, path) => {
  head.addEventListener("click", () => rcNavigate(path));
  head.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && ev.target === head) rcNavigate(path);
  });
};

const rcUnavailable = (st) => ["unavailable", "unknown"].includes(st.state);

// HA's callService already shows a toast when the call fails, then rejects: the rejection is only swallowed here
// so that it does not end up as "Uncaught (in promise)".
const rcCall = (hass, domain, service, data) => Promise.resolve(hass.callService(domain, service, data)).catch(() => {});

// A click inside a dialog (more-info opened from the card, say) is not a click outside the card.
const rcInDialog = (ev) => ev.composedPath().some((n) => ["ha-more-info-dialog", "ha-dialog", "dialog"].includes(n.localName));

// `fn()`, computed again only when one of `deps` is no longer the same object (or value) as last time.
const rcMemo = (store, key, deps, fn) => {
  const hit = store[key];
  if (hit && hit.deps.length === deps.length && hit.deps.every((d, i) => d === deps[i])) return hit.value;
  const value = fn();
  store[key] = { deps, value };
  return value;
};

// ── Base card ────────────────────────────────────────────────────────────────
class RcCard extends HTMLElement {
  static getStubConfig(hass) {
    const areas = Object.keys(hass?.areas ?? {});
    return { area: areas[0] ?? "" };
  }

  // Subclasses set: static i18n, static defaults, static tag, static styles.
  static getConfigElement() {
    // biome-ignore lint/complexity/noThisInStatic: each subclass opens its own editor.
    return document.createElement(`${this.tag}-editor`);
  }

  setConfig(config) {
    if (this.constructor.needsArea && !config.area && !config.entities?.length && !config.include?.length) {
      throw new Error(rcT(this.constructor.i18n, rcLang(this.constructor.i18n, this._hass, config), "err_config"));
    }
    this._config = { ...this.constructor.defaults, ...config };
    // show_title: the header's title, hidden by the stylesheet
    this.toggleAttribute?.("hide-title", config.show_title === false);
    if (!this.shadowRoot) this._attach();
    this._sig = null;
    this._render();
  }

  // The shadow root, and no rewrite of the card between a press anywhere in it and the end of the click: Home
  // Assistant updates the card several times a second, and a rewrite under the pointer replaces the element pressed,
  // so that the click lands on the card itself and does nothing (the tiles already hold it, see _bindPress; this
  // covers the rest: header button, detail button, rows, popup). The pending update is rendered once released.
  _attach() {
    const root = this.attachShadow({ mode: "open" });
    this._onPressEnd = () => {
      window.removeEventListener("pointerup", this._onPressEnd, true);
      window.removeEventListener("pointercancel", this._onPressEnd, true);
      // After the click, which comes in the same task as the release.
      setTimeout(() => {
        if (this._pressing) this._released();
      }, 0);
    };
    root.addEventListener("pointerdown", (ev) => {
      this._byPointer = true;
      if (ev.button !== 0) return;
      this._pressing = true;
      window.addEventListener("pointerup", this._onPressEnd, true);
      window.addEventListener("pointercancel", this._onPressEnd, true);
    });
    // The focus is kept across rewrites for the keyboard only (no focus ring after a mouse click or a tap).
    root.addEventListener("keydown", () => {
      this._byPointer = false;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    window.removeEventListener("pointerup", this._onPressEnd, true);
    window.removeEventListener("pointercancel", this._onPressEnd, true);
    // A press cut short by the detach never gets its release: rendered now, and the next updates too.
    if (this._pressing) this._released();
  }

  set hass(hass) {
    this._hass = hass;
    // No re-render during a drag or a press: it would replace the tile under the finger.
    if (this._dragging || this._pressing) this._deferred = true;
    else this._render();
  }

  // The tiles actually shown (`only_on` / `only_alerts` applied), nothing when the card is hidden.
  getCardSize() {
    if (this.style.display === "none") return 0;
    const n = this._shown ?? this._items?.length ?? 0;
    if (!n || !this._config) return 1;
    // A row of large tiles (`layout: tiles`) is about one and a half rows of compact ones.
    const rows = Math.ceil(n / this._cols());
    return 1 + (this._tiles() ? Math.ceil(rows * 1.5) : rows);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  _lang() {
    return rcLang(this.constructor.i18n, this._hass, this._config);
  }

  _t(key, vars) {
    return rcT(this.constructor.i18n, this._lang(), key, vars);
  }

  // `<base>_one` / `_few` / `_many` for `n`, with {n} filled in.
  _tn(base, n, vars) {
    return this._t(rcPluralKey(this.constructor.i18n, this._lang(), base, n), { ...vars, n });
  }

  _areaOf(id) {
    const e = this._hass.entities?.[id];
    if (!e) return undefined;
    return e.area_id ?? this._hass.devices?.[e.device_id]?.area_id;
  }

  _areaName() {
    const c = this._config;
    return c.area ? (this._hass.areas?.[c.area]?.name ?? c.area) : "";
  }

  // The configured `entities`; otherwise the entities of the area accepted by `_candidate`, minus `exclude`,
  // plus `include` (entities from another room or without one).
  _entries() {
    const h = this._hass;
    const c = this._config;
    const list = (l) => (l || []).map((e) => (typeof e === "string" ? { entity: e } : e)).filter((e) => h.states[e.entity]);
    if (c.entities?.length) return list(c.entities);
    this._prepare();
    const found = c.area ? this._areaIds().filter((id) => h.states[id] && this._candidate(id)).map((entity) => ({ entity })) : [];
    const ids = new Set(found.map((e) => e.entity));
    return [...found, ...list(c.include).filter((e) => !ids.has(e.entity))];
  }

  // Visible entities of the area, minus `exclude`: the registries are scanned again only when they or the config
  // change (an entity outside the entity registry has no area anyway).
  _areaIds() {
    const h = this._hass;
    const c = this._config;
    return rcMemo((this._memo ||= {}), "area", [c, h.entities, h.devices], () => {
      const exclude = new Set(c.exclude || []);
      return Object.keys(h.entities || {}).filter((id) => !exclude.has(id) && !h.entities[id].hidden && this._areaOf(id) === c.area);
    });
  }

  // Hook run before the discovery, for what `_candidate` needs.
  _prepare() {}

  // Re-render only when something visible changed.
  _changed(parts) {
    const sig = JSON.stringify([this._config, this._lang(), parts]);
    if (sig === this._sig) return false;
    this._sig = sig;
    return true;
  }

  _hide(hidden) {
    this.style.display = hidden ? "none" : "";
    return hidden;
  }

  // Status of a set of opening and safety sensors: an alarm (`leaks` active ones, the most serious being `alert`: leak,
  // smoke, co or gas), then the open ones, then the unavailable ones (`unavail`: a sensor that cannot report is no
  // all-clear), then "All closed" when there are door or window sensors (`closable`), `idle` otherwise.
  _openingStatus(leaks, open, closable, idle = "all_quiet", unavail = 0, alert = "leak") {
    if (leaks) return this._t(alert);
    if (open) return this._tn("open", open);
    if (unavail) return this._tn("unavail", unavail);
    return this._t(closable ? "all_closed" : idle);
  }

  // Subclasses implement `_collect()` (the tiles) and `_draw(items)`.
  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    this._items = this._collect();
    this._draw(this._items);
  }

  _cols() {
    return Math.min(4, Math.max(1, Number(this._config.columns) || 2));
  }

  // `layout: tiles`: one large tile per entity, the size of Home Assistant's Tile card (easier to tap on a phone).
  _tiles() {
    return this._config?.layout === "tiles";
  }

  // Overviews: the grid of room tiles (`tile(room)`), its columns, the empty and idle states, then the open room's
  // details kept in step with the rooms shown.
  _roomGrid(grid, rooms, tile) {
    const cols = Number(this._config.columns);
    // A `columns` of 1 or 2 holds on a narrow card; 3 and more go down to two under 340 px, one under 260 px.
    grid.classList.toggle("fixed", cols >= 1 && cols <= 2);
    grid.style.setProperty("--cols", String(Math.min(6, Math.max(1, cols || 3))));
    // Every room idle with the "hide idle rooms" option: the header alone says it all.
    const idle = !rooms.length && this._total > 0;
    grid.hidden = idle;
    if (idle) grid.innerHTML = "";
    else grid.innerHTML = rooms.length ? rooms.map(tile).join("") : `<div class="empty">${rcEsc(this._t("no_rooms"))}</div>`;
    if (this._openArea && !rooms.some((x) => x.id === this._openArea)) this._toggle(null);
    else if (this._openArea) this._fillPanel();
  }

  _head({ icon, title, status, chips = "", allOff = false }) {
    const c = this._config;
    return `
      <div class="head${c.navigation_path ? " nav" : ""}"${c.navigation_path ? ' role="link" tabindex="0"' : ""}>
        <div class="badge"><ha-icon icon="${rcEsc(icon)}"></ha-icon></div>
        <div class="title">${rcEsc(title)}</div>
        ${chips}
        <button class="pill${allOff ? " action" : ""}" title="${rcEsc(allOff ? this._t("turn_all_off") : status)}"${allOff ? "" : " disabled"}>
          ${allOff ? '<ha-icon icon="mdi:power"></ha-icon>' : ""}<span class="pt">${rcEsc(status)}</span>
        </button>
      </div>`;
  }

  _tile(i, { cls = "", style = "", extra = "", state = i.state, title = `${i.name} — ${i.state}` }) {
    return `
      <button class="tile ${i.unavailable ? "na" : i.on ? "on" : "off"}${cls}" data-id="${rcEsc(i.id)}"
              ${style ? `style="${rcEsc(style)}"` : ""} title="${rcEsc(title)}">
        ${extra}
        <span class="ic"><ha-icon icon="${rcEsc(i.icon)}"></ha-icon></span>
        <span class="txt">
          <span class="name">${rcEsc(i.name)}</span>
          <span class="state">${state}</span>
        </span>
      </button>`;
  }

  _paint(level, head, tiles, extraClass = "") {
    // The tile or control with the keyboard focus keeps it through the redraw (a toggle, a step or a two-tap
    // confirmation from the keyboard): tiles by their data-id, controls by their data-k.
    const active = this._byPointer ? null : this.shadowRoot.activeElement;
    const focused = active?.dataset?.id;
    const focusKey = active?.dataset?.k;
    this.shadowRoot.innerHTML = `
      <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="lvl-${level}${extraClass}${this._tiles() ? " layout-tiles" : ""}">
        ${head}
        ${tiles ? `<div class="grid" style="--cols:${this._cols()}">${tiles}</div>` : ""}
        ${this._afterGrid()}
      </ha-card>`;
    const root = this.shadowRoot;
    root.querySelector(".pill.action")?.addEventListener("click", (ev) => this._allOff(ev));
    if (this._config.navigation_path) rcBindNav(root.querySelector(".head"), this._config.navigation_path);
    for (const el of root.querySelectorAll(".tile")) {
      this._bindTile(el, (this._items || []).find((i) => i.id === el.dataset.id));
      if (focused && el.dataset.id === focused) el.focus({ preventScroll: true });
    }
    this._bindAfter(root);
    if (focusKey) root.querySelector(`[data-k="${focusKey}"]`)?.focus({ preventScroll: true });
  }

  // What a card adds under its tiles (the Lights card's scenes), and its event wiring.
  _afterGrid() {
    return "";
  }

  _bindAfter() {}

  // The "turn everything off" button of the header (full card) or of the status (mini card).
  _allOff(ev) {
    ev.stopPropagation();
    const ids = (this._items || []).filter((i) => i.on).map((i) => i.id);
    if (!ids.length) return;
    // A host card may ask first (the Overview confirms before turning plugs off); otherwise off at once.
    if (this._confirmOff) this._confirmOff(ids);
    else rcCall(this._hass, "homeassistant", "turn_off", { entity_id: ids });
  }

  // Tap, hold for more-info, and an optional horizontal drag ({ move(x), end(x), step(delta), flush() }). From the
  // keyboard: Enter / Space tap, Shift+Enter or the context-menu key open the details, ←/→ step the drag by ∓/±10
  // (a held key at most every RC_REPEAT_MS), and releasing the arrow calls `flush`.
  _bindPress(el, { onTap, onHold, drag }) {
    let start = null;
    let mode = null; // null | "hold" | "drag"
    let timer = null;
    let lastStep = 0;
    el.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      start = { x: ev.clientX, y: ev.clientY };
      mode = null;
      this._pressing = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        // The card may have been detached mid-press (nothing else clears this timer): no hold on a dead node.
        if (mode || !this.isConnected) return;
        mode = "hold";
        // The press is settled (no tap): the details may open over the tile, so its pointerup may never come.
        this._released();
        onHold();
      }, RC_HOLD_MS);
    });
    el.addEventListener("pointermove", (ev) => {
      if (!start || mode === "hold") return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!mode && drag && Math.abs(dx) > RC_MOVE_PX && Math.abs(dx) > Math.abs(dy)) {
        mode = "drag";
        clearTimeout(timer);
        this._dragging = true;
        el.setPointerCapture(ev.pointerId);
        el.classList.add("dragging");
      } else if (!mode && (Math.abs(dx) > RC_MOVE_PX || Math.abs(dy) > RC_MOVE_PX)) {
        clearTimeout(timer); // scrolling, or dragging what cannot be dragged: not a tap
        start = null;
        this._released();
      }
      if (mode === "drag") drag.move(ev.clientX);
    });
    const end = (ev, cancelled) => {
      clearTimeout(timer);
      if (!start) return;
      const wasDrag = mode === "drag";
      if (wasDrag) {
        this._dragging = false;
        el.classList.remove("dragging");
        if (!cancelled) drag.end(ev.clientX);
        this._sig = null;
      } else if (!mode && !cancelled) {
        onTap();
      }
      start = null;
      mode = null;
      // After a drag, the next update redraws (the bar keeps the new level until the light reports it).
      this._released(!wasDrag);
    };
    // The mouse leaving the tile mid-press (no capture outside a drag) cancels it: neither a tap nor a hold.
    el.addEventListener("pointerleave", () => {
      if (!start || mode) return;
      clearTimeout(timer);
      start = null;
      this._released();
    });
    el.addEventListener("pointerup", (ev) => end(ev, false));
    el.addEventListener("pointercancel", (ev) => end(ev, true));
    el.addEventListener("contextmenu", (ev) => ev.preventDefault());
    el.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" && ev.shiftKey) || ev.key === "ContextMenu") {
        ev.preventDefault();
        if (!ev.repeat) onHold();
      } else if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (!ev.repeat) onTap();
      } else if (drag?.step && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
        ev.preventDefault();
        if (ev.repeat && ev.timeStamp - lastStep < RC_REPEAT_MS) return;
        lastStep = ev.timeStamp;
        drag.step(ev.key === "ArrowRight" ? 10 : -10);
      }
    });
    // The arrow released: the stepped level goes out now rather than after the pause.
    el.addEventListener("keyup", (ev) => {
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") drag?.flush?.();
    });
  }

  // End of a press: renders now what an update brought during it.
  _released(flush = true) {
    this._pressing = false;
    if (!this._deferred || this._dragging) return;
    this._deferred = false;
    if (flush) this._render();
  }

  // Default tile: tap toggles, hold opens the details.
  _bindTile(el, item) {
    this._bindPress(el, {
      onTap: () => !item?.unavailable && rcCall(this._hass, "homeassistant", "toggle", { entity_id: el.dataset.id }),
      onHold: () => rcMoreInfo(this, el.dataset.id),
    });
  }
}

// Lights and plugs: entities that are on or off, a status counting the ones on, an optional "turn everything off".
// Subclasses set `static headIcons` ([on, off]) and `static emptyKey`, and implement `_sigOf(item)` (what a tile
// shows) and `_tileOf(item)`; `_statusExtra(lit)` adds to the status.
class RcToggleCard extends RcCard {
  _statusExtra() {
    return "";
  }

  // What the header shows, on the full card and the mini card: level, icon, status (`ofTotal`: *2/5 on*) and whether
  // the "turn everything off" button is there. Null when nothing changed, or when the card hides itself.
  _summary(items, ofTotal = false) {
    const c = this._config;
    const lit = items.filter((i) => i.on);
    const level = lit.length ? "on" : "off";
    if (!this._changed([ofTotal, items.map((i) => this._sigOf(i))])) return null;
    if (this._hide(c.hide_when_off && level === "off")) return null;

    const shown = c.only_on ? items.filter((i) => i.on || i.unavailable) : items;
    this._shown = shown.length;
    const [onIcon, offIcon] = this.constructor.headIcons;
    const n = ofTotal ? `${lit.length}/${items.length}` : lit.length;
    const status = lit.length
      ? this._t(rcPluralKey(this.constructor.i18n, this._lang(), "on", lit.length), { n })
      : this._t(items.length ? "all_off" : this.constructor.emptyKey);
    return {
      level,
      shown,
      icon: lit.length ? onIcon : offIcon,
      status: status + this._statusExtra(lit),
      allOff: c.all_off_button && lit.length > 0,
    };
  }

  _draw(items) {
    const s = this._summary(items);
    if (!s) return;
    const head = this._head({ ...s, title: this._config.title || this._areaName() || this._t("title") });
    this._paint(s.level, head, s.shown.map((i) => this._tileOf(i)).join(""));
  }
}

// ── Mini cards ───────────────────────────────────────────────────────────────
// A mini card shows what its full card (`Base`) shows on two lines: the room badge, title and status, then one chip
// per entity. Its zoom button (top right, `zoom: false` removes it) switches it to the full card and back; a click
// anywhere else brings it back too.
// The subclass implements `_drawMini(items)`, which builds the chips and calls `_paintMini`.
// Zoomed in, everything is shown (`only_alerts` and `hide_when_clear` only apply to the compact view). With
// `alertsOnly`, the compact view always shows only what needs a look (no `only_alerts` option then): quiet entities
// show once zoomed in.
const rcMini = (Base, tag, styles, { alertsOnly = false } = {}) =>
  class extends Base {
    static tag = tag;
    static defaults = (({ only_alerts, ...rest }) => ({ ...rest, ...(alertsOnly ? {} : { only_alerts }), zoom: true }))(
      Base.defaults,
    );
    static styles = `${Base.styles}${RC_MINI_STYLES}${styles}`;

    constructor() {
      super();
      // A click anywhere else brings the card back to its compact view.
      this._onUnzoom = (ev) => {
        if (rcOutside(this, ev)) rcUnzoom(this);
      };
    }

    connectedCallback() {
      super.connectedCallback?.();
      this._unzoom ??= watchOutside(this, this._onUnzoom);
      this._unzoom.on();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this._unzoom?.off();
      // Left (another dashboard view, a conditional card hidden): back to the compact view.
      rcUnzoom(this);
    }

    getCardSize() {
      if (this._zoomed) return super.getCardSize();
      return this.style.display === "none" ? 0 : 1;
    }

    getGridOptions() {
      return { columns: 12, min_columns: 6, rows: "auto" };
    }

    _draw(items) {
      const config = this._config;
      // The base card's own filter does the work: off zoomed in, always on in an `alertsOnly` compact view.
      if (this._zoomed) this._config = { ...config, only_alerts: false, hide_when_clear: false };
      else if (alertsOnly) this._config = { ...config, only_alerts: true };
      try {
        if (this._zoomed) super._draw(items);
        else this._drawMini(items);
      } finally {
        this._config = config;
      }
      this._addZoom();
    }

    _paintMini({ level, icon, status, chips, cls = "", allOff = false }) {
      const c = this._config;
      const nav = c.navigation_path;
      // With `allOff` the status is the "turn everything off" button, like the full card's pill.
      const st = allOff
        ? `<button class="st action" title="${rcEsc(this._t("turn_all_off"))}"><ha-icon icon="mdi:power"></ha-icon><span class="pt">${rcEsc(status)}</span></button>`
        : `<span class="st" title="${rcEsc(status)}"><span class="pt">${rcEsc(status)}</span></span>`;
      this.shadowRoot.innerHTML = `
        <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
        <ha-card class="lvl-${level}${cls}">
          <div class="mini">
            <div class="badge" title="${rcEsc(status)}"><ha-icon icon="${rcEsc(icon)}"></ha-icon></div>
            <div class="body">
              <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
                <div class="title">${rcEsc(c.title || this._areaName() || this._t("title"))}</div>
                ${st}
              </div>
              <div class="rs">${chips}</div>
            </div>
          </div>
        </ha-card>`;
      const root = this.shadowRoot;
      if (nav) rcBindNav(root.querySelector(".head"), nav);
      root.querySelector(".st.action")?.addEventListener("click", (ev) => this._allOff(ev));
      for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
    }

    // Zoom button at the end of the header, top right in both views, added once per render.
    // Its click is the overviews' (rcZoomClick): stop the tap on the title (navigation_path), toggle, keep the
    // keyboard focus (Enter / Space: no click count) on the button that replaced this one.
    _addZoom() {
      const head = this._config.zoom && this.shadowRoot.querySelector(".head");
      if (!head || head.querySelector(".zoom")) return;
      const button = document.createElement("button");
      button.className = "zoom";
      button.title = this._t(this._zoomed ? "zoom_out" : "zoom_in");
      button.innerHTML = `<ha-icon icon="${rcZoomIcon(this)}"></ha-icon>`;
      button.addEventListener("click", (ev) => rcZoomClick(this, ev));
      head.appendChild(button);
    }
  };

// Lights and plugs mini cards: the status counts what is on out of the total (*2/5 on*), with the full card's
// "turn everything off" button; then a tinted pill (icon and name) for each entity on, its icon alone for the others.
// The subclass may implement `_chipExtra(item)`, shown after the name (a plug's power draw).
const rcToggleMini = (Base, tag, styles) =>
  class extends rcMini(Base, tag, `${RC_TOGGLE_MINI_STYLES}${styles}`) {
    _chipExtra() {
      return "";
    }

    _drawMini(items) {
      const s = this._summary(items, true);
      if (!s) return;
      const chips = s.shown
        .map((i) => {
          const cls = i.unavailable ? " na" : i.on ? " on pill" : " off";
          const style = i.on && i.color ? ` style="--t:${rcEsc(i.color)}"` : "";
          return `
          <button class="r${cls}" data-id="${rcEsc(i.id)}"${style} title="${rcEsc(i.name)} — ${rcEsc(i.state)}">
            <ha-icon icon="${rcEsc(i.icon)}"></ha-icon>${i.on ? `<span>${rcEsc(i.name)}</span>${this._chipExtra(i)}` : ""}
          </button>`;
        })
        .join("");
      this._paintMini({ level: s.level, icon: s.icon, status: s.status, chips, allOff: s.allOff });
    }
  };

// ── Overviews: the open room ─────────────────────────────────────────────────
// What both overviews share around their room tiles: a tap follows the room's `navigation_path` or unfolds its
// details in the `.panel` (filled by the subclass's `_fillPanel`, from `_roomGrid`), a click anywhere else folds it
// back and returns to the rooms needing a look. The subclass implements `_shownRooms()` (the tiles shown) and
// `_clearPanel()` (drops its detail cards); `_beforeFold()` (optional) runs first on an outside click.
const rcRoomsPanel = (Base) =>
  class extends Base {
    constructor() {
      super();
      this._onOutside = (ev) => {
        if (!rcOutside(this, ev)) return;
        this._beforeFold?.();
        if (this._openArea) this._toggle(null);
        rcUnzoom(this);
      };
    }

    // A new config rebuilds the room details, which take part of it (language, exclude, thresholds…).
    setConfig(config) {
      this._panelArea = null;
      super.setConfig(config);
    }

    connectedCallback() {
      super.connectedCallback?.();
      this._outside ??= watchOutside(this, this._onOutside);
      this._outside.on();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this._outside?.off();
      // Left (another dashboard view, a conditional card hidden): folded back as by a click elsewhere, so that the
      // card does not come back with a room open, zoomed or its popup open.
      this._beforeFold?.();
      if (this._openArea) this._toggle(null);
      rcUnzoom(this);
    }

    _tap(aid) {
      const x = this._shownRooms().find((r) => r.id === aid);
      if (x?.navigation_path) rcNavigate(x.navigation_path);
      else this._toggle(this._openArea === aid ? null : aid);
    }

    // Opens a room's details (the render fills the panel), or folds them back.
    _toggle(aid) {
      this._openArea = aid;
      this._panelArea = null;
      this._sig = null;
      this._render();
      if (aid) return;
      const panel = this.shadowRoot.querySelector(".panel");
      panel.hidden = true;
      panel.innerHTML = "";
      this._clearPanel();
    }
  };

// ── Editor ───────────────────────────────────────────────────────────────────
// Fields shared by the room cards' editors.
const rcAreaFields = (navigation) => [
  { name: "area", selector: { area: {} } },
  { name: "title", selector: { text: {} } },
  ...(navigation ? [{ name: "navigation_path", selector: { navigation: {} } }] : []),
  { name: "columns", selector: { number: { min: 1, max: 4, mode: "box" } } },
];
// Compact tiles (default) or large ones, the size of Home Assistant's Tile card.
const rcLayoutField = (i18n, lang) => ({
  name: "layout",
  selector: {
    select: {
      mode: "dropdown",
      options: ["compact", "tiles"].map((value) => ({ value, label: rcT(i18n, lang, `ed_layout_${value}`) })),
    },
  },
});
const rcBooleans = (...names) => names.map((name) => ({ name, selector: { boolean: {} } }));

// "Advanced" section, folded, with the options that are lists or maps (edited as YAML) and the language. Its fields
// sit at the root of the config (`flatten`).
const RC_ADVANCED_HELPERS = ["language", "entities", "thresholds", "rooms"];
const rcAdvanced = (i18n, lang, ...names) => [
  {
    name: "advanced",
    type: "expandable",
    flatten: true,
    schema: names.map((name) =>
      name === "language"
        ? {
            name,
            selector: {
              select: {
                mode: "dropdown",
                options: [
                  { value: "", label: rcT(i18n, lang, "ed_language_auto") },
                  { value: "en", label: "English" },
                  { value: "fr", label: "Français" },
                  { value: "de", label: "Deutsch" },
                  { value: "es", label: "Español" },
                  { value: "sr", label: "Српски" },
                  { value: "sr-Latn", label: "Srpski (latinica)" },
                  { value: "it", label: "Italiano" },
                  { value: "nl", label: "Nederlands" },
                  { value: "pt", label: "Português (Portugal)" },
                  { value: "pl", label: "Polski" },
                  { value: "ro", label: "Română" },
                  { value: "da", label: "Dansk" },
                  { value: "sv", label: "Svenska" },
                  { value: "bg", label: "Български" },
                  { value: "ru", label: "Русский" },
                  { value: "uk", label: "Українська" },
                  { value: "hu", label: "Magyar" },
                  { value: "sk", label: "Slovenčina" },
                  { value: "cs", label: "Čeština" },
                  { value: "sl", label: "Slovenščina" },
                  { value: "lv", label: "Latviešu" },
                  { value: "el", label: "Ελληνικά" },
                ],
              },
            },
          }
        : { name, selector: { object: {} } },
    ),
  },
];
// Entity picker limited to `ids`, left out when there is none.
const rcEntitiesField = (name, ids) =>
  ids.length ? [{ name, selector: { entity: { multiple: true, include_entities: ids } } }] : [];

// Include list: the entities of the card's domains (narrowed by `card.includeMatch` when set), anywhere in the home,
// that the card does not show yet (entities already included stay in the list).
const rcIncludeField = (card, hass, config) => {
  if (!hass) return [];
  const shown = new Set(
    rcProbe(card, hass, { ...config, entities: undefined, include: [] })
      ._entries()
      .map((e) => e.entity),
  );
  const ids = Object.keys(hass.states).filter(
    (id) =>
      card.includeDomains.includes(id.split(".")[0]) &&
      (!card.includeMatch || card.includeMatch(hass, id)) &&
      !shown.has(id) &&
      !hass.entities?.[id]?.hidden &&
      !hass.entities?.[id]?.entity_category,
  );
  for (const e of config?.include || []) {
    const id = typeof e === "string" ? e : e.entity;
    if (!ids.includes(id)) ids.push(id);
  }
  return rcEntitiesField("include", ids);
};

// A detached card of class `card`, with `config` over its defaults, to run its discovery from the editor.
const rcProbe = (card, hass, config) => {
  const probe = document.createElement(card.tag);
  probe._hass = hass;
  probe._config = { ...card.defaults, ...config };
  return probe;
};

// Exclude list limited to what the card finds in the chosen room, with the card's own rules
// (entities already excluded stay in the list).
const rcExcludeField = (card, hass, config) => {
  const ids =
    hass && config?.area
      ? rcProbe(card, hass, { ...config, entities: undefined, exclude: [] })
          ._entries()
          .map((e) => e.entity)
      : [];
  return rcEntitiesField("exclude", ids);
};

// `schema(lang, hass, config)` lists the fields; options left at the card's default are not written to the YAML
// (list defaults such as `exclude: []` are not shown in the form: an empty list is never written anyway).
// `autos` maps an option to its default worked out from the config (`(hass, config) => value`): shown in the form
// while unset, and kept out of the YAML when left at it.
// Entity lists the form edits with an entity picker (ids only): an item written `{ entity, name, icon }` in YAML shows as its entity,
// and gets its name and icon back when the form changes the list (ha-room-card#77).
const RC_ENTITY_LISTS = ["include"];
const rcListIds = (list) => (Array.isArray(list) ? list.map((e) => (typeof e === "string" ? e : e?.entity)).filter(Boolean) : list);
const rcListKeep = (ids, before) =>
  Array.isArray(ids) ? ids.map((id) => (Array.isArray(before) ? before.find((e) => typeof e === "object" && e?.entity === id) : undefined) ?? id) : ids;

const rcEditor = ({ card, helpers, schema, autos = {} }) => {
  const i18n = card.i18n;
  const defaults = { show_title: true, ...Object.fromEntries(Object.entries(card.defaults).filter(([, v]) => !Array.isArray(v))) };
  return class extends HTMLElement {
    setConfig(config) {
      this._config = config;
      this._update();
    }

    set hass(hass) {
      this._hass = hass;
      this._update();
    }

    _update() {
      if (!this._hass || !this._config) return;
      const lang = rcLang(i18n, this._hass, this._config);
      // Read by the label and helper callbacks, set once on the form: a language change must reach them too.
      this._lang = lang;
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (s) => rcT(i18n, this._lang, `ed_${s.name}`);
        this._form.computeHelper = (s) =>
          helpers.includes(s.name) ? rcT(i18n, this._lang, `ed_${s.name}_helper`) : undefined;
        this._form.addEventListener("value-changed", (ev) => {
          const config = { ...ev.detail.value };
          for (const k of RC_ENTITY_LISTS) if (k in config) config[k] = rcListKeep(config[k], this._config[k]);
          for (const k of Object.keys(config)) {
            const v = config[k];
            if (v === "" || v == null || (Array.isArray(v) && !v.length) || defaults[k] === v) delete config[k];
          }
          for (const [k, auto] of Object.entries(autos)) {
            const untouched = this._config[k] === undefined && config[k] === auto(this._hass, this._config);
            if (untouched || config[k] === auto(this._hass, config)) delete config[k];
          }
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      // A new data or schema object re-renders the whole form, and the schema runs the card's discovery:
      // both only change with the config, the language or the registries.
      const memo = (this._memo ||= {});
      const h = this._hass;
      this._form.data = rcMemo(memo, "data", [this._config, h.areas], () => {
        const data = { ...defaults, ...this._config };
        for (const k of RC_ENTITY_LISTS) if (k in data) data[k] = rcListIds(data[k]);
        for (const [k, auto] of Object.entries(autos)) data[k] ??= auto(h, this._config);
        return data;
      });
      this._form.schema = rcMemo(memo, "schema", [lang, this._config, h.entities, h.devices, h.areas], () =>
        schema(lang, h, this._config),
      );
    }
  };
};

const rcRegister = (card, editor, name, description) => {
  if (customElements.get(card.tag)) return;
  customElements.define(card.tag, card);
  customElements.define(`${card.tag}-editor`, editor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: card.tag,
    name,
    description,
    preview: true,
    documentationURL: "https://github.com/juju35/ha-power-device-card",
  });
};

if (!customElements.get("power-device-card")) {
  console.info(`%c HA-POWER-DEVICE-CARD %c v${RC_VERSION} `, "background:#f08c00;color:#fff;font-weight:700", "");
}

// ── Common styles ────────────────────────────────────────────────────────────
const RC_BASE_STYLES = `
  :host {
    --rc-ok: var(--success-color, #43a047);
    --rc-warn: var(--warning-color, #ffa600);
    --rc-alert: var(--error-color, #db4437);
    --rc-info: var(--info-color, #039be5);
    --rc-light: var(--state-light-active-color, #ffb300);
    --rc-plug: var(--state-switch-on-color, var(--primary-color, #03a9f4));
    --rc-idle: var(--secondary-text-color, #9e9e9e);
    --rc-na: var(--disabled-color, #9e9e9e);
    display: block;
    min-width: 0;
  }
  /* The card answers its own width (container queries). That containment drops its content from its natural width: in
     a wrapper sized by its content (inline-block, a grid's auto column, a flex row: layout-card, button-card…) it would
     shrink to its padding. The empty grid below (no height) gives the host a natural width of 344 px there, as a
     preferred width only: its column is minmax(0, …), so the card still shrinks to its column in a grid card, a
     horizontal stack or a 1fr column, even wrapped in a <div> (hui-card in layout-card). contain-intrinsic-inline-size
     or a min-width in px would be a minimum there, and the card would overflow. */
  :host::before { content: ""; display: grid; grid-template-columns: minmax(0, 344px); height: 0; }
  ha-card { padding: 12px; overflow: hidden; container-type: inline-size; }
  ha-card.lvl-alert { box-shadow: 0 0 0 1px color-mix(in srgb, var(--rc-alert) 45%, transparent), var(--ha-card-box-shadow, none); }

  .head { display: flex; align-items: center; gap: 10px; }
  .head.nav { cursor: pointer; }
  .head.nav:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
  .badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
           background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
  .badge ha-icon { --mdc-icon-size: 24px; }
  .lvl-alert .badge { animation: rc-pulse 1.6s ease-in-out infinite; }
  /* Narrow header: the title keeps a few letters (never 0 px), the status pill shrinks and ellipsises, the icon buttons
     (zoom, power) never shrink; under 200 px the pill is only its coloured dot, its text kept for screen readers. */
  .title { flex: 1 1 0; min-width: 5ch; font-size: 16px; font-weight: 500; color: var(--primary-text-color);
           white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
           /* show_title: false keeps the title's room (the pill and buttons stay in place) */
  :host([hide-title]) .head > .title { visibility: hidden; }
  .pill { all: unset; flex: 0 1 auto; min-width: 0; box-sizing: border-box; position: relative;
          display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 500;
          padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent);
          /* Coloured text is half the accent, half the text colour: 4.5:1 on its tint in light and dark themes, where
             the bare accent (amber above all) is not. */
          color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); }
  .pt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pill ha-icon { flex: none; }
  /* A card this narrow (6 columns of the Sections view on a phone): the title is at its few letters already, so the
     status pill goes to a line of its own under it, where its whole label fits, rather than end with "…". */
  @container (max-width: 260px) {
    .head { flex-wrap: wrap; row-gap: 4px; }
    .head::after { content: ""; order: 1; flex: 1 0 100%; }
    .head > .pill { order: 2; margin-left: 50px; max-width: calc(100% - 50px); }
  }
  @container (max-width: 200px) {
    /* Under 200 px the pill is only its dot again: back on the title's line. */
    .head { flex-wrap: nowrap; }
    .head::after { content: none; }
    .head > .pill { order: 0; margin-left: 0; max-width: none; }
    .head > .pill .pt, .st .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .head > .pill:not(.action), .st { flex: none; padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    .head > .pill:not(.action)::before, .st::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    .head > .pill.action { padding: 1px 4px; }
    /* A full card this narrow (6 columns of the Sections view on a phone): a smaller badge, no side chip in the header. */
    .head { gap: 6px; }
    .head > .badge { width: 32px; height: 32px; }
    .head > .badge ha-icon { --mdc-icon-size: 20px; }
    .head > .chip { display: none; }
  }
  .pill.action { cursor: pointer; }
  .pill.action:hover { background: color-mix(in srgb, var(--c) 24%, transparent); }
  .pill.action:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .pill ha-icon { --mdc-icon-size: 12px; margin-left: -2px; }

  .grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  .tile { all: unset; position: relative; overflow: hidden; box-sizing: border-box; cursor: pointer; min-width: 0;
          display: flex; align-items: center; gap: 8px; padding: 5px 8px 5px 5px; border-radius: 10px;
          touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
          background: color-mix(in srgb, var(--t) 9%, var(--secondary-background-color, transparent));
          border: 1px solid color-mix(in srgb, var(--t) 22%, transparent); transition: background .2s, border-color .2s; }
  .tile.off, .tile.na { background: var(--secondary-background-color, transparent); border-color: transparent; }
  .tile.na { --t: var(--rc-na); opacity: .7; }
  .tile:hover { background: color-mix(in srgb, var(--t) 15%, var(--secondary-background-color, transparent)); }
  .tile:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .ic, .txt { position: relative; }
  .ic { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
        color: var(--t); background: color-mix(in srgb, var(--t) 20%, transparent); }
  .ic ha-icon { --mdc-icon-size: 16px; }
  .txt { display: flex; flex-direction: column; min-width: 0; }
  .name { font-size: 13px; font-weight: 500; line-height: 1.2; color: var(--primary-text-color);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* A reading is never cut: on a narrow tile it goes on to a second line (the name, a label, keeps its ellipsis). */
  .state { font-size: 11px; line-height: 1.2; color: var(--secondary-text-color); overflow-wrap: break-word; }
  /* A card this narrow (a phone, 6 columns of the Sections view): one tile per row, whatever the columns option. */
  @container (max-width: 260px) { .grid { grid-template-columns: minmax(0, 1fr); } }
  /* layout: tiles — the size of Home Assistant's Tile card — 56 px high, a 40 px icon, the name over the state. */
  .layout-tiles .grid { gap: 8px; }
  .layout-tiles .tile { min-height: 56px; gap: 10px; padding: 8px 10px 8px 8px; border-radius: 12px; }
  .layout-tiles .ic { width: 40px; height: 40px; }
  .layout-tiles .ic ha-icon { --mdc-icon-size: 24px; }
  .layout-tiles .txt { gap: 2px; }
  .layout-tiles .name { font-size: 14px; line-height: 1.25; }
  .layout-tiles .state { font-size: 12px; line-height: 1.25; }

  @keyframes rc-blink { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
  @keyframes rc-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 45%, transparent) }
                        50% { box-shadow: 0 0 0 7px transparent } }
  @media (prefers-reduced-motion: reduce) { .tile, .lvl-alert .badge { animation: none; transition: none; } }
`;

// Mini cards: layout, chips and zoom button. A chip is plain (icon and text) until it needs a look: then a tinted pill.
// The zoom / detail button of the mini cards and the overviews.
const RC_ZOOM_STYLES = `
  /* 40 px to tap, laid out as the 24 px it looks (the negative margins). */
  .zoom { all: unset; flex: none; cursor: pointer; width: 40px; height: 40px; margin: -12px -12px -12px -8px; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom ha-icon { --mdc-icon-size: 16px; }
  .zoom:hover { background: color-mix(in srgb, var(--rc-idle) 16%, transparent); color: var(--primary-text-color); }
  .zoom:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
`;

// Lights and plugs mini cards: the "turn everything off" status (not filled: tinted on hover, like the zoom button)
// and the chips of the entities that are off (icon alone, grey).
const RC_TOGGLE_MINI_STYLES = `
  .st.action { all: unset; flex: 0 1 auto; min-width: 0; box-sizing: border-box; position: relative; cursor: pointer;
               display: inline-flex; align-items: center; gap: 3px; margin-left: auto; padding: 1px 6px; border-radius: 999px;
               font-size: 11px; font-weight: 500; color: var(--c); }
  .st.action ha-icon { --mdc-icon-size: 12px; flex: none; }
  .st.action:hover { background: color-mix(in srgb, var(--c) 14%, transparent); }
  .st.action:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  @container (max-width: 200px) {
    .st.action { width: auto; height: auto; padding: 1px 4px; }
    .st.action::before { content: none; }
  }
  .r.off, .r.na { padding: 0 3px; }
  .r.off ha-icon, .r.na ha-icon { margin-right: 0; }
  .r.off { --t: var(--rc-idle); }
  .r.na  { --t: var(--rc-na); opacity: .7; }
  .r small { flex: none; font-size: 10px; font-weight: 400; opacity: .8; margin-left: 4px; }
`;

// The overviews' room grid: the tiles, their icon, chips row, empty state and details panel. Each overview sets the
// tile's default tint and its own levels (`.room { --t: … }`, `.room.lvl-…`), the chips' spacing and the panel extras.
const RC_ROOM_GRID_STYLES = `
  .grid { display: grid; grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  @container (max-width: 340px) { .grid:not(.fixed) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  /* A card this narrow (6 columns of the Sections view on a phone): one room per row, whatever the columns option. Two
     left the name a letter or two ("B…") and pushed a chip out of its tile. */
  @container (max-width: 260px) { .grid.grid { grid-template-columns: minmax(0, 1fr); } }
  .grid[hidden] { display: none; }
  .room { all: unset; box-sizing: border-box; cursor: pointer; min-width: 0;
          display: grid; grid-template-columns: 26px minmax(0, 1fr); grid-template-areas: "ic name" "ic state" "chips chips";
          column-gap: 7px; align-items: center; align-content: start; padding: 6px 7px; border-radius: 10px;
          background: var(--secondary-background-color, transparent); border: 1px solid transparent;
          transition: background .2s, border-color .2s; }
  .room.lvl-warn, .room.lvl-alert {
    background: color-mix(in srgb, var(--t) 9%, var(--secondary-background-color, transparent));
    border-color: color-mix(in srgb, var(--t) 22%, transparent); }
  .room:hover { background: color-mix(in srgb, var(--t) 13%, var(--secondary-background-color, transparent)); }
  .room:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .room.sel { border-color: color-mix(in srgb, var(--primary-color) 55%, transparent); }
  .room .ic { grid-area: ic; align-self: start; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
              color: var(--t); background: color-mix(in srgb, var(--t) 16%, transparent); }
  .room.lvl-ok .ic { color: var(--primary-text-color); background: color-mix(in srgb, var(--rc-idle) 14%, transparent); }
  .room .ic ha-icon { --mdc-icon-size: 15px; }
  .room .name { grid-area: name; }
  /* The state (a sentence: "Water leak", "Too humid +1") wraps between its words only; a word too long for its line
     ends with "…" rather than being broken ("Pr|es|en|ce"). */
  .room .state { grid-area: state; overflow-wrap: normal; overflow: hidden; text-overflow: ellipsis; }
  .room:not(.lvl-ok) .state { color: color-mix(in srgb, var(--t) 50%, var(--primary-text-color, #212121)); }
  .chips { grid-area: chips; display: flex; flex-wrap: wrap; }
  .chips:empty { display: none; }
  .empty { grid-column: 1 / -1; padding: 12px; text-align: center; font-size: 13px; color: var(--secondary-text-color); }
  .panel { margin-top: 8px; border-radius: 12px; overflow: hidden; background: var(--secondary-background-color, transparent);
           --ha-card-background: transparent; --card-background-color: transparent;
           --ha-card-box-shadow: none; --ha-card-border-width: 0; }
  .panel[hidden] { display: none; }
  /* The unfolded room cards are custom elements with no display of their own: inline, the separator between them
     (border-top) would only paint on an empty first line box around their block <ha-card>. */
  .panel > * { display: block; }
  @media (prefers-reduced-motion: reduce) { .room { animation: none; transition: none; } }
`;

const RC_MINI_STYLES = `${RC_ZOOM_STYLES}
  /* The badge sits 12px from the card's top-left corner, like the other ha-* cards, beside the title and the readings. */
  ha-card:has(.mini) { padding: 12px; }
  .mini { display: flex; align-items: flex-start; gap: 10px; }
  /* The badge keeps the full card's size (40 px, icon 24 px): the body is at least as tall, a lone title line centred
     beside it. */
  .body { flex: 1; min-width: 0; min-height: 40px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .mini .head { gap: 8px; }
  .mini .title { line-height: 1.25; }
  .st { flex: 0 1 auto; min-width: 0; position: relative; display: inline-flex; align-items: center;
        margin-left: auto; font-size: 11px; font-weight: 500; color: var(--c); }
  .rs { display: flex; flex-wrap: wrap; gap: 2px 4px; margin-left: -4px; }
  .rs:empty { display: none; }
  /* A chip never runs past the card: a long name ends with an ellipsis. */
  .r { all: unset; cursor: pointer; display: inline-flex; align-items: baseline; gap: 1px; padding: 0 5px 0 4px;
       box-sizing: border-box; min-width: 0; max-width: 100%; overflow: hidden;
       border-radius: 999px; font-size: 12px; font-weight: 500; line-height: 24px; white-space: nowrap; --t: var(--rc-ok);
       color: var(--primary-text-color); }
  .r ha-icon { --mdc-icon-size: 13px; flex: none; color: var(--t); align-self: center; margin-right: 2px; }
  .r > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .r.pill { color: color-mix(in srgb, var(--t) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--t) 14%, transparent); }
  .r:hover { background: color-mix(in srgb, var(--t) 20%, var(--secondary-background-color, transparent)); }
  .r:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
`;
