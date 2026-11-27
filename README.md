# WhatsApp Inbox

Frontend WhatsApp Inbox berbasis **Vite + React + TypeScript** dengan Supabase dan Meta WhatsApp Cloud API melalui Supabase Edge Functions.

## Technology Stack

- Vite 7
- React 19
- TypeScript 5
- React Router 7
- Supabase JavaScript Client
- Supabase Edge Functions dan Realtime Broadcast

## Requirements

- Node.js 22 atau versi yang didukung Vite.
- npm.
- Supabase project yang sudah dikonfigurasi.
- Akses ke repository GitHub.

## Setup

1. Clone repository.
2. Install dependency:

   ```bash
   npm install
   ```

3. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

Konfigurasi URL project dan Supabase publishable key sudah ditetapkan langsung pada `src/lib/supabase/client.ts`. Tidak diperlukan file `.env` atau environment variable untuk konfigurasi Supabase.

Publishable key memang dirancang untuk digunakan di browser. Jangan pernah memasukkan Supabase `service_role` key, secret API key, atau `WHATSAPP_ACCESS_TOKEN` ke frontend.

## Validation

```bash
npm run typecheck
npm run build
npm run preview
```

GitHub Actions menjalankan typecheck dan production build pada Pull Request yang menargetkan `main`, push ke branch utama/feature, dan workflow dispatch.

## WhatsApp Inbox Data Flow

- Daftar percakapan dan detail pesan dibaca melalui Edge Function publik `whatsapp-get-inbox`.
- Pesan dikirim melalui Edge Function publik `whatsapp-send-message`.
- Reply Buttons dikirim sebagai pesan interaktif `type: interactive` melalui Edge Function yang sama; pengguna dapat memilih hingga tiga tombol balasan.
- Balasan tombol masuk diterima melalui `whatsapp-webhook` dan ditampilkan sebagai pesan interaktif pada Inbox.
- Frontend tidak memanggil Meta Graph API secara langsung.
- Frontend tidak membaca tabel WhatsApp secara langsung karena RLS tabel hanya mengizinkan role `authenticated`; aplikasi ini tidak menggunakan Supabase Auth.
- Pembaruan Inbox didengarkan melalui Realtime Broadcast channel `whatsapp-inbox`, event `inbox_update`, yang dikirim oleh webhook dan fungsi pengiriman pesan.
- Akun aktif dikelola melalui `whatsapp_settings` di Supabase Dashboard. Aplikasi mengharapkan tepat satu akun aktif.
- Batas waktu layanan 24 jam, idempotensi, penyimpanan pending, dan status akhir tetap divalidasi backend.

## Core Database Tables

Frontend mengikuti kontrak tabel yang sudah ada, tanpa membuat atau mengubah schema:

- `whatsapp_settings`
- `whatsapp_contacts`
- `whatsapp_messages`
- `whatsapp_message_statuses`
- `whatsapp_message_media`

## Repository Workflow

Source implementation berada pada branch `feature/bootstrap-vite-react-typescript`. Perubahan diajukan melalui Pull Request ke `main`. Merge dan deployment tetap melalui persetujuan terpisah.

## Scope Notes

- Tidak ada login atau registrasi frontend.
- Tidak ada pengelolaan akun WhatsApp pada UI.
- Tidak ada secret backend pada browser.
- Tidak ada perubahan schema, RLS, policy, atau Edge Function dari repository frontend ini.
- Pengujian manual UI dan alur WhatsApp dilakukan oleh pemilik aplikasi.
