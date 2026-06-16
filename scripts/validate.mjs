#!/usr/bin/env node
// Validates every card in cards/*.json against card.schema.json and every deck
// in decks/*.json against deck.schema.json, plus a few cross-reference checks
// (commander exists, color-identity legality, singleton rule).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ajv = new Ajv2020({ allErrors: true, strict: false });

const cardSchema = JSON.parse(readFileSync(join(root, "card.schema.json"), "utf8"));
const acornSchema = JSON.parse(readFileSync(join(root, "card.acorn.schema.json"), "utf8"));
const deckSchema = JSON.parse(readFileSync(join(root, "deck.schema.json"), "utf8"));
const validateBlack = ajv.compile(cardSchema);
const validateAcorn = ajv.compile(acornSchema);
const validateDeck = ajv.compile(deckSchema);

// Acorn (un-set) cards use the permissive schema; everything else is rules-legal.
const validateCard = (card) => {
  const v = card.border === "acorn" ? validateAcorn : validateBlack;
  const ok = v(card);
  validateCard.errors = v.errors;
  return ok;
};

let failed = 0;

// ---- Cards ----
const cardsDir = join(root, "cards");
const cardFiles = readdirSync(cardsDir).filter((f) => f.endsWith(".json"));
const cards = new Map(); // name -> card

for (const file of cardFiles) {
  const card = JSON.parse(readFileSync(join(cardsDir, file), "utf8"));
  delete card.$schema;
  if (validateCard(card)) {
    console.log(`✓ ${file}`);
    cards.set(card.name, card);
  } else {
    failed++;
    console.error(`✗ ${file}`);
    for (const err of validateCard.errors) {
      console.error(`    ${err.instancePath || "(root)"} ${err.message}`);
    }
  }
}
console.log(`\n${cardFiles.length - failed}/${cardFiles.length} cards valid`);

// ---- Decks ----
const decksDir = join(root, "decks");
const deckFiles = existsSync(decksDir) ? readdirSync(decksDir).filter((f) => f.endsWith(".json")) : [];
let deckFailed = 0;

const within = (id, deckId) => (id || []).every((c) => deckId.includes(c));

if (deckFiles.length) console.log("");
for (const file of deckFiles) {
  const deck = JSON.parse(readFileSync(join(decksDir, file), "utf8"));
  delete deck.$schema;
  const errors = [];

  if (!validateDeck(deck)) {
    for (const err of validateDeck.errors) {
      errors.push(`${err.instancePath || "(root)"} ${err.message}`);
    }
  }

  const deckId = deck.colorIdentity || [];
  // Acorn (Un-set) decks ignore color-identity legality and the singleton rule.
  const isAcorn = deck.border === "acorn";

  // Commander must exist as a generated card and be a subset of the deck identity.
  for (const name of deck.commander || []) {
    const cmd = cards.get(name);
    if (!cmd) {
      errors.push(`commander "${name}" has no matching card in cards/`);
    } else if (!isAcorn && !within(cmd.colorIdentity, deckId)) {
      errors.push(`commander "${name}" identity [${cmd.colorIdentity}] exceeds deck identity [${deckId}]`);
    }
  }

  // Listed cards: legality + singleton. Unresolved names are warnings (WIP decks).
  for (const entry of deck.cards || []) {
    const card = cards.get(entry.name);
    const count = entry.count ?? 1;
    if (!card) {
      console.warn(`    ⚠ ${file}: "${entry.name}" not generated yet (slot only)`);
      continue;
    }
    if (!isAcorn && !within(card.colorIdentity, deckId)) {
      errors.push(`"${entry.name}" identity [${card.colorIdentity}] is outside deck identity [${deckId}]`);
    }
    if (!isAcorn && deck.format === "commander" && count > 1 && !(card.supertypes || []).includes("Basic")) {
      errors.push(`"${entry.name}" appears ${count}× but singleton allows 1 (non-basic)`);
    }
  }

  if (errors.length) {
    deckFailed++;
    console.error(`✗ ${file}`);
    for (const e of errors) console.error(`    ${e}`);
  } else {
    console.log(`✓ ${file}`);
  }
}
if (deckFiles.length) console.log(`\n${deckFiles.length - deckFailed}/${deckFiles.length} decks valid`);

process.exit(failed + deckFailed ? 1 : 0);
