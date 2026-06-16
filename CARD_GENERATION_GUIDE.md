# MTG Card Generation Guide

A reference for agents generating fictional Magic: The Gathering cards in this repo. It defines (1) the **standardized JSON format** every generated card must use, and (2) the **rules-text wording conventions** to follow so cards read like real, modern MTG cards.

Sources: [MTGJSON Card data model](https://mtgjson.com/data-models/card/card-set/) (format), and the [MTGCardSmith Proper Wording Guide](https://forums.mtgcardsmith.com/index.php?p=/discussion/5659/proper-wording-guide) (templating).

> **Assembling decks?** Cards can be collected into **decks** — themed, color-identity-bound collections built under Commander/EDH rules. See [`DECK_BUILDING_GUIDE.md`](./DECK_BUILDING_GUIDE.md) for the deck format and assembly guidance.
>
> **Want to go feral?** This guide enforces the rules. To generate unhinged, rules-defying **acorn / Un-set** cards (half-mana, fourth-wall jokes, infinite power, pure nonsense), set `"border": "acorn"` and follow [`UNHINGED_GUIDE.md`](./UNHINGED_GUIDE.md) — those cards use a permissive schema and a holographic frame in the viewer.

---

## 1. Standardized JSON format

Each card is a single JSON object. We use a **subset of the MTGJSON `Card (Set)` model** plus a couple of generator-specific fields. Store one card per file in `cards/`, using kebab-case filenames derived from the card name (e.g. `cards/embercoil-drake.json`).

A machine-readable JSON Schema lives at [`card.schema.json`](./card.schema.json). Add `"$schema": "../card.schema.json"` to each card file for editor validation/autocomplete. A working example is in [`cards/embercoil-drake.json`](./cards/embercoil-drake.json). To validate every card against the schema:

```bash
pnpm install   # first time only
pnpm validate
```

`pnpm validate` runs [`scripts/validate.mjs`](./scripts/validate.mjs), which checks every `cards/*.json` file against the schema and exits non-zero on any failure. Run it after generating cards.

### Viewing cards

```bash
pnpm dev   # builds public/cards.json from cards/*.json, then serves the viewer
```

This starts a static viewer at `http://localhost:5173` (override with `PORT=…`) that renders each card on a fake MTG front frame — name, mana cost, type line, rules text, flavor, and P/T / loyalty / defense. The card art is intentionally a placeholder for now. The frame is tinted by the card's `colors` (mono-color, gold for multicolor, artifact/colorless/land variants). `public/cards.json` is build output and is git-ignored; regenerate it any time with `pnpm build`.

Mana, tap, and other `{…}` symbols (in both `manaCost` and `text`) render as real SVG symbols from [`public/symbols/`](./public/symbols/), downloaded from Scryfall — so write costs and abilities using standard tokens like `{2}`, `{W}`, `{T}`, `{W/U}`, `{X}`. Any token without a matching SVG falls back to its literal `{token}` text. See [`public/symbols/README.md`](./public/symbols/README.md) to add more.

### Generating card art

Card illustrations are AI-generated and stored in `public/art/`, referenced by each card's `art` field. Use the repo-local **`generate-card-art`** skill (`.claude/skills/generate-card-art/`) to generate art for one card, several, or every card missing it — it builds a prompt from the card's type/colors/flavor, generates the image, sets the `art` field, and rebuilds the manifest. Cards without art simply show a placeholder in the viewer.

### Field reference

| Field | Type | Required | Description |
|---|---|---|---|
| `border` | string | ⬦ | `"black"` (default, omit) for rules-legal cards, or `"acorn"` to make an Un-set card validated by the permissive schema. See [`UNHINGED_GUIDE.md`](./UNHINGED_GUIDE.md). |
| `name` | string | ✅ | Card name. Use `" // "` to delimit faces on split/MDFC/transform cards. |
| `manaCost` | string | ⬦ | Mana cost in curly-brace symbols, e.g. `"{2}{U}{U}"`. Omit for lands. Symbol order: `{X}` then generic, then `WUBRG`. |
| `manaValue` | number | ✅ | Total converted mana value (the old "CMC"). `{X}` counts as 0. |
| `colors` | string[] | ✅ | Colors from the mana cost / color indicator. Subset of `["W","U","B","R","G"]`. Empty `[]` for colorless. |
| `colorIdentity` | string[] | ✅ | All colors in cost, color indicator, **and** rules text symbols. Used for Commander legality. |
| `type` | string | ✅ | Full type line, e.g. `"Legendary Creature — Dragon Wizard"`. Use an em-dash (`—`) between types and subtypes. |
| `types` | string[] | ✅ | Card types only, e.g. `["Creature"]`, `["Instant"]`, `["Artifact","Creature"]`. |
| `supertypes` | string[] | ⬦ | e.g. `["Legendary"]`, `["Basic"]`, `["Snow"]`. `[]` if none. |
| `subtypes` | string[] | ⬦ | e.g. `["Dragon","Wizard"]`, `["Equipment"]`, `["Aura"]`. `[]` if none. |
| `text` | string | ⬦ | Rules text. Use real newlines (`\n`) between ability paragraphs. See §2. |
| `power` | string | ⬦ | Creature power. String because of `*` (e.g. `"*"`, `"1+*"`). Creatures/Vehicles only. |
| `toughness` | string | ⬦ | Creature toughness. Same rules as power. |
| `loyalty` | string | ⬦ | Starting loyalty for planeswalkers, e.g. `"4"`. |
| `defense` | string | ⬦ | Defense value for Battle cards. |
| `keywords` | string[] | ⬦ | Keyword abilities present, e.g. `["Flying","Trample"]`. Capitalized here even though lowercase in text. |
| `rarity` | string | ✅ | One of `"common"`, `"uncommon"`, `"rare"`, `"mythic"`. |
| `flavorText` | string | ⬦ | Italicized flavor text (no rules meaning). |
| `art` | string | ⬦ | Path to the card's illustration relative to `public/`, e.g. `"art/embercoil-drake.jpg"`. The viewer shows a placeholder when absent. Generate with the `generate-card-art` skill. |
| `artist` | string | ⬦ | Credited (fictional) illustrator. |
| `set` | string | ⬦ | Set code this card belongs to (uppercase), generator-specific. |
| `number` | string | ⬦ | Collector number within the set. |
| `uuid` | string | ⬦ | A v4/v5 UUID for the card. Optional but recommended for dedup. |

Legend: ✅ = always required, ⬦ = include when applicable.

### Generator conventions
- **Colorless** = empty `colors` array, not `["C"]`. (`{C}` may still appear in `manaCost`/identity for colorless mana symbols.)
- **Lands** have no `manaCost` and `manaValue: 0`.
- Keep `colors` and `colorIdentity` consistent with `manaCost` and `text`. If the text adds e.g. `{R}`, `R` must be in `colorIdentity`.
- `manaValue` must equal the sum of `manaCost` (with `{X}` = 0).
- Power/toughness/loyalty/defense are **strings**, even when numeric, to allow `*` and `X`.

### Example card

```json
{
  "name": "Embercoil Drake",
  "manaCost": "{2}{U}{R}",
  "manaValue": 4,
  "colors": ["U", "R"],
  "colorIdentity": ["U", "R"],
  "type": "Creature — Drake",
  "types": ["Creature"],
  "supertypes": [],
  "subtypes": ["Drake"],
  "text": "Flying\nWhenever Embercoil Drake deals combat damage to a player, draw a card, then discard a card.\n{1}{R}: Embercoil Drake gets +1/+0 until end of turn.",
  "power": "2",
  "toughness": "3",
  "keywords": ["Flying"],
  "rarity": "uncommon",
  "flavorText": "Its wingbeats sound like cracking embers.",
  "artist": "AI Generated",
  "set": "GEN",
  "number": "112"
}
```

---

## 2. Rules-text wording conventions

Match Wizards' official templating so generated cards read authentically.

### Numbers: numerals vs. words
**Numerals** for in-game quantities:
- Damage: `Shock deals 2 damage to any target.`
- Life: `You gain 3 life.`
- Mana value references: `Destroy target creature with mana value 3 or less.`
- Ability values: `Scry 2`, `Crew 4`, counters, `+2/+0`, `-X/-X`.

**Spelled-out words** for cards moved/manipulated:
- `Draw two cards.` (not "Draw 2 cards")
- `Look at the top five cards of your library.`
- `Discard three cards.`

### Modifier verbs: get / gain / have
- **gets** — temporary power/toughness change: `Target creature gets +3/+3 until end of turn.`
- **gains** — keyword for a limited duration: `Target creature gains trample until end of turn.`
- **have** — static keyword granted by a permanent: `Creatures you control have haste.`

### Damage and life need a source/recipient
- Damage always names a source: `Lightning Bolt deals 3 damage to any target.` (never bare "Deal 3 damage").
- Life gain always names who: `You gain 4 life.` (never bare "Gain 4 life").

### Keywords & capitalization
- Keyword abilities that lead a line are **capitalized** and have **no period** when listed alone: `Flying`, `Trample`, `Vigilance`.
- Multiple keywords on one line are comma-separated: `Flying, vigilance, haste` — only the first is capitalized.
- When a keyword is granted mid-sentence, it's **lowercase**: `Target creature gains lifelink until end of turn.`
- **Reminder text** is in italics inside parentheses: `Flying (This creature can't be blocked except by creatures with flying or reach.)`

### Ability words
Italicized, followed by an em-dash, then the ability:
- `*Landfall* — Whenever a land enters the battlefield under your control, ...`

Ability words (Landfall, Battalion, Constellation, etc.) are **flavor only** — they can't be referenced by other cards or granted.

### Activated abilities
Format: `[cost]: [effect].` Costs are comma-separated; the colon comes **after all costs**. Mana costs come first, then other costs like tapping.
- `{T}: Add {G}.`
- `{1}, {T}, Tap an untapped creature you control: Add two mana of any one color.`
- `{2}{B}, Sacrifice a creature: Draw a card.`

Mana symbol order within a cost: generic/colorless first, then **W, U, B, R, G**.

### Triggered abilities
Begin with **When**, **Whenever**, or **At**:
- `When ~ enters the battlefield, draw a card.`
- `Whenever ~ attacks, create a 1/1 white Soldier creature token.`
- `At the beginning of your upkeep, you lose 1 life.`

(Use the actual card name in real text; `~` / the full name, not "this card".)

### Targeting
- Use `target` precisely: `Destroy target creature.` vs. `Destroy each creature.`
- "any target" = a creature, player, planeswalker, or battle.
- Choose targets when the ability is put on the stack; effects without "target" don't target.

### Counters, tokens, types
- Counters: `Put a +1/+1 counter on target creature.`
- Tokens: `Create a 2/2 green Bear creature token.` (power/toughness, color words, then subtype, then "creature token").
- **Capitalize** card types, creature types, and subtypes in text: `Search your library for a Forest card.`, `each Vampire you control`.

### Punctuation & layout
- End complete sentences/abilities with a period.
- Separate distinct abilities with line breaks (one ability per paragraph). In JSON `text`, use `\n`.
- Use a real em-dash `—` in type lines and ability words, not a hyphen.

---

## 3. Quick checklist before saving a card
1. `manaValue` equals the sum of `manaCost` (X = 0).
2. `colors` and `colorIdentity` consistent with cost **and** any mana symbols in `text`.
3. `type` line matches `types` / `supertypes` / `subtypes`.
4. Creatures have `power` + `toughness`; planeswalkers have `loyalty`; battles have `defense`.
5. `keywords` array lists every keyword used in `text`.
6. Wording follows §2 (numerals vs words, get/gain/have, damage source, lowercase granted keywords).
7. `rarity` is one of common / uncommon / rare / mythic.
8. Power balanced for its mana value and rarity (sanity-check against real cards).
