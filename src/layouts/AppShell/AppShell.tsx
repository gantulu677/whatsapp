import type { ReactNode } from "react";
import { Header } from "./Header";
import { Main } from "./Main";
import { BottomNav } from "./BottomNav";
export function AppShell({children}:{children:ReactNode}) {
 return <div className="app-shell"><Header/><Main>{children}</Main><BottomNav/></div>;
}