# Design System Strategy: The Introspective Monolith

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Sanctuary."** Unlike traditional productivity tools that feel like spreadsheets or rigid journals, this system treats the interface as a living, breathing space for reflection. We are moving away from the "app-as-a-tool" and toward "app-as-an-atmosphere."

To break the "template" look, we employ **Intentional Asymmetry**. Instead of centering every element, we use the `Spacing Scale` (specifically `12` and `16`) to create wide, editorial margins that allow content to breathe. Overlapping elements—such as a waveform bleeding slightly over a card boundary—create a sense of organic depth, moving the UI away from a flat grid and toward a high-end editorial layout.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
The palette is rooted in deep, contemplative tones, designed to reduce eye strain and encourage late-night reflection.

*   **Primary (`#accec5` Sage):** Reserved exclusively for moments of growth—active recording states, successful saved entries, and progress indicators.
*   **Tertiary (`#ffb4a1` Red):** A soft, muted highlight for emotional triggers or delete actions. It is never aggressive, always "subtle red."
*   **The "No-Line" Rule:** We do not use 1px solid borders to section content. Boundaries are defined strictly through background shifts. For example, a `surface-container-low` (`#1a1c1c`) section sits on a `background` (`#121414`) to denote a functional area.
*   **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of fine, dark paper. 
    *   *Base Layer:* `surface`
    *   *Interaction Layer:* `surface-container-low`
    *   *Elevated Content (Cards):* `surface-container-high`
*   **The Glass & Gradient Rule:** Floating elements, such as the recording playback bar, must use **Glassmorphism**. Apply `surface-container` at 70% opacity with a `20px` backdrop blur. Use a subtle linear gradient from `primary` to `primary-container` for the "Record" button to give it a "soulful" glow rather than a flat, plastic look.

---

## 3. Typography: The Human-Machine Dialogue
We pair the technical precision of **Neue Machina** (Space Grotesk as the functional alternative) with the approachable clarity of **Manrope**.

*   **Display & Headlines (Space Grotesk/Neue Machina):** Used for dates, mood titles, and prompts. The ink-trap inspired geometry of Neue Machina provides that "tech-forward yet personal" tension. 
    *   *Rule:* Use `display-lg` for single-word mood summaries to create an editorial, poster-like feel.
*   **Body & Labels (Manrope):** All voice-to-text transcriptions and metadata use Manrope. It is optimized for readability, ensuring that long reflections feel effortless to consume.
*   **Hierarchy:** High contrast in scale is mandatory. A `display-sm` headline should be paired with `body-sm` metadata to emphasize the importance of the thought over the data.

---

## 4. Elevation & Depth: Tonal Layering
We reject traditional drop shadows in favor of **Ambient Light** and **Tonal Layering**.

*   **The Layering Principle:** To lift a mood-analysis card, do not add a shadow. Instead, place a `surface-container-highest` (`#333535`) card atop a `surface-container-low` (`#1a1c1c`) background. The delta in luminance creates a natural, soft lift.
*   **Ambient Shadows:** If a floating action button (the Recording Circle) requires a shadow, use the `on-surface` color at 6% opacity with a blur radius of `32px`. It should feel like a soft glow, not a hard shadow.
*   **The Ghost Border:** For input fields, use the `outline-variant` token at **15% opacity**. This provides a "hint" of a container without breaking the minimalist flow.

---

## 5. Components: Fluidity & Form

### The Circular Recorder
*   **Form:** A perfect `rounded-full` circle using `primary-container`. 
*   **Interaction:** On tap, the button expands slightly using a `spring` animation.
*   **Visual:** Surround the button with an **Animated Waveform** that uses `primary` and `primary-fixed-dim`. The waveform should be fluid, not jagged, mimicking the ebb and flow of breath.

### Elegant Calendar Views
*   **Layout:** Remove all grid lines. Use `spacing-6` between dates.
*   **State:** The current day is marked with a subtle `primary` dot (`4px`) underneath the number. Selected days use a `surface-bright` circular background with `on-surface` text.

### Data Visualization (Mood Analysis)
*   **Cards:** Forbid divider lines. Use `spacing-8` of vertical white space to separate the "Mood Trend" from "Common Keywords."
*   **Charts:** Use soft, rounded paths for line charts. Fill the area under the curve with a gradient from `primary` (20% opacity) to `transparent`.

### Inputs & Reflection Fields
*   **Text Inputs:** No bottom border. Use a `surface-container-lowest` background with a `rounded-md` corner.
*   **States:** When active, the "Ghost Border" increases to 30% opacity of the `primary` token.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use extreme white space. If you think there is enough space, add `spacing-4` more.
*   **DO** use "low-contrast" labels (`on-surface-variant`) for secondary info to keep the focus on the user's words.
*   **DO** ensure all transitions are "Ease-In-Out" with a duration of 300ms to maintain the "Calm" atmosphere.

### Don't
*   **DON'T** use 100% black (`#000000`). Always use the `surface` or `background` tokens to maintain depth.
*   **DON'T** use sharp corners. Everything must adhere to the `rounded-md` (1.5rem) or `rounded-lg` (2rem) scale to feel approachable.
*   **DON'T** use standard "Success Green" or "Error Red." Only use the `primary` (Sage) and `tertiary` (Subtle Red) tokens provided to maintain the sophisticated color profile.