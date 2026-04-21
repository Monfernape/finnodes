# PWA Behavior

Use this guide when changing the manifest, icons, service worker behavior, or other cached static assets.

## Cache Invalidation

- When changing PWA-related assets or metadata, also bump `CACHE_VERSION` in `public/sw.js`.
- This includes changes to the manifest, launcher icons, splash-related icons, and other files cached by the service worker such as `/manifest.webmanifest` and `/icons/*`.
- If changing cached static assets used by the PWA or service worker, verify they are included in `STATIC_ASSETS` in `public/sw.js` and that the cache version is bumped.

## Platform Caveat

- Samsung Internet and some Android launchers can retain old PWA icons aggressively after deployment. If icon changes do not appear, reinstalling the PWA may still be required.
