# TODO

Open questions that need an answer from the artist or a decision from us. Tick or remove an item once it is settled.

## For the artist

- [ ] **Section descriptions.** The one-line descriptions for Bottles, Commissions, and Paintings are placeholder copy (in `src/sections.ts`, shown with a "Draft for artist review" marker on `/work` and each section page). Approve or rewrite them.
- [ ] **Which pieces are available?** No artwork currently has `status: available`, so the Available filter on `/artwork` shows nothing. Worth the Break and Pure Honey are `commission`; After the Break is `not_for_sale`.
- [ ] **Is "Paintings" the right name for the third section?** It was "Other work" until the filter list named it. After the Break (canvas, plaster, gold leaf) is the only piece in it.
- [ ] **Is there work that is neither a bottle, a painting, nor a commission?** If so it needs its own section; every piece must list at least one.

## For us

- [ ] **"Work" and "Artwork" are both in the main nav.** `/work` is the section overview and `/artwork` is the filterable list of everything. Keep both, merge them, or rename one? Five nav items fit on phones 390px wide and up; on narrower phones the nav row scrolls sideways.
- [ ] **Where should "← All work" on an artwork page go?** It still points at `/work` (the section overview). `/artwork` is now the page that actually lists every piece.
- [ ] **How filters combine on `/artwork`.** Currently: Bottles, Commissions, and Paintings widen each other (Bottles + Paintings shows both), and Available narrows the result to pieces for sale. Confirm this is what is expected, as opposed to every selected filter having to match.
- [ ] **Even grid: fit or crop?** Everywhere artworks are listed, every tile is the same 4:5 frame with the whole photograph fitted inside, so a square photo such as Worth the Break gets dark bands above and below. The alternative is cropping each photo to fill the frame, which cuts off the edges of the piece.
- [ ] **Filter label.** The button says "Commissions" to match the nav and the section page, not "Commission".
- [ ] **Should a filtered view be linkable?** The selection is not stored in the URL, so there is no way to share a link to, say, available bottles.
