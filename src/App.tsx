import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppRouter, buildRouteObjects } from "./router/AppRouter";
import { RouteErrorBoundary } from "./router/RouteErrorBoundary";
import { PendingNavigationHandler } from "./router/PendingNavigationHandler";
import { OverlayHost, OverlayProvider } from "./overlay/OverlayHost";
import { LoadingPage } from "./system/SystemPages";

function ApplicationRoot() {
  return <OverlayProvider><PendingNavigationHandler /><AppRouter /><OverlayHost /></OverlayProvider>;
}

const router = createBrowserRouter([{
  id: "application-root",
  element: <ApplicationRoot />,
  errorElement: <RouteErrorBoundary />,
  children: buildRouteObjects(),
}]);

export default function App() {
  return <RouterProvider router={router} fallbackElement={<LoadingPage />} />;
}