import type { ComponentType } from "react";
import { Link, useParams } from "react-router-dom";
function PageFrame({title,description}:{title:string;description:string}){return <section className="page-card"><p className="eyebrow">WHATSAPP APPLICATION</p><h1>{title}</h1><p>{description}</p></section>;}
function HomePage(){return <PageFrame title="Home" description="Halaman utama aplikasi siap dikembangkan."/>;}
function ProductsPage(){return <PageFrame title="Products" description="Daftar produk akan ditampilkan di sini."/>;}
function ProfilePage(){return <PageFrame title="Profile" description="Informasi profil pengguna akan ditampilkan di sini."/>;}
function ProductDetailPage(){const {productId}=useParams();return <PageFrame title="Product Detail" description={`Detail produk: ${productId??"—"}`}/>;}
function CheckoutPage(){return <PageFrame title="Checkout" description="Alur checkout akan diimplementasikan pada tahap berikutnya."/>;}
function PaymentResultPage(){return <PageFrame title="Payment Result" description="Status hasil pembayaran akan ditampilkan di sini."/>;}
function LiveChatPage(){return <PageFrame title="Live Chat" description="Halaman percakapan langsung."/>;}
function NotificationPage(){return <PageFrame title="Notifications" description="Daftar notifikasi pengguna."/>;}
function CartPage(){return <PageFrame title="Cart" description="Keranjang belanja pengguna."/>;}
function NotFoundPage(){return <section className="page-card"><p className="eyebrow">404</p><h1>Halaman tidak ditemukan</h1><p>Alamat yang Anda buka tidak tersedia.</p><Link to="/app">Kembali ke Home</Link></section>;}
export const pageComponents:Record<string,ComponentType>={HomePage,ProductsPage,ProfilePage,ProductDetailPage,CheckoutPage,PaymentResultPage,LiveChatPage,NotificationPage,CartPage,NotFoundPage};