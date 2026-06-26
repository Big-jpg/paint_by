# PBN App Design Brainstorm

## Three Approaches

### 1. Atelier Mono
**Brief Intro:** A stark, monochromatic workspace inspired by printmaking studios — black/white/warm gray with a single accent. The tool recedes; the output is the star.
**Probability:** 0.04

### 2. Chromatic Utility
**Brief Intro:** Bold, saturated color blocks and geometric shapes that celebrate the act of color separation itself — playful but precise.
**Probability:** 0.06

### 3. Paper & Ink
**Brief Intro:** Textured paper background, inked borders, hand-drawn feel — evokes the physical paint-by-numbers kit experience.
**Probability:** 0.03

---

## Chosen Approach: Atelier Mono

### Design Movement
Swiss International / Brutalist Utility — function-first with deliberate typographic hierarchy and generous whitespace.

### Core Principles
1. **Output supremacy** — the generated PBN artwork dominates the viewport; UI chrome is minimal and recedes
2. **Monochrome discipline** — interface uses only black, white, and warm grays; color belongs to the output
3. **Precision typography** — clear hierarchy through weight and size, not decoration
4. **Visible process** — progress is communicated through clean, animated bars, not flashy effects

### Color Philosophy
The interface is deliberately colorless so the generated paint-by-numbers palette pops with maximum contrast. A single warm accent (amber/ochre) signals interactive affordances. Background is a warm off-white (#FAFAF8) to avoid clinical sterility.

- Background: `#FAFAF8` (warm paper white)
- Surface: `#FFFFFF` (cards/panels)
- Border: `#E8E5E0` (warm gray)
- Text primary: `#1A1A1A`
- Text secondary: `#6B6560`
- Accent: `#C87A2F` (burnt ochre — interactive elements only)
- Progress bar: `#1A1A1A` (black)

### Layout Paradigm
Single-column centered workspace with generous margins. The upload zone occupies the full content width. Results display the SVG at maximum available width with the palette and downloads as a compact sidebar on desktop, stacked below on mobile.

### Signature Elements
1. **Hairline borders** — 1px warm gray lines define zones without visual weight
2. **Oversized step counter** — during processing, a large monospace numeral shows the current pipeline step (1/7, 2/7...)
3. **Palette strip** — horizontal row of numbered color swatches with hex values, reminiscent of Pantone chips

### Interaction Philosophy
Interactions are immediate and tactile. Buttons use a subtle scale-down on press. The drop zone responds to drag with a dashed border animation. No gratuitous transitions — motion serves feedback only.

### Animation
- Drop zone: dashed border animates (dash-offset) on drag-over
- Progress bar: smooth width transition (200ms ease-out)
- Results: fade-in with slight upward translate (opacity 0→1, translateY 8px→0, 300ms)
- Button press: scale(0.97) on :active, 150ms ease-out
- Settings panel: height collapse/expand with 250ms ease-out

### Typography System
- **Display/Heading:** "DM Mono" (monospace) — bold, used for the app title and step counters
- **Body:** "Inter" weight 400/500 — used for descriptions, labels, settings
- **Accent text:** "DM Mono" regular — used for file names, color hex values, technical readouts

### Brand Essence
**Positioning:** A precision tool for artists who want clean paint-by-numbers output without noise.
**Personality:** Precise, confident, understated.

### Brand Voice
Headlines are short, declarative, technical. CTAs are verb-first and specific.
- "Drop an image. Get a numbered canvas."
- "Export SVG — print at any scale."

### Wordmark & Logo
A geometric paint-drop shape formed from overlapping numbered segments — abstract, recognizable at small sizes. No text in the mark itself.

### Signature Brand Color
Burnt Ochre `#C87A2F` — warm, artistic, distinct from typical tech blue/purple.
