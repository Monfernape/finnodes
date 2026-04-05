# FinNodes Notes

## PWA Assets

- When changing PWA-related assets or metadata, also bump `CACHE_VERSION` in [public/sw.js](/Users/usmankhalil/Documents/GitHub/finnodes/public/sw.js).
- This applies to changes in the manifest, launcher icons, splash-related icons, and other files cached by the service worker such as `/manifest.webmanifest` and `/icons/*`.
- Samsung/Android may still cache old PWA icons aggressively, so after deployment it can still require removing and reinstalling the PWA to see the updated icon.

## Mobile-Native UX

- Preserve the mobile app-like navigation pattern:
  `MobileBottomNav` is the primary mobile navigation and stays fixed at the bottom on screens below `lg`.
- Preserve the sidebar split:
  desktop uses the shadcn sidebar in the main layout, mobile uses the sidebar trigger/drawer behavior from `components/ui/sidebar.tsx`.
- Keep the mobile sidebar as a full-width overlay:
  `--sidebar-width-mobile` is intentionally `100vw` in [app/(main)/layout.tsx](/Users/usmankhalil/Documents/GitHub/finnodes/app/(main)/layout.tsx).
- Keep desktop sidebar pinned and main content independently scrollable.
- When a table or dense layout overflows horizontally, contain overflow at the component level instead of letting the page canvas grow:
  use `min-w-0` on flex content containers and rely on local scroll wrappers like the table component.
- Keep responsive behavior aligned to the app’s `lg` breakpoint for desktop/mobile navigation changes.

## Navigation And Caching

- Preserve route prefetching on navigation surfaces:
  sidebar items and mobile bottom nav items intentionally use both `prefetch` on `Link` and `useRoutePrefetch(...)`.
- If changing navigation structure, keep the current “primary mobile tabs + More sheet” pattern unless explicitly redesigning it.
- If changing cached static assets used by the PWA or service worker, verify they are included in `STATIC_ASSETS` and that the cache version is bumped.

## Type Safety

- Do not use type assertions such as `as`, angle-bracket assertions, or assertion-based shortcuts to silence TypeScript.
- Fix the type at the source when possible.
- If a value is genuinely unknown at runtime, narrow it with a type guard before use.
