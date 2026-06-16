#!/usr/bin/env node
// Validates every card in cards/*.json against card.schema.json.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(readFileSync(join(root, "card.schema.json"), "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const cardsDir = join(root, "cards");
const files = readdirSync(cardsDir).filter((f) => f.endsWith(".json"));

let failed = 0;
for (const file of files) {
  const card = JSON.parse(readFileSync(join(cardsDir, file), "utf8"));
  delete card.$schema; // editor hint, not part of the card data
  if (validate(card)) {
    console.log(`✓ ${file}`);
  } else {
    failed++;
    console.error(`✗ ${file}`);
    for (const err of validate.errors) {
      console.error(`    ${err.instancePath || "(root)"} ${err.message}`);
    }
  }
}

console.log(`\n${files.length - failed}/${files.length} cards valid`);
process.exit(failed ? 1 : 0);
