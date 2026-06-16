---
name: generate-card-art-direct
description: Generate AI illustration art for the MTG cards in this repo using the agent's native image generation tool and wire it into the viewer. Use when the user asks to generate, create, or regenerate art/illustrations/images for cards directly without using external scripts or API keys.
---

# Generate card art directly using Agent Tools

Generates a fantasy illustration for one or more cards in `cards/` using the agent's native `generate_image` tool, saves the resulting image to the project's `public/art/` folder, sets each card's `art` field to point to the image, and rebuilds the viewer manifest.

This approach skips the external generation scripts and does not require a Google API key.

## Inputs

Figure out the target set of cards from the request:
- A named card → that one card (match by `name` or filename in `cards/`).
- A list of cards → those.
- "all" / "missing" / no target given → every `cards/*.json` whose `art` field is absent. (Only regenerate cards that already have `art` if the user explicitly asks.)

## Procedure

For each target card:

1. **Read** the card JSON from `cards/<slug>.json` (the `slug` is the filename without `.json`).

2. **Build an art prompt** from the card's fields (see "Prompt construction" below).

3. **Generate** the image by calling the `generate_image` tool with:
   - `Prompt`: The constructed prompt.
   - `ImageName`: The slug with hyphens converted to underscores (e.g., `embercoil_drake`).

4. **Copy the image** from the conversation's artifact directory to the card art directory:
   - The image is saved in `<Artifact Directory Path>/<ImageName>.png` (where `<Artifact Directory Path>` is provided in the agent's system instructions/context, e.g. `/Users/tytremblay/.gemini/antigravity-cli/brain/<conversation-id>`).
   - Create the target directory if it doesn't exist:
     ```bash
     mkdir -p public/art
     ```
   - Copy the generated image:
     ```bash
     cp "/Users/tytremblay/.gemini/antigravity-cli/brain/<conversation-id>/<image_name>.png" "public/art/<slug>.png"
     ```

5. **Set the `art` field** in the card's JSON to `"art/<slug>.png"` (path relative to `public/`). Use a precise file edit to update the JSON without modifying other fields.

6. After all target cards are done, **rebuild and validate**:
   ```bash
   pnpm validate && pnpm build
   ```
   Then instruct the user to run `pnpm dev` (or restart it) to see the results.

7. **Verify** that each saved file actually exists (`ls public/art/`) before claiming success. If a card fails to generate, report it to the user.

## Prompt construction

Compose a prompt from the card so the art matches its flavor and mechanics. Always include these constraints verbatim:

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

1. Generate image using `generate_image` with prompt:
   > A blue-and-red drake (a sleek two-legged lesser dragon with large wings) in flight, its body crackling with arcs of blue lightning and glowing red embers trailing from its wings, as if its wingbeats scatter sparks. Dramatic stormy sky with electric clouds. Landscape orientation, roughly 4:3, around 1024x768. No text, no borders, no card frame, no watermark — just the illustration. Painterly, high-detail digital fantasy illustration in the style of trading-card game art. Cinematic lighting, rich color.
   - `ImageName` set to: `embercoil_drake`

2. Copy the generated artifact:
   ```bash
   cp "/Users/tytremblay/.gemini/antigravity-cli/brain/32de4f0c-abfa-434a-9ac9-fbca99d592dd/embercoil_drake.png" "public/art/embercoil-drake.png"
   ```

3. Update `cards/embercoil-drake.json` `art` field to `"art/embercoil-drake.png"`.
