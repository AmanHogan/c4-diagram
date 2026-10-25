# Design system

Reference doc for the visual language and interaction patterns built in this
app (Flowdeck), meant to be **carried into new Next.js + TypeScript +
Tailwind + shadcn projects** so they start from the same look and feel
instead of re-deriving it. If you're an AI agent scaffolding a new app off
this doc: read the whole thing before writing UI code, and prefer copying
the referenced component files over reimplementing them from the
description alone — the description is a summary, the code is the source
of truth.

This doc assumes the same stack every time it's reused: Next.js (App
Router), TypeScript, Tailwind v4, shadcn/ui, dark-mode-only by default.

## Where to start a new project from this doc

1. Copy `src/app/globals.css`'s `@theme inline` block and both `:root`/`.dark`
   token blocks verbatim (below) — don't hand-retype the OKLCH/hex values,
   copy them exactly so color stays pixel-identical across apps.
2. Copy the reusable component files listed in "Reusable components" below
   into the new repo's `src/components/`, adjusting only the app-specific
   bits (e.g. `itemHref`/`iconFor` become whatever entities the new app has).
3. Copy `AINSTRUCTIONS.md`'s coding-standards section (JSDoc on functions
   >20 lines, no `any`, explicit return types, no floating promises, ESLint
   enforced) into the new repo's own instructions file — same rules, same
   lint config shape.
4. Set `<html className="dark ...">` in the root layout by default (see
   "Theme" below) unless the new app explicitly needs a light default.

## Color tokens

Dark is the default and primary theme; light exists but is treated as the
secondary/opt-in palette (see "Theme" below). Both are shadcn/tweakcn's
canonical near-black/near-white neutral scale, not the muddier default
mid-grey shadcn ships with. Brand accent is a blue (`#3b82f6` dark /
`#2563eb` light), not shadcn's monochrome default — everything that reads
as "primary" (buttons, focus rings, active states, hover borders) uses it.

```css
/* dark (default) */
--background: #0a0a0a;
--foreground: #fafafa;
--card: #171717;
--card-foreground: #fafafa;
--popover: #262626;
--popover-foreground: #fafafa;
--primary: #3b82f6;
--primary-foreground: #ffffff;
--secondary: #262626;
--secondary-foreground: #fafafa;
--muted: #262626;
--muted-foreground: #a1a1a1;
--accent: #404040;
--accent-foreground: #fafafa;
--destructive: #ff6467;
--border: rgba(255, 255, 255, 0.11);
--input: rgba(255, 255, 255, 0.14);
--ring: #3b82f6;
```

```css
/* light */
--background: oklch(1 0 0);
--foreground: oklch(0.145 0 0);
--card: oklch(1 0 0);
--popover: oklch(1 0 0);
--primary: #2563eb;
--primary-foreground: #ffffff;
--secondary: oklch(0.97 0 0);
--muted: oklch(0.97 0 0);
--muted-foreground: oklch(0.556 0 0);
--accent: oklch(0.97 0 0);
--destructive: #ef4444;
--border: oklch(0.922 0 0);
--input: oklch(0.922 0 0);
--ring: #2563eb;
```

Pull the full block (including `--sidebar-*` tokens) straight from
[globals.css](src/app/globals.css) rather than retyping — that's the
canonical copy.

## Theme

- `<html class="dark">` by default, set once in the root layout
  ([layout.tsx](src/app/layout.tsx)) — the whole app is dark-mode-first.
- A screen can opt back into the light palette by scoping a class that
  redeclares every token *and* sets `color`/`background-color` directly
  (inherited properties don't otherwise re-resolve just from redefining the
  custom properties — see `.diagram-canvas-light` in globals.css for the
  exact pattern). Use this sparingly, only where a screen genuinely needs
  the opposite theme (e.g. a canvas meant to export/print on white).

## Corners ("light corners")

Radius is defined once (`--radius: 0.625rem` ≈ 10px) and every other radius
step is derived by *subtracting/adding* off that base, not multiplying —
that keeps the top of the scale from blowing up into an oversized pill:

```css
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
--radius-2xl: 1rem;
--radius-3xl: 1.5rem;
```

Card-like surfaces (poster cards, list rows, popovers) consistently use
`rounded-xl` with a `border-2 border-border/60` — a *visible but soft*
border, not a hard 1px line, and not borderless. This is the single most
repeated visual signature in the app: every clickable card/row looks like
`rounded-xl border-2 border-border/60 bg-card p-6`, and its hover state is
`hover:-translate-y-0.5 hover:border-primary hover:shadow-lg` (a tiny lift +
the border going primary-blue + a shadow — never a background color change,
never a scale transform).

## Typography

- Font: Geist (self-hosted via the `geist` npm package — `GeistSans` /
  `GeistMono` — never a network font request).
- Section headings on landing-style pages (dashboard sections, list-page
  titles) use a gradient-clip technique, not a flat color:

```css
.gradient-text {
  background: linear-gradient(100deg, #7c9bff 0%, #3b82f6 60%, #60a5fa 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

  For the more common muted-fade heading style (not the brand-blue one),
  the same clip technique is applied inline instead of via the class:
  `bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text
  text-transparent`. Used for every page's `<h1>`/section `<h2>` — full
  sentences, not short labels (e.g. "Pick up where you left off." not
  "Recent").

## Motion — what animates and what doesn't 

This is the part worth internalizing rather than copying literally, since
it's a set of *rules*, decided deliberately in this project:

- **No page-transition animation between routes.** No slide, no
  fade-through-black, no interstitial loading route. Navigation is instant;
  the app is used too frequently for that friction to ever pay for itself.
- **Data loading uses a delay-then-skeleton pattern, never a bare spinner
  or "Loading…" string.** See [`useDelayedLoading`](src/lib/use-delayed-loading.ts):
  a skeleton only appears if the load takes longer than ~150ms (fast loads
  show nothing, avoiding a flash), and once shown it stays for a minimum
  ~300ms even if data arrives sooner (so it can't itself flicker in and out).
  Every skeleton is shaped like the real content it's replacing (see
  `poster-card-skeleton.tsx`, `list-row-skeleton.tsx`), never a generic spinner.
- **Carousels get a CSS mask edge-fade**, not a hard clip — cards scrolling
  past the edge dissolve into transparency instead of getting visibly cut
  off. Applied via `mask-image: linear-gradient(...)` on the scroll
  container (see `static-carousel.tsx` / `marquee.tsx`), not JS.
- **The auto-scrolling marquee is a pure CSS `transform` loop**, no JS
  driving it, pausable on hover via `animation-play-state`. Gotcha: it must
  be written as longhand `animation-name`/`animation-duration`/etc. with
  `animation-play-state` deliberately omitted, not the `animation` shorthand
  — see the comment above `.animate-marquee` in globals.css for why (an
  unlayered-CSS-vs-Tailwind-layer specificity fight).
- **Hover states are transform + border-color + shadow, not scale or
  background-color.** `hover:-translate-y-0.5 hover:border-primary
  hover:shadow-lg` is the house style for any clickable card.

## Gotcha: Tailwind's bare `.group` collides across nesting

If a component using `group`/`group-hover:` is ever placed inside another
component that *also* uses a bare `group` (e.g. a card inside the
Marquee, which uses `group` for its own pause-on-hover), Tailwind's
`group-hover:` matches **any** ancestor with `.group`, not just the nearest
one — so hovering the outer component lights up every `group-hover:` state
inside it at once, not just the one under the cursor. Fix: give the inner
component a **named** group (`group/card` + `group-hover/card:...`) so its
hover state only scopes to itself. Default to named groups for anything
that might end up nested inside another `group`-using component.

## Reusable components

Copy these into a new project's `src/components/` as a starting kit —
they're already generic enough to reuse with different data:

| File | What it is |
|---|---|
| `components/ui/skeleton.tsx` | Base `animate-pulse` skeleton primitive |
| `lib/use-delayed-loading.ts` | The anti-flash delayed-skeleton hook |
| `components/dashboard/vertical-item-card.tsx` | `PosterCard` — icon/cover-image badge, title, truncated description, date + CTA chip footer, all inside one link |
| `components/dashboard/static-carousel.tsx` / `components/ui/marquee.tsx` | Scroll-snap row / auto-scrolling row, both with the edge-fade mask |
| `components/library/list-item-row.tsx` | Row layout for list pages (icon, title, description, meta, visibility pill, delete) |
| `components/library/sort-control.tsx` + `lib/group-by-recency.ts` | "This week" / month-bucket grouping + a sort dropdown |
| `components/diagram/edit-details-button.tsx` | The "consolidate secondary fields behind a pencil-icon popover" pattern (description/cover image/visibility/folder) |

## Non-negotiables carried over from `AINSTRUCTIONS.md`

New projects should start with the same enforcement, not just the same
intent: JSDoc required on any function over ~20 lines, no `any`, no
`@ts-ignore`/`@ts-expect-error`, every function has an explicit return
type, no floating promises — all as ESLint errors, not style suggestions.
`npm run lint` and `npm run typecheck` both clean before any change is
considered done.
