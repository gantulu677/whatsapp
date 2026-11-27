import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useInbox } from "./useInbox";
import type { InboxMessage, InteractiveCarouselMessage, InteractiveReplyButtons } from "./types";
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
  const buttonReply = message.interactive && "button_reply" in message.interactive ? message.interactive.button_reply : null;
  const outgoingInteractive = message.interactive && "action" in message.interactive ? message.interactive : null;
  return (
    <article className={["message-row", outgoing ? "outgoing" : "incoming"].join(" ")}>
      <div className="message-bubble">
        {outgoingInteractive?.type === "button" && outgoingInteractive.header?.type === "text" ? <p className="interactive-message-header">{outgoingInteractive.header.text}</p> : null}
        {buttonReply ? (
          <p className="interactive-reply-label">Balasan tombol: {buttonReply.title ?? message.message_content ?? "Pilihan dipilih"}</p>
        ) : message.message_content ? (
          <p>{message.message_content}</p>
        ) : (
          <p className="message-kind">{messagePreview(message)}</p>
        )}
        {message.media.map((media) => (
          <div className="message-media" key={media.id}>
            {media.url && media.mime_type?.startsWith("image/") ? (
              <a href={media.url} target="_blank" rel="noreferrer"><img src={media.url} alt={media.caption ?? media.file_name ?? "Lampiran pesan"} loading="lazy" /></a>
            ) : media.url ? (
              <a href={media.url} target="_blank" rel="noreferrer">{media.file_name ?? "Buka lampiran"}</a>
            ) : (
              <span>{media.file_name ?? "Lampiran tidak tersedia"}</span>
            )}
          </div>
        ))}
        {outgoingInteractive?.type === "button" ? (
          <>
            <div className="interactive-message-options" aria-label="Pilihan balasan">
              {outgoingInteractive.action.buttons.map((item, index) => <span key={item.reply.id ?? index}>{item.reply.title}</span>)}
            </div>
            {outgoingInteractive.footer?.text ? <p className="interactive-message-footer">{outgoingInteractive.footer.text}</p> : null}
          </>
        ) : null}
        {outgoingInteractive?.type === "carousel" ? (
          <div className="carousel-message" aria-label="Kartu carousel">
            {outgoingInteractive.action.cards.map((card) => {
              const mediaUrl = card.header.type === "image" ? card.header.image.link : card.header.video.link;
              return (
                <article className="carousel-message-card" key={card.card_index}>
                  {card.header.type === "image"
                    ? <a href={mediaUrl} target="_blank" rel="noreferrer"><img src={mediaUrl} alt={card.body?.text ?? `Kartu ${card.card_index + 1}`} loading="lazy" /></a>
                    : <video src={mediaUrl} controls preload="metadata" />}
                  {card.body?.text ? <p>{card.body.text}</p> : null}
                  {card.type === "cta_url"
                    ? <a className="carousel-message-cta" href={card.action.parameters.url} target="_blank" rel="noreferrer">{card.action.parameters.display_text}</a>
                    : <div className="interactive-message-options">{card.action.buttons.map((item) => <span key={item.quick_reply.id}>{item.quick_reply.title}</span>)}</div>}
                </article>
              );
            })}
          </div>
        ) : null}
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
    detailLoading, detailMoreLoading, listMoreLoading, listPagination, detailPagination,
    searchResults, searchLoading, searchError, searchRevision, sendWarning,
    sending, error, sendError, retryPayload, realtimeStatus, refreshList, loadMoreConversations,
    loadOlderMessages, loadAllConversations, cancelConversationSearch,
    selectConversation, sendMessage, sendInteractiveMessage, retryMessage,
  } = useInbox();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [composerMode, setComposerMode] = useState<"text" | "buttons" | "carousel">("text");
  const [carouselBody, setCarouselBody] = useState("");
  const [carouselButtonMode, setCarouselButtonMode] = useState<"quick_reply" | "cta_url">("quick_reply");
  const [carouselCards, setCarouselCards] = useState<Array<{ mediaType: "image" | "video"; mediaUrl: string; body: string; buttonTitle: string; buttonUrl: string }>>([
    { mediaType: "image", mediaUrl: "", body: "", buttonTitle: "", buttonUrl: "" },
    { mediaType: "image", mediaUrl: "", body: "", buttonTitle: "", buttonUrl: "" },
  ]);
  const [buttonBody, setButtonBody] = useState("");
  const [buttonHeader, setButtonHeader] = useState("");
  const [buttonFooter, setButtonFooter] = useState("");
  const [buttonTitles, setButtonTitles] = useState(["", ""]);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRestoreRef = useRef<{ height: number; top: number } | null>(null);
  const previousSelectedContactRef = useRef(selectedContactId);

  useEffect(() => {
    const normalized = search.trim();
    if (!normalized) {
      cancelConversationSearch();
      return;
    }
    const timeout = window.setTimeout(() => void loadAllConversations(), 250);
    return () => {
      window.clearTimeout(timeout);
      cancelConversationSearch();
    };
  }, [search, searchRevision, loadAllConversations, cancelConversationSearch]);

  useLayoutEffect(() => {
    if (previousSelectedContactRef.current !== selectedContactId) {
      previousSelectedContactRef.current = selectedContactId;
      pendingScrollRestoreRef.current = null;
      return;
    }
    const pending = pendingScrollRestoreRef.current;
    const element = messageListRef.current;
    if (!pending || !element) return;
    element.scrollTop = pending.top + (element.scrollHeight - pending.height);
    pendingScrollRestoreRef.current = null;
  }, [messages, selectedContactId]);

  async function handleLoadOlderMessages() {
    const element = messageListRef.current;
    if (element) pendingScrollRestoreRef.current = { height: element.scrollHeight, top: element.scrollTop };
    const loaded = await loadOlderMessages();
    if (!loaded) pendingScrollRestoreRef.current = null;
  }

  const filteredConversations = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const source = normalized ? searchResults : conversations;
    if (!normalized) return source;
    return source.filter(({ contact, last_message }) =>
      [contact.profile_name ?? "", contact.wa_id, last_message.message_content ?? ""]
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [conversations, search, searchResults]);

  const activeConversation = [...conversations, ...searchResults].find((item) => item.contact.id === selectedContactId);
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
          <button className="icon-button" type="button" onClick={() => void refreshList()} aria-label="Muat ulang percakapan" title="Muat ulang">↻</button>
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
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, nomor, atau pesan" />
          </label>
          <div className="conversation-list-scroll">
            {listLoading && conversations.length === 0 ? <div className="inbox-skeleton-list" role="status" aria-label="Memuat percakapan">{[0,1,2,3].map((item) => <div className="inbox-skeleton-item" key={item}><span /><div><i /><i /></div></div>)}</div> : null}
            {searchLoading ? <p className="inbox-state">Mencari seluruh percakapan…</p> : null}
            {searchError ? <p className="inbox-state" role="alert">{searchError}</p> : null}
            {!listLoading && !searchLoading && !searchError && filteredConversations.length === 0 ? (
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
            {!search.trim() && listPagination.has_more ? (
              <button className="pagination-button" type="button" disabled={listMoreLoading} onClick={() => void loadMoreConversations()}>
                {listMoreLoading ? "Memuat…" : "Muat percakapan sebelumnya"}
              </button>
            ) : null}
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
                <button className="mobile-back-button" type="button" onClick={() => selectConversation("")} aria-label="Kembali ke daftar percakapan">
                  ← <span>Kembali</span>
                </button>
                <span className="contact-avatar detail-avatar" aria-hidden="true">{(contact?.profile_name ?? contact?.wa_id ?? "?").slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{contact?.profile_name?.trim() || contact?.wa_id || "Memuat kontak…"}</strong>
                  <span>{contact?.wa_id ?? ""}</span>
                </div>
              </header>

              <div className="message-list" aria-live="polite" aria-busy={detailLoading} ref={messageListRef}>
                {detailPagination.has_more ? (
                  <button className="pagination-button older-messages-button" type="button" disabled={detailMoreLoading} onClick={() => void handleLoadOlderMessages()}>
                    {detailMoreLoading ? "Memuat…" : "Muat pesan sebelumnya"}
                  </button>
                ) : null}
                {detailLoading && messages.length === 0 ? <div className="inbox-message-skeleton" role="status" aria-label="Memuat pesan"><span /><span /><span /></div> : null}
                {!detailLoading && messages.length === 0 ? <p className="inbox-state">Belum ada pesan pada percakapan ini.</p> : null}
                {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
              </div>

              <div className="composer-area">
                {sendError ? <p className="composer-error" role="alert">{sendError}</p> : null}
                {sendWarning ? <p className="composer-warning" role="alert">{sendWarning}</p> : null}
                {retryPayload ? (
                  <button className="retry-send-button" type="button" disabled={sending} onClick={() => void retryMessage()}>
                    Coba ulang permintaan yang sama
                  </button>
                ) : null}
                <div className="composer-mode-switch" role="group" aria-label="Jenis pesan">
                  <button type="button" className={composerMode === "text" ? "active" : ""} onClick={() => setComposerMode("text")}>Pesan teks</button>
                  <button type="button" className={composerMode === "buttons" ? "active" : ""} onClick={() => setComposerMode("buttons")}>Tombol balasan</button>
                  <button type="button" className={composerMode === "carousel" ? "active" : ""} onClick={() => setComposerMode("carousel")}>Media carousel</button>
                </div>
                {composerMode === "text" ? (
                  <form className="message-composer" onSubmit={(event) => void handleSubmit(event)}>
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ketik pesan…" rows={1} maxLength={4096} aria-label="Tulis pesan WhatsApp" />
                    <button type="submit" disabled={!draft.trim() || sending || !account || !contact}>{sending ? "Mengirim…" : "Kirim"}</button>
                  </form>
                ) : composerMode === "buttons" ? (
                  <form className="interactive-composer" onSubmit={async (event) => {
                    event.preventDefault();
                    const titles = buttonTitles.map((title) => title.trim()).filter(Boolean);
                    if (!buttonBody.trim() || titles.length < 1 || new Set(titles.map((title) => title.toLocaleLowerCase())).size !== titles.length) return;
                    const interactive: InteractiveReplyButtons = {
                      type: "button",
                      ...(buttonHeader.trim() ? { header: { type: "text", text: buttonHeader.trim() } } : {}),
                      body: { text: buttonBody.trim() },
                      ...(buttonFooter.trim() ? { footer: { text: buttonFooter.trim() } } : {}),
                      action: { buttons: titles.map((title) => ({ type: "reply", reply: { id: `reply_${crypto.randomUUID()}`, title } })) },
                    };
                    const sent = await sendInteractiveMessage(interactive);
                    if (sent) {
                      setButtonBody(""); setButtonHeader(""); setButtonFooter("");
                      setButtonTitles(["", ""]); setComposerMode("text");
                    }
                  }}>
                    <input value={buttonHeader} onChange={(event) => setButtonHeader(event.target.value)} maxLength={60} placeholder="Header teks (opsional, maks. 60)" aria-label="Header pesan" />
                    <textarea value={buttonBody} onChange={(event) => setButtonBody(event.target.value)} maxLength={1024} rows={2} placeholder="Isi pesan (wajib, maks. 1.024 karakter)" aria-label="Isi pesan tombol balasan" />
                    <div className="reply-button-fields">
                      {buttonTitles.map((title, index) => (
                        <div className="reply-button-field" key={index}>
                          <input value={title} onChange={(event) => setButtonTitles((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} maxLength={20} placeholder={`Judul tombol ${index + 1} (maks. 20)`} aria-label={`Judul tombol ${index + 1}`} />
                          {buttonTitles.length > 1 ? <button type="button" aria-label={`Hapus tombol ${index + 1}`} onClick={() => setButtonTitles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button> : null}
                        </div>
                      ))}
                    </div>
                    {buttonTitles.length < 3 ? <button className="add-reply-button" type="button" onClick={() => setButtonTitles((current) => [...current, ""])}>+ Tambah tombol</button> : null}
                    <input value={buttonFooter} onChange={(event) => setButtonFooter(event.target.value)} maxLength={60} placeholder="Footer (opsional, maks. 60)" aria-label="Footer pesan" />
                    <button className="interactive-send-button" type="submit" disabled={!buttonBody.trim() || !buttonTitles.some((title) => title.trim()) || new Set(buttonTitles.filter((title) => title.trim()).map((title) => title.trim().toLocaleLowerCase())).size !== buttonTitles.filter((title) => title.trim()).length || sending || !account || !contact}>{sending ? "Mengirim…" : "Kirim tombol balasan"}</button>
                  </form>
                ) : (
                  <form className="interactive-composer carousel-composer" onSubmit={async (event) => {
                    event.preventDefault();
                    const mediaType = carouselCards[0]?.mediaType ?? "image";
                    const validCards = carouselCards.length >= 2 && carouselCards.length <= 10 &&
                      carouselCards.every((card) => card.mediaType === mediaType && /^https:\/\//i.test(card.mediaUrl.trim()) &&
                        card.buttonTitle.trim().length > 0 && (carouselButtonMode !== "cta_url" || /^https:\/\//i.test(card.buttonUrl.trim())) &&
                        (card.body.split("\n").length - 1) <= 2);
                    if (!carouselBody.trim() || !validCards) return;
                    const cards: InteractiveCarouselMessage["action"]["cards"] = carouselCards.map((card, index) => {
                      const header = card.mediaType === "image"
                        ? { type: "image" as const, image: { link: card.mediaUrl.trim() } }
                        : { type: "video" as const, video: { link: card.mediaUrl.trim() } };
                      const cardBody = card.body.trim() ? { text: card.body.trim() } : undefined;
                      if (carouselButtonMode === "cta_url") return {
                        card_index: index, type: "cta_url" as const, header,
                        ...(cardBody ? { body: cardBody } : {}),
                        action: { name: "cta_url" as const, parameters: { display_text: card.buttonTitle.trim(), url: card.buttonUrl.trim() } },
                      };
                      return {
                        card_index: index, type: "button" as const, header,
                        ...(cardBody ? { body: cardBody } : {}),
                        action: { buttons: [{ type: "quick_reply" as const, quick_reply: { id: `carousel_${crypto.randomUUID()}_${index}`, title: card.buttonTitle.trim() } }] },
                      };
                    });
                    const sent = await sendInteractiveMessage({ type: "carousel", body: { text: carouselBody.trim() }, action: { cards } });
                    if (sent) {
                      setCarouselBody("");
                      setCarouselCards([
                        { mediaType, mediaUrl: "", body: "", buttonTitle: "", buttonUrl: "" },
                        { mediaType, mediaUrl: "", body: "", buttonTitle: "", buttonUrl: "" },
                      ]);
                      setComposerMode("text");
                    }
                  }}>
                    <textarea value={carouselBody} onChange={(event) => setCarouselBody(event.target.value)} maxLength={1024} rows={2} placeholder="Teks utama carousel (wajib, maks. 1.024 karakter)" aria-label="Teks utama carousel" />
                    <div className="carousel-button-mode" role="group" aria-label="Jenis tombol pada kartu">
                      <button type="button" className={carouselButtonMode === "quick_reply" ? "active" : ""} onClick={() => setCarouselButtonMode("quick_reply")}>Quick reply</button>
                      <button type="button" className={carouselButtonMode === "cta_url" ? "active" : ""} onClick={() => setCarouselButtonMode("cta_url")}>Tautan URL</button>
                    </div>
                    {carouselCards.map((card, index) => (
                      <fieldset className="carousel-card-fields" key={index}>
                        <legend>Kartu {index + 1}</legend>
                        <label>Media
                          <select value={card.mediaType} onChange={(event) => setCarouselCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, mediaType: event.target.value as "image" | "video" } : item))}>
                            <option value="image">Gambar</option><option value="video">Video</option>
                          </select>
                        </label>
                        <input type="url" value={card.mediaUrl} onChange={(event) => setCarouselCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, mediaUrl: event.target.value } : item))} placeholder="URL HTTPS media publik" aria-label={`URL media kartu ${index + 1}`} />
                        <textarea value={card.body} onChange={(event) => setCarouselCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, body: event.target.value } : item))} maxLength={160} rows={2} placeholder="Teks kartu (opsional, maks. 160 karakter)" aria-label={`Teks kartu ${index + 1}`} />
                        <input value={card.buttonTitle} onChange={(event) => setCarouselCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, buttonTitle: event.target.value } : item))} maxLength={20} placeholder="Label tombol (wajib, maks. 20)" aria-label={`Label tombol kartu ${index + 1}`} />
                        {carouselButtonMode === "cta_url" ? <input type="url" value={card.buttonUrl} onChange={(event) => setCarouselCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, buttonUrl: event.target.value } : item))} placeholder="URL HTTPS tujuan tombol" aria-label={`URL tombol kartu ${index + 1}`} /> : null}
                        {carouselCards.length > 2 ? <button type="button" className="remove-carousel-card" onClick={() => setCarouselCards((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Hapus kartu</button> : null}
                      </fieldset>
                    ))}
                    {carouselCards.length < 10 ? <button type="button" className="add-reply-button" onClick={() => setCarouselCards((current) => [...current, { mediaType: current[0]?.mediaType ?? "image", mediaUrl: "", body: "", buttonTitle: "", buttonUrl: "" }])}>+ Tambah kartu</button> : null}
                    <button className="interactive-send-button" type="submit" disabled={!carouselBody.trim() || carouselCards.length < 2 || carouselCards.length > 10 || carouselCards.some((card) => !card.mediaUrl.trim() || !/^https:\/\//i.test(card.mediaUrl.trim()) || !card.buttonTitle.trim() || (carouselButtonMode === "cta_url" && !/^https:\/\//i.test(card.buttonUrl.trim()))) || new Set(carouselCards.map((card) => card.mediaType)).size > 1 || sending || !account || !contact}>{sending ? "Mengirim…" : "Kirim media carousel"}</button>
                    <p className="carousel-form-note">Gunakan URL HTTPS yang dapat diakses publik. Semua kartu harus memakai tipe media dan tombol yang sama.</p>
                  </form>
                )}                <p className="composer-hint">Pesan interaktif mengikuti batas layanan 24 jam yang divalidasi server.</p>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
