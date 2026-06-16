#!/usr/bin/env node
// Reads every cards/*.json and decks/*.json and writes public/cards.json and
// public/decks.json (the two arrays the viewer fetches).
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cardsDir = join(root, "cards");
const decksDir = join(root, "decks");

// ---- Cards ----
const cards = readdirSync(cardsDir)
  .filter((f) => f.endsWith(".json"))
  .map((file) => {
    const card = JSON.parse(readFileSync(join(cardsDir, file), "utf8"));
    delete card.$schema;
    return { ...card, _file: file };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(join(root, "public", "cards.json"), JSON.stringify(cards, null, 2) + "\n");
console.log(`Wrote ${cards.length} card(s) to public/cards.json`);

// ---- Decks ----
// Resolve each deck entry's name against the generated cards so the viewer can
// render real frames. Entries with no matching card are kept as unresolved slots.
const byName = new Map(cards.map((c) => [c.name, c]));

const decks = !existsSync(decksDir)
  ? []
  : readdirSync(decksDir)
      .filter((f) => f.endsWith(".json"))
      .map((file) => {
        const deck = JSON.parse(readFileSync(join(decksDir, file), "utf8"));
        delete deck.$schema;
        const entries = (deck.cards || []).map((entry) => ({
          ...entry,
          count: entry.count ?? 1,
          card: byName.get(entry.name) || null, // null = referenced card not generated yet
        }));
        const listed = entries.reduce((n, e) => n + e.count, 0);
        return { ...deck, cards: entries, _file: file, _listed: listed };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(join(root, "public", "decks.json"), JSON.stringify(decks, null, 2) + "\n");
console.log(`Wrote ${decks.length} deck(s) to public/decks.json`);
