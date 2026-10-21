# Lepide design reference — Sunjeev fills this in BEFORE the exercise

- **Primary design-system Markdown path:** `design.md` (repo root) — "Lepidus Design System — AI Design Contract", generated 2026-10-15. Sections read for MiniDSP: §0–§2, §4, §5 (Badge, Breadcrumb, Button, Card, Dropdown, EmptyState, Input, Link, Message, Sidebar, Skeleton, Spinner, Table; AlertPanel read, not used), §6, §7, §8; token names checked against §3/§11.
- **Other design-system Markdown paths:** NONE (llms.txt / llms-full.txt exist on the live site but were not used).
- **Live reference URL:** https://lepide-design-system.vercel.app
  - CSS (linked in `src/app/layout.tsx` `<head>`): https://lepide-design-system.vercel.app/v1/lepidus.css
  - JS (loaded with `next/script`, `afterInteractive`): https://lepide-design-system.vercel.app/v1/lepidus.js
- **Approved asset paths:** `LOGO/lepide.ico` (Lepide mark, 48×48, supplied by the human on 2026-10-21) → copied unchanged to `src/app/favicon.ico` (replaces the Next.js default) and converted losslessly to `public/brand/lepide.png` (48×48, transparent) for `next/image` in the Sidebar header (`lp-sidebar__header`, 40 px, `alt="Lepide"`) and above the login/sign-up cards. Other icons are inline SVGs copied from the canonical §5 examples (Sidebar dashboard/list icons, Message error/success icons, EmptyState illustration, Spinner); one custom upload-arrow SVG (`currentColor`, `aria-hidden`) in the Sidebar icon slot.
- **Licensing/fonts/icon notes:** `--font-family-primary` is Open Sans. `lepidus.css` (fetched 2026-10-21) contains no `@font-face`/`@import`, so the app renders with a locally installed Open Sans or the fallback stack; no font files are bundled. Next.js scaffold fonts (Geist) were removed.

The Agent must read real files and follow actual tokens/components. If missing in a real session, tell the human and resolve before UI work. In a rehearsal, assumptions must be clearly labelled SIMULATED.

## System gap notes (MiniDSP, Phase 3)

| Need | Gap | What was used instead |
|---|---|---|
| File picker on /upload | No plain-CSS file-upload / dropzone component. EmptyState's "As upload dropzone" story needs a custom dashed `<button>` style that has no `lp-` class. | Input anatomy (`lp-input` › `lp-input__row--label-top` › `lp-input__field` › `lp-input__input`) with the native `type="file"` (Input passes native `type` through). Helper/error text via `lp-input__message(--error)` + `aria-describedby`. |
| Folder picker on /upload (added after Phase 5 on request) | No folder-upload component. | Same Input anatomy with native `type="file" multiple webkitdirectory`. Per-file status uses `lp-badge` (Scanned = success, Rejected = error, Skipped = neutral — always with text); results in `lp-table`; progress via `lp-spinner` + text and a secondary `lp-button` "Stop". |
| Risk-distribution chart on /dashboard | Charts are React-only (`@ramsarjal-404/react`, not installed). | §6 archetype D rule: text summary — `lp-table` of risk `lp-badge` + file count. |
| KPI tiles (files, findings, High+Critical) | No stat/KPI component. | `lp-card` with title + a token-only `.kpi-value` text wrapper (`--typography-heading-h1-*`, `--font-weight-bold`). |
| Table "no rows" state | `lp-table__empty-cell` is in the legal set but §5 has no plain-HTML example. | `<tr><td class="lp-table__empty-cell" colspan=N>` (Table anatomy part 7) containing an `lp-empty-state` (EmptyState guidance: put it in the table's empty slot), inside `aria-live="polite"`. |
| Dropdown in a React app without the React package | `@ramsarjal-404/react` is not an approved dependency. | Canonical plain-HTML single-select anatomy rendered from JSX; `lepidus.js` owns open/close/selection; app listens to `lp-dropdown-change` only. Client-mounted dropdowns call `Lepidus.initDropdown(el)`; a `key` per value remounts fresh markup after navigation. Options carry `aria-checked` (plain-HTML hook) **and** `aria-selected` (React Dropdown semantics; required by jsx-a11y for `role="option"`). |
| Semantic headings in cards | `lp-card__title` is a styled `<div>`. | Heading element inside `lp-card__title` (allowed by Card a11y notes) with a token-free `.heading-reset { margin:0; font:inherit }` so card typography is unchanged. |
| Theme switching | Out of scope. | `data-theme="light"` only. Dark / hc **not visually verified**. |

Known inline styles (both copied from canonical anatomy, not invented): Sidebar `style="width: 100px"`; visually-hidden table `<caption>` style.
