import { useNavigation } from "react-router-dom";
export function PendingNavigationHandler() {
 const navigation=useNavigation();
 return <div className="sr-only" aria-live="polite" aria-atomic="true">{navigation.state!=="idle"?"Memuat halaman…":""}</div>;
}