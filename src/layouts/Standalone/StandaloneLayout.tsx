import type { ReactNode } from "react";
import { StandaloneHeader } from "./StandaloneHeader";
import { StandaloneContent } from "./StandaloneContent";
import { StandaloneBottomAction } from "./StandaloneBottomAction";
export function StandaloneLayout({children,routeId}:{children:ReactNode;routeId:string}){
 return <div className="standalone-layout"><StandaloneHeader/><StandaloneContent>{children}</StandaloneContent><StandaloneBottomAction routeId={routeId}/></div>;
}