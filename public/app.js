// Fetches public/cards.json and renders each card onto a fake MTG front frame.
const gallery = document.getElementById("gallery");
const search = document.getElementById("search");
const count = document.getElementById("count");

let cards = [];

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

// Token like "W", "2", "T", "W/U", "W/P" -> SVG filename "W", "2", "T", "WU", "WP".
function symbolFile(token) {
  return token.replace(/\//g, "").toUpperCase();
}

// An <img> of the real Scryfall symbol, falling back to literal "{token}" on 404.
function symbolImg(token) {
  const img = document.createElement("img");
  img.className = "ms";
  img.src = `/symbols/${symbolFile(token)}.svg`;
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
  const el = document.createElement("article");
  el.className = "card";

  const inner = document.createElement("div");
  inner.className = "card-inner " + frameClass(card);

  // Title bar: name + mana cost
  const title = document.createElement("div");
  title.className = "bar";
  const name = document.createElement("span");
  name.className = "card-name";
  name.textContent = card.name || "(unnamed)";
  title.append(name, manaCostEl(card.manaCost));

  // Art placeholder
  const art = document.createElement("div");
  art.className = "art";
  art.textContent = "ART";

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

function render(list) {
  gallery.innerHTML = "";
  if (!list.length) {
    gallery.innerHTML = '<p class="empty">No cards match.</p>';
  } else {
    for (const card of list) gallery.appendChild(renderCard(card));
  }
  count.textContent = `${list.length} card${list.length === 1 ? "" : "s"}`;
}

function applyFilter() {
  const q = search.value.trim().toLowerCase();
  if (!q) return render(cards);
  render(
    cards.filter((c) =>
      [c.name, c.type, c.text, c.flavorText]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(q))
    )
  );
}

search.addEventListener("input", applyFilter);

fetch("/cards.json")
  .then((r) => r.json())
  .then((data) => {
    cards = data;
    render(cards);
  })
  .catch((err) => {
    gallery.innerHTML = `<p class="empty">Could not load cards.json — run <code>pnpm dev</code>.<br>${err}</p>`;
  });
