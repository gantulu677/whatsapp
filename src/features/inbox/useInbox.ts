import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabaseClient } from "../../lib/supabase/client";
import { getInboxDetail, getInboxList, InboxApiError, sendWhatsappMessage } from "./api";
import type {
  InboxAccount, InboxContact, InboxConversation, InboxMessage, InboxPagination,
  SendMessagePayload, InteractiveReplyButtons,
} from "./types";

const EMPTY_PAGINATION: InboxPagination = { next_cursor: null, has_more: false };
const PAGE_SIZE = 50;

export function useInbox() {
  const [account, setAccount] = useState<InboxAccount | null>(null);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<InboxContact | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [listPagination, setListPagination] = useState<InboxPagination>(EMPTY_PAGINATION);
  const [detailPagination, setDetailPagination] = useState<InboxPagination>(EMPTY_PAGINATION);
  const [listLoading, setListLoading] = useState(true);
  const [listMoreLoading, setListMoreLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMoreLoading, setDetailMoreLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<SendMessagePayload | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");
  const detailRequestRef = useRef(0);
  const selectedContactRef = useRef<string | null>(null);
  const listRequestRef = useRef(0);

  const refreshList = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError("Supabase belum dikonfigurasi. Lengkapi konfigurasi client sebelum menjalankan aplikasi.");
      setListLoading(false);
      return;
    }
    const requestId = ++listRequestRef.current;
    setListLoading(true);
    try {
      const response = await getInboxList(PAGE_SIZE);
      if (requestId !== listRequestRef.current) return;
      setAccount(response.account);
      setConversations(response.conversations);
      setListPagination(response.pagination ?? EMPTY_PAGINATION);
      setError(null);
    } catch (cause) {
      if (requestId !== listRequestRef.current) return;
      setError(cause instanceof InboxApiError ? cause.message : "Tidak dapat memuat daftar percakapan.");
    } finally {
      if (requestId === listRequestRef.current) setListLoading(false);
    }
  }, []);

  const loadMoreConversations = useCallback(async () => {
    if (!listPagination.has_more || !listPagination.next_cursor || listMoreLoading) return;
    const requestId = listRequestRef.current;
    setListMoreLoading(true);
    try {
      const response = await getInboxList(PAGE_SIZE, listPagination.next_cursor);
      if (requestId !== listRequestRef.current) return;
      setConversations((current) => {
        const existing = new Set(current.map((item) => item.contact.id));
        return [...current, ...response.conversations.filter((item) => !existing.has(item.contact.id))];
      });
      setListPagination(response.pagination ?? EMPTY_PAGINATION);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat memuat percakapan berikutnya.");
    } finally {
      setListMoreLoading(false);
    }
  }, [listPagination, listMoreLoading]);

  const refreshDetail = useCallback(async () => {
    const contactId = selectedContactRef.current;
    if (!contactId) return;
    const requestId = ++detailRequestRef.current;
    setDetailLoading(true);
    try {
      const response = await getInboxDetail(contactId, PAGE_SIZE);
      if (requestId !== detailRequestRef.current || selectedContactRef.current !== contactId) return;
      setSelectedContact(response.contact);
      setMessages(response.messages);
      setDetailPagination(response.pagination ?? EMPTY_PAGINATION);
    } catch (cause) {
      if (requestId !== detailRequestRef.current || selectedContactRef.current !== contactId) return;
      setError(cause instanceof Error ? cause.message : "Tidak dapat memuat detail percakapan.");
    } finally {
      if (requestId === detailRequestRef.current && selectedContactRef.current === contactId) setDetailLoading(false);
    }
  }, []);

  const loadOlderMessages = useCallback(async () => {
    const contactId = selectedContactRef.current;
    if (!contactId || !detailPagination.has_more || !detailPagination.next_cursor || detailMoreLoading) return;
    const requestId = detailRequestRef.current;
    setDetailMoreLoading(true);
    try {
      const response = await getInboxDetail(contactId, PAGE_SIZE, detailPagination.next_cursor);
      if (requestId !== detailRequestRef.current || selectedContactRef.current !== contactId) return;
      setMessages((current) => {
        const existing = new Set(current.map((message) => message.id));
        return [...response.messages.filter((message) => !existing.has(message.id)), ...current];
      });
      setDetailPagination(response.pagination ?? EMPTY_PAGINATION);
    } catch (cause) {
      if (requestId === detailRequestRef.current && selectedContactRef.current === contactId) {
        setError(cause instanceof Error ? cause.message : "Tidak dapat memuat riwayat pesan sebelumnya.");
      }
    } finally {
      if (selectedContactRef.current === contactId) setDetailMoreLoading(false);
    }
  }, [detailPagination, detailMoreLoading]);

  const selectConversation = useCallback(async (contactId: string) => {
    selectedContactRef.current = contactId || null;
    const requestId = ++detailRequestRef.current;
    setSelectedContactId(contactId || null);
    setRetryPayload(null);
    setSendError(null);
    setDetailPagination(EMPTY_PAGINATION);
    if (!contactId) {
      setSelectedContact(null);
      setMessages([]);
      setDetailLoading(false);
      setDetailMoreLoading(false);
      return;
    }
    setSelectedContact(null);
    setMessages([]);
    setDetailLoading(true);
    setDetailMoreLoading(false);
    try {
      const response = await getInboxDetail(contactId, PAGE_SIZE);
      if (requestId !== detailRequestRef.current || selectedContactRef.current !== contactId) return;
      setSelectedContact(response.contact);
      setMessages(response.messages);
      setDetailPagination(response.pagination ?? EMPTY_PAGINATION);
      setError(null);
    } catch (cause) {
      if (requestId !== detailRequestRef.current || selectedContactRef.current !== contactId) return;
      setError(cause instanceof Error ? cause.message : "Tidak dapat memuat detail percakapan.");
    } finally {
      if (requestId === detailRequestRef.current && selectedContactRef.current === contactId) setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void refreshList(); }, [refreshList]);

  useEffect(() => {
    const client = supabaseClient;
    if (!client) return;
    const channel = client.channel("whatsapp-inbox")
      .on("broadcast", { event: "inbox_update" }, () => {
        void refreshList();
        void refreshDetail();
      })
      .subscribe((status) => setRealtimeStatus(status));
    return () => {
      ++detailRequestRef.current;
      ++listRequestRef.current;
      void client.removeChannel(channel);
    };
  }, [refreshList, refreshDetail]);

  const sendPayload = useCallback(async (payload: SendMessagePayload) => {
    if (!account || !selectedContact || payload.to !== selectedContact.wa_id) return false;
    setSending(true);
    setSendError(null);
    try {
      await sendWhatsappMessage(payload);
      setRetryPayload(null);
      await Promise.all([refreshList(), refreshDetail()]);
      return true;
    } catch (cause) {
      const apiError = cause instanceof InboxApiError ? cause : new InboxApiError("Pengiriman pesan gagal.");
      setSendError(apiError.message);
      if (apiError.retryable || apiError.code === "DELIVERY_UNKNOWN") setRetryPayload(payload);
      else if (apiError.code === "IDEMPOTENT_PENDING" || apiError.code === "IDEMPOTENT_FAILED") {
        setRetryPayload(null);
        void refreshDetail();
      }
      return false;
    } finally {
      setSending(false);
    }
  }, [account, selectedContact, refreshList, refreshDetail]);

  const sendMessage = useCallback((message: string) => {
    if (!account || !selectedContact || !message.trim()) return Promise.resolve(false);
    const payload: SendMessagePayload = retryPayload && retryPayload.to === selectedContact.wa_id &&
      retryPayload.message === message.trim() && !retryPayload.interactive
      ? retryPayload
      : {
          phone_number_id: account.phone_number_id, to: selectedContact.wa_id,
          message: message.trim(), client_request_id: crypto.randomUUID(),
        };
    return sendPayload(payload);
  }, [account, selectedContact, retryPayload, sendPayload]);

  const sendInteractiveMessage = useCallback((interactive: InteractiveReplyButtons) => {
    if (!account || !selectedContact) return Promise.resolve(false);
    return sendPayload({
      phone_number_id: account.phone_number_id, to: selectedContact.wa_id,
      interactive, client_request_id: crypto.randomUUID(),
    });
  }, [account, selectedContact, sendPayload]);

  const retryMessage = useCallback(() => retryPayload ? sendPayload(retryPayload) : Promise.resolve(false), [retryPayload, sendPayload]);

  return {
    account, conversations, selectedContactId, selectedContact, messages,
    listLoading, listMoreLoading, detailLoading, detailMoreLoading,
    listPagination, detailPagination, sending, error, sendError, retryPayload, realtimeStatus,
    refreshList, selectConversation, loadMoreConversations, loadOlderMessages,
    sendMessage, sendInteractiveMessage, retryMessage,
    clearSendError: () => setSendError(null),
  };
}
