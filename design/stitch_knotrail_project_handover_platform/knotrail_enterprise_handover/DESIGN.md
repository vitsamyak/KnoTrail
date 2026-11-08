---
name: KnoTrail Enterprise Handover
colors:
  surface: '#f3fcf2'
  surface-dim: '#d4dcd3'
  surface-bright: '#f3fcf2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf6ec'
  surface-container: '#e7f0e7'
  surface-container-high: '#e2ebe1'
  surface-container-highest: '#dce5db'
  on-surface: '#161d18'
  on-surface-variant: '#414844'
  inverse-surface: '#2a322c'
  inverse-on-surface: '#eaf3e9'
  outline: '#727973'
  outline-variant: '#c1c8c2'
  surface-tint: '#446554'
  primary: '#416352'
  on-primary: '#ffffff'
  primary-container: '#597c6a'
  on-primary-container: '#f5fff7'
  inverse-primary: '#aacfba'
  secondary: '#4a6456'
  on-secondary: '#ffffff'
  secondary-container: '#cae6d5'
  on-secondary-container: '#4f685a'
  tertiary: '#785600'
  on-tertiary: '#ffffff'
  tertiary-container: '#966e13'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5ebd5'
  primary-fixed-dim: '#aacfba'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#2c4d3d'
  secondary-fixed: '#cde9d8'
  secondary-fixed-dim: '#b1cdbc'
  on-secondary-fixed: '#072015'
  on-secondary-fixed-variant: '#334c3f'
  tertiary-fixed: '#ffdea6'
  tertiary-fixed-dim: '#f0bf5f'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#f3fcf2'
  on-background: '#161d18'
  surface-variant: '#dce5db'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  metric-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

The design system establishes a focused, calm, and pragmatic atmosphere engineered specifically for complex project knowledge-handover workflows in enterprise SaaS environments. Handover workflows are naturally high-friction moments plagued by ambiguity, information rot, and cognitive overload. The UI counters this stress with an architectural balance of warm natural tones, crisp typography, and uncluttered modular panels.

### Visual Aesthetic & Philosophy
- **Style Archetype:** Modern Corporate Minimalism with Organic Warmth. It rejects sterile high-gloss tech aesthetics in favor of a grounded, ergonomic palette reminiscent of premium editorial tools and tactile organizational surfaces.
- **Tone:** Methodical, reliable, clear, and reassuring.
- **Audience:** Engineering leaders, technical program managers, solution architects, and departing or incoming staff who require dense, structured audit trails and friction-free status comprehension.
- **Sensory Character:** Off-white canvas backgrounds juxtaposed with elevated pure white functional tiles, refined dark forest green accents, and understated status indicators that never shout.

## Colors

The color system directly reflects the organic, serene sage-and-canvas environment depicted in the reference design. Surfaces lean into warmth rather than cold steel or clinical blue.

### Primary Palette Roles
- **Primary Canvas Background (`#F3F4F0`):** A soft, warm-grey base canvas providing low eye-strain contrast against stark white panels.
- **Card / Surface Background (`#FFFFFF`):** High-clarity white for active cards, input modules, floating rails, and inspection surfaces.
- **Primary Accent (`#688B78`):** A muted sage green used for primary interactive states, highlighted chips, selected icons, and positive engagement points.
- **Deep Sage / Dark Accent (`#344D40`):** High-authority accent reserved for primary action button fills, prominent KPI cards, and critical headers.

### Neutral & Line Hierarchy
- **Text Primary (`#202822`):** Deep charcoal with subtle olive undertones for dense body text, major statistics, and titles.
- **Text Secondary (`#747D75`):** Muted sage-slate for metadata labels, table timestamps, hints, and placeholder text.
- **Border Subtle (`#E6E9E4`):** Delicate outline tone for cards, dividers, and pill containers to maintain boundary definition without visual clutter.

### Semantic Status Indicators
- **Verified / Clean Handover (`#668F74`):** Confirmed documents, approved pull-requests, verified access tokens.
- **Uncertain / Warning (`#D7A84B`):** Partial handovers, unassigned documentation blocks, pending sign-offs.
- **Conflicting / Danger (`#C96C67`):** Expired credentials, broken dependency links, blockers.
- **Missing / Neutral Status (`#9AA39C`):** Unstarted tasks, optional attributes, archived states.

## Typography

Typography relies entirely on the utilitarian clarity of Inter, calibrated specifically for density, numerical data, and structural hierarchy.

### Hierarchy & Application Rules
- **Display & Large Headlines:** Used exclusively for main view greetings and top-level portfolio overviews. Letter tracking is subtly compressed (`-0.02em` to `-0.015em`) to retain compactness across medium-to-large displays.
- **Metric Level (`metric-xl`):** Purpose-built for critical KPI blocks (e.g., handover completion percentages, remaining blocker counts, active contributors). Features tight vertical heights and semi-bold weight for immediate scan speed.
- **Card Headings (`headline-sm` / `headline-md`):** Maintain a strict 600 weight paired directly with `#202822` to clearly ground individual modular tiles.
- **Body & Secondary Text:** Body content defaults to regular weight (400) to keep long-form technical transition guides and architecture notes legible without crowding.
- **Badges & Labels (`label-sm`):** Rendered at 11px semi-bold with slightly expanded tracking (`+0.02em`) for status chips, micro-indicators, and pill tag metrics.

## Layout & Spacing

The layout philosophy follows a disciplined fluid modular grid structured around cards and floating vertical control surfaces, mirroring the organized dashboard architecture of the visual reference.

### Grid & Layout Structure
- **Sidebar Integration:** Uses a narrow, floating vertical pill navigation rail (64px to 72px wide) anchored with `margin` offsets from the outer viewport edges rather than pinning edge-to-edge.
- **Content Canvas:** A 12-column dynamic CSS grid with a standard `gutter` of 1.25rem (20px). Cards span contextual multiples: 3 columns for top stat metrics, 6 columns for detailed visual charts or transfer lists, and 3 columns for quick-action or status blocks.
- **Vertical Rhythm:** Row gaps mirror column gutters (20px / 1.25rem) to maintain symmetrical tile distribution.

### Component Internal Density
- **Micro Spacing (`space-2xs` to `space-xs`):** Reserved for icon-to-label gaps, badge internals, and inline delta percentages.
- **Component Padding (`space-md` to `space-lg`):** Standard internal padding for cards and panels. High-density metrics cards use `space-md` (16px), while comprehensive summary blocks utilize `space-xl` (24px).
- **Responsive Adaptations:** At tablet breakpoints (< 1024px), the 12-column grid collapses to 6 columns with 16px gutters; on mobile (< 768px), the floating navigation converts to a fixed bottom pill bar, and dashboard cards stack into a single column with 12px gutters.

## Elevation & Depth

Depth in this design system is achieved through organic surface contrast and warm, diffused ambient shadows rather than stark structural drop-shadows or heavy outlines.

### Elevation Levels
- **Canvas Base (Level 0):** Surface color `#F3F4F0`. Flat, non-interactive floor for the entire application.
- **Flat Panels & Cards (Level 1):** Solid `#FFFFFF` fill resting on the `#F3F4F0` base. Elevated with an ultra-soft, low-opacity warm ambient shadow:
  - `box-shadow: 0 4px 20px -2px rgba(32, 40, 34, 0.04), 0 2px 6px -1px rgba(32, 40, 34, 0.02);`
  - Accompanied by a 1px hairline border: `1px solid #E6E9E4`.
- **Floating Controls & Navigation Rails (Level 2):** Floating sidebar rails, floating pill search bars, and top-tier active modals:
  - `box-shadow: 0 10px 30px -4px rgba(32, 40, 34, 0.08), 0 4px 10px -2px rgba(32, 40, 34, 0.03);`
  - Crisp boundary defined with `1px solid rgba(230, 233, 228, 0.8)`.
- **Accentuated Highlight Panels:** Inverted colored cards (e.g., active milestone summaries or primary graph containers) utilize solid `#344D40` or `#688B78` backgrounds with no shadow, relying on pure chromatic contrast to step forward in space.

## Shapes

The shape vocabulary utilizes modern rounded geometry (`roundedness: 2`), balancing software utility with soft, accessible aesthetics.

### Curvature Tokens
- **Standard Structural Elements (`rounded` / 0.5rem / 8px):** Form inputs, dropdown selectors, nested list items, and table action trigger zones.
- **Cards & Primary Modules (`rounded-lg` / 1rem / 16px to 20px):** Content containers, metric tiles, progress charts, and profile info blocks.
- **Floating Navigation & Outer Panels (`rounded-xl` / 1.5rem / 24px):** Floating pill navigation containers, search headers, and elevated dialogs.
- **Fully Rounded (`rounded-full` / Pill):** Icon buttons, status chips, progress bars, floating search input fields, and circular profile avatars.

## Components

### Buttons
- **Primary Button:** Deep Sage fill (`#344D40`), crisp white text (`#FFFFFF`), `rounded-lg` (8px to 10px corner radius), 40px height for standard interface actions. Hover transition shifts background slightly toward `#202822`.
- **Secondary Button:** Surface white fill (`#FFFFFF`), subtle border (`1px solid #E6E9E4`), text color `#202822`. Hover introduces an ultra-light sage tint (`#F3F4F0`).
- **Accent / Micro Action:** Muted Sage fill (`#688B78`), white text, compact height (32px), `rounded-full` for inline task handoffs and document approvals.

### Cards & Panels
- **Standard Metric Card:** Solid white (`#FFFFFF`), 16px to 20px border radius, subtle border (`#E6E9E4`), internal padding of 20px. Displays secondary label on top, bold metric number below, paired with miniature trend sparklines or mini avatars on the right edge.
- **Inverted Dark Feature Card:** Background `#344D40` or `#688B78`, white typography, housing primary transition milestones, system progress radial charts, or critical handoff timelines.

### Navigation Rail (Floating Vertical Pill)
- A narrow, floating vertical pill container placed on the left side of the dashboard.
- Background `#FFFFFF` with Level 2 elevation and `#E6E9E4` border.
- Fully rounded ends with vertically stacked icon buttons. Active tab displays as a circular solid `#202822` or `#344D40` pill badge with an inverted white icon; inactive items feature `#747D75` icons that hover to `#202822`.

### Status Chips & Badges
- Compact height (22px to 26px), `rounded-full`, 8px horizontal padding.
- **Verified:** Background `#EBF2ED`, text `#344D40`, accompanied by a 6px solid `#668F74` status dot.
- **Uncertain / In Progress:** Background `#FAF4E8`, text `#7A5C1E`, accompanied by a 6px solid `#D7A84B` dot.
- **Conflicting / Blocker:** Background `#F9ECEB`, text `#8A3A36`, accompanied by a 6px solid `#C96C67` dot.

### Inputs & Search Bars
- Floating pill search field mimicking the top bar in the reference: pill shape (`rounded-full`), white background, subtle border (`#E6E9E4`), leading icon, right-aligned circular search icon button in dark slate (`#202822`).
- Standard form fields feature an 8px radius, `#FFFFFF` background, 1px border (`#E6E9E4`), and transition to a focused border of `#688B78` with a 2px outer ambient ring (`rgba(104, 139, 120, 0.2)`).

### Progress Indicators & Gauges
- Semicircular progress gauges and horizontal bars use `#E6E9E4` as the track base.
- Active fill utilizes `#688B78` or `#344D40`, providing clean organic readouts for milestone percentage completions.