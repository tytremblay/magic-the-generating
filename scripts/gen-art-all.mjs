#!/usr/bin/env node
// Batch-generate card illustrations, save them to public/art/ as compact .webp,
// and let build-manifest auto-wire them into the viewer.
//
// Backends:
//   drawthings (default) — local FLUX via the Draw Things app's HTTP API
//                          (Settings → enable API Server). Free, runs on your
//                          GPU; uses whatever model is loaded in the app.
//   gemini               — Google "nano banana" (gemini-2.5-flash-image) paid
//                          API (~$0.039/image). Needs GEMINI_API_KEY in .env.
// Art is committed to the repo, so you never regenerate an existing one for free.
//
// Usage:
//   node scripts/gen-art-all.mjs                 # every card missing art (Draw Things)
//   node scripts/gen-art-all.mjs --commanders    # just the 7 deck commanders
//   node scripts/gen-art-all.mjs --deck=whateverville-chaos
//   node scripts/gen-art-all.mjs --only=big-murph,gnasher-mcchaos
//   node scripts/gen-art-all.mjs --commanders --dry        # print prompts, no calls
//   node scripts/gen-art-all.mjs --only=big-murph --force  # regenerate existing
//   node scripts/gen-art-all.mjs --backend=gemini          # use the paid API instead
//
// Flags: --backend=drawthings|gemini, --force, --dry, --limit=N, --png (skip webp),
//        --steps=N --width=N --height=N (Draw Things), --dt-url=URL,
//        --concurrency=N (gemini only; Draw Things is forced to 1).

import { readFileSync, readdirSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cardsDir = join(root, "cards");
const decksDir = join(root, "decks");
const artDir = join(root, "public", "art");

// ---- tiny .env loader (KEY=VALUE lines; no deps) ----
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// ---- args ----
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (k) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const DRY = has("--dry");
const FORCE = has("--force");
const TO_PNG = has("--png");
const LIMIT = Number(val("limit") || 0);

// Backend: "drawthings" (local FLUX via Draw Things, free) or "gemini" (paid API).
const BACKEND = (val("backend") || process.env.ART_BACKEND || "drawthings").toLowerCase();

// Draw Things settings (local, A1111-compatible txt2img on /sdapi/v1/txt2img).
// The active model is whatever is loaded in the Draw Things app.
const DT_URL = (val("dt-url") || process.env.DRAWTHINGS_URL || "http://127.0.0.1:7860").replace(/\/$/, "");
const STEPS = Number(val("steps") || 8);
const WIDTH = Number(val("width") || 1024);
const HEIGHT = Number(val("height") || 768); // 4:3 landscape — MTG card art-window orientation

// Local generation runs on one GPU; parallel requests just contend. Gemini fans out.
const CONCURRENCY = BACKEND === "drawthings" ? 1 : Math.max(1, Number(val("concurrency") || 3));

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (BACKEND === "gemini" && !apiKey && !DRY) {
  console.error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY). Put it in a local .env file or the environment.\nGet a key at https://aistudio.google.com/apikey, or run with --dry to preview prompts.");
  process.exit(2);
}
const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

const hasCwebp = (() => { try { execFileSync("cwebp", ["-version"], { stdio: "ignore" }); return true; } catch { return false; } })();
if (!TO_PNG && !hasCwebp && !DRY) console.warn("⚠ cwebp not found — saving PNGs instead of webp. (brew install webp)");

// Appended to EVERY prompt: a hard guard against the text artifacts FLUX otherwise bakes in.
// Circular dials/wheels/clock faces are the worst offenders, so call them out explicitly.
const NO_TEXT_GUARD = "No text, words, letters, or numbers anywhere; leave any clocks, dials, wheels, forms, signs, and banners completely blank and unmarked. No captions, watermark, signature, borders, or card frame — illustration only.";
// Draw Things negative prompt (belt-and-suspenders; distilled FLUX may largely ignore it).
const NEG_PROMPT = "text, words, letters, numbers, numerals, clock numerals, dial markings, runes, glyphs, inscriptions, typography, captions, signature, watermark, frame, border";

// Fallback style template — used ONLY for cards with no stored artPrompt (basics, standalone cards).
const STYLE = "Painterly, high-detail digital fantasy illustration in the style of Magic: The Gathering trading-card art. Cinematic lighting, rich color, dynamic composition. Tone: darkly comedic small-town Americana colliding with cosmic, political, and bureaucratic absurdity — Whateverville, a cursed civic carnival. Landscape orientation, 4:3 (about 1024x768).";

const PALETTE = {
  W: "radiant whites, gold and ivory, sunlit and orderly",
  U: "cool blues and cyans, water, sky, arcane glow",
  B: "dark and shadowy, decay, sickly purples and greens, ominous",
  R: "fiery oranges and reds, lava, sparks, chaotic energy",
  G: "lush, earthy, verdant, overgrown",
};

function paletteFor(colors = []) {
  if (!colors.length) return "muted metallic and stone neutrals";
  return colors.map((c) => PALETTE[c]).filter(Boolean).join("; ") || "muted neutral tones";
}

function subjectFor(card) {
  const t = card.types || [];
  const sub = (card.subtypes || []).join(" ");
  // Skip quoted/dialogue flavor — FLUX typesets quoted lines as text in the
  // image. Descriptive (unquoted) flavor renders as scene detail, so keep it.
  const ft = card.flavorText && !card.flavorText.includes('"') ? card.flavorText : "";
  const flavor = ft ? ` Mood: ${ft}` : "";
  const name = card.name.split(",")[0];
  if (t.includes("Creature"))
    return `Depict "${name}", ${sub ? "a " + sub : "a creature"}, in a dynamic, characterful pose as the focal subject.${flavor}`;
  if (t.includes("Land"))
    return `A sweeping establishing landscape of "${name}" — a location, no central character.${flavor}`;
  if (t.includes("Instant") || t.includes("Sorcery"))
    return `Depict the dramatic moment or magical effect of "${name}": ${card.text?.split("\n")[0] || name}.${flavor}`;
  if (t.includes("Artifact") && !t.includes("Creature"))
    return `A detailed hero shot of the object "${name}", ornate and characterful.${flavor}`;
  if (t.includes("Enchantment"))
    return `An evocative scene conveying the ongoing magic of "${name}".${flavor}`;
  return `Depict "${name}".${flavor}`;
}

function buildPrompt(card) {
  return `${subjectFor(card)} Color palette: ${paletteFor(card.colors)}. ${STYLE}`;
}

// ---- load cards + commander/deck index ----
const allCards = readdirSync(cardsDir)
  .filter((f) => f.endsWith(".json"))
  .map((file) => ({ slug: file.replace(/\.json$/, ""), card: JSON.parse(readFileSync(join(cardsDir, file), "utf8")) }));
const bySlug = new Map(allCards.map((c) => [c.slug, c]));
const byName = new Map(allCards.map((c) => [c.card.name, c]));

const decks = existsSync(decksDir)
  ? readdirSync(decksDir).filter((f) => f.endsWith(".json")).map((f) => ({ slug: f.replace(/\.json$/, ""), deck: JSON.parse(readFileSync(join(decksDir, f), "utf8")) }))
  : [];

// Map each card slug to its deck's artDirection (base prompt) for set cohesion.
const deckDirBySlug = new Map();
for (const { deck } of decks) {
  if (!deck.artDirection) continue;
  for (const e of deck.cards || []) {
    const c = byName.get(e.name);
    if (c) deckDirBySlug.set(c.slug, deck.artDirection);
  }
}

// Final prompt: deck base + stored per-card prompt + no-text guard. Falls back to
// the computed buildPrompt for cards without a stored artPrompt (basics, standalone).
function finalPromptFor(slug, card) {
  if (card.artPrompt) {
    const base = deckDirBySlug.get(slug);
    return `${base ? base + " " : ""}${card.artPrompt} ${NO_TEXT_GUARD}`;
  }
  return `${buildPrompt(card)} ${NO_TEXT_GUARD}`;
}

// ---- select targets ----
let targets;
if (val("only")) {
  targets = val("only").split(",").map((s) => bySlug.get(s.trim())).filter(Boolean);
} else if (has("--commanders")) {
  const names = new Set();
  for (const { deck } of decks) for (const e of deck.cards || []) if (e.role === "Commander") names.add(e.name);
  targets = [...names].map((n) => byName.get(n)).filter(Boolean);
} else if (val("deck")) {
  const d = decks.find((x) => x.slug === val("deck"));
  if (!d) { console.error(`No deck "${val("deck")}". Options: ${decks.map((x) => x.slug).join(", ")}`); process.exit(2); }
  const names = new Set((d.deck.cards || []).map((e) => e.name));
  targets = [...names].map((n) => byName.get(n)).filter(Boolean);
} else {
  targets = allCards;
}

const artExists = (slug) => ["webp", "png", "jpg"].some((e) => existsSync(join(artDir, `${slug}.${e}`)));
if (!FORCE) targets = targets.filter((t) => !artExists(t.slug));
if (LIMIT) targets = targets.slice(0, LIMIT);

if (!targets.length) { console.log("Nothing to generate (all selected cards already have art; use --force to redo)."); process.exit(0); }
mkdirSync(artDir, { recursive: true });
const engine = BACKEND === "drawthings" ? `Draw Things ${DT_URL} (${WIDTH}x${HEIGHT}, ${STEPS} steps)` : model;
console.log(`${DRY ? "[dry] " : ""}Generating ${targets.length} image(s) via ${engine}, concurrency ${CONCURRENCY}${TO_PNG || !hasCwebp ? " (png)" : " (webp)"}.\n`);

// ---- generation ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Get a PNG Buffer for a prompt from the selected backend (throws on failure).
async function fetchPng(prompt) {
  if (BACKEND === "drawthings") {
    const res = await fetch(`${DT_URL}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, negative_prompt: NEG_PROMPT, steps: STEPS, width: WIDTH, height: HEIGHT }),
      signal: AbortSignal.timeout(300_000), // local gen can be slow; 5 min ceiling
    });
    if (!res.ok) throw new Error(`Draw Things ${res.status} ${res.statusText}`);
    const b64 = (await res.json())?.images?.[0];
    if (!b64) throw new Error("no image in Draw Things response");
    return Buffer.from(b64, "base64");
  }
  // gemini
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
  });
  if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`);
  const parts = (await res.json())?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  if (!imgPart) throw new Error("no image in Gemini response");
  return Buffer.from((imgPart.inlineData || imgPart.inline_data).data, "base64");
}

function saveImage(slug, buf) {
  if (TO_PNG || !hasCwebp) { writeFileSync(join(artDir, `${slug}.png`), buf); return; }
  const tmp = join(artDir, `${slug}.tmp.png`);
  writeFileSync(tmp, buf);
  execFileSync("cwebp", ["-quiet", "-q", "82", tmp, "-o", join(artDir, `${slug}.webp`)]);
  unlinkSync(tmp);
}

async function genOne({ slug, card }) {
  const prompt = finalPromptFor(slug, card);
  if (DRY) { console.log(`— ${slug}\n  ${prompt}\n`); return { slug, ok: true }; }
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { saveImage(slug, await fetchPng(prompt)); return { slug, ok: true }; }
    catch (e) { lastErr = e.message; await sleep(1500 * attempt); }
  }
  return { slug, ok: false, err: lastErr };
}

// simple concurrency pool
const queue = [...targets];
const results = [];
let done = 0;
async function worker() {
  while (queue.length) {
    const t = queue.shift();
    const r = await genOne(t);
    results.push(r);
    done++;
    const tag = r.ok ? "✓" : "✗";
    console.log(`${tag} [${done}/${targets.length}] ${r.slug}${r.ok ? "" : "  — " + r.err}`);
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));

const failed = results.filter((r) => !r.ok);
console.log(`\nDone: ${results.length - failed.length} ok, ${failed.length} failed.`);
if (failed.length) { console.log("Retry failures with: --only=" + failed.map((f) => f.slug).join(",")); process.exit(1); }
if (!DRY) console.log("Next: run `npm run build` to wire the new art into the viewer.");
