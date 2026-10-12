# TODO

Open questions that need an answer from the artist or a decision from us. Tick or remove an item once it is settled.

## For the artist

- [ ] **Is "Paintings" the right name for the third section?** It was "Other work" until the filter list named it. After the Break (canvas, plaster, gold leaf), Blue 1, Deep Wave, and This Seemed Easier in My Head are the pieces in it.
- [ ] **Details for the stub pieces.** Blue 1, Deep Wave, This Seemed Easier in My Head, Jack Daniel's 1, Don Julio 1, Clase Azul 1, Moxie 1, and Death Isn’t Black and White (`blue-1`, `deep-wave`, `this-seemed-easier-in-my-head`, `jack-daniels-1`, `don-julio-1`, `clase-azul-1`, `moxie-1`, and `death-isnt-black-and-white` under `src/content/artworks/`) are stubs and the site currently shows their placeholders. Needed for each: the real title (the current ones are working titles; the slug and folder name follow it), year (2024 is a placeholder taken from the photo date), medium, materials, dimensions (shown as "1 × 1 TODO", now also in the hover overlay on `/artwork`), description, and alt text for every photograph. Each of these records carries `placeholder: true`, which keeps the piece out of the homepage's Selected work; remove the flag once its details are filled in.
- [ ] **Is there work that is neither a bottle, a painting, nor a commission?** If so it needs its own section; every piece must list at least one.
- [ ] **Dimensions of the finished pieces.** After the Break, Worth the Break, and Pure Honey all say 36 × 24 in. Worth the Break is photographed square (its alt text says "Square framed assemblage") and Pure Honey looks closer to 4:5. Confirm the real sizes.
- [ ] **Planned or experimental?** The About biography says each piece is "carefully planned, composed, and refined until the materials land exactly where she wants them". The About process text, the homepage, and the Commissions page say the outcome "is not fixed in advance" and that final compositions "are not predetermined". Which is true, or how should both be said?
- [ ] **Is the About biography final?** It is the only long text without a "Draft for artist review" marker, its humour sits next to much more formal copy, and its first sentence is reused on the homepage. Keep it as is, tone it down for commission clients, or mark it as a draft?
- [ ] **First or third person?** The artist statement on the About page says "I"; everything else says "the artist" and "her".
- [ ] **Commissions pull quote.** "Each commission is an original Endeavor work…" is in quotation marks with no speaker. Attribute it or drop the quotation marks.
- [ ] **New photographs of the three finished pieces.** Pure Honey (763 × 953 px), After the Break (1170 × 2080 px, leaning on a floor with the baseboard in frame), and Worth the Break (1254 × 1254 px) are the smallest photographs on the site and well under the 2000 to 3000 px target, yet they carry the homepage. Pure Honey is visibly soft when enlarged.
- [ ] **Medium wording.** "Mixed media", "Mixed media, framed assemblage", and "Mixed media with sculptural texture and metallic gold accents" describe three similar works. Pick one convention. Pure Honey's description is also missing its final period.
- [ ] **Labels for secondary photographs.** Artwork pages caption them with the internal role name: "angled view", "environment view" (Death Isn’t Black and White shows "angled view" three times). What should visitors see instead?

## For us

- [ ] **How filters combine on `/artwork`.** Currently: Bottles, Commissions, and Paintings widen each other (Bottles + Paintings shows both), Available, Unavailable, and Sold widen each other the same way, and a section filter combined with a status filter narrows the result to pieces matching both. Confirm this is what is expected, as opposed to every selected filter having to match.
- [ ] **Even grid: fit or crop?** Everywhere artworks are listed, every tile is the same 4:5 frame with the whole photograph fitted inside, so a square photo such as Worth the Break gets dark bands above and below. The alternative is cropping each photo to fill the frame, which cuts off the edges of the piece.
- [ ] **Filter label.** The button says "Commissions" to match the nav, not "Commission".
- [ ] **Title in the hover overlay?** Hovering a photograph in an artwork list shows the dimensions and "Sold" or "Unavailable". The reference site (morganbroomestudio.com/portfolio) also puts the title in its overlay because its tiles have no caption; ours keep the title under the photograph, so the overlay leaves it out.
- [ ] **Should a filtered view be linkable?** The selection is not stored in the URL, so there is no way to share a link to, say, available bottles. It would also let the Section value on an artwork page and the link at the bottom of `/commissions` open `/artwork` already filtered; with the section pages gone, the first is plain text and the second goes to the unfiltered list.

### From the October 2026 site audit

Found by reading the source and measuring the built pages in headless Chromium. None of these are fixed yet.

- [ ] **Image weight.** `ArtworkImage` uses `quality={88}` for AVIF and WebP alike: `/artwork` is about 3.0 MB of AVIF at 960w and 7.1 MB at 1600w. Widths jump from 960 to 1600, so a 3× phone in the one-column layout downloads the 1600w file. Lightbox files (WebP, quality 92) reach 1.8 MB each with no loading state.
- [ ] **Logo.** `endeavor-emblem.png` is a 242 KB, 512 × 512 PNG served unoptimized on every page as the favicon, the 52px header mark, and the footer mark.
- [ ] **No link preview image.** `BaseLayout` accepts an `image` prop but no page passes one, so nothing emits `og:image`. `og:url` and `twitter:card` are also missing.
- [ ] **Commissions hero rotator.** It crops with `object-fit: cover` (a portrait work shows only its middle third at 1440px), has no pause or previous/next control, keeps rotating behind the open lightbox, and closing the lightbox then drops keyboard focus to `<body>` because the slide that opened it has gone `inert`.
- [ ] **No previous/next between artworks.** The only way on from an artwork page is back, which loses the filter the visitor came from.
- [ ] **Very small label text.** Navigation, eyebrows, captions, and card metadata render at 10 to 11.5px, uppercase and letter-spaced.
- [ ] **Each artwork card has two links to the same page** (image and title), which doubles the tab stops (38 on `/artwork`); the image link's `aria-label` also hides the photograph's alt text from screen readers.
- [ ] **The ↗ arrow is on every `.text-link`, including internal ones,** while the real external links (Instagram, footer) have none.
- [ ] **Lightbox polish.** The page behind still scrolls while it is open, single-image galleries show "1 / 1", and the caption appears both in the top counter and under the image.
- [ ] **320px overflow.** The H1 on `/contact` is wider than a 320px screen by about 30px.
- [ ] **After the Break alt text.** The hero and the angled photograph share one alt text; the angled one should describe depth or projection.
- [ ] **Homepage repetition.** After the Break is the hero and the first Selected card; Worth the Break is the second Selected card and the Featured block.
- [ ] **Verify on the live deployment.** That unknown URLs now return the styled 404 page (`not_found_handling` was added to `wrangler.jsonc`; needs a deploy), whether `/_astro/*` gets long-lived cache headers (`public/_headers` sets none), and whether links without a trailing slash (`/artwork`) cost a redirect to `/artwork/`.
