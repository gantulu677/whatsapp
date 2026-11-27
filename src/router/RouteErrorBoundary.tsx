import { isRouteErrorResponse, useRouteError } from "react-router-dom";
export function RouteErrorBoundary() {
 const error=useRouteError();
 const message=isRouteErrorResponse(error)?`${error.status} — ${error.statusText}`:error instanceof Error?error.message:"Terjadi kesalahan saat memuat halaman.";
 return <main className="system-page" role="alert"><p className="eyebrow">ROUTE ERROR</p><h1>Halaman tidak dapat dimuat</h1><p>{message}</p><a href="/app">Kembali ke aplikasi</a></main>;
}