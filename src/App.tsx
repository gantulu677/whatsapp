import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppRouter, buildRouteObjects } from "./router/AppRouter";
import { PendingNavigationHandler } from "./router/PendingNavigationHandler";
import { OverlayHost, OverlayProvider } from "./overlay/OverlayHost";
import { getSystemUIComponent } from "./system/systemUIRegistry";

const LoadingFallback = getSystemUIComponent("LoadingPage");
const GlobalErrorFallback = getSystemUIComponent("GlobalErrorPage");

function ApplicationRoot() {
  return <OverlayProvider><PendingNavigationHandler /><AppRouter /><OverlayHost /></OverlayProvider>;
}

const router = createBrowserRouter([{
  id: "application-root",
  element: <ApplicationRoot />,
  errorElement: <GlobalErrorFallback />,
  children: buildRouteObjects(),
}]);

export default function App() {
  return <RouterProvider router={router} fallbackElement={<LoadingFallback />} />;
}
