---
name: generate-card-art
description: Generate AI illustration art for the MTG cards in this repo and wire it into the viewer. Use when the user asks to generate, create, or regenerate art/illustrations/images for one card, several cards, or all cards missing art (e.g. "generate art for Emberlash", "make art for every card", "fill in the missing card art").
---

# Generate card art

Generates a fantasy illustration for one or more cards in `cards/`, saves it to `public/art/`, sets each card's `art` field, and rebuilds the viewer manifest.

Art is generated with Google's **"nano banana"** model (`gemini-2.5-flash-image`) via [`scripts/gen-art.mjs`](../../../scripts/gen-art.mjs), which calls the Gemini API directly and saves a **PNG**. This requires an API key in the `GEMINI_API_KEY` environment variable (get one at https://aistudio.google.com/apikey). Override the model with `GEMINI_IMAGE_MODEL` if needed.

> Do **not** use the `visual-asset-generator` agent for this skill — it silently routes to other backends (Pollinations/Sana). Use `gen-art.mjs` so generation actually goes through nano banana.

## Inputs

Figure out the target set of cards from the request:
- A named card → that one card (match by `name` or filename in `cards/`).
- A list of cards → those.
- "all" / "missing" / no target given → every `cards/*.json` whose `art` field is absent. (Only regenerate cards that already have `art` if the user explicitly asks.)

## Procedure

For each target card:

1. **Read** the card JSON from `cards/<slug>.json` (the `slug` is the filename without `.json`).

2. **Build an art prompt** from the card's fields (see "Prompt construction" below).

3. **Generate** by launching the `voltagent-dev-exp:visual-asset-generator` agent with that prompt. Tell it to save to:
   `/Users/tytremblay/Documents/ty/magic-the-generating/public/art/<slug>.jpg`
   (creating `public/art/` if needed). When generating for many cards, launch the agents in parallel (multiple Agent calls in one message), one per card.

4. **Set the `art` field** in the card's JSON to `"art/<slug>.jpg"` (path relative to `public/`). Use Edit; don't disturb other fields.

5. After all cards are done, **rebuild and validate**:
   ```bash
   pnpm validate && pnpm build
   ```
   Then tell the user to run `pnpm dev` (or restart it) to see the results.

Verify each saved file actually exists (`ls public/art/`) before claiming success — the generation backend can fail silently. Report any cards that failed so they can be retried.

## Prompt construction

Compose a prompt from the card so the art matches it. Always include these constraints verbatim:

> Landscape orientation, roughly 4:3, around 1024x768. No text, no borders, no card frame, no watermark — just the illustration. Painterly, high-detail digital fantasy illustration in the style of trading-card game art. Cinematic lighting, rich color.

**Subject — derive from the card type:**
- **Creature** → depict the creature itself (use `subtypes` for what it is, `name`/`flavorText` for character), in a dynamic pose.
- **Planeswalker** → a heroic/villainous character portrait of the named walker, mid-action with their signature magic.
- **Instant / Sorcery** → depict the *moment or effect* the spell describes (read `text`/`flavorText`), not an object.
- **Enchantment** → an evocative scene conveying the ongoing magic.
- **Artifact** → the object itself, ornate and detailed, as a hero shot. (Artifact creatures → the creature/construct.)
- **Land** → a sweeping landscape/location matching the name (no creatures unless the name implies them).

**Palette — derive from `colors` (color identity), to match the frame tint:**
- `W` white: radiant, gold/ivory, sunlit, orderly.
- `U` blue: cool blues/cyans, water, sky, arcane.
- `B` black: dark, shadowy, decay, purples/greens, ominous.
- `R` red: fiery oranges/reds, lava, lightning, chaotic energy.
- `G` green: lush, earthy, verdant, natural.
- Multicolor → blend the relevant palettes.
- Colorless artifact → metallic/stone neutral tones. Land → natural tones for its terrain.

Weave the card's `flavorText` in as mood/atmosphere when present.

## Example (Embercoil Drake, {2}{U}{R} Creature — Drake)

> A blue-and-red drake (a sleek two-legged lesser dragon with large wings) in flight, its body crackling with arcs of blue lightning and glowing red embers trailing from its wings, as if its wingbeats scatter sparks. Dramatic stormy sky with electric clouds. [+ the verbatim style/constraint block above.]

Saved to `public/art/embercoil-drake.jpg`; card's `art` set to `"art/embercoil-drake.jpg"`.
