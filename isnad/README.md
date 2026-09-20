# Al-Kafi isnad (chain of narrators) data

Compact per-hadith narrator chains for Al-Kafi, so the Noorium app can draw a chain flow-chart for any Al-Kafi hadith the user opens.

## Source and licence

Derived from **ThaqalaynData** by narmafraz (https://github.com/narmafraz/ThaqalaynData), released under **CC0 1.0** (public-domain dedication; attribution not required, given here as a courtesy). Data used: `books/al-kafi/<vol>/<book>/<chapter>/<hadith>.json` (`narrator_chain`, `gradings`) and `people/narrators/<id>.json` (narrator titles). Commit used: `1eb1df2` (master, Sep 2026).

## Layout

```
isnad/kafi/index.json   volumes, counts, sizes, key format
isnad/kafi/v1.json ... v8.json
tools/                  scripts that produced the data (reference only; they expect a local ThaqalaynData clone + API dumps)
```

## KEY (how the app finds a hadith)

The app already receives an entry from `https://www.thaqalayn-api.net/api/<bookId>/<number>`.

* File: volume number `N` from `entry.bookId` (`Al-Kafi-Volume-<N>-Kulayni`) -> `isnad/kafi/v<N>.json`.
* Key: `String(entry.id)` -> `json.h["<id>"]`. The API `id` is unique and sequential (1..N) in every volume.
* Absent key = no chain available (see "Not included").
* Safety token: `h[key].t` must equal `token(entry.arabicText)`, otherwise do not draw the chain (protects against the API renumbering).

Why not `entry.URL`? The `/hadith/<vol>/<book>/<chapter>/<hadith>` path does not reliably equal the ThaqalaynData path: volume 1 puts the introduction at book 0 / chapter 0, volumes 6-8 number chapters and hadith differently, and every volume-8 URL has the form `/1/<n>/<n>`. Also ThaqalaynData has extra Arabic-only hadith the API lacks (e.g. vol 7: 1821 vs 892). The id -> ThaqalaynData mapping was therefore built by aligning the Arabic text of each API entry with the dataset (exact normalized text, else first+last 40 letters, else fuzzy; monotonic order enforced), and for every non-exact match the chain text was verified to be >= 90% similar to the start of the API text. Identical texts always carry identical chains, so an ambiguous duplicate can only affect the grading, never the chain.

### Token / normalisation (`tools/isnad_key.js` is the reference)

`norm(s)`: (1) delete every `( ... )` group; (2) delete leading digits/dash/space; (3) delete diacritics U+0610-061A, U+064B-065F, U+0670, U+06D6-06ED and tatweel U+0640; (4) U+0622/0623/0625/0671 -> U+0627; (5) U+0649 -> U+064A, U+0629 -> U+0647, U+06CC -> U+064A, U+06A9 -> U+0643; (6) keep only U+0621-063A and U+0641-064A; (7) delete `عليه|عليهما|عليهم|عليها` immediately followed by `السلام`; (8) delete `صلياللهعليهواله`.
`token(s)` = FNV-1a 32-bit (offset 0x811c9dc5, prime 0x01000193, one step per code point, `& 0xFFFFFFFF`) over the first 24 chars of `norm(s)`, then `& 0xFFFF`, printed as 4 lowercase hex digits.
Test vectors (API text starts): vol 5 id 1 `1- عِدَّةٌ مِنْ أَصْحَابِنَا عَنْ أَحْمَدَ بْنِ مُحَمَّدٍ ...` -> norm prefix `عدهمناصحابناعناحمدبنمحمد` -> token `1c9f`; vol 4 id 1 -> `3251`; vol 1 id 301 -> `9ad1`.

## Schema

```json
{ "v":1, "source":"ThaqalaynData (narmafraz), CC0", "book":"al-kafi", "volume":5,
  "h": { "1": { "t":"1c9f",
                "c":[ {"i":6,"n":"A number of our companions","a":"عِدَّةٌ مِنْ أَصْحَابِنَا"},
                      {"i":2,"n":"his father","a":"أَبِيهِ","r":1}, {"t":"رَفَعَهُ"} ],
                "g":"Majlisi: صحيح | Behbudi: ضعيف",
                "q":1 } } }
```

* `c` - the chain in the order it is read in the hadith (first item = the one Kulayni names, last = closest to the Infallible / source). Items:
  * narrator: `i` dataset narrator id (`people/narrators/<i>.json` upstream), `n` English label from the dataset (omitted when the dataset has none - about 13% of entries; use `a`), `a` Arabic exactly as written in this hadith (with its case endings).
  * `r:1` - back-reference the dataset does **not** resolve ("his father", "from him", "his grandfather", "some of his companions", ...). The name of the person is given by the previous narrator in the chain; nothing is guessed. Draw it as a dashed "same as above / relative of previous" node.
  * `{t:"..."}` - text inside the chain that the dataset did not link to a narrator (e.g. `رفعه` "raised it", `عمن ذكره` "from someone he mentioned", `بهذا الإسناد` "with the same chain", or a name it left unlinked). Draw as a note/gap on the link.
* `g` - hadith-level gradings present in the dataset (Majlisi in Mir'at al-Uqul, Behbudi in Sahih al-Kafi), citation suffixes removed. These grade the **hadith**, not the narrators.
* `q` - omitted: exact text match. `1`: matched on first+last 40 letters. `2`: fuzzy text match (chain text still verified).
* `n` note: the English label is the dataset's canonical label for narrator id `i`; the dataset merges name variants under one id (e.g. "Ahmad b. Abi Abdillah" is filed under "Ahmad b. Muhammad b. Khalid"), so `n` may be a fuller form of the Arabic shown in `a`. The dataset's ids are **name-based, not person-verified**: the same id can be several people (e.g. "Ali ibn Muhammad").

## What is NOT included

* No narrator reliability grades (thiqa / da'if / majhul of individual narrators) - the source does not provide them.
* No narrator identity claims. The dataset also carries AI-generated identity guesses (`ai.isnad_matn.known_identity`, `identity_confidence`) - these were deliberately **not** copied.
* No chain for 219 of the 14,241 API hadith (1.5%): 116 where the dataset itself has no narrator chain (mostly "و بإسناده" / "بهذا الإسناد" continuations of the previous hadith), 79 that could not be matched to any dataset hadith, 23 matched only loosely and rejected because the chain text did not agree with the API text, and 1 whose chain held no usable narrator. Nothing is inferred from neighbouring hadith.
* Arabic hadith text / translations (the app already gets them from the API).

See `kafi/index.json` for exact per-volume counts.
