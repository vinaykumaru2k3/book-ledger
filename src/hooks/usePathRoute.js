import { useState, useEffect } from "react";

export function usePathRoute(defaultRoute = "all") {
  const [route, setRoute] = useState(() => {
    const path = window.location.pathname.slice(1);
    return path || defaultRoute;
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.slice(1);
      setRoute(path || defaultRoute);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [defaultRoute]);

  const navigate = (newRoute) => {
    const path = newRoute === "all" ? "/" : `/${encodeURI(newRoute)}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
      setRoute(newRoute);
    }
  };

  return [route, navigate];
}
