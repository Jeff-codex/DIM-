# DIM DESIGN.md

This file defines the design system direction for DIM.

It is based on the current DIM public implementation and brand rationale already present in this repository:

- `docs/dim-v1-design-rationale.md`
- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/editorial-heading.module.css`
- `apps/web/components/magazine-intro.module.css`
- `apps/web/components/article-list-item.module.css`
- `apps/web/components/cta-button.module.css`
- `apps/web/components/magazine-category-nav.module.css`
- `apps/web/components/representative-image.module.css`
- `apps/web/components/site-header.module.css`

The goal is not to imitate a SaaS landing page, dashboard, or breaking-news portal.
DIM should feel like a serious Korean editorial intelligence magazine with structured archives, restrained emphasis, and long-form reading discipline.

## 1. Visual Theme & Atmosphere

DIM is typography-first, editorial, and quiet.

The homepage should read like an editorial declaration before it reads like a content feed.
The archive should behave like a calm index, not a high-velocity stream.
The article page should feel like a considered reading surface, not a product detail page and not a dashboard.

The visual mood is built on four principles:

- black intro surfaces that create authority and pacing
- off-white reading surfaces that keep long-form text calm
- grayscale structure with very limited accent use
- strong hierarchy through spacing, line length, and typography instead of decoration

DIM should feel:

- direct
- composed
- editorial
- structured
- restrained

DIM should not feel:

- startup-marketing
- dashboard-heavy
- playful
- gradient-led
- decorative for its own sake

Public surfaces and CMS surfaces should not use identical grammar.
Public pages should feel more editorial and final.
Internal CMS pages may be more utility-driven, but should still inherit DIM's restraint and typography discipline.

## 2. Color Palette & Roles

Use the existing DIM palette as the authoritative base.

### Core Light Surfaces

- `--color-background`: `#ffffff`
- `--color-background-alt`: `#f4f4f2`
- `--color-surface`: `#ffffff`
- `--color-surface-muted`: `#faf9f6`
- `--color-surface-quiet`: `#f2f1ed`

These values create a paper-like reading environment.
They are not sterile blue-whites and should not be replaced with cold SaaS neutrals.

### Text

- `--color-text-primary`: `#111111`
- `--color-text-secondary`: `#5b5b5b`

Primary text should stay near-black and highly legible.
Secondary text should recede clearly but remain readable in Korean body copy.

### Structural Lines

- `--color-divider`: `#e5e1da`
- `--color-divider-strong`: `rgba(17, 17, 17, 0.14)`
- `--color-outline-soft`: `rgba(17, 17, 17, 0.08)`

Borders and dividers should remain whisper-thin and structural.
Use them to organize reading and navigation, not to create boxed UI chrome.

### Accent

- `--color-accent`: `#d72013`
- `--color-accent-hover`: `#b81b10`
- `--color-selection`: `#f4d4d1`

The DIM red is a high-signal accent, not a background mood.
Use it for:

- key emphasis
- hover moments on titles
- focus and selection cues
- rare editorial highlights

Do not introduce a competing purple, blue, neon, or gradient-led brand accent into the public experience.

### Dark Brand Surfaces

Use the existing public dark shell values as the authoritative dark mood:

- intro/header black: `#050505`
- white border on dark surfaces: `rgba(255, 255, 255, 0.08)`
- intro eyebrow/body text should use reduced white opacity instead of gray tokens

Dark surfaces should feel like editorial stage-setting, not dark mode for a product app.

## 3. Typography Rules

DIM already defines two primary font roles in code.
Keep them.

### Font Families

- Body/UI: `Noto Sans KR` via `--font-body`
- Display/Headlines: `Noto Serif KR` via `--font-display`

This split is important.
DIM should use serif weight and tension for editorial authority, and sans-serif for interface clarity and body readability.

### Core Typography Principles

- Headlines use the display font
- Body, navigation, metadata, forms, and controls use the body font
- Korean line breaks should remain deliberate
- Preserve `word-break: keep-all`
- Preserve balanced headings and pretty-wrapped paragraphs/lists

### Title Scale

Use the existing title measures and tracking as the authoritative baseline:

- Hero title:
  - max measure: `13.6ch`
  - size: `clamp(1.98rem, 3.05vw, 3.08rem)`
  - line-height: `1.1`
  - letter-spacing: `-0.042em`
- Section title:
  - max measure: `18.5ch`
  - size: `clamp(1.42rem, 2vw, 1.9rem)`
  - line-height: `1.24`
  - letter-spacing: `-0.03em`
- Card title:
  - max measure: `18.2ch`
  - size: `clamp(1.14rem, 1.45vw, 1.42rem)`
  - line-height: `1.32`
  - letter-spacing: `-0.03em`
- Article detail title:
  - max measure: `13.2ch`
  - size: `clamp(2.08rem, 3.55vw, 3.5rem)`
  - line-height: `1.08`
  - letter-spacing: `-0.044em`
- Form/support title:
  - max measure: `16.4ch`
  - size: `clamp(1.28rem, 1.68vw, 1.62rem)`
  - line-height: `1.24`
  - letter-spacing: `-0.028em`

### Body Scale

- Base body size: `16px`
- Base body line-height: `1.68`
- Intro body size: `0.98rem`
- Intro body line-height: `1.84`
- Archive excerpt size: `0.92rem`
- Archive excerpt line-height: `1.72`

Body copy should feel calm and spacious, not compressed.

### Labels and Eyebrows

Use uppercase labels sparingly and consistently:

- eyebrow size: `0.76rem`
- eyebrow weight: `600` or `700`
- eyebrow letter-spacing: `0.18em`
- line-height: `1`
- text-transform: `uppercase`

Eyebrows are for orientation and editorial categorization, not decoration.

## 4. Component Stylings

### Header

DIM's global header is a dark editorial bar, not a product navbar.

- sticky
- top: `0`
- dark background: `rgba(5, 5, 5, 0.98)`
- blur: `12px`
- bottom border: `1px solid rgba(255, 255, 255, 0.08)`
- generous vertical presence

The brand line in the header should stay compact, uppercase, and high-contrast.

### Magazine Intro

The intro block is a key DIM signature.

- dark surface
- white text
- generous vertical padding
- one eyebrow
- one strong display headline
- short body copy in reduced-opacity white

This is where DIM establishes editorial intent.
It must never read like a growth-marketing hero with stacked CTAs and feature bullets.

### Buttons

Use the current DIM button logic as the baseline.

Primary button:

- background: `#111111`
- border: `#111111`
- text: `#ffffff`
- min-height: `42px`
- radius: flat or effectively square
- weight: `600`
- subtle lift on hover only

Secondary button:

- transparent background
- thin dark border
- near-black text
- no heavy shadows

Buttons should feel decisive and editorial, not soft, glossy, or playful.

### Category Navigation

The category bar is part archive indexing, part editorial wayfinding.

- white background
- thin dark border
- radius: `6px`
- medium weight text
- hover uses darker inset underline/bottom emphasis rather than glow

These links can be slightly card-like, but should not become bubbly chips or colorful tabs.

### Archive Cards

Archive cards are intentionally simple:

- image
- title
- short excerpt

Avoid metadata overload.
Do not add dashboard badges, tag clusters, or noisy analytics-style chrome.

Current image rules are authoritative:

- lead image ratio: `4:3`
- card image ratio: `4:3`
- object-fit: `cover`

Card hover should remain subtle:

- slight title color shift toward DIM red
- slight media opacity or scale change

### Article Detail Cover

Current detail cover rule is authoritative:

- ratio: `8:5`
- object-fit: `cover`

The cover image supports the article but should not overpower the reading system.

Visible cover metadata on public pages should remain minimal.
Only explicit photo/source information should render as visible text.
Accessibility alt text belongs in HTML/meta, not as visible captions by default.

## 5. Layout Principles

### Containers

Use the existing DIM width system:

- layout container: `1240px`
- reading width: `780px`
- mobile gutters: `20px` per side via `calc(100% - 40px)`

### Spacing Scale

Use the current section spacing tokens:

- `--section-space-xl`: `96px`
- `--section-space-lg`: `72px`
- `--section-space-md`: `52px`

DIM needs generous section spacing.
Do not compress public pages into dense product marketing blocks.

### Page Structure

Home page:

- dark editorial intro first
- centered category navigation second
- calm archive grid after that

Archive page:

- editorial intro explaining the archive
- centered category navigation
- search/filter surface
- quiet grid of cards

Article page:

- one strong hero/title region
- one cover image
- one reading column
- minimal interruptions

The archive is an index.
The article is a reading surface.
Do not merge those behaviors.

## 6. Depth & Elevation

DIM should stay mostly flat.

Authoritative existing values:

- `--shadow-soft`: `0 8px 18px rgba(17, 17, 17, 0.025)`
- `--shadow-paper`: `0 14px 34px rgba(17, 17, 17, 0.03)`

Use shadows sparingly.
Most structure should come from:

- contrast
- borders
- spacing
- typography

Allowed depth moments:

- subtle paper lift on rare cards or contained panels
- sticky dark header blur
- very small hover movement

Disallowed depth habits:

- oversized shadows
- glassmorphism
- neon glow
- gradient haze
- layered SaaS dashboard chrome

## 7. Do's and Don'ts

### Do

- Keep DIM black/white first, red second
- Let serif headlines carry editorial authority
- Keep body text calm and readable in Korean
- Use long reading widths and strong vertical rhythm
- Keep archive cards simple and scannable
- Use borders and spacing to organize, not decorative blocks
- Let the homepage state DIM's editorial position before content browsing begins
- Keep CMS more utilitarian than public pages, but still restrained

### Don't

- Don't turn DIM into a startup landing page
- Don't introduce purple-led or blue-led branding
- Don't rely on gradients as the main atmosphere
- Don't use dashboard widgets, KPI tiles, or app-like chrome on public pages
- Don't over-round everything into pill-heavy UI
- Don't turn cards into dense metadata containers
- Don't use playful typography or illustration systems that weaken editorial authority
- Don't make animations a primary identity signal

## 8. Responsive Behavior

DIM already has working public breakpoints around `760px` and `520px`.
Preserve that logic.

### Mobile Principles

- Headlines widen to full measure on mobile
- Detail titles reduce in size but keep strong contrast and tension
- Header stacks vertically when needed
- Secondary brand text may hide on small screens
- Category navigation wraps cleanly
- Reading width should remain single-column and uncluttered

### Responsive Rules

- Never collapse into a dashboard-style mobile experience
- Preserve the distinction between intro, navigation, archive, and reading surfaces
- Keep image ratios stable:
  - card/lead `4:3`
  - detail `8:5`
- Keep tap targets comfortable without inflating every component visually

## 9. Agent Prompt Guide

When generating or editing DIM UI, follow these instructions:

- Build DIM like a serious editorial intelligence magazine.
- Prefer typography, spacing, and contrast over decorative effects.
- Use `Noto Serif KR` for headings and `Noto Sans KR` for body/UI.
- Keep the core palette grayscale with DIM red as the only strong accent.
- Keep public pages black/white, structured, and calm.
- Make home feel declarative, archive feel index-like, and article feel readable.
- If choosing between "magazine" and "SaaS", choose magazine.
- If choosing between "quiet" and "flashy", choose quiet.
- If choosing between "structured" and "playful", choose structured.

### Useful shorthand prompts

- "Use DIM editorial black/white structure with restrained red emphasis."
- "Make this feel like a Korean magazine archive, not a product landing page."
- "Keep a single reading column and calm metadata rhythm."
- "Use subtle borders and spacing instead of colorful cards or gradients."

### Inspiration Synthesis

If an agent needs a mental model, the correct synthesis is:

- editorial chiaroscuro and authority
- structured dark archive logic
- calm, paper-like reading surfaces

Not:

- startup hero gradients
- infra dashboard polish
- documentation-site chrome

