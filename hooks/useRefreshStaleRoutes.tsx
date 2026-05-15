"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const STALE_ROUTES_STORAGE_KEY = "finnodes:stale-routes";

const getStoredRoutes = () => {
  if (typeof window === "undefined") {
    return [];
  }

  return (
    window.sessionStorage
      .getItem(STALE_ROUTES_STORAGE_KEY)
      ?.split("\n")
      .filter(Boolean) ?? []
  );
};

const storeRoutes = (routes: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  if (routes.length === 0) {
    window.sessionStorage.removeItem(STALE_ROUTES_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(STALE_ROUTES_STORAGE_KEY, routes.join("\n"));
};

const getRoutePathname = (href: string) => {
  if (typeof window === "undefined") {
    return href.split("?")[0] || "/";
  }

  return new URL(href, window.location.origin).pathname;
};

export const markRouteStale = (href: string) => {
  const pathname = getRoutePathname(href);
  const routes = getStoredRoutes();

  if (routes.includes(pathname)) {
    return;
  }

  storeRoutes([...routes, pathname]);
};

export const RefreshStaleRoutes = () => {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const routes = getStoredRoutes();

    if (!routes.includes(pathname)) {
      return;
    }

    storeRoutes(routes.filter((route) => route !== pathname));
    router.refresh();
  }, [pathname, router]);

  return null;
};
