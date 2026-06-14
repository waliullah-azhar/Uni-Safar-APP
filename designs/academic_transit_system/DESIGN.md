---
name: Academic Transit System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#3f4944'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#6f7973'
  outline-variant: '#bec9c2'
  surface-tint: '#1b6b51'
  primary: '#004532'
  on-primary: '#ffffff'
  primary-container: '#065f46'
  on-primary-container: '#8bd6b7'
  inverse-primary: '#8bd6b6'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#3a3c3e'
  on-tertiary: '#ffffff'
  tertiary-container: '#515355'
  on-tertiary-container: '#c5c7c9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a6f2d1'
  primary-fixed-dim: '#8bd6b6'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513b'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e1e2e4'
  tertiary-fixed-dim: '#c5c6c8'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-xl:
    fontFamily: manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  inset-squish: 12px 24px
  inset-equal: 20px
---

## Brand & Style
The brand personality is authoritative yet accessible, focusing on reliability, safety, and efficiency for student commuters. The design style is **Modern Corporate**, leaning into high-clarity minimalism. It prioritizes information density and scannability over decorative elements. By utilizing a "High-Trust" aesthetic, the system feels institutional and dependable, ensuring students feel secure while navigating their transit options.

## Colors
This design system utilizes a restricted, high-contrast palette to ensure accessibility and professional rigor.

- **Primary Emerald (#065f46):** Used for primary actions, success states, and brand signatures. It signifies safety and institutional trust.
- **Pure White (#ffffff):** The primary surface color to maintain a clean, "paper-like" feel.
- **Light Gray (#f3f4f6):** Used for secondary backgrounds, structural grouping, and subtle UI divisions.
- **Charcoal Black (#111827):** The sole color for text and critical icons, ensuring maximum legibility against light backgrounds.

## Typography
Manrope is the foundational typeface, chosen for its modern geometric structure and excellent legibility at small sizes. The typographic hierarchy is "ultra-sharp," meaning we use tight letter spacing for headlines and generous line heights for body text to aid student scanning speeds. All text uses Charcoal Black (#111827) unless placed on a Primary Emerald background, in which case it must be Pure White (#ffffff).

## Layout & Spacing
The layout follows a **Fixed Grid** model on desktop (1200px max-width) and a **Fluid Grid** on mobile devices.

- **Grid:** 12-column layout for desktop, 4-column for mobile.
- **Rhythm:** A 4px baseline grid governs all spacing.
- **Padding:** Generous internal padding (20px minimum for cards) is required to prevent visual clutter and ensure "tapability" for students on the move.
- **Reflow:** On mobile, side-by-side elements (like route info) should stack vertically to maintain high-contrast text sizing.

## Elevation & Depth
This design system avoids heavy, blurry shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

- **Depth Tiers:** Use Light Gray (#f3f4f6) for the base background and Pure White (#ffffff) for foreground cards to create natural separation.
- **Borders:** All interactive elements and cards must feature a subtle 1px inner border in Light Gray (#f3f4f6) or a slightly darker gray variant to define boundaries without adding visual weight.
- **Flat Elevation:** Interactive states (hover/active) should be indicated by color shifts (e.g., Primary Emerald darkening slightly) rather than a change in shadow depth.

## Shapes
Following the requirement for 16px corners, the system adopts a **Rounded** shape language.

- **Standard Elements:** 0.5rem (8px) for small components like chips or input fields.
- **Large Elements:** 1rem (16px) for primary containers, cards, and modal sheets.
- **Interactive Elements:** Buttons should match the card roundedness (16px) to maintain a cohesive, modern silhouette.

## Components
- **Buttons:** Large (48px height), 16px rounded corners, with Primary Emerald background and White text. Secondary buttons use a Light Gray background with Charcoal text.
- **Cards:** Pure White background, 16px rounded corners, 1px Light Gray border, and 20px-24px padding. No shadows.
- **Chips:** Small, 8px rounded corners, used for "Route Status" (e.g., "On Time"). Use Light Gray background with Bold Charcoal text.
- **Input Fields:** 1px solid border in Light Gray, shifting to Primary Emerald on focus. High-contrast placeholder text.
- **Transit Lists:** Rows separated by 1px horizontal dividers. Use large, bold Manrope for "Minutes Until Arrival" to ensure instant scannability.
- **Wayfinding Icons:** Minimalist line icons in Charcoal Black. Active navigation tabs use Primary Emerald for both icon and label.