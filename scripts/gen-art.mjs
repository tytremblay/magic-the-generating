#!/usr/bin/env node
// Generate one card illustration with Google's "nano banana" (Gemini 2.5 Flash Image)
// and save it to public/art/<slug>.png.
//
// Usage:  node scripts/gen-art.mjs <slug> "<prompt>"
//   slug   : output filename stem, e.g. "embercoil-drake"
//   prompt : the full image prompt (quote it)
//
// Requires an API key in GEMINI_API_KEY (or GOOGLE_API_KEY). Get one from
// https://aistudio.google.com/apikey. Override the model with GEMINI_IMAGE_MODEL.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const [slug, prompt] = process.argv.slice(2);
if (!slug || !prompt) {
  console.error('Usage: node scripts/gen-art.mjs <slug> "<prompt>"');
  process.exit(2);
}

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY). Get one at https://aistudio.google.com/apikey");
  process.exit(2);
}

const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const res = await fetch(url, {
  method: "POST",
  headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`✗ ${slug}: API ${res.status} ${res.statusText}\n${body.slice(0, 800)}`);
  process.exit(1);
}

const data = await res.json();
const parts = data?.candidates?.[0]?.content?.parts ?? [];
// REST returns camelCase `inlineData`; accept snake_case too for safety.
const imgPart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
if (!imgPart) {
  const finish = data?.candidates?.[0]?.finishReason || "unknown";
  const text = parts.find((p) => p.text)?.text || "";
  console.error(`✗ ${slug}: no image in response (finishReason: ${finish}). ${text.slice(0, 300)}`);
  process.exit(1);
}

const b64 = (imgPart.inlineData || imgPart.inline_data).data;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artDir = join(root, "public", "art");
mkdirSync(artDir, { recursive: true });
const out = join(artDir, `${slug}.png`);
writeFileSync(out, Buffer.from(b64, "base64"));
console.log(`✓ ${slug} -> public/art/${slug}.png  (model: ${model})`);
