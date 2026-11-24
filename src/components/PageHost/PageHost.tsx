import { pageRegistry } from "../../registry/appConfig";
import { pageComponents } from "../../pages/PageComponents";
import { PageRenderBoundary } from "./PageRenderBoundary";
export function PageHost({pageId}:{pageId:string}) {
 const page=pageRegistry.get(pageId);
 const PageComponent=pageComponents[pageId];
 if(!page||!PageComponent) return <section className="system-page" role="alert"><h1>Halaman tidak tersedia</h1><p>Page registry tidak memiliki implementasi untuk "{pageId}".</p></section>;
 return <PageRenderBoundary key={pageId}><PageComponent/></PageRenderBoundary>;
}