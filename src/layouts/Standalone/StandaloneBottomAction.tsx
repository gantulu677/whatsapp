import { appConfig } from "../../registry/appConfig";
export function StandaloneBottomAction({routeId}:{routeId:string}){
 const visibility=appConfig.routeBehavior.standaloneBottomAction.visibilityPerRoute;
 const visible=visibility[routeId]??appConfig.routeBehavior.standaloneBottomAction.defaultVisible;
 return visible?<footer className="standalone-bottom-action"><span>Aksi halaman</span></footer>:null;
}