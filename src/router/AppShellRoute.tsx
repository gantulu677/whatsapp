import { AppShell } from "../layouts/AppShell/AppShell";
import { PageHost } from "../components/PageHost/PageHost";
import type { RouteDefinition } from "../registry/appConfig";
export function AppShellRoute({route}:{route:RouteDefinition}) {
 return <AppShell><PageHost pageId={route.pageId}/></AppShell>;
}