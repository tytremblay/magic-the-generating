// Renders a single card front at print resolution for the MPC exporter.
// Usage: print.html?slug=<filename-without-.json>  (or ?slug=<exact card name>)
import { renderCard, fitText } from "./card.js";

const CUT_W = 750, CUT_H = 1050; // makeplayingcards poker cut size (px)

const slug = new URLSearchParams(location.search).get("slug");
const cut = document.querySelector(".cut");

const cards = await fetch("cards.json").then((r) => r.json());
const card =
  cards.find((c) => c._file === `${slug}.json`) || cards.find((c) => c.name === slug);

if (!card) {
  document.body.dataset.error = `no card for slug "${slug}"`;
} else {
  const el = renderCard(card); // no onZoom → static
  cut.appendChild(el);

  // Fit the rules text at the card's native size, then scale the whole card to
  // cover the cut box (aspect ratios are ~identical, so the clip is sub-pixel).
  el.querySelectorAll(".text-box").forEach(fitText);
  requestAnimationFrame(() => {
    const w = el.offsetWidth, h = el.offsetHeight;
    const scale = Math.max(CUT_W / w, CUT_H / h);
    const tx = (CUT_W - w * scale) / 2;
    const ty = (CUT_H - h * scale) / 2;
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    // Signal the exporter that layout + scaling are done (images awaited separately).
    requestAnimationFrame(() => { document.body.dataset.ready = "1"; });
  });
}
