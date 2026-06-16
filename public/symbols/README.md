# Mana & tap symbols

SVG card symbols downloaded from [Scryfall](https://scryfall.com/docs/api/card-symbols)
(`https://svgs.scryfall.io/card-symbols/<SYMBOL>.svg`).

Filename = the symbol token without braces or slashes, uppercased:
`{W}` → `W.svg`, `{T}` → `T.svg`, `{2}` → `2.svg`, `{W/U}` → `WU.svg`, `{W/P}` → `WP.svg`.

The viewer maps each `{…}` token in a card's `manaCost` and `text` to the matching file.
If a token has no file, it falls back to rendering the literal text (e.g. `{?}`).

The mana symbols themselves are © Wizards of the Coast; they're used here only to
display fan-made, non-commercial cards. To refresh or add symbols, re-download from
the Scryfall URL above.
