// Fetches public/cards.json + public/decks.json and renders cards onto a fake
// MTG front frame, and decks as themed collections of those cards.
import { renderCard, fitText, fitContainer } from "./card.js";

const search = document.getElementById("search");
const count = document.getElementById("count");
const cardsView = document.getElementById("cards-view");
const decksView = document.getElementById("decks-view");
const tabCards = document.getElementById("tab-cards");
const tabTokens = document.getElementById("tab-tokens");
const tabDecks = document.getElementById("tab-decks");
const acornToggle = document.getElementById("acorn-toggle");
const groupBy = document.getElementById("group-by");
const cardFilters = document.getElementById("card-filters");

let cards = [];
let decks = [];
let view = "cards";
let selectedDeckName = null;

const BRACKETS = { 1: "Exhibition", 2: "Core", 3: "Upgraded", 4: "Optimized", 5: "cEDH" };
const ROLE_ORDER = [
  "Commander", "Threat", "Payoff", "Interaction", "Board Wipe",
  "Draw", "Ramp", "Tutor", "Protection", "Synergy", "Utility", "Land",
];

// Cluster ordering + labels for "group by" in the Cards view.
const TYPE_ORDER = ["Creature", "Planeswalker", "Instant", "Sorcery", "Artifact", "Enchantment", "Battle", "Land", "Other"];
const COLOR_ORDER = ["White", "Blue", "Black", "Red", "Green", "Multicolor", "Colorless", "Land"];
const COLOR_NAME = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };

// Tokens are their own slice of the set (see the Tokens tab). Kept out of the
// main Cards list so the two don't duplicate each other.
const isToken = (card) => card.rarity === "token";

function primaryType(card) {
  const types = card.types || [];
  for (const t of TYPE_ORDER) if (types.includes(t)) return t;
  return types[0] || "Other";
}

function colorBucket(card) {
  const colors = (card.colors || []).filter((c) => COLOR_NAME[c]);
  if ((card.types || []).includes("Land")) return "Land";
  if (colors.length === 0) return "Colorless";
  if (colors.length >= 2) return "Multicolor";
  return COLOR_NAME[colors[0]];
}

// ---- Card zoom overlay ----
// Re-renders the clicked card and scales it up to fill the viewport so its
// auto-fit text becomes readable. Click the backdrop (outside the card) or
// press Escape to close.
let overlayEl = null;

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement("div");
  overlayEl.className = "card-overlay";
  overlayEl.hidden = true;
  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) closeOverlay(); // only the backdrop closes
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlayEl.hidden) closeOverlay();
  });
  document.body.appendChild(overlayEl);
  return overlayEl;
}

function closeOverlay() {
  if (!overlayEl) return;
  overlayEl.hidden = true;
  overlayEl.innerHTML = "";
  document.body.classList.remove("overlay-open");
}

function openCardOverlay(card) {
  const ov = ensureOverlay();
  ov.innerHTML = "";
  const stage = document.createElement("div");
  stage.className = "card-zoom";
  const cardEl = renderCard(card);
  stage.appendChild(cardEl);
  ov.appendChild(stage);
  ov.hidden = false;
  document.body.classList.add("overlay-open");

  // Fit the text at the card's base size, then scale the whole card up to fill
  // the viewport (transform keeps the fitted layout and stays centred).
  requestAnimationFrame(() => {
    cardEl.querySelectorAll(".text-box").forEach(fitText);
    const baseW = cardEl.offsetWidth || 320;
    const baseH = cardEl.offsetHeight || (baseW * 88) / 63;
    const scale = Math.min((window.innerWidth * 0.94) / baseW, (window.innerHeight * 0.94) / baseH);
    stage.style.transform = `scale(${scale})`;
  });
}

// ---- Cards view ----
function gridOf(list) {
  const grid = document.createElement("div");
  grid.className = "gallery";
  for (const card of list) grid.appendChild(renderCard(card, { onZoom: openCardOverlay }));
  return grid;
}

// Group a list into ordered [key, cards] clusters by "type" or "color".
function clusterCards(list, axis) {
  const keyFn = axis === "type" ? primaryType : colorBucket;
  const order = axis === "type" ? TYPE_ORDER : COLOR_ORDER;
  const groups = new Map();
  for (const card of list) {
    const k = keyFn(card);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(card);
  }
  return [...groups.keys()]
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
    .map((k) => [k, groups.get(k)]);
}

function renderCards(list) {
  cardsView.innerHTML = "";
  const axis = groupBy.value;
  if (!list.length) {
    cardsView.innerHTML = '<p class="empty">No cards match.</p>';
  } else if (axis === "none") {
    cardsView.appendChild(gridOf(list));
  } else {
    for (const [key, group] of clusterCards(list, axis)) {
      const head = document.createElement("h2");
      head.className = "cluster-head";
      head.textContent = `${key} (${group.length})`;
      cardsView.append(head, gridOf(group));
    }
  }
  const noun = view === "tokens" ? "token" : "card";
  count.textContent = `${list.length} ${noun}${list.length === 1 ? "" : "s"}`;
  fitContainer(cardsView);
}

// ---- Decks view ----
// A circular color pip for a WUBRG(C) identity letter.
function pip(color) {
  const img = document.createElement("img");
  img.className = "ms pip";
  img.src = `symbols/${color}.svg`;
  img.alt = color;
  img.title = color;
  return img;
}

// A placeholder tile for a deck slot whose card hasn't been generated yet.
function slotTile(entry) {
  const el = document.createElement("article");
  el.className = "card slot";
  const inner = document.createElement("div");
  inner.className = "slot-inner";
  const n = document.createElement("div");
  n.className = "slot-name";
  n.textContent = entry.name;
  const tag = document.createElement("div");
  tag.className = "slot-tag";
  tag.textContent = "not generated yet";
  inner.append(n, tag);
  el.appendChild(inner);
  return el;
}

function renderDeck(deck) {
  const isAcorn = deck.border === "acorn";
  const panel = document.createElement("section");
  panel.className = "deck" + (isAcorn ? " deck-acorn" : "");

  // Header: name + bracket + color pips
  const head = document.createElement("div");
  head.className = "deck-head";
  const h = document.createElement("h2");
  h.className = "deck-name";
  h.textContent = deck.name;
  const pips = document.createElement("span");
  pips.className = "deck-pips";
  const id = deck.colorIdentity || [];
  for (const c of id.length ? id : ["C"]) pips.appendChild(pip(c));
  head.append(h, pips);
  if (deck.bracket) {
    const b = document.createElement("span");
    b.className = "deck-bracket";
    b.textContent = `Bracket ${deck.bracket} · ${BRACKETS[deck.bracket] || ""}`;
    head.appendChild(b);
  }

  // Theme + commander + tally
  const theme = document.createElement("p");
  theme.className = "deck-theme";
  theme.textContent = deck.theme || "";

  const meta = document.createElement("p");
  meta.className = "deck-meta";
  const size = deck.plan?.size ?? (deck.format === "commander" ? 100 : null);
  const tally = size ? `${deck._listed} / ${size} cards` : `${deck._listed} cards`;
  const cmd = (deck.commander || []).join(" + ");
  meta.textContent = [cmd && `Commander: ${cmd}`, tally, deck.format].filter(Boolean).join("  ·  ");

  panel.append(head, theme, meta);

  // The sell: longer flavor/strategy blurb.
  if (deck.description) {
    const desc = document.createElement("p");
    desc.className = "deck-description";
    desc.textContent = deck.description;
    panel.appendChild(desc);
  }

  // Group cards: by role for normal decks, by chaos level for acorn decks.
  const keyOf = isAcorn
    ? (entry) =>
        entry.role === "Commander"
          ? "Commander"
          : entry.role === "Land" || (entry.card?.types || []).includes("Land")
            ? "Lands"
            : `Chaos ${entry.card?.chaos ?? "?"}`
    : (entry) => entry.role || "Utility";
  const order = isAcorn
    ? ["Commander", "Chaos 1", "Chaos 2", "Chaos 3", "Chaos 4", "Chaos 5", "Lands"]
    : ROLE_ORDER;

  const groups = new Map();
  for (const entry of deck.cards || []) {
    const k = keyOf(entry);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(entry);
  }
  const orderedKeys = [...groups.keys()].sort(
    (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)
  );

  for (const key of orderedKeys) {
    const entries = groups.get(key);
    const sub = document.createElement("h3");
    sub.className = "deck-role";
    sub.textContent = `${key} (${entries.reduce((n, e) => n + (e.count || 1), 0)})`;
    const grid = document.createElement("div");
    grid.className = "gallery deck-grid";
    for (const entry of entries) {
      const tile = entry.card ? renderCard(entry.card, { onZoom: openCardOverlay }) : slotTile(entry);
      if ((entry.count || 1) > 1) {
        const badge = document.createElement("span");
        badge.className = "count-badge";
        badge.textContent = `×${entry.count}`;
        tile.appendChild(badge);
      }
      grid.appendChild(tile);
    }
    panel.append(sub, grid);
  }

  return panel;
}

// A compact entry in the left-hand deck list.
function deckListItem(deck) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "deck-list-item";
  item.dataset.name = deck.name;

  const nm = document.createElement("span");
  nm.className = "dli-name";
  nm.textContent = deck.name;

  const meta = document.createElement("span");
  meta.className = "dli-meta";
  const pips = document.createElement("span");
  pips.className = "dli-pips";
  const id = deck.colorIdentity || [];
  for (const c of id.length ? id : ["C"]) pips.appendChild(pip(c));
  const size = deck.plan?.size ?? (deck.format === "commander" ? 100 : null);
  const tally = document.createElement("span");
  tally.textContent = size ? `${deck._listed}/${size}` : `${deck._listed}`;
  meta.append(pips, tally);
  if (deck.border === "acorn") {
    const t = document.createElement("span");
    t.className = "dli-tag acorn";
    t.textContent = "ACORN";
    meta.appendChild(t);
  } else if (deck.bracket) {
    const t = document.createElement("span");
    t.className = "dli-tag";
    t.textContent = `B${deck.bracket}`;
    meta.appendChild(t);
  }

  item.append(nm, meta);
  return item;
}

// Show one deck in the detail pane and mark its list entry active.
function selectDeck(deck, listEl, detail) {
  selectedDeckName = deck.name;
  for (const el of listEl.querySelectorAll(".deck-list-item")) {
    el.classList.toggle("active", el.dataset.name === deck.name);
  }
  detail.innerHTML = "";
  detail.appendChild(renderDeck(deck));
  fitContainer(detail);
}

function renderDecks(list) {
  decksView.innerHTML = "";
  count.textContent = `${list.length} deck${list.length === 1 ? "" : "s"}`;
  if (!list.length) {
    decksView.innerHTML = '<p class="empty">No decks match. Add one in <code>decks/</code>.</p>';
    return;
  }
  if (!list.some((d) => d.name === selectedDeckName)) selectedDeckName = list[0].name;

  const layout = document.createElement("div");
  layout.className = "deck-layout";
  const listEl = document.createElement("aside");
  listEl.className = "deck-list";
  const detail = document.createElement("div");
  detail.className = "deck-detail";

  for (const deck of list) {
    const item = deckListItem(deck);
    item.addEventListener("click", () => selectDeck(deck, listEl, detail));
    listEl.appendChild(item);
  }
  layout.append(listEl, detail);
  decksView.appendChild(layout);

  selectDeck(list.find((d) => d.name === selectedDeckName), listEl, detail);
}

// ---- Filtering + view switching ----
function matchesQuery(c, q) {
  return [c.name, c.type, c.text, c.flavorText]
    .filter(Boolean)
    .some((s) => s.toLowerCase().includes(q));
}

function applyFilter() {
  const q = search.value.trim().toLowerCase();
  if (view === "cards" || view === "tokens") {
    // Tokens tab shows only tokens; Cards tab shows everything else.
    let list = cards.filter((c) => (view === "tokens" ? isToken(c) : !isToken(c)));
    if (view === "cards" && !acornToggle.checked) list = list.filter((c) => c.border !== "acorn");
    if (q) list = list.filter((c) => matchesQuery(c, q));
    renderCards(list);
  } else {
    const list = !q
      ? decks
      : decks.filter((d) =>
          [d.name, d.theme, d.description, (d.commander || []).join(" ")]
            .filter(Boolean)
            .some((s) => s.toLowerCase().includes(q))
        );
    renderDecks(list);
  }
}

function switchView(next) {
  view = next;
  const onDecks = next === "decks";
  // Cards and Tokens both render into the cards gallery; Decks has its own pane.
  cardsView.hidden = onDecks;
  decksView.hidden = !onDecks;
  cardFilters.hidden = onDecks;
  // The Acorn filter only makes sense for the main Cards list.
  acornToggle.closest(".chk").hidden = next !== "cards";
  tabCards.classList.toggle("active", next === "cards");
  tabTokens.classList.toggle("active", next === "tokens");
  tabDecks.classList.toggle("active", onDecks);
  search.placeholder = onDecks
    ? "Filter decks by name, theme…"
    : next === "tokens"
      ? "Filter tokens by name, type…"
      : "Filter by name, type, text…";
  applyFilter();
}

search.addEventListener("input", applyFilter);
acornToggle.addEventListener("change", applyFilter);
groupBy.addEventListener("change", applyFilter);
tabCards.addEventListener("click", () => switchView("cards"));
tabTokens.addEventListener("click", () => switchView("tokens"));
tabDecks.addEventListener("click", () => switchView("decks"));

// Card width can change when the grid reflows; refit the visible view's text.
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => fitContainer(view === "cards" ? cardsView : decksView), 150);
});

Promise.all([
  fetch("cards.json").then((r) => r.json()),
  fetch("decks.json").then((r) => r.json()).catch(() => []),
])
  .then(([cardData, deckData]) => {
    cards = cardData;
    decks = deckData || [];
    const tokenCount = cards.filter(isToken).length;
    tabTokens.textContent = `Tokens${tokenCount ? ` (${tokenCount})` : ""}`;
    tabDecks.textContent = `Decks${decks.length ? ` (${decks.length})` : ""}`;
    applyFilter();
  })
  .catch((err) => {
    cardsView.innerHTML = `<p class="empty">Could not load cards.json — run <code>pnpm dev</code>.<br>${err}</p>`;
  });
