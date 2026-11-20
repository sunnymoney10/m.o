# m.o brand

Direction A, "Good Company", chosen by the owner on 2026-11-20. Warm cream paper, plum ink, brick for actions, butter for what's selected. The drawings carry the personality, and the controls stay familiar.

## The mark
The dot in "m.o" is a person with a saved seat at the table: a round brick head over one plum table line.

- **Wordmark** (`Wordmark` in `components/mo/brand.tsx`): the full name, drawn as shapes (not typed), so it looks the same everywhere. Its height follows `font-size`, its ink follows `color`, and the head is always brick.
- **Mark** (`Mark`, `public/favicon.svg`, the app icons): the seat on its own, for small places.
- Clear space: at least the head's width on every side.
- On plum, the ink parts turn cream and the head stays brick.
- Don't: stretch it, recolour the head, type "m.o" in a font where the logo should be, add effects or shadows, or put it on a busy picture.
- Pronounced em-oh. Always written lowercase with the dot: m.o.

## Icons
- `public/favicon.svg`: the mark on cream.
- `public/apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (mark inside the safe middle). To regenerate: `node scripts/brand-icons.cjs`.
- `public/manifest.webmanifest` sets `"display": "browser"` on purpose. On iPhone, a full-screen home-screen app keeps its own cookies, so a host who made plans in Safari would see none of them. Opening in the browser keeps their plans.
- Link previews (`public/og/*.png`): `node scripts/og-images.cjs` with `npm run dev` running.

## Colour
Every colour in `app/globals.css` comes from a token in `:root`. Don't write a hex value anywhere else in the stylesheet.

| Token | Value | Use | Text contrast |
| --- | --- | --- | --- |
| `--cream` | `#f6eee4` | page background | plum on cream 13.4:1 |
| `--paper` | `#fffaf3` | cards | plum on paper 14.8:1 |
| `--ink` | `#3a1a2b` | headings, logo | |
| `--text` | `#2c1b24` | body text | 15.7:1 on paper |
| `--muted` | `#6f6066` | secondary text | 5.2:1 on cream |
| `--brick` | `#b23b28` | primary buttons, the logo's head | white on brick 5.9:1 |
| `--butter` | `#f5d36a` | selected tab, highlights | plum on butter 10.6:1 |
| `--sky` / `--sky-soft` | `#c5d4f0` / `#e4ebf8` | info callouts | brick on sky-soft 4.9:1 |
| `--noted` | `#7a5600` | "noted, not confirmed" (dashed) | 6.4:1 on paper, 5.8:1 on butter-soft |
| `--confirmed` | `#2f6b3a` | confirmed | 6.2:1 on paper |
| `--danger` | `#a3271a` | delete actions | 7.1:1 on paper |

Supporting tokens (lines, tracks, shades, backdrops, shadows) are listed in `:root` with comments. Check any new text pair against WCAG AA (4.5:1) before using it.

## Type
Outfit for everything; Caveat only for handwritten notes. Sizes come from tokens:

| Token | Size | Use |
| --- | --- | --- |
| `--fs-label` | 12 | uppercase labels |
| `--fs-small` | 13 | fine print |
| `--fs-body` | 15 | secondary and list text |
| `--fs-input` | 16 | body and every form field (iPhone zooms into fields smaller than 16) |
| `--fs-lead` | 17 | card titles, emphasis |
| `--fs-title` | 22 | section titles |
| `--fs-section` | 28 | big section headings |
| `--fs-page` | 34 | page titles on phones |
| `--fs-display` | 46 | page titles on desktop, big numbers |

## Shape and space
- Corners: `--r-s` 8 (small), `--r-m` 14 (buttons, fields), `--radius` 22 (cards), `--r-pill` (chips).
- Spacing in 8px steps (8/16/24). Tap targets at least 44px.
- Shadows: `--shadow-s`, `--shadow-l` only.

## Voice
Plain words and short sentences. Buttons say what happens ("Create plan"). The promise is "Make it out the groupchat."
