import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMatches } from "react-router-dom";
type OverlayKind="modal"|"drawer"|"dialog";
interface Toast {id:number;message:string;}
interface OverlayState {modal:ReactNode|null;drawer:ReactNode|null;dialog:ReactNode|null;toasts:Toast[];}
interface OverlayContextValue {state:OverlayState;open:(kind:OverlayKind,content:ReactNode)=>void;close:(kind:OverlayKind)=>void;closeTransient:()=>void;pushToast:(message:string)=>void;dismissToast:(id:number)=>void;}
const OverlayContext=createContext<OverlayContextValue|null>(null);
export function useOverlay(){
 const value=useContext(OverlayContext);
 if(!value)throw new Error("useOverlay must be used inside OverlayProvider.");
 return value;
}
export function OverlayProvider({children}:{children:ReactNode}){
 const matches=useMatches();
 const routeId=matches.at(-1)?.id??"";
 const [state,setState]=useState<OverlayState>({modal:null,drawer:null,dialog:null,toasts:[]});
 const closeTransient=useCallback(()=>setState(current=>({...current,modal:null,drawer:null,dialog:null})),[]);
 useEffect(()=>{closeTransient();},[routeId,closeTransient]);
 const value=useMemo<OverlayContextValue>(()=>({
  state,
  open:(kind,content)=>setState(current=>({...current,[kind]:content})),
  close:(kind)=>setState(current=>({...current,[kind]:null})),
  closeTransient,
  pushToast:(message)=>setState(current=>({...current,toasts:[...current.toasts,{id:Date.now()+Math.random(),message}]})),
  dismissToast:(id)=>setState(current=>({...current,toasts:current.toasts.filter(toast=>toast.id!==id)}))
 }),[state,closeTransient]);
 return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}
function ModalHost({content}:{content:ReactNode|null}){return content?<div className="overlay-backdrop"><section className="overlay-panel" role="dialog" aria-modal="true">{content}</section></div>:null;}
function DrawerHost({content}:{content:ReactNode|null}){return content?<aside className="drawer-host" role="complementary">{content}</aside>:null;}
function DialogHost({content}:{content:ReactNode|null}){return content?<div className="overlay-backdrop"><section className="overlay-panel" role="alertdialog" aria-modal="true">{content}</section></div>:null;}
function ToastHost({toasts,onDismiss}:{toasts:Toast[];onDismiss:(id:number)=>void}){
 return <div className="toast-host" aria-live="polite" aria-atomic="false">{toasts.map(toast=><button className="toast-item" key={toast.id} onClick={()=>onDismiss(toast.id)}>{toast.message}</button>)}</div>;
}
export function OverlayHost(){
 const {state,close,dismissToast}=useOverlay();
 const hasTransient=Boolean(state.modal||state.drawer||state.dialog);
 return <div className="overlay-host" data-overlay-host><ModalHost content={state.modal}/><DrawerHost content={state.drawer}/><DialogHost content={state.dialog}/><ToastHost toasts={state.toasts} onDismiss={dismissToast}/>{hasTransient?<button className="overlay-dismiss" onClick={()=>{close("modal");close("drawer");close("dialog");}}>Tutup overlay</button>:null}</div>;
}