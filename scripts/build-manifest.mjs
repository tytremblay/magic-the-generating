#!/usr/bin/env node
// Reads every cards/*.json and writes public/cards.json (one array the viewer fetches).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cardsDir = join(root, "cards");

const cards = readdirSync(cardsDir)
  .filter((f) => f.endsWith(".json"))
  .map((file) => {
    const card = JSON.parse(readFileSync(join(cardsDir, file), "utf8"));
    delete card.$schema;
    return { ...card, _file: file };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const out = join(root, "public", "cards.json");
writeFileSync(out, JSON.stringify(cards, null, 2) + "\n");
console.log(`Wrote ${cards.length} card(s) to public/cards.json`);
