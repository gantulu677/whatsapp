import { useMemo, useState, type FormEvent } from "react";
import { useInbox } from "./useInbox";
import type { InboxMessage } from "./types";
import "./inbox.css";

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function messagePreview(message: { message_content: string | null; message_type: string }) {
  if (message.message_content?.trim()) return message.message_content;
  const labels: Record<string, string> = {
    image: "Foto", video: "Video", audio: "Pesan suara", document: "Dokumen",
    sticker: "Stiker", location: "Lokasi", contacts: "Kontak", interactive: "Pesan interaktif",
  };
  return labels[message.message_type] ?? "Pesan";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Menunggu", sent: "Terkirim", delivered: "Diterima", read: "Dibaca",
    failed: "Gagal", received: "Diterima", unknown: "Status tidak diketahui",
  };
  return labels[status] ?? status;
}

function MessageBubble({ message }: { message: InboxMessage }) {
  const outgoing = message.direction === "outbound";
  return (
    <article className={["message-row", outgoing ? "outgoing" : "incoming"].join(" ")}>
      <div className="message-bubble">
        {message.message_content ? <p>{message.message_content}</p> : <p className="message-kind">{messagePreview(message)}</p>}
        {message.media.map((media) => (
          <div className="message-media" key={media.id}>
            {media.url && media.mime_type?.startsWith("image/") ? (
              <a href={media.url} target="_blank" rel="noreferrer">
                <img src={media.url} alt={media.caption ?? media.file_name ?? "Lampiran pesan"} loading="lazy" />
              </a>
            ) : media.url ? (
              <a href={media.url} target="_blank" rel="noreferrer">{media.file_name ?? "Buka lampiran"}</a>
            ) : (
              <span>{media.file_name ?? "Lampiran tidak tersedia"}</span>
            )}
          </div>
        ))}
        {message.error?.message ? <p className="message-error">{message.error.message}</p> : null}
        <footer className="message-meta">
          <time dateTime={message.timestamp}>{formatTime(message.timestamp)}</time>
          {outgoing ? <span>{statusLabel(message.status)}</span> : null}
        </footer>
      </div>
    </article>
  );
}

export function InboxPage() {
  const {
    account, conversations, selectedContactId, selectedContact, messages, listLoading,
    detailLoading, sending, error, sendError, retryPayload, realtimeStatus, refreshList,
    selectConversation, sendMessage,
  } = useInbox();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const filteredConversations = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter(({ contact, last_message }) =>
      [contact.profile_name ?? "", contact.wa_id, last_message.message_content ?? ""]
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [conversations, search]);

  const activeConversation = conversations.find((item) => item.contact.id === selectedContactId);
  const contact = selectedContact ?? activeConversation?.contact ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    const sent = await sendMessage(message);
    if (sent) setDraft("");
  }

  return (
    <section className="inbox-page" aria-label="WhatsApp Inbox">
      <div className="inbox-toolbar">
        <div>
          <p className="inbox-eyebrow">WHATSAPP BUSINESS</p>
          <h1>Inbox</h1>
          <p className="inbox-account">{account ? account.name : "Memuat akun WhatsApp…"}</p>
        </div>
        <div className="inbox-toolbar-actions">
          <span className={["realtime-indicator", realtimeStatus === "SUBSCRIBED" ? "connected" : ""].join(" ")}>
            <span aria-hidden="true" />{realtimeStatus === "SUBSCRIBED" ? "Live" : "Menghubungkan"}
          </span>
          <button className="icon-button" type="button" onClick={() => void refreshList()} aria-label="Muat ulang percakapan">↻</button>
        </div>
      </div>

      {error ? (
        <div className="inbox-alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void refreshList()}>Coba lagi</button>
        </div>
      ) : null}

      <div className={["inbox-layout", selectedContactId ? "is-detail-open" : ""].join(" ")}>
        <aside className="inbox-list-panel" aria-label="Daftar percakapan">
          <div className="conversation-list-heading">
            <h2>Percakapan</h2>
            <span>{conversations.length}</span>
          </div>
          <label className="conversation-search">
            <span className="sr-only">Cari percakapan</span>
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau nomor" />
          </label>
          <div className="conversation-list-scroll">
            {listLoading && conversations.length === 0 ? <p className="inbox-state">Memuat percakapan…</p> : null}
            {!listLoading && filteredConversations.length === 0 ? (
              <div className="inbox-state">
                <strong>{search ? "Tidak ditemukan" : "Belum ada percakapan"}</strong>
                <span>{search ? "Coba kata kunci lain." : "Pesan WhatsApp yang masuk akan muncul di sini."}</span>
              </div>
            ) : null}
            {filteredConversations.map(({ contact: item, last_message }) => {
              const name = item.profile_name?.trim() || item.wa_id;
              return (
                <button
                  className={["conversation-item", selectedContactId === item.id ? "selected" : ""].join(" ")}
                  key={item.id}
                  type="button"
                  onClick={() => void selectConversation(item.id)}
                  aria-current={selectedContactId === item.id ? "true" : undefined}
                >
                  <span className="contact-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
                  <span className="conversation-copy">
                    <span className="conversation-topline"><strong>{name}</strong><time>{formatTime(last_message.timestamp)}</time></span>
                    <span className="conversation-bottomline">
                      <span>{last_message.direction === "outbound" ? "Anda: " : ""}{messagePreview(last_message)}</span>
                      {last_message.status === "failed" ? <em>Gagal</em> : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="inbox-detail-panel" aria-label="Detail percakapan">
          {!selectedContactId ? (
            <div className="inbox-detail-empty">
              <span className="inbox-empty-icon" aria-hidden="true">☏</span>
              <h2>Pilih percakapan</h2>
              <p>Pilih kontak di sebelah kiri untuk melihat riwayat pesan.</p>
            </div>
          ) : (
            <>
              <header className="conversation-detail-header">
                <button className="mobile-back-button" type="button" onClick={() => selectConversation("")}>
                  ← <span>Kembali</span>
                </button>
                <span className="contact-avatar detail-avatar" aria-hidden="true">{(contact?.profile_name ?? contact?.wa_id ?? "?").slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{contact?.profile_name?.trim() || contact?.wa_id || "Memuat kontak…"}</strong>
                  <span>{contact?.wa_id ?? ""}</span>
                </div>
              </header>

              <div className="message-list" aria-live="polite">
                {detailLoading && messages.length === 0 ? <p className="inbox-state">Memuat pesan…</p> : null}
                {!detailLoading && messages.length === 0 ? <p className="inbox-state">Belum ada pesan pada percakapan ini.</p> : null}
                {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
              </div>

              <div className="composer-area">
                {sendError ? <p className="composer-error" role="alert">{sendError}</p> : null}
                {retryPayload ? (
                  <button className="retry-send-button" type="button" disabled={sending} onClick={() => void sendMessage(retryPayload.message)}>
                    Coba ulang permintaan yang sama
                  </button>
                ) : null}
                <form className="message-composer" onSubmit={(event) => void handleSubmit(event)}>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ketik pesan…"
                    rows={1}
                    maxLength={4096}
                    aria-label="Tulis pesan WhatsApp"
                  />
                  <button type="submit" disabled={!draft.trim() || sending || !account || !contact}>
                    {sending ? "Mengirim…" : "Kirim"}
                  </button>
                </form>
                <p className="composer-hint">Pesan teks mengikuti batas waktu layanan 24 jam yang divalidasi server.</p>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
