# Unhinged / Acorn Card Guide

This is the **anything-goes** annex to [`CARD_GENERATION_GUIDE.md`](./CARD_GENERATION_GUIDE.md). It's for generating cards in the spirit of Magic's *Un-sets* (Unglued, Unhinged, Unstable, Unfinity) — and beyond, into pure AI-fever-dream nonsense. The normal guide is a rules-enforcement machine. This one exists to **break those rules on purpose, for fun.**

The whole point is **variety**. Don't write the same joke twice. Treat the menus in §4 as dice to roll — sample different rows every time so no two un-cards feel alike.

---

## 1. What makes a card "acorn"

Real Magic prints un-cards with an **acorn** security stamp (formerly a silver border) to mark them as not-for-constructed-play. We do the same with one field:

```json
"border": "acorn"
```

That flag does two things:
- **Validation** routes the card to [`card.acorn.schema.json`](./card.acorn.schema.json) instead of the strict `card.schema.json`. Almost everything becomes optional and free-form (see §5).
- **The viewer** renders it with a holographic rainbow-foil frame and an **ACORN** stamp, and shrinks absurdly long names to fit.

Acorn cards live in `cards/` alongside normal cards and show up in the **Cards** tab. They are **not** Commander-legal — keep them out of decks in `decks/` (the deck validator assumes rules-legal cards).

> Convention: give acorn cards `"set": "UNGEN"` to distinguish them from the rules-legal `GEN` set, and feel free to use joke collector numbers (`"🥐001"`, `"#REF!"`, `"½"`, `"ribbit"`).

---

## 2. The chaos dial (1–5)

Set `"chaos"` to declare how far off the rails the card goes. Use it to pace yourself — not every card should be a 5.

| Level | Name | Feel |
|---|---|---|
| **1** | Cheeky | A normal card with one winking joke (a silly name, a flavor gag). Rules still basically work. |
| **2** | Silly | Recognizable Magic with a goofy twist — a comedic token, a pun-keyword. |
| **3** | Un-set | Full Unglued/Unstable energy: dice, physical actions, fourth-wall jokes, made-up mechanics that *almost* work. |
| **4** | Cursed | Mechanics that strain reality — half-mana, table-state references, effects that need a referee and a hug. |
| **5** | Nonsense | Does not work and does not care. Surreal, ungrammatical, impossible. The frog knows. |

---

## 3. You may break every convention

Everything in §2 of the card guide is now a **suggestion to violate**:

- **Mana:** any token. `{½}`, `{∞}`, `{🍕}`, `{Q}` (untap), `{E}` (energy), or a prose cost in the text like *"High-five a friend"* or *"Pay 3 life and an apology."* Unknown `{tokens}` simply render as literal text in the viewer, so invent freely.
- **Type lines:** pile on words. `Legendary Enchantment Artifact Land Creature — Aristocat Disaster Statistician`. Invent supertypes and subtypes (`Vibe`, `Snack`, `Bureaucrat`, `Deity`).
- **Power/Toughness:** strings of anything — `"∞"`, `"*"`, `"π"`, `"🥖"`, `"-3"`, `"1½"`, `"frog"`, `"yes"`.
- **Rules text:** break templating. Use second person, address the player, give stage directions, contradict yourself, trail off…
- **Grammar:** optional at chaos 5.
- **Keywords:** make them up — just add italic reminder text so the joke lands: `Doomscroll (At the beginning of your upkeep, look at the top card of your library and feel vaguely worse.)`

---

## 4. The four flavor toolkits (sampling menus)

Mix freely. For a given card, pick **one or two** flavors and **roll a few rows** from their menus — don't use the same row twice across cards.

### A. Un-set mechanics
The genuine Unglued/Unstable/Unfinity toolkit.

| Knob | Sample rows |
|---|---|
| Dice | roll a d6 / d20 / "the highest die you own"; reroll if you don't like it |
| Physical action | high-five, fist-bump, balance the card on your head, hum a tune, stand up, hold your breath, draw the card's art from memory |
| Contraptions / stickers | "open a Sticker Sheet and stick one on a permanent"; "assemble a Contraption" |
| Half-things | `{½}` mana, half a counter, "split the difference and argue about it" |
| Timing gags | "until your next snack", "for as long as you keep talking", "only on Tuesdays" |

### B. Fourth-wall / table-state
The card reaches out of the game into the room.

| Knob | Sample rows |
|---|---|
| Player superlatives | the loudest / tallest / most recently snacking / worst-at-bluffing player |
| Real-world state | the current time, the room temperature, your phone's battery %, the weather outside |
| Meta-objects | the card's own art, its flavor text, the number of commas in its rules text, another card's name |
| Table actions | "the first player to say 'frog' gains control of it"; "if nobody laughs, sacrifice this" |
| The reader | "you, holding this card, right now" |

### C. Impossible math
Numbers that refuse to behave.

| Knob | Sample rows |
|---|---|
| Infinities | ∞ power; "draw cards until you're uncomfortable"; "this happens an infinite number of times, quickly" |
| Fractions / irrationals | `{½}` cost; π/1 counters; "deal 2.5 damage, rounded emotionally" |
| Negatives | -3/-3 base stats; "gain -1 life"; "untap a negative number of lands" |
| Undefined ops | divide by zero; "as both players, simultaneously"; "the value is left as an exercise for the reader" |
| Runaway loops | "repeat this step. there is no end to this step." |

### D. Pure nonsense
AI dreaming about Magic at 3 a.m.

| Knob | Sample rows |
|---|---|
| Surreal effects | "scry your soul, then draw a conclusion"; "cast your feelings"; "exile target Tuesday" |
| Broken grammar | "frog do be flying"; "the creature is become tall" |
| Absurd names | full-sentence names, honorific stacks, names that are just punctuation |
| Self-aware text | "this card is legal in every format in which it is not banned (none)"; "ignore the previous ability, it was lying" |
| Ominous flavor | one-line dread that explains nothing |

---

## 5. The acorn JSON format

Same file layout as normal cards (one per file in `cards/`, kebab-case name). Add `"$schema": "../card.acorn.schema.json"`. The **only** required fields are `name` and `border`.

| Field | Notes |
|---|---|
| `border` | **Required.** Must be `"acorn"`. |
| `name` | **Required.** Anything, any length. |
| `subtitle` | Optional second line under the name (the viewer renders it). |
| `manaCost` | Any string. Omit it and put a prose cost in `text` if you prefer. |
| `manaValue` | Number, or a joke string (`"yes"`, `"∞"`). |
| `type` / `types` / `supertypes` / `subtypes` | Free-form. `type` is the displayed line; the arrays are optional. |
| `power` / `toughness` / `loyalty` / `defense` | Any string or number. |
| `keywords` | Real or invented. |
| `rarity` | Any string. |
| `text`, `flavorText`, `art`, `artist`, `set`, `number` | As usual, but unconstrained. |
| `chaos` | Integer 1–5 (§2). |
| `extras` | Free-form object for novel mechanics you want to record (`physicalAction`, `dice`, `fourthWall`, `stickers`, `halfMana`, …). Documentation only — the viewer ignores it. |

Because the schema is `additionalProperties: true`, you can also just invent new top-level fields if it helps.

### Worked examples (in this repo)
- [`cards/sir-reginald-flufflebottom.json`](./cards/sir-reginald-flufflebottom.json) — Un-set mechanics (d6, high-five) + fourth-wall (loudest player). Croissant mana `{🥐}`, fish toughness.
- [`cards/the-spreadsheet-that-achieved-sentience.json`](./cards/the-spreadsheet-that-achieved-sentience.json) — fourth-wall + impossible math. `{∞}` cost, `manaValue: "yes"`, divide by zero.
- [`cards/why-is-the-frog-like-that.json`](./cards/why-is-the-frog-like-that.json) — pure nonsense. Toughness `"frog"`, broken grammar, self-aware text.
- [`cards/half-orc-three-quarters-wizard.json`](./cards/half-orc-three-quarters-wizard.json) — half-mana `{½}`, stickers, balance-on-your-head.

---

## 6. Generation recipe (how to roll up an un-card)

Since there's no script, **you** are the chaos engine. To keep output varied:

1. **Pick a chaos level** (§2) — vary it card to card; don't make everything a 5.
2. **Pick one or two flavors** from §4 — and ideally a different combination than the last card.
3. **Roll a few rows** from those flavor menus. Pick rows you haven't used recently.
4. **Find the joke first**, then build the card around it (name, type line, one or two abilities, P/T, flavor). One strong gag beats five weak ones.
5. **Break exactly the conventions that serve the joke** — a chaos-2 card might bend one rule; a chaos-5 card abandons all of them.
6. Set `"border": "acorn"`, `"set": "UNGEN"`, a fun `"number"`, and record any novel mechanics in `extras`.
7. **Validate:** `pnpm validate` (acorn cards route to the permissive schema automatically).
8. **View:** `pnpm dev` → **Cards** tab. Un-cards render with a rainbow-foil frame and an ACORN stamp.

---

## 7. Quick checklist
1. `"border": "acorn"` is set (so validation and the viewer treat it as an un-card).
2. There's an actual joke, and the card commits to it.
3. The mechanics broken are the ones that serve the joke — not noise.
4. `chaos` honestly reflects how far it goes.
5. You sampled **fresh** rows from §4 — it doesn't repeat your last few cards.
6. It's kept out of `decks/` (acorn cards aren't Commander-legal).
7. `pnpm validate` passes.
