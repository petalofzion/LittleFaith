# 2) Little Faith Brand UI Brief & Style Guide

## 2.0 UI North Star

**Visual identity in one line:**
Modern sacred warmth—**golden halo** accents on calm surfaces, optimized for long reading.

**Core UI objectives**

* Make Scripture **feel readable and present**
* Make advanced tooling **feel optional**
* Make theming **feel like a first-class feature**, not a gimmick

---

## 2.1 Design system approach (DaisyUI + semantic tokens)

### The rule: semantic colors, not hard-coded colors

Use DaisyUI semantic utilities (e.g., `bg-primary`, `text-base-content`) rather than fixed Tailwind color classes. DaisyUI explicitly recommends semantic color names because they make theming easier and keep colors consistent across themes. ([daisyUI][14])

### Required color roles (DaisyUI contract)

At minimum, every theme defines:

* `primary` / `primary-content`
* `secondary` / `secondary-content`
* `accent` / `accent-content`
* `neutral` / `neutral-content`
* `base-100` / `base-200` / `base-300` / `base-content`
* `info`, `success`, `warning`, `error` (+ their `*-content`) ([daisyUI][14])

This becomes your **Theme Contract v1**. Themes and plugins must not invent new meanings for these roles.

---

## 2.2 Brand color system (Little Faith Halo Gold)

### Primary brand color

You provided:

* **Halo Gold A:** `#e8c36e`
* **Halo Gold B:** `#f6c543` (brighter)

**Recommendation**

* Use **Halo Gold B (`#f6c543`)** as `primary` for brand energy.
* Use **Halo Gold A (`#e8c36e`)** for subtle gradients, borders, and glows.

### Critical contrast note (very important)

Bright gold **does not work as text on white** for accessibility (it’s too low contrast). Use gold primarily as:

* button fills (with dark text)
* accents, borders, icons on dark surfaces
* glows/gradients behind focal elements

For link text on light backgrounds, use a darker “gold-ink” accent (example: a deeper amber/brown) to hit contrast targets from WCAG guidance. ([W3C][7])

### Supporting palette (suggested)

* **Ink (text):** near-black charcoal (comfort > pure black)
* **Parchment (light surfaces):** warm off-white base
* **Mid surfaces:** subtle warm grays
* **Dark mode surfaces:** deep blue-charcoal, not pure black (reduces glare)
* **Accent (link/interactive text on light):** darker amber/brown

### Halo effects (brand signature)

Use a restrained glow:

* `primary/10` to `primary/0` radial gradient behind:

  * app icon area
  * primary CTA
  * “Continue reading” card
    Rule: **no more than 1–2 halo glows per screen**.

---

## 2.3 Typography system (reader-first)

### Font pairing (recommended defaults)

* UI sans: **Manrope** (or system UI font stack)
* Reader serif (optional): **Source Serif 4** / **EB Garamond** (for Scripture text)

### Text sizing (MVP)

Expose exactly 3 choices immediately:

* **Small**
* **Comfortable (default)**
* **Large**

Then in later phases, add:

* slider (fine grain)
* “serif vs sans” toggle for Scripture body
* line height toggle (Normal / Relaxed)

### Line length (measure)

For continuous reading, keep line length in the “good reading zone” (commonly ~50–75 characters per line). ([Baymard Institute][2])
Implementation: constrain the reader column with a max width and generous side padding.

---

## 2.4 Layout, framing, compositing

### MVP layout (Phase 1)

* App shell:

  * Left sidebar (nav)
  * Top bar (contextual actions)
  * Main content area
* Reader page:

  * centered column
  * minimal tool chrome
  * floating quick controls (text size, theme, focus mode)

### Mature layout (Phase 3+)

* Split-pane system:

  * Reader + Commentary + Notes panels
  * panels are dockable/resizable
* Workspaces:

  * saved layouts (e.g., “Reading”, “Study”, “Homily Prep”)

### Visual hierarchy rules

* One primary action per screen (gold emphasis)
* Secondary actions use neutral styling
* Destructive actions use `error` styling, never gold

---

## 2.5 Component styling rules (DaisyUI-based)

### Buttons

* Primary CTA: `btn btn-primary`
* Primary CTA text must use `primary-content` (dark ink on gold)
* Secondary: `btn btn-secondary` (muted)
* Tertiary: `btn btn-ghost`
* Destructive: `btn btn-error`

### Cards

* Default dashboard module: `card bg-base-100 border border-base-300`
* Focus card (Continue Reading): subtle halo glow behind card, not inside text

### Inputs

* Inputs must have clear focus rings and meet non-text contrast guidance (3:1 for component boundaries/indicators). ([W3C][8])

### Tabs / Split views

Follow ARIA patterns for keyboard navigation (arrow keys inside tablist, etc.) for accessibility consistency. ([W3C][9])

### Modals

Follow focus-trap guidance for modal dialogs. ([W3C][10])

### Tooltips

Tooltips are for supportive hints, not critical instructions. Keep them short. ([Nielsen Norman Group][6])

---

## 2.6 Iconography and imagery

### Icon style

* Use one consistent set (e.g., Lucide icons) and stick to:

  * 1.5–2px stroke
  * rounded line caps
  * avoid mixing filled + outline styles randomly

### Religious imagery

* Keep it symbolic and calm:

  * seed/halo motifs
  * subtle cross forms as geometry (avoid heavy illustration early)
* Don’t overload the UI with devotional art; let the text be the centerpiece.

---

## 2.7 Motion and interaction feel

* Transitions should be fast and gentle (avoid bouncy “app store game” vibes).
* Prefer fades and short slides.
* Respect reduced-motion preferences.

---

## 2.8 Theming architecture (implementation-ready)

### How DaisyUI themes apply

* Themes are enabled in DaisyUI and applied via `data-theme="themeName"` on the `<html>` element. ([daisyUI][4])
* DaisyUI supports semantic color utilities (e.g. `bg-primary`) mapped to theme variables. ([daisyUI][14])
* DaisyUI also supports nesting themes by applying `data-theme` to any subtree. ([daisyUI][4])
  This enables a future where the Reader could have its own theme distinct from the chrome—**but don’t do that in MVP**.

---

### Theme Contract v1 (what every theme must define)

Minimum required (matching DaisyUI roles):

* All roles from §2.1 (primary/secondary/accent/neutral/base/info/success/warning/error + content)

Plus Little Faith additions (stored in your own schema):

* `font.ui` (e.g., Inter)
* `font.reader` (e.g., Source Serif 4)
* `radius.scale` (soft/medium/sharp)
* `reader.lineHeight` (normal/relaxed)
* `halo.intensity` (0–100)

### Theme storage format (user-editable)

**`theme.json`** (human-readable), example shape:

```json
{
  "id": "littlefaith-halo",
  "name": "Little Faith Halo",
  "type": "light",
  "daisyui": {
    "primary": "#f6c543",
    "primary-content": "#0b0f14",
    "secondary": "#1f2937",
    "secondary-content": "#f8fafc",
    "accent": "#a16207",
    "accent-content": "#ffffff",
    "neutral": "#111827",
    "neutral-content": "#f8fafc",
    "base-100": "#fcfbf8",
    "base-200": "#f5f2ea",
    "base-300": "#ede8dd",
    "base-content": "#0b0f14",
    "info": "#2563eb",
    "success": "#16a34a",
    "warning": "#f59e0b",
    "error": "#dc2626"
  },
  "littlefaith": {
    "font": { "ui": "Inter", "reader": "Source Serif 4" },
    "reader": { "lineHeight": "relaxed" },
    "halo": { "intensity": 35 }
  },
  "version": 1
}
```

### Runtime application strategy (works in Tauri)

* Built-in themes are compiled normally.
* User themes are loaded from disk, converted into CSS variables, then injected into a `<style>` tag.
* Switching themes only changes `document.documentElement.dataset.theme`.

This keeps theme switching instant and avoids recompiling Tailwind.

---

## 2.9 Theme & plugin packaging (for future store)

### Theme pack (`.lftheme`)

A zipped bundle:

* `manifest.json` (name, author, version, tags)
* `theme.json` (the contract above)
* `preview.png` (optional)
* `license.txt` (required)

### Plugin pack (`.lfplugin`)

Separate track; plugins require explicit permissions.

Tauri’s capabilities/permissions system exists specifically to limit what the frontend and plugins can access, and plugin permissions can be tailored. ([Tauri][12])

---

## 2.10 UI implementation roadmap — least complex → most committal

### Stage 1 — MVP Visual System (least committing)

* Implement **one official theme**: “Little Faith Halo” (light + dark variants)
* DaisyUI semantic classes everywhere
* Typography scale + 3 text sizes
* Reader measure constraints (line length)
* Minimal component set: buttons, cards, inputs, tabs, modal, tooltip

### Stage 2 — Theming Foundation

* Theme switcher UI
* Persist theme + text size in UserVault
* Add 2–4 curated themes (High Contrast, OLED Dark, Parchment)

### Stage 3 — Theme Editor + Export/Import

* Create/edit theme (guided)
* Export `.lftheme`
* Import `.lftheme`
* Contrast warnings (WCAG-based targets) ([W3C][15])

### Stage 4 — Theme Marketplace UI (store shell)

* Browse, preview, install themes
* Rating/tags/search
* Trust signals (verified author, signed packs) — more engineering commitment

### Stage 5 — Full plugin store + permissions UI (most committal)

* Plugins with permissions prompts
* Per-plugin permission management UI
* “Safe mode” launch option (disable all plugins)

---

## 2.11 UI QA checklist (fast and brutal)

**Every screen**

* Works at Small/Comfortable/Large text without clipping
* Keyboard reachable and usable
* Focus states visible (and not only color-dependent)
* No “gold text on white” for important text
* No tooltip contains critical instructions ([Nielsen Norman Group][6])

**Reader**

* Long-session comfortable contrast
* Measure constrained for readability ([Baymard Institute][2])
* Focus mode is one click away

---

## Final note: why this will actually be theme-shareable later

Because you’re standardizing early on:

* **Semantic color roles** (DaisyUI contract) ([daisyUI][14])
* **Theme application mechanism** (`data-theme`) ([daisyUI][4])
* A **Theme Contract v1** that doesn’t change every week

That combination is what makes “user-made themes + store later” realistic instead of a perpetual refactor.

---
