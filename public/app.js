// Fetches public/cards.json + public/decks.json and renders cards onto a fake
// MTG front frame, and decks as themed collections of those cards.
const search = document.getElementById("search");
const count = document.getElementById("count");
const cardsView = document.getElementById("cards-view");
const decksView = document.getElementById("decks-view");
const tabCards = document.getElementById("tab-cards");
const tabDecks = document.getElementById("tab-decks");

let cards = [];
let decks = [];
let view = "cards";

const BRACKETS = { 1: "Exhibition", 2: "Core", 3: "Upgraded", 4: "Optimized", 5: "cEDH" };
const ROLE_ORDER = [
  "Commander", "Threat", "Payoff", "Interaction", "Board Wipe",
  "Draw", "Ramp", "Tutor", "Protection", "Synergy", "Utility", "Land",
];

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
function renderCards(list) {
  cardsView.innerHTML = "";
  if (!list.length) {
    cardsView.innerHTML = '<p class="empty">No cards match.</p>';
  } else {
    for (const card of list) cardsView.appendChild(renderCard(card));
  }
  count.textContent = `${list.length} card${list.length === 1 ? "" : "s"}`;
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
  const panel = document.createElement("section");
  panel.className = "deck";

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

  // Cards grouped by role
  const groups = new Map();
  for (const entry of deck.cards || []) {
    const role = entry.role || "Utility";
    if (!groups.has(role)) groups.set(role, []);
    groups.get(role).push(entry);
  }
  const orderedRoles = [...groups.keys()].sort(
    (a, b) => (ROLE_ORDER.indexOf(a) + 1 || 99) - (ROLE_ORDER.indexOf(b) + 1 || 99)
  );

  for (const role of orderedRoles) {
    const entries = groups.get(role);
    const sub = document.createElement("h3");
    sub.className = "deck-role";
    sub.textContent = `${role} (${entries.reduce((n, e) => n + (e.count || 1), 0)})`;
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

function renderDecks(list) {
  decksView.innerHTML = "";
  if (!list.length) {
    decksView.innerHTML = '<p class="empty">No decks match. Add one in <code>decks/</code>.</p>';
  } else {
    for (const deck of list) decksView.appendChild(renderDeck(deck));
  }
  count.textContent = `${list.length} deck${list.length === 1 ? "" : "s"}`;
}

// ---- Filtering + view switching ----
function applyFilter() {
  const q = search.value.trim().toLowerCase();
  if (view === "cards") {
    const list = !q
      ? cards
      : cards.filter((c) =>
          [c.name, c.type, c.text, c.flavorText]
            .filter(Boolean)
            .some((s) => s.toLowerCase().includes(q))
        );
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
  tabCards.classList.toggle("active", onCards);
  tabDecks.classList.toggle("active", !onCards);
  search.placeholder = onCards ? "Filter by name, type, text…" : "Filter decks by name, theme…";
  applyFilter();
}

search.addEventListener("input", applyFilter);
tabCards.addEventListener("click", () => switchView("cards"));
tabDecks.addEventListener("click", () => switchView("decks"));

Promise.all([
  fetch("cards.json").then((r) => r.json()),
  fetch("decks.json").then((r) => r.json()).catch(() => []),
])
  .then(([cardData, deckData]) => {
    cards = cardData;
    decks = deckData || [];
    tabDecks.textContent = `Decks${decks.length ? ` (${decks.length})` : ""}`;
    renderCards(cards);
  })
  .catch((err) => {
    cardsView.innerHTML = `<p class="empty">Could not load cards.json — run <code>pnpm dev</code>.<br>${err}</p>`;
  });
