import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinNodes",
    short_name: "FinNodes",
    id: "/",
    description: "Finance portal for DevNodes to manage company expenses",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1f1f1f",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/mobile-expenses.png",
        sizes: "850x1320",
        type: "image/png",
        label: "Expenses overview on mobile",
      },
      {
        src: "/screenshots/desktop-expenses.png",
        sizes: "2296x1460",
        type: "image/png",
        form_factor: "wide",
        label: "Expenses overview on desktop",
      },
    ],
  };
}
