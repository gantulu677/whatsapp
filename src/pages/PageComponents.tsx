import type { ComponentType } from "react";
import { Link, useParams } from "react-router-dom";
import { InboxPage } from "../features/inbox/InboxPage";

function PageFrame({title,description}:{title:string;description:string}){return <section className="page-card"><p className="eyebrow">WHATSAPP APPLICATION</p><h1>{title}</h1><p>{description}</p></section>;}
function HomePage(){return <section className="page-card"><p className="eyebrow">WHATSAPP APPLICATION</p><h1>WhatsApp Inbox</h1><p>Kelola percakapan WhatsApp dari satu tempat.</p><Link className="back-link" to="/app/live-chat">Buka Inbox →</Link></section>;}
function ProductsPage(){return <PageFrame title="Products" description="Halaman ini belum termasuk dalam fitur WhatsApp Inbox."/>;}
function ProfilePage(){return <PageFrame title="Profile" description="Informasi profil belum tersedia."/>;}
function ProductDetailPage(){const {productId}=useParams();return <PageFrame title="Product Detail" description={`Detail produk: ${productId??"—"}`}/>;}
function CheckoutPage(){return <PageFrame title="Checkout" description="Halaman ini belum tersedia."/>;}
function PaymentResultPage(){return <PageFrame title="Payment Result" description="Halaman ini belum tersedia."/>;}
function LiveChatPage(){return <InboxPage />;}
function NotificationPage(){return <PageFrame title="Notifications" description="Daftar notifikasi belum tersedia."/>;}
function CartPage(){return <PageFrame title="Cart" description="Halaman ini belum tersedia."/>;}
function NotFoundPage(){return <section className="page-card"><p className="eyebrow">404</p><h1>Halaman tidak ditemukan</h1><p>Alamat yang Anda buka tidak tersedia.</p><Link to="/app">Kembali ke Home</Link></section>;}
export const pageComponents:Record<string,ComponentType>={HomePage,ProductsPage,ProfilePage,ProductDetailPage,CheckoutPage,PaymentResultPage,LiveChatPage,NotificationPage,CartPage,NotFoundPage};