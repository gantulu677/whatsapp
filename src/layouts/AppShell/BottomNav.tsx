import { NavLink } from "react-router-dom";
import { appConfig, routeRegistry } from "../../registry/appConfig";
export function BottomNav(){
 if(!appConfig.navigation.visible)return null;
 return <nav className="bottom-nav" aria-label="Navigasi utama">{appConfig.navigation.items.map(item=>{
  const route=routeRegistry.get(item.routeId); if(!route)return null;
  return <NavLink key={item.id} to={route.path} end={item.routeId === "home"} className={({isActive})=>`bottom-nav-link${isActive?" active":""}`}>{item.label}</NavLink>;
 })}</nav>;
}