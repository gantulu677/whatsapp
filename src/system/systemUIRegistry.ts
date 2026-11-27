import type { ComponentType } from "react";
import { appConfig } from "../registry/appConfig";
import { LoadingPage, GlobalErrorPage } from "./SystemPages";
import { RouteErrorBoundary } from "../router/RouteErrorBoundary";

const componentMap: Record<string, ComponentType> = {
  LoadingPage,
  RouteErrorPage: RouteErrorBoundary,
  GlobalErrorPage,
};

export function getSystemUIComponent(id: string): ComponentType {
  const definition = appConfig.systemUIRegistry.find((item) => item.id === id);
  if (!definition) throw new Error(`Unknown System UI id "${id}".`);
  const component = componentMap[definition.component];
  if (!component) throw new Error(`Unknown System UI component "${definition.component}".`);
  return component;
}
