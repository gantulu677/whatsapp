import { Outlet, type RouteObject } from "react-router-dom";
import { appConfig } from "../registry/appConfig";
import { AppShellRoute } from "./AppShellRoute";
import { StandaloneRoute } from "./StandaloneRoute";
import { getSystemUIComponent } from "../system/systemUIRegistry";

const RouteErrorFallback = getSystemUIComponent("RouteErrorPage");

export function buildRouteObjects(): RouteObject[] {
  return appConfig.routes.map((route) => ({
    id: route.routeId,
    path: route.path,
    element: route.layoutId === "AppShell"
      ? <AppShellRoute route={route} />
      : <StandaloneRoute route={route} />,
    errorElement: <RouteErrorFallback />,
  }));
}

export function AppRouter() {
  return <Outlet />;
}
