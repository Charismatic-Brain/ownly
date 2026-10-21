---
name: apple-design
description: >-
  Apple interface design philosophy, fluid physical motion principles, and tactile interaction rules for web frontends. Use when designing, building, or refining user interfaces, animations, gestures, modals, slide-overs, buttons, sheets, or visual components to feel fluid, responsive, tactile, and native.
---

# Apple Design & Fluid Interfaces Engineering Skill

This skill translates Apple's design philosophy, Human Interface Guidelines (HIG), and fluid physical motion principles (distilled from Apple's legendary WWDC *Designing Fluid Interfaces* session) into actionable, high-craft rules for modern web applications.

---

## 1. The Core Philosophy

Traditional web UI treats animation as a decorative timeline (fixed durations, static easing curves, and un-interruptible keyframes). 
**Apple design treats UI as physical material governed by Newtonian mechanics.**

> **The Fluid Interaction Through-line:**
> An interface feels truly alive and trustworthy when:
> 1. Motion **starts immediately** from the element's current on-screen presentation value.
> 2. Motion **inherits the kinetic velocity** of the user's gesture.
> 3. Motion **projects momentum forward** to a natural resting state.
> 4. Any gesture or transition can be **interrupted, redirected, or reversed** at any millisecond without snapping.

### Apple's Four Human Needs Framework
Every UI decision must satisfy one or more of these foundational human needs:
1. **Safety & Predictability:** The interface never behaves unexpectedly. Direct manipulation always produces consistent, immediate physical reactions.
2. **Understanding & Spatial Context:** Elements transform from their origin; windows expand from their cards; items collapse into their folders. Users never lose spatial orientation.
3. **Achievement:** Every action gives instant sensory confirmation. Nothing feels uncertain or stalled.
4. **Joy:** Purposeful, delightful micro-interactions and tactile physics elevate functional software into an experience people love using.

---

## 2. Core Technical Rules for Fluid Motion

### Rule 1: Kill Latency — Immediate Response
- **Trigger feedback on `pointerdown`**, never wait for `pointerup` or `click`.
- When a user touches or clicks a button, card, or tab, apply active feedback (e.g. `scale(0.97)`, subtle brightness shift, or background highlight) within **16ms** (the very next display frame).
- Eliminate artificial interaction delays or synthetic ripple effects that lag behind user input.

### Rule 2: Behavior over Animation — Springs over Easings
- **Never use fixed-duration linear or ease-in-out curves for interactive elements.**
- Use **critically damped or slightly underdamped springs** (`damping`, `stiffness`, `mass`).
- **Why Springs?** 
  - Springs have no fixed duration. The speed of the animation is automatically calculated based on the distance to travel and the entry velocity.
  - Springs preserve continuous momentum. If an element is moving fast, it naturally overshoots slightly and settles smoothly.
- **Recommended Spring Presets:**
  - **Snappy / Interactive (Buttons, toggles, small controls):**
    `stiffness: 400, damping: 30, mass: 0.8` (response: ~0.3s)
  - **Fluid / Surface (Modals, cards, dropdown menus):**
    `stiffness: 300, damping: 28, mass: 1` (response: ~0.4s)
  - **Gentle / Sheet (Slide-over drawers, full-page transitions):**
    `stiffness: 200, damping: 25, mass: 1` (response: ~0.5s)
  - **Bouncy / Feedback (Badges, icons, like reactions):**
    `stiffness: 500, damping: 18, mass: 1` (slight playful bounce)

### Rule 3: 1:1 Direct Manipulation
- During drag, swipe, or pull gestures, the element must stay locked **1:1** to the pointer coordinates.
- Never add artificial smoothing or lag between the pointer and the dragged surface during an active touch/drag.
- Use `setPointerCapture` so drag operations do not lose tracking if the cursor temporarily leaves the element bounds.

### Rule 4: Velocity Handoff & Momentum Projection
- When releasing a dragged element (like a dismissible modal or swipeable item):
  1. Calculate the instantaneous release velocity: $v = \frac{\Delta x}{\Delta t}$ or $\frac{\Delta y}{\Delta t}$.
  2. Feed that velocity directly into the exit or snap spring animation as the initial velocity (`velocity: gestureVelocity`).
  3. If the user flicks the modal downward with high velocity, it must dismiss immediately in the direction of the flick, even if the drag distance was small.
  4. If the user drags downward slowly past the threshold, it dismisses gently. If dragged and released with upward velocity, it springs back open.

### Rule 5: Boundary Resistance & Rubber-Banding
- When dragging an element past its valid boundary (e.g. over-scrolling or pulling down a sheet already at the top), apply logarithmic resistance:
  $$x_{\text{display}} = x_{\text{boundary}} + (x - x_{\text{boundary}}) \times 0.35$$
- Upon release, spring back to $x_{\text{boundary}}$ with a snappy recovery spring.

### Rule 6: Absolute Interruptibility
- If an element is animating towards closed and the user taps or drags it, it must **freeze and track from its current visual position**.
- Never allow an animation to force a completion cycle before accepting new input.

---

## 3. Visual Materials, Lighting & Depth

### Translucent Materials (Glassmorphism & Vibrancy)
- Apple interfaces use layered materials rather than flat solid blocks to establish depth hierarchy:
  - **Top bars & headers:** `backdrop-filter: blur(20px) saturate(180%)` with semi-transparent background (e.g. `bg-slate-900/80` or `rgba(15, 23, 42, 0.75)`).
  - **Floating panels & modals:** Multi-layered background with a 1px delicate specular border (`border border-white/10` in dark mode, `border-black/5` in light mode).
  - **Drop shadows:** Never use harsh, single-point black shadows. Use soft, diffused, multi-layered shadows:
    `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.25)`

### Restraint & Hierarchy
- **Quiet Surfaces:** Let user content (documents, photos, data) take center stage. The application chrome should recede into the background.
- **Consistent Tint Color:** Choose one primary accent (e.g. Apple blue `#007AFF`, teal `#0EA5E9` / `#14B8A6`, or purple) for interactive callouts, selection rings, and primary actions. Do not use competing loud colors.

### Typography & Polish
- Use Apple system font stacks: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif`.
- **Optical Letter-Spacing:**
  - Large headings ($> 24\text{px}$): Tight tracking (`tracking-tight` or `-0.02em`).
  - Small labels, tags, captions ($< 12\text{px}$): Slightly relaxed tracking (`tracking-wider` or `+0.04em`) with uppercase bold weights.
- **Line Heights:** Always maintain comfortable leading (`leading-relaxed` for prose, `leading-tight` for titles).

---

## 4. Accessibility & Reduced Motion

- **Honor `prefers-reduced-motion`:**
  - When the user enables reduced motion, do not merely turn off CSS transitions and leave the UI feeling broken or abrupt.
  - Replace spring translations, scale bounces, and spatial shifts with an elegant **subtle cross-fade** (opacity fade: 150ms).
  - Keep state changes immediate and functional.
- **Minimum Tap Targets:** Ensure interactive buttons, icons, and list items have a touch area of at least **44 × 44 pt** (`min-h-[44px] min-w-[44px]`), even if the visible icon is only 18–20px.
- **Contrast Ratios:** Maintain at least 4.5:1 contrast for regular text and 3:1 for large text and active control states.

---

## 5. Web Implementation Quick Reference

### Pointer-Down Tactile Feedback (Tailwind + CSS)
```tsx
<button
  className="
    inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium
    bg-brand-500 text-white shadow-sm shadow-brand-500/20
    transition-transform duration-100 ease-out
    active:scale-[0.97] active:brightness-95
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2
  "
>
  Save Changes
</button>
```

### Apple-Style Glass Dialog / Card Surface
```tsx
<div
  className="
    bg-slate-900/80 backdrop-blur-xl
    border border-white/10
    rounded-2xl p-6
    shadow-2xl shadow-black/50
  "
>
  {/* Content */}
</div>
```

---

## Summary Checklist Before Approving a UI Component
- [ ] Does feedback occur on pointer-down without hesitation?
- [ ] Are animations driven by natural springs rather than linear or ease curves?
- [ ] Can interactions and gestures be interrupted or redirected mid-motion?
- [ ] Does typography employ tight tracking on titles and optical sizing on captions?
- [ ] Are translucent materials layered with subtle specular borders and diffused shadows?
- [ ] Is `prefers-reduced-motion` cleanly supported with soft opacity fades?
- [ ] Are touch/click targets at least 44×44px?

