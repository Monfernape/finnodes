# Mobile-Native Experience

Use this guide when changing layout, navigation, responsive behavior, loading states, or interaction design.

FinNodes should feel as close as possible to a native mobile app on phones. Prefer touch-first layouts, fast perceived performance, smooth transitions, and navigation patterns that feel app-like rather than browser-like.

## Core Standard

- Optimize for perceived speed as much as raw speed.
- Keep interactions touch-friendly, predictable, and easy to reach on mobile.
- Avoid janky layout shifts, scroll traps, and horizontal page overflow.
- Prefer transitions that feel smooth and intentional without adding delay.
- Preserve mobile patterns that make the app feel installed, focused, and stable.

## Navigation Model

- `MobileBottomNav` is the primary mobile navigation on screens below `lg`.
- Preserve the current split navigation model: desktop uses the shadcn sidebar in the main layout, mobile uses the sidebar trigger and drawer behavior from `components/ui/sidebar.tsx`.
- If changing navigation structure, keep the current `primary mobile tabs + More sheet` pattern unless the task explicitly redesigns navigation.
- Preserve route prefetching on navigation surfaces: sidebar items and mobile bottom nav items should keep both `prefetch` on `Link` and `useRoutePrefetch(...)`.
- Keep mobile navigation actions reachable and visually stable during route changes.

## Responsive Layout

- Keep responsive behavior aligned to the app's `lg` breakpoint for desktop/mobile navigation changes.
- Keep the mobile sidebar as a full-width overlay by preserving `--sidebar-width-mobile: 100vw` in `app/(main)/layout.tsx` unless the task explicitly changes the mobile navigation model.
- Keep the desktop sidebar pinned and the main content area independently scrollable.
- Design mobile layouts for narrow phone widths first, then scale up to tablet and desktop.
- Respect safe-area insets for controls and bottom-aligned UI.

## Scrolling And Overflow

- When tables or other dense layouts overflow horizontally, contain overflow at the component level instead of allowing the page canvas to grow.
- Use `min-w-0` on flex content containers when needed and prefer local scroll wrappers around overflowing components.
- Avoid nested scroll regions unless the interaction clearly requires them.
- Preserve smooth vertical reading and browsing flows on mobile.

## Motion And Feedback

- Use short, purposeful transitions that support orientation and feedback.
- Avoid heavy animation that delays interaction readiness or makes the interface feel sluggish.
- Animate overlays, sheets, and navigation changes in ways that feel smooth on mid-range mobile devices.
- Prefer subtle motion that reinforces hierarchy and state changes over decorative animation.

## Loading And Perceived Performance

- Reduce waiting that the user can feel, not just waiting measured in code.
- Prefetch likely next routes and views where the app already does so.
- Use skeletons, placeholders, or optimistic transitions when loading states would otherwise feel abrupt or stalled.
- Avoid blank states during navigation when existing content or a lightweight transition can preserve continuity.
- Preserve visual stability during loading to minimize layout shift.

## Interaction Quality

- Keep primary actions easy to reach by thumb on mobile.
- Use tap targets and spacing that remain comfortable on smaller screens.
- Avoid interaction patterns that depend on hover or precise cursor behavior for primary tasks.
- Make dense data views usable on phones without forcing the entire page to zoom or scroll sideways.
