"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const useRoutePrefetch = (routes: Array<string | undefined | null>) => {
  const router = useRouter();

  useEffect(() => {
    const uniqueRoutes = routes.filter(
      (route, index): route is string =>
        Boolean(route) && routes.indexOf(route) === index,
    );

    uniqueRoutes.forEach((route) => {
      void router.prefetch(route);
    });
  }, [router, routes]);
};
