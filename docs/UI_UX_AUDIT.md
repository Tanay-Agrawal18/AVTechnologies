# Vyorai (IWMS) — UI/UX and Accessibility Audit

This document reviews the user interface, component interactions, responsive design, contrast, and accessibility compliance across the Vyorai Intern Workflow Management System.

---

## 1. Design System & Brand Alignment
- **Palette Tokens:**
  - Primary Navy: `#0B1F3A` (Brand Anchor)
  - Interactive Sky Blue: `#38BDF8` (Buttons, highlights, badges)
  - Surface Background: `#F5F8FF` (Crisp, clean workplace tint)
  - Card Surfaces: `#FFFFFF` with `1px solid rgba(11,31,58,.10)`
  - Text Hierarchy: Primary `#111827`, secondary `rgba(11,31,58,.50)`
- **Typography:**
  - Modern sans-serif stack (`Inter`, `system-ui`, `-apple-system`).
  - Clear line-height and anti-aliasing on high-DPI displays.
- **Card Accents:**
  - Standardized `.iwms-card` with subtle drop shadow `0 1px 3px rgba(11,31,58,.06)`.
  - Task card distinction via left accent border (`border-left: 3.5px solid #0284C7`).

---

## 2. Header, Navigation & Mobile State Corrections
- **Actionable Notification Bell:**
  - Previously, the notification bell in `DashboardHeader.tsx` was a static button with a red unread badge but no action or accessible status.
  - Corrected to announce accessible state (`aria-label="No new notifications"`) and provide feedback upon interaction.
- **Mobile Menu Dismissal:**
  - `AdminSidebar.tsx` and `InternSidebar.tsx` both support mobile overlays.
  - Added global `Escape` key listeners to dismiss the open navigation drawer on desktop and mobile keyboards.
  - Added `aria-label` to hamburger buttons and navigation triggers for screen reader support.
- **Focus Management & Contrast:**
  - Implemented `:focus-visible` styling (`outline: 2px solid var(--iwms-sky); outline-offset: 2px;`).
  - Badge contrasts verified for WCAG AA compliance (contrast ratio ≥ 4.5:1 for normal text).

---

## 3. Responsive Layout & Viewport Testing
- **Breakpoints Validated:**
  - **Mobile (320px – 480px):** Single-column cards, collapsible mobile sidebar, sticky compact header with truncated page titles.
  - **Tablet (768px – 1024px):** Responsive 2-column grids for KPI statistics, accessible touch targets (minimum 44x44px).
  - **Desktop (1024px+):** Fixed full-height sidebars, dense data tables with horizontal scroll and sticky column headers.
- **Reduced Motion:**
  - CSS animations respect `prefers-reduced-motion: reduce`.

---

## 4. Forms, Validations & Loading Feedback
- **Input Error States:**
  - Inputs highlight with rose borders and display inline error messages on failure.
  - Import forms provide real-time preview counts (valid rows vs. invalid rows) before committing mutations.
- **Button Loading States:**
  - Submit buttons disable and show spinner feedback during asynchronous API requests to prevent double-click mutations.
