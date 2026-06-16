// Fetches public/cards.json + public/decks.json and renders cards onto a fake
// MTG front frame, and decks as themed collections of those cards.
const search = document.getElementById("search");
const count = document.getElementById("count");
const cardsView = document.getElementById("cards-view");
const decksView = document.getElementById("decks-view");
const tabCards = document.getElementById("tab-cards");
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

// Shrink a text box's font size until its content fits with no scrollbar — for
// print-faithful cards (makeplayingcards.com), where scrolling isn't an option.
function fitText(box) {
  const MAX = 13, MIN = 6;
  box.style.fontSize = MAX + "px";
  if (box.clientHeight === 0) return; // not laid out / hidden; refit when shown
  let size = MAX;
  while (size > MIN && box.scrollHeight > box.clientHeight) {
    size -= 0.5;
    box.style.fontSize = size + "px";
  }
}

function fitContainer(container) {
  requestAnimationFrame(() => container.querySelectorAll(".text-box").forEach(fitText));
}

function frameClass(card) {
  const types = card.types || [];
  const colors = card.colors || [];
  if (card.border === "acorn") return "frame-acorn";
  if (types.includes("Land")) return "frame-land";
  if (colors.length === 0) {
    return types.includes("Artifact") ? "frame-artifact" : "frame-colorless";
  }
  if (colors.length >= 2) return "frame-multi";
  return "frame-" + colors[0];
}

// Token like "W", "2", "T", "W/U", "W/P" -> SVG filename "W", "2", "T", "WU", "WP".
function symbolFile(token) {
  return token.replace(/\//g, "").toUpperCase();
}

// An <img> of the real Scryfall symbol, falling back to literal "{token}" on 404.
function symbolImg(token) {
  const img = document.createElement("img");
  img.className = "ms";
  img.src = `symbols/${symbolFile(token)}.svg`;
  img.alt = `{${token}}`;
  img.title = `{${token}}`;
  img.addEventListener("error", () => {
    const t = document.createTextNode(`{${token}}`);
    img.replaceWith(t);
  });
  return img;
}

function manaCostEl(cost) {
  const wrap = document.createElement("span");
  wrap.className = "mana-cost";
  if (!cost) return wrap;
  for (const m of cost.matchAll(/\{([^}]+)\}/g)) wrap.appendChild(symbolImg(m[1]));
  return wrap;
}

// Append a rules-text string to `parent`, replacing every {…} token with a symbol image.
function appendTextWithSymbols(parent, text) {
  let last = 0;
  for (const m of text.matchAll(/\{([^}]+)\}/g)) {
    if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
    parent.appendChild(symbolImg(m[1]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
}

function renderCard(card) {
  const isAcorn = card.border === "acorn";
  const el = document.createElement("article");
  el.className = "card" + (isAcorn ? " acorn" : "");

  const inner = document.createElement("div");
  inner.className = "card-inner " + frameClass(card);

  // Title bar: name + mana cost. Long un-card names shrink to fit.
  const title = document.createElement("div");
  title.className = "bar";
  const name = document.createElement("span");
  const len = (card.name || "").length;
  name.className = "card-name" + (len > 34 ? " tiny" : len > 22 ? " small" : "");
  name.textContent = card.name || "(unnamed)";
  if (card.subtitle) {
    const sub = document.createElement("span");
    sub.className = "card-subtitle";
    sub.textContent = card.subtitle;
    name.append(document.createElement("br"), sub);
  }
  title.append(name, manaCostEl(card.manaCost));

  // Art: real illustration if present, else a hatched placeholder
  const art = document.createElement("div");
  art.className = "art";
  if (card.art) {
    art.classList.add("has-art");
    art.style.backgroundImage = `url("${card.art}")`;
  } else {
    art.textContent = "ART";
  }

  // Type line
  const typeLine = document.createElement("div");
  typeLine.className = "bar type-line";
  typeLine.textContent = card.type || "";

  // Text box: rules text (one <p> per line) + flavor
  const textBox = document.createElement("div");
  textBox.className = "text-box";
  if (card.text) {
    for (const line of card.text.split("\n")) {
      const p = document.createElement("p");
      appendTextWithSymbols(p, line);
      textBox.appendChild(p);
    }
  }
  if (card.flavorText) {
    const fl = document.createElement("p");
    fl.className = "flavor";
    fl.textContent = card.flavorText;
    textBox.appendChild(fl);
  }

  inner.append(title, art, typeLine, textBox);

  // Acorn (un-set) security stamp
  if (isAcorn) {
    const stamp = document.createElement("div");
    stamp.className = "acorn-stamp";
    stamp.textContent = "ACORN";
    inner.appendChild(stamp);
  }

  // Bottom-right badge: P/T, loyalty, or defense
  if (card.power != null && card.toughness != null) {
    const pt = document.createElement("div");
    pt.className = "pt";
    pt.textContent = `${card.power}/${card.toughness}`;
    inner.appendChild(pt);
  } else if (card.loyalty != null) {
    const l = document.createElement("div");
    l.className = "loyalty";
    l.textContent = card.loyalty;
    inner.appendChild(l);
  } else if (card.defense != null) {
    const d = document.createElement("div");
    d.className = "loyalty";
    d.textContent = card.defense;
    inner.appendChild(d);
  }

  el.appendChild(inner);
  return el;
}

// ---- Cards view ----
function gridOf(list) {
  const grid = document.createElement("div");
  grid.className = "gallery";
  for (const card of list) grid.appendChild(renderCard(card));
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
  count.textContent = `${list.length} card${list.length === 1 ? "" : "s"}`;
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
      const tile = entry.card ? renderCard(entry.card) : slotTile(entry);
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
function applyFilter() {
  const q = search.value.trim().toLowerCase();
  if (view === "cards") {
    let list = cards;
    if (!acornToggle.checked) list = list.filter((c) => c.border !== "acorn");
    if (q) {
      list = list.filter((c) =>
        [c.name, c.type, c.text, c.flavorText]
          .filter(Boolean)
          .some((s) => s.toLowerCase().includes(q))
      );
    }
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
  const onCards = next === "cards";
  cardsView.hidden = !onCards;
  decksView.hidden = onCards;
  cardFilters.hidden = !onCards;
  tabCards.classList.toggle("active", onCards);
  tabDecks.classList.toggle("active", !onCards);
  search.placeholder = onCards ? "Filter by name, type, text…" : "Filter decks by name, theme…";
  applyFilter();
}

search.addEventListener("input", applyFilter);
acornToggle.addEventListener("change", applyFilter);
groupBy.addEventListener("change", applyFilter);
tabCards.addEventListener("click", () => switchView("cards"));
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
    tabDecks.textContent = `Decks${decks.length ? ` (${decks.length})` : ""}`;
    applyFilter();
  })
  .catch((err) => {
    cardsView.innerHTML = `<p class="empty">Could not load cards.json — run <code>pnpm dev</code>.<br>${err}</p>`;
  });
