# MTG Deck Building Guide

A reference for agents assembling **decks** out of the cards in this repo. A deck is a collection of cards united by a **loose theme** and a **color identity**. This guide covers (1) the **Commander / EDH construction rules** a deck must follow, (2) **guidance for assembling a good deck** (power brackets and a composition template), and (3) the **standardized JSON format** every deck in this repo uses.

For the individual-card format and rules-text conventions, see [`CARD_GENERATION_GUIDE.md`](./CARD_GENERATION_GUIDE.md). Decks are built from those cards.

Sources: [Official Commander rules](https://mtgcommander.net/index.php/rules/), [Commander Brackets (Wizards announcement)](https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026), [EDHREC – How to Play Commander](https://edhrec.com/articles/edh-rules-how-to-play-commander), and community deck-building templates ([BinderBrew](https://binderbrew.com/commander-deck-building-template), [EPIC EDH](https://epicedh.com/commander-deck-building-template/)).

---

## 1. Commander / EDH construction rules

Commander (also called EDH) is the default format for decks in this repo. The hard rules:

| Rule | Requirement |
|---|---|
| **Deck size** | Exactly **100 cards**, including the commander. |
| **Singleton** | No two cards may share the same English name — **except basic lands**, of which you may run any number. |
| **Commander** | One **legendary creature** (or a card that says "can be your commander"), kept in the **command zone** at the start of the game. |
| **Color identity** | Every card's color identity must be a **subset of the commander's color identity** (see §2). |
| **Starting life** | Each player begins at **40 life**. |
| **Commander damage** | A player who takes **21+ combat damage from a single commander** loses the game. |
| **Banned list** | Some cards are banned in Commander; the [official banned list](https://mtgcommander.net/index.php/banned-list/) is authoritative. Generated cards have no banned status, so this only matters if you mix in real cards. |

**Partners / backgrounds:** two commanders are allowed only when both say *Partner* (or one is a creature with *Choose a Background* and the other is a Background). The deck's color identity is then the **union** of both. This repo's format allows up to two commanders for that reason.

A non-Commander deck can use `"format": "freeform"` to opt out of the size and singleton constraints — useful for casual showcases.

---

## 2. Color identity (the rule that governs deck legality)

A card's **color identity** is every color that appears in:
- its mana cost,
- its color indicator, **and**
- any **mana symbols in its rules text** (e.g. an ability that costs `{R}` or makes you pay `{G}`).

This is exactly the `colorIdentity` field on each card (see the card guide). Hybrid mana counts as both colors. Reminder text and basic land types in the type line also count.

**The deck rule:** a card is legal in a deck only if its `colorIdentity` is a **subset** of the deck's `colorIdentity`, and the deck's identity must equal the **union of its commanders' identities**. A mono-blue commander (`["U"]`) cannot run a card whose identity is `["U","R"]`, even if you never pay the red. Colorless cards (identity `[]`) go in any deck.

`pnpm validate` enforces this for every generated card listed in a deck.

---

## 3. Power level: Commander Brackets

In 2025 Wizards introduced **Commander Brackets**, the official 1–5 scale for describing how powerful a deck is so playgroups can match up fairly. Set a deck's `bracket` honestly to its strongest plausible game.

| # | Bracket | Game Changers | Combos | Feel |
|---|---|---|---|---|
| **1** | **Exhibition** | 0 | None | Ultra-casual theme/flavor decks; not built to win fast. |
| **2** | **Core** | 0 | None | Precon power level — coherent but unoptimized. The default for a new themed deck. |
| **3** | **Upgraded** | up to 3 | Late-game only | Focused, synergy-driven; powerful staples without early lock-out. |
| **4** | **Optimized** | unlimited | unrestricted | High power — efficient cards, fast mana, tuned win conditions. |
| **5** | **cEDH** | unlimited | unrestricted | Competitive; built to win as early and reliably as possible. |

**Game Changers** are a Wizards-curated list of format-warping cards (fast mana, powerful tutors, oppressive staples). Brackets 1–3 also avoid **mass land denial** and **extra-turn chains**. The full list lives in the [Wizards announcement](https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026).

---

## 4. Composition template (how to fill 100 cards)

The commander defines the plan; the other 99 cards support it. A reliable starting split — **guidelines, not laws**; adjust to your curve and theme:

| Category | Count | Purpose |
|---|---|---|
| **Lands** | **~37** (35–38) | Mana base. Start near 38 and shave ~1 per 3–4 ramp pieces. |
| **Ramp** | **~10** | Mana rocks, dorks, and land-fetch to accelerate and fix colors. |
| **Card draw** | **~10–12** | Refill your hand so you don't run out of gas. |
| **Interaction** | **~8–12** | Spot removal and counters to answer threats. |
| **Board wipes** | **~2–4** | Mass removal to reset a losing board. |
| **Threats / payoffs** | **remainder (~25)** | The creatures and spells that actually win, plus on-theme synergy. |

A popular alternative is the **"7×9" template**: 36 lands + 1 commander, then **9 categories of 7 cards** (e.g. 7 ramp, 7 draw, 7 removal, and 6 theme buckets) = 63, totalling 100. Use whichever framing fits.

**Mana curve:** keep the average mana value low (most cards ≤ 4); a deck of expensive cards stalls. Make sure your colored-mana requirements are supported by your lands and ramp.

In this repo's deck format, the `plan` field records these **target counts** so a deck can document its intended full build even while only a few of its cards have actually been generated.

---

## 5. Assembling a deck — step by step

1. **Pick a commander and theme.** A legendary creature whose abilities suggest a game plan ("loot through spells", "go wide with tokens"). The theme is a one-sentence game plan. The commander's colors set the deck's `colorIdentity`.
2. **Choose a bracket.** Decide the power level you're targeting; it constrains which cards belong.
3. **Draft the composition plan.** Fill in `plan` with target counts from §4 (they should sum, with the commander, to `size`).
4. **Assign cards to roles.** As cards are generated (or chosen), list each in `cards` with the `role` it fills. Every card's identity must be legal (§2).
5. **Check the curve and balance.** Enough lands and ramp; not too top-heavy; removal and draw present.
6. **Validate.** Run `pnpm validate` — it checks the deck schema, that the commander exists, color-identity legality, and the singleton rule.
7. **View it.** Run `pnpm dev` and open the **Decks** tab to see the deck rendered with its cards.

---

## 6. Standardized JSON deck format

One deck per file in `decks/`, kebab-cased from the deck name (e.g. `decks/izzet-spellstorm.json`). Add `"$schema": "../deck.schema.json"` for editor validation. The machine-readable schema is [`deck.schema.json`](./deck.schema.json); a worked example is [`decks/izzet-spellstorm.json`](./decks/izzet-spellstorm.json).

A deck references cards **by name** — it does not copy card data. The build step resolves those names against `cards/*.json`. A deck may be a **work in progress**: list only the cards that exist, and use `plan` to document the rest. Names with no matching card render as "not generated yet" slots in the viewer (and are warnings, not errors, in validation).

### Field reference

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Deck name. |
| `format` | string | ✅ | `"commander"` (100-card singleton) or `"freeform"` (no size/singleton constraints). |
| `theme` | string | ✅ | The loose theme / game plan, in a sentence. |
| `description` | string | ⬦ | Longer strategy or flavor notes. |
| `colorIdentity` | string[] | ✅ | The deck's color identity (subset of `WUBRG`). Empty `[]` for a colorless deck. Equals the union of the commanders' identities. |
| `commander` | string[] | ⬦ | Card name(s) of the commander(s) — 1, or 2 for partner/background. **Required when `format` is `commander`.** |
| `bracket` | integer | ⬦ | Power bracket 1–5 (§3). **Required when `format` is `commander`.** |
| `cards` | object[] | ✅ | The cards assigned to the deck so far (see below). |
| `plan` | object | ⬦ | Target composition counts to fill the deck to `size` (§4). Documents intent; not enforced. |

Each entry in `cards`:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Card name, matched against `cards/*.json` exactly. |
| `count` | integer | ⬦ | Copies (default 1). Must be 1 in singleton formats except basic lands. |
| `role` | string | ⬦ | Functional role: `Commander`, `Land`, `Ramp`, `Draw`, `Interaction`, `Board Wipe`, `Threat`, `Payoff`, `Synergy`, `Protection`, `Tutor`, `Utility`. |
| `note` | string | ⬦ | Why the card is in the deck. |

The `plan` object has a `size` (default 100, including the commander) plus any number of named category → target-count entries.

### Example deck

```json
{
  "$schema": "../deck.schema.json",
  "name": "Sirella's Spellstorm",
  "format": "commander",
  "theme": "Izzet spellslinger — chain cheap instants and sorceries to grow a prowess crew, loot toward your best spells, and close with evasive, spell-fueled threats.",
  "colorIdentity": ["U", "R"],
  "commander": ["Sirella, the Stormcoil"],
  "bracket": 2,
  "cards": [
    { "name": "Sirella, the Stormcoil", "role": "Commander" },
    { "name": "Embercoil Drake", "role": "Threat" },
    { "name": "Coil in the Deep", "role": "Interaction" },
    { "name": "Emberlash", "role": "Interaction" }
  ],
  "plan": { "size": 100, "lands": 37, "ramp": 10, "draw": 12, "interaction": 12, "boardWipes": 3, "threats": 13, "payoff": 12 }
}
```

### Building & viewing

```bash
pnpm validate   # validates cards/*.json and decks/*.json (schema + legality)
pnpm dev        # builds public/cards.json + public/decks.json, then serves the viewer
```

`pnpm build` regenerates `public/decks.json`, which resolves each deck's card names to full card data so the **Decks** tab in the viewer can render them on real frames, grouped by role, with a slot placeholder for any card not generated yet. `public/decks.json` is build output (git-ignored).

---

## 7. Quick checklist before saving a deck
1. `format` set; if `commander`, `commander` and `bracket` are present.
2. `colorIdentity` equals the union of the commanders' color identities.
3. Every listed card's `colorIdentity` is a subset of the deck's (§2).
4. Commander is a **legendary creature** (or "can be your commander") that exists in `cards/`.
5. Singleton respected — only basic lands have `count` > 1.
6. `theme` is a clear one-sentence game plan; `bracket` honestly reflects power level (§3).
7. `plan` target counts are sensible and sum (with the commander) to `size` (§4).
8. `pnpm validate` passes.
