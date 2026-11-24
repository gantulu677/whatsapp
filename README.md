# Application Architecture

Dokumentasi struktur aplikasi berbasis **Vite + React + TypeScript**.

## 1. Technology Stack

- **Vite** — frontend build tool.
- **React** — UI library.
- **TypeScript** — static type checking.
- **React Router** — client-side routing.

## 2. Project Structure

```text
src/
├── App.tsx
├── main.tsx
│
├── router/
│   ├── AppRouter.tsx
│   ├── AppShellRoute.tsx
│   ├── StandaloneRoute.tsx
│   ├── NotFoundRoute.tsx
│   └── RouteErrorBoundary.tsx
│
├── layouts/
│   ├── AppShell/
│   │   ├── AppShell.tsx
│   │   ├── Header.tsx
│   │   ├── Main.tsx
│   │   └── BottomNav.tsx
│   │
│   └── Standalone/
│       ├── StandaloneLayout.tsx
│       ├── StandaloneHeader.tsx
│       ├── StandaloneContent.tsx
│       └── StandaloneBottomAction.tsx
│
├── components/
│   └── PageHost/
│       └── PageHost.tsx
│
└── overlay/
    ├── OverlayHost.tsx
    ├── ModalHost.tsx
    ├── DrawerHost.tsx
    ├── DialogHost.tsx
    └── ToastHost.tsx
```

## 3. Application Entry Point

### `main.tsx`

Entry point aplikasi Vite. Bertanggung jawab untuk memasang React ke elemen root HTML dan memuat stylesheet global.

### `App.tsx`

Application Composition Root.

Bertanggung jawab menghubungkan:
- BrowserRouter
- AppRouter
- OverlayHost

`App.tsx` tidak bertanggung jawab mendefinisikan route, halaman, atau implementasi layout.

## 4. Routing Architecture

### `AppRouter.tsx`

Mengelola seluruh konfigurasi routing aplikasi.

Tanggung jawab:
- Membaca definisi route dari Route Path Registry.
- Menghubungkan `routeId` dengan `pageId` dan `layoutId`.
- Mengarahkan route ke wrapper layout yang sesuai.
- Menyediakan NotFound route.
- Menangani route-level error boundary.

### `AppShellRoute.tsx`

Wrapper route untuk halaman yang menggunakan `AppShell`.

Struktur:

```text
AppShellRoute
└── AppShell
    ├── Header
    ├── Main
    │   └── PageHost
    │       └── ActivePage
    └── BottomNav
```

### `StandaloneRoute.tsx`

Wrapper route untuk halaman yang menggunakan `StandaloneLayout`.

Struktur:

```text
StandaloneRoute
└── StandaloneLayout
    ├── StandaloneHeader
    ├── StandaloneContent
    │   └── ActivePage
    └── StandaloneBottomAction
```

Standalone route tidak menggunakan AppShell.

### `NotFoundRoute.tsx`

Menangani navigasi menuju route yang tidak terdaftar.

### `RouteErrorBoundary.tsx`

Menangani error pada level routing agar kegagalan suatu route dapat ditampilkan secara terkontrol.

## 5. Layout Architecture

### AppShell

Layout utama aplikasi dengan tiga wilayah:

1. `Header` — navigasi dan informasi bagian atas.
2. `Main` — area konten utama yang menampung PageHost.
3. `BottomNav` — navigasi utama bagian bawah.

`Main` menyediakan area konten yang dapat di-scroll secara independen.

`BottomNav` secara default memiliki `visible: true`.

### StandaloneLayout

Layout mandiri untuk halaman yang tidak menggunakan AppShell.

Wilayahnya:
1. `StandaloneHeader`
2. `StandaloneContent`
3. `StandaloneBottomAction`

`StandaloneContent` memiliki area scroll independen.

## 6. Page Rendering

### `PageHost.tsx`

Bertanggung jawab merender satu halaman aktif berdasarkan `pageId` yang diberikan oleh sistem routing.

Prinsip:
- Setiap halaman didefinisikan satu kali dalam Central Page Registry.
- Halaman dapat digunakan oleh beberapa route.
- Halaman tidak menentukan layout-nya sendiri.
- PageHost tidak bertanggung jawab menentukan URL atau navigasi.

## 7. Global Overlay Architecture

### `OverlayHost.tsx`

Global overlay host berada di dalam `BrowserRouter`, tetapi di luar route dan layout.

```text
App
└── BrowserRouter
    ├── AppRouter
    │   ├── AppShellRoute
    │   └── StandaloneRoute
    │
    └── OverlayHost
        ├── ModalHost
        ├── DrawerHost
        ├── DialogHost
        └── ToastHost
```

Tanggung jawab:
- Menjadi pusat pengelolaan overlay.
- Menyediakan modal, drawer, dialog, dan toast.
- Memungkinkan overlay digunakan dari berbagai halaman.
- Menutup overlay yang relevan ketika `routeId` berubah.

Overlay tidak dimiliki secara eksklusif oleh AppShell maupun StandaloneLayout.

## 8. Registry Integration

Arsitektur menggunakan registry terpusat sebagai sumber definisi.

### Central Page Registry

Sumber definisi halaman, termasuk:
- `pageId`
- `type`
- Metadata halaman

Nilai `type` yang digunakan:

| Value | Purpose |
|---|---|
| `main` | Klasifikasi halaman utama |
| `standalone` | Klasifikasi halaman mandiri |
| `shared` | Klasifikasi halaman yang dapat digunakan bersama |

Atribut `type` berfungsi sebagai metadata, dokumentasi, dan validasi konsistensi ringan.

Atribut ini tidak menentukan layout dan tidak membatasi penggunaan ulang halaman.

### Route Path Registry

Sumber definisi path dan pemetaan route.

Hubungan utama:

```text
routeId
   ↓
pageId
   ↓
layoutId
```

- `routeId` mengidentifikasi tujuan navigasi.
- `pageId` mengidentifikasi halaman yang dirender.
- `layoutId` menentukan layout yang digunakan oleh route.

Path tidak boleh diduplikasi secara manual di berbagai komponen.

## 9. Architecture Principles

Prinsip yang harus dipertahankan:

1. **Single Source of Truth** — definisi halaman dan route dikelola melalui registry.
2. **Separation of Concerns** — Page, Route, dan Layout memiliki tanggung jawab berbeda.
3. **Page Reusability** — satu halaman dapat digunakan oleh beberapa route.
4. **Layout Independence** — StandaloneLayout tidak bergantung pada AppShell.
5. **Single Active Page** — PageHost hanya merender satu halaman aktif dalam satu waktu.
6. **Global Overlay** — overlay berada di luar route layout.
7. **Centralized Navigation** — navigasi mengacu pada `routeId`.
8. **Type Safety** — kontrak dan props komponen menggunakan TypeScript.

## 10. Naming Conventions

| File type | Extension | Example |
|---|---|---|
| React component | `.tsx` | `App.tsx` |
| TypeScript module | `.ts` | `route.types.ts` |
| Stylesheet | `.css` | `index.css` |
| Configuration | `.json` | `App.json` |

Gunakan:
- PascalCase untuk nama React component dan file komponennya.
- camelCase untuk fungsi, variabel, dan properti.
- PascalCase untuk interface/type yang merepresentasikan komponen atau objek domain.

## 11. Implementation Boundary

Dokumentasi ini menetapkan struktur dan tanggung jawab arsitektur.

Dokumentasi ini belum menetapkan:
- Implementasi internal setiap halaman.
- Detail schema JSON registry.
- Kontrak lengkap seluruh props komponen.
- State management global.
- Strategi data fetching.
- Detail autentikasi dan otorisasi.
- Implementasi CSS dan responsive design.

Hal-hal tersebut perlu ditentukan melalui dokumentasi dan kontrak implementasi masing-masing.

---

**Document:** Application Architecture  
**Stack:** Vite + React + TypeScript  
**Status:** Architecture Draft
