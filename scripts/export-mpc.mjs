#!/usr/bin/env node
// Render every card front (and the shared back) to print-ready PNGs for
// makeplayingcards.com. Drives the installed Google Chrome via puppeteer-core,
// screenshotting the real card design (public/print.html) at MPC poker bleed
// size (822×1122, 750×1050 cut) and a 2× device scale factor for crisp text.
//
// Output: public/print/fronts/<slug>.png  +  public/print/back.png
// Usage:  node scripts/export-mpc.mjs            (all cards)
//         node scripts/export-mpc.mjs favor goblin   (just these slugs)
import { spawn } from "node:child_process";
import { mkdirSync, copyFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 5188;
const SCALE = Number(process.env.EXPORT_SCALE) || 2; // 2× → 1644×2244 PNGs
const BLEED_W = 822, BLEED_H = 1122;

// Locate Chrome (override with CHROME_PATH).
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(CHROME)) {
  console.error(`✗ Chrome not found at ${CHROME}. Set CHROME_PATH.`);
  process.exit(1);
}

const outDir = join(root, "public", "print");
const frontsDir = join(outDir, "fronts");
mkdirSync(frontsDir, { recursive: true });

// Which cards? CLI args = explicit slugs; otherwise every card in the manifest.
const cards = JSON.parse(readFileSync(join(root, "public", "cards.json"), "utf8"));
const argSlugs = process.argv.slice(2);
const slugs = argSlugs.length
  ? argSlugs
  : cards.map((c) => (c._file || "").replace(/\.json$/, "")).filter(Boolean);

// Serve public/ so the page can fetch cards.json and load art over http.
const server = spawn(process.execPath, [join(root, "scripts", "serve.mjs")], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${base}/cards.json`);
      if (r.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error("server did not start");
}

async function main() {
  await waitForServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: BLEED_W, height: BLEED_H, deviceScaleFactor: SCALE });

  let ok = 0;
  const failed = [];
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    try {
      await page.goto(`${base}/print.html?slug=${encodeURIComponent(slug)}`, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });
      const err = await page.evaluate(() => document.body.dataset.error || "");
      if (err) throw new Error(err);
      await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
      await page.screenshot({
        path: join(frontsDir, `${slug}.png`),
        clip: { x: 0, y: 0, width: BLEED_W, height: BLEED_H },
      });
      ok++;
    } catch (e) {
      failed.push(slug);
      console.error(`✗ ${slug}: ${e.message}`);
    }
    if ((i + 1) % 25 === 0 || i === slugs.length - 1) {
      console.log(`  …${i + 1}/${slugs.length} (${ok} ok${failed.length ? `, ${failed.length} failed` : ""})`);
    }
  }
  await browser.close();

  // Shared card back.
  const backSrc = join(root, "public", "card-back.png");
  if (existsSync(backSrc)) {
    copyFileSync(backSrc, join(outDir, "back.png"));
    console.log("  copied card-back.png → public/print/back.png");
  } else {
    console.warn("  ! public/card-back.png missing — no back.png written");
  }

  console.log(`\n✓ Exported ${ok}/${slugs.length} fronts to public/print/fronts/`);
  if (failed.length) console.log(`✗ Failed: ${failed.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => server.kill());
