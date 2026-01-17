# 1) Little Faith Brand UX Brief & Implementation Roadmap

## 1.0 Purpose and UX North Star

**Product promise (in one sentence):**
Little Faith makes deep Scripture study feel calm, readable, and powerful—without forcing users to wade through denominational features they don’t want.

**North Star UX outcomes**

* **Immediate clarity:** first-run setup gets a user into reading within **30–60 seconds**.
* **Deep study without chaos:** advanced tools exist, but they are **progressively disclosed** (revealed when needed), keeping the primary UI simpler and less error-prone. ([Nielsen Norman Group][1])
* **Reader-first comfort:** typography, spacing, and contrast support long sessions (this is not a “dashboard that shouts”).
* **User agency:** features, dashboards, and themes are user-controlled and reversible.

**Primary audiences (initial)**

1. **Everyday Catholic reader** (wants daily rhythm + notes + simple search)
2. **Serious Catholic studier** (commentaries, crossrefs, original language tools later)
3. **Clergy/catechist** (lesson prep, quick retrieval, topical collections)
4. **Future expansion:** Protestant / non-denominational / other faith libraries (but **opt-in**)

---

## 1.1 Brand experience principles

These are “behavioral constraints” for UX decisions:

### A) Reverent calm, not sterile minimalism

* Calm surfaces, gentle motion, low visual noise.
* “Gold halo” accent communicates warmth and sacredness—used with restraint (see UI doc).

### B) Progressive disclosure as a default pattern

* Most users should succeed using only the “front layer” of the app.
* Advanced workflows appear via:

  * “More options…”
  * right-click/context menus
  * tool panels that can be added to a workspace
    Progressive disclosure reduces overwhelm by deferring rarely used/advanced features. ([Nielsen Norman Group][1])

### C) The app never argues with the user’s faith life

* Avoid guilt/shame microcopy.
* Don’t label users aggressively (“Choose your denomination NOW”).
* Offer presets that are easy to change later.

### D) Reading ergonomics are sacred ergonomics

* Target readable line length for continuous reading (roughly **50–75 characters per line** as a practical range). ([Baymard Institute][2])
* Provide text sizing immediately (Small / Medium / Large), and later a slider.

---

## 1.2 Experience architecture

### Global information architecture (IA)

You want a **stable, boring navigation spine** that plugins extend without breaking:

**Top-level (MVP)**

* **Home**
* **Read**
* **Search**
* **Library** (modules/texts)
* **Notes**
* **Settings**

**Later additions (phase-gated)**

* **Study** (workspace-centric tools: crossrefs, commentaries, dictionaries)
* **Today** (liturgical calendar + lectionary + Liturgy of the Hours)
* **Plugins & Themes** (store + local installs)

### Navigation model

Desktop-first means:

* Left sidebar (primary nav) + top bar (context actions)
* Command palette (later) for power users
* Tabs/workspaces (later) for multi-panel study

---

## 1.3 First-run onboarding: “Quick Setup” (least explicit denominational gating)

### Goal

A user should feel like they’re choosing **readability and focus**, not joining a faction.

### Quick Setup (Phase 1 / MVP) — 3 steps, 30–60 seconds

**Step 1 — “What do you want on your home screen?” (Focus preset)**
Show 3 cards (wording intentionally gentle):

1. **Catholic Rhythm**

   * Home shows: Today’s Mass readings (later), Saints (later), Catechism shortcuts, Church docs shortcuts
2. **Bible Study (Classic)**

   * Home shows: Reading plans, search, comparisons, notes
3. **Just Scripture (Minimal)**

   * Home shows: Continue reading, simple search, bookmarks

Under the hood, this sets **feature flags** and **dashboard modules** (details below). The user can change it later in Settings without penalty.

**Step 2 — “What’s easiest to read?”**

* **Small / Comfortable / Large**
* Optional: “Use serif text in reader” (later)
  This aligns with platform typography guidance: choose sizes most people can read easily. ([Apple Developer][3])

**Step 3 — Theme**

* **Light / Dark / System**
  DaisyUI supports default themes and prefers-dark behavior; you’ll map this to your theme engine. ([daisyUI][4])

**Done → Land in Read mode** (not in a complex dashboard).

### Phase 3 onboarding upgrade: “Interactive Tutorial”

Offer it after the first successful action (e.g., after they open their first passage), not immediately.

**Tutorial rules**

* Use contextual help and short walkthroughs; NN/g notes onboarding can be contextual rather than a forced tutorial. ([Nielsen Norman Group][5])
* Tooltips must not contain task-critical information and should be brief/helpful. ([Nielsen Norman Group][6])

---

## 1.4 Dashboard as modular “cards” (feature-flag driven)

### Dashboard modules (examples)

* Continue Reading
* Quick Search
* Bookmarks / Highlights
* Notes In Progress
* Today (later: lectionary)
* Liturgy of the Hours (later)
* Vatican News (later)
* Saints / Calendar (later)
* Recently Installed Resources
* “Customize Home” (always present)

### Why modules?

Because your onboarding “focus preset” is really:

* Which modules are visible
* What order they appear
* Which nav entries are pinned
* Which plugin “channels” are enabled

This is the simplest way to give Catholics “front-and-center Catholic stuff” without making non-Catholics dig through settings.

---

## 1.5 Reading experience UX spec (MVP → mature)

### MVP reading behaviors (Phase 1)

* Clean reader pane
* Book/chapter navigation
* Verse numbers toggle
* Quick font size toggle (Small/Med/Large)
* Highlight + note on verse
* Copy/share (desktop copy)

**Layout**

* Reader is centered with a maximum measure to protect readability (target that ~50–75 char/line range). ([Baymard Institute][2])

### Phase 2 reading upgrades

* Split view: compare translations
* “Focus mode” (hide chrome)
* Cross-reference peek (hover/click)
* Keyboard shortcuts for navigation

### Phase 4–5 reading/study convergence

* Workspaces (saved multi-panel layouts)
* Commentary sync with verse focus
* “Study sidebar” that can be shown/hidden (progressive disclosure in action)

---

## 1.6 Accessibility & interaction standards (non-negotiables)

### Contrast

* Text contrast should meet WCAG guidance (commonly **4.5:1** for normal text). ([W3C][7])
* Non-text UI components (borders, icons that convey meaning, focus rings) should meet **3:1** contrast guidance. ([W3C][8])

### Keyboard and ARIA patterns (especially important for a desktop study app)

* Use ARIA Authoring Practices patterns for complex widgets. ([W3C][9])
* Modal dialogs must trap focus; Tab/Shift+Tab shouldn’t escape the dialog. ([W3C][10])
* Ensure keyboard access principles for custom widgets (focusable elements, correct semantics). ([WebAIM][11])

### Motion

* Respect “reduced motion” OS setting.
* Animations should clarify cause/effect, not decorate.

---

## 1.7 Theming + plugin UX (user-facing behaviors)

### Phase 1: Theme switching (built-in)

* Settings → Appearance → Theme dropdown + Light/Dark/System
* Preview thumbnail per theme
* Persist per user

DaisyUI themes are enabled and applied via `data-theme` on the document root. ([daisyUI][4])

### Phase 3: Theme editing (user-authored themes)

* “Create theme” wizard:

  * pick base: Light or Dark
  * choose primary halo gold variant
  * adjust surfaces + text + accent
  * run automatic contrast checks (warn, don’t block)
* Export theme as a file (e.g., `.lftheme`)

### Phase 5: Theme sharing/store

* Browse themes (screenshots, tags: “High contrast”, “OLED”, “Parchment”, “Monastic”)
* Install with one click
* Security model: themes are “safe” (CSS vars only), plugins are gated with permissions (see below)

---

## 1.8 Implementation roadmap (UX) — least complex → most committal

### Phase 1 — MVP Foundations (least committing)

**Goal:** reading + basic study comfort + quick setup

* Quick Setup (focus preset, text size, theme)
* Basic nav + Home modules (Continue Reading, Search, Library shortcut)
* Reader with typography controls + highlighting + notes
* Settings: Appearance, Reading, Data location
* Accessibility basics (contrast targets, keyboard nav)

**Exit criteria**

* A new user can install, open, read, and create a note in under 2 minutes.

### Phase 2 — Study Comfort

* Split view (compare translations)
* Better search experience (filters, recent searches)
* Bookmarking, history, verse lists
* “Help” panel and non-intrusive tips

### Phase 3 — Personalization & Guided Learning

* Theme editor + import/export
* Contextual tutorial (tooltips + guided steps)
* Workspace “lite” (save panel layout)

### Phase 4 — Denominational feature packs (more committal)

* Catholic pack: lectionary, saints, Catechism linking
* Protestant pack: resources, reading plans emphasis
* Minimal pack: reading purity
  (These are still “presets” that toggle modules & plugins.)

### Phase 5 — Plugin/Theme Store (most committal)

* Store UX, ratings, trust signals
* Sandboxed plugins + explicit permissions
* Community theme marketplace

---

## 1.9 Permissions and trust (plugin UX + safety)

When you add a plugin store, you’re no longer just building an app—you’re building a **platform**.

Tauri v2 has a security model with **capabilities** and **permissions** that constrain what the frontend can access. ([Tauri][12])
Plugin permissions can be enabled/disabled and tailored per plugin. ([Tauri][13])

**UX requirement:**
Every plugin install flow must clearly state:

* what the plugin can access (files, network, vault)
* why it needs it
* what the user can revoke

---