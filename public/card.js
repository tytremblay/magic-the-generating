// Shared card renderer: builds the fake MTG front frame for one card.
// Used by both the viewer (app.js) and the print exporter (print.js) so the
// on-screen card and the makeplayingcards.com upload are pixel-identical.

// Shrink a text box's font size until its content fits with no scrollbar — for
// print-faithful cards (makeplayingcards.com), where scrolling isn't an option.
export function fitText(box) {
  const MAX = 13, MIN = 6;
  box.style.fontSize = MAX + "px";
  if (box.clientHeight === 0) return; // not laid out / hidden; refit when shown
  let size = MAX;
  while (size > MIN && box.scrollHeight > box.clientHeight) {
    size -= 0.5;
    box.style.fontSize = size + "px";
  }
}

export function fitContainer(container) {
  requestAnimationFrame(() => container.querySelectorAll(".text-box").forEach(fitText));
}

// Frame tint is driven purely by color identity so every card — un-set/"acorn"
// included — reads as one cohesive Whateverville set rather than two products.
function frameClass(card) {
  const types = card.types || [];
  const colors = card.colors || [];
  if (types.includes("Land")) return "frame-land";
  if (colors.length === 0) {
    return types.includes("Artifact") ? "frame-artifact" : "frame-colorless";
  }
  if (colors.length >= 2) return "frame-multi";
  return "frame-" + colors[0];
}

// The Whateverville set emblem: a little town-hall silhouette, the same on every
// card and tinted by rarity (the strongest "same set" signal there is).
const RARITY_CLASS = {
  common: "r-common",
  uncommon: "r-uncommon",
  rare: "r-rare",
  mythic: "r-mythic",
  "mythic rare": "r-mythic",
  token: "r-token",
};
const RARITY_CODE = { common: "C", uncommon: "U", rare: "R", mythic: "M", "mythic rare": "M", token: "T" };

function setSymbol(rarity) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "set-symbol " + (RARITY_CLASS[rarity] || "r-special"));
  const p = document.createElementNS(NS, "path");
  // Pediment, architrave, four columns, base — reads instantly as "city hall".
  p.setAttribute(
    "d",
    "M12 2 L23 9 H1 Z M3 10 H21 V12 H3 Z M4.5 12 H6.5 V18.5 H4.5 Z " +
      "M9 12 H11 V18.5 H9 Z M13 12 H15 V18.5 H13 Z M17.5 12 H19.5 V18.5 H17.5 Z " +
      "M2 18.5 H22 V21.5 H2 Z"
  );
  svg.appendChild(p);
  return svg;
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

// Build the card element. Pass `onZoom` to make it clickable (viewer); omit it
// for a static render (print export, zoom overlay contents).
export function renderCard(card, { onZoom } = {}) {
  const el = document.createElement("article");
  el.className = "card";

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

  // Type line: type text on the left, the Whateverville set emblem on the right.
  const typeLine = document.createElement("div");
  typeLine.className = "bar type-line";
  const typeText = document.createElement("span");
  typeText.className = "type-text";
  typeText.textContent = card.type || "";
  typeLine.append(typeText, setSymbol(card.rarity));

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

  // Collector line: the same municipal-document footer on every card.
  const collector = document.createElement("div");
  collector.className = "collector";
  const left = document.createElement("span");
  left.textContent = [card.number, RARITY_CODE[card.rarity] || "•", "WHATEVERVILLE"]
    .filter(Boolean)
    .join(" · ");
  const right = document.createElement("span");
  right.textContent = card.artist || "";
  collector.append(left, right);
  inner.appendChild(collector);

  el.appendChild(inner);

  // Click a card to read it big in a centered overlay (viewer only).
  if (onZoom) {
    el.classList.add("clickable");
    el.addEventListener("click", () => onZoom(card));
  }
  return el;
}
