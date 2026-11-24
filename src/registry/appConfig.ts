import rawConfig from "../../App.json";
export type PageType = "main" | "standalone" | "shared";
export interface PageDefinition { id: string; type: PageType; title: string; description: string; }
export interface RouteDefinition { routeId: string; pageId: string; layoutId: "AppShell" | "StandalonePages"; path: string; }
export interface AppConfig {
 schemaVersion: string;
 application: { name: string; framework: string; router: string; routerMode: string };
 pageRegistry: PageDefinition[];
 systemUIRegistry: Array<{id:string;component:string}>;
 routes: RouteDefinition[];
 navigation: { component: string; id: string; visible: boolean; items: Array<{id:string;routeId:string;label:string}> };
 routeBehavior: { standaloneBottomAction: { defaultVisible: boolean; visibilityPerRoute: Record<string,boolean> } };
}
export const appConfig = rawConfig as AppConfig;
export const pageRegistry = new Map(appConfig.pageRegistry.map(page => [page.id,page]));
export const routeRegistry = new Map(appConfig.routes.map(route => [route.routeId,route]));
export function validateAppConfig(): void {
 const pageIds = new Set(appConfig.pageRegistry.map(page=>page.id));
 const routeIds = new Set(appConfig.routes.map(route=>route.routeId));
 const paths = appConfig.routes.map(route=>route.path);
 for (const page of appConfig.pageRegistry) if (!["main","standalone","shared"].includes(page.type)) throw new Error(`Invalid page type: ${page.id}`);
 for (const route of appConfig.routes) {
  if (!pageIds.has(route.pageId)) throw new Error(`Unknown pageId in route ${route.routeId}`);
  if (!["AppShell","StandalonePages"].includes(route.layoutId)) throw new Error(`Unknown layoutId in route ${route.routeId}`);
 }
 for (const item of appConfig.navigation.items) if (!routeIds.has(item.routeId)) throw new Error(`Unknown navigation route: ${item.routeId}`);
 if (new Set(paths).size !== paths.length) throw new Error("Duplicate route paths in App.json.");
 if (!appConfig.routes.some(route=>route.path==="*")) throw new Error('Missing wildcard route "*".');
 if (typeof appConfig.navigation.visible!=="boolean") throw new Error("navigation.visible must be boolean.");
 if (typeof appConfig.routeBehavior.standaloneBottomAction.defaultVisible!=="boolean") throw new Error("standaloneBottomAction.defaultVisible must be boolean.");
}
validateAppConfig();