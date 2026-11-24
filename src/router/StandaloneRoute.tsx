import { StandaloneLayout } from "../layouts/Standalone/StandaloneLayout";
import { PageHost } from "../components/PageHost/PageHost";
import type { RouteDefinition } from "../registry/appConfig";
export function StandaloneRoute({route}:{route:RouteDefinition}) {
 return <StandaloneLayout routeId={route.routeId}><PageHost pageId={route.pageId}/></StandaloneLayout>;
}