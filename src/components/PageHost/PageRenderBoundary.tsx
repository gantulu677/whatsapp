import { Component, type ErrorInfo, type ReactNode } from "react";
interface Props { children: ReactNode; }
interface State { hasError: boolean; }
export class PageRenderBoundary extends Component<Props,State> {
 state:State={hasError:false};
 static getDerivedStateFromError():State { return {hasError:true}; }
 componentDidCatch(error:Error,info:ErrorInfo) { console.error("Page rendering failed:",error,info.componentStack); }
 render() {
  if(this.state.hasError) return <section className="system-page" role="alert"><h1>Konten halaman mengalami gangguan</h1><p>Coba buka kembali halaman ini.</p></section>;
  return this.props.children;
 }
}