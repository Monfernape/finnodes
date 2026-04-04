"use client";

import { useEffect } from "react";

const SW_URL = "/sw.js";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          if (registration.active?.scriptURL.endsWith(SW_URL)) {
            void registration.unregister();
          }
        });
      });
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register(SW_URL, { scope: "/" });
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}
