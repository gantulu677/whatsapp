import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabaseClient } from "../../lib/supabase/client";
import { getInboxDetail, getInboxList, InboxApiError, sendWhatsappMessage } from "./api";
import type {
  InboxAccount,
  InboxContact,
  InboxConversation,
  InboxMessage,
  InboxPagination,
  SendMessagePayload,
  InteractiveMessage,
} from "./types";

const PAGE_SIZE = 50;
const EMPTY_PAGINATION: InboxPagination = { next_cursor: null, has_more: false };

function mergeConversations(
  current: InboxConversation[],
  incoming: InboxConversation[],
): InboxConversation[] {
  const byContact = new Map<string, InboxConversation>();
  for (const item of [...current, ...incoming]) {
    const existing = byContact.get(item.contact.id);
    if (!existing || new Date(item.last_message.timestamp).getTime() >= new Date(existing.last_message.timestamp).getTime()) {
      byContact.set(item.contact.id, item);
    }
  }
  return [...byContact.values()].sort(
    (a, b) => new Date(b.last_message.timestamp).getTime() - new Date(a.last_message.timestamp).getTime(),
  );
}

function mergeMessages(current: InboxMessage[], incoming: InboxMessage[]): InboxMessage[] {
  const byId = new Map<string, InboxMessage>();
  for (const message of [...current, ...incoming]) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function useInbox() {
  const [account, setAccount] = useState<InboxAccount | null>(null);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<InboxContact | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [listPagination, setListPagination] = useState<InboxPagination>(EMPTY_PAGINATION);
  const [detailPagination, setDetailPagination] = useState<InboxPagination>(EMPTY_PAGINATION);
  const [searchResults, setSearchResults] = useState<InboxConversation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchRevision, setSearchRevision] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listMoreLoading, setListMoreLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMoreLoading, setDetailMoreLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendWarning, setSendWarning] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<SendMessagePayload | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");

  const detailRequestRef = useRef(0);
  const selectedContactRef = useRef<string | null>(null);
  const listRequestRef = useRef(0);
  const searchRequestRef = useRef(0);
  const listPaginationRef = useRef<InboxPagination>(EMPTY_PAGINATION);
  const detailPaginationRef = useRef<InboxPagination>(EMPTY_PAGINATION);
  const listLoadedOlderRef = useRef(false);
  const detailLoadedOlderRef = useRef(false);
  const listMoreLoadingRef = useRef(false);
  const detailMoreLoadingRef = useRef(false);
  const detailLoadingRef = useRef(false);
  const detailRefreshPendingRef = useRef(false);

  const updateListPagination = useCallback((pagination: InboxPagination) => {
    listPaginationRef.current = pagination;
    setListPagination(pagination);
  }, []);

  const updateDetailPagination = useCallback((pagination: InboxPagination) => {
    detailPaginationRef.current = pagination;
    setDetailPagination(pagination);
  }, []);

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
      if (listLoadedOlderRef.current) {
        setConversations((current) => mergeConversations(current, response.conversations));
      } else {
        setConversations(response.conversations);
        updateListPagination(response.pagination ?? EMPTY_PAGINATION);
      }
      setError(null);
    } catch (cause) {
      if (requestId !== listRequestRef.current) return;
      setError(cause instanceof InboxApiError ? cause.message : "Tidak dapat memuat daftar percakapan.");
    } finally {
      if (requestId === listRequestRef.current) setListLoading(false);
    }
  }, [updateListPagination]);

  const loadMoreConversations = useCallback(async () => {
    const pagination = listPaginationRef.current;
    if (!pagination.has_more || !pagination.next_cursor || listMoreLoadingRef.current) return;
    const requestId = listRequestRef.current;
    listMoreLoadingRef.current = true;
    setListMoreLoading(true);
    try {
      const response = await getInboxList(PAGE_SIZE, pagination.next_cursor);
      if (requestId !== listRequestRef.current) return;
      setConversations((current) => mergeConversations(current, response.conversations));
      listLoadedOlderRef.current = true;
      updateListPagination(response.pagination ?? EMPTY_PAGINATION);
    } catch (cause) {
      if (requestId === listRequestRef.current) {
        setError(cause instanceof Error ? cause.message : "Tidak dapat memuat percakapan berikutnya.");
      }
    } finally {
      listMoreLoadingRef.current = false;
      setListMoreLoading(false);
    }
  }, [updateListPagination]);

  const loadAllConversations = useCallback(async () => {
    const requestId = ++searchRequestRef.current;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const all: InboxConversation[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const response = await getInboxList(PAGE_SIZE, cursor);
        if (requestId !== searchRequestRef.current) return;
        all.push(...response.conversations);
        const nextCursor = response.pagination?.next_cursor ?? null;
        hasMore = Boolean(response.pagination?.has_more && nextCursor);
        if (!hasMore || !nextCursor || seenCursors.has(nextCursor)) break;
        seenCursors.add(nextCursor);
        cursor = nextCursor;
      }

      if (requestId === searchRequestRef.current) setSearchResults(mergeConversations([], all));
    } catch (cause) {
      if (requestId === searchRequestRef.current) {
        setSearchError(cause instanceof Error ? cause.message : "Tidak dapat mencari seluruh percakapan.");
      }
    } finally {
      if (requestId === searchRequestRef.current) setSearchLoading(false);
    }
  }, []);

  const cancelConversationSearch = useCallback(() => {
    ++searchRequestRef.current;
    setSearchLoading(false);
    setSearchError(null);
    setSearchResults([]);
  }, []);

  const refreshDetail = useCallback(async () => {
    const contactId = selectedContactRef.current;
    if (!contactId) return;
    if (detailMoreLoadingRef.current) {
      detailRefreshPendingRef.current = true;
      return;
    }
    const requestId = ++detailRequestRef.current;
    detailLoadingRef.current = true;
    setDetailLoading(true);
    try {
      const response = await getInboxDetail(contactId, PAGE_SIZE);
      if (requestId !== detailRequestRef.current || selectedContactRef.current !== contactId) return;
      setSelectedContact(response.contact);
      if (detailLoadedOlderRef.current) {
        setMessages((current) => mergeMessages(current, response.messages));
      } else {
        setMessages(response.messages);
        updateDetailPagination(response.pagination ?? EMPTY_PAGINATION);
      }
    } catch (cause) {
      if (requestId === detailRequestRef.current && selectedContactRef.current === contactId) {
        setError(cause instanceof Error ? cause.message : "Tidak dapat memuat detail percakapan.");
      }
    } finally {
      if (requestId === detailRequestRef.current && selectedContactRef.current === contactId) {
        detailLoadingRef.current = false;
        setDetailLoading(false);
      }
    }
  }, [updateDetailPagination]);

  const loadOlderMessages = useCallback(async () => {
    const contactId = selectedContactRef.current;
    const pagination = detailPaginationRef.current;
    if (!contactId || !pagination.has_more || !pagination.next_cursor || detailMoreLoadingRef.current || detailLoadingRef.current) return false;
    const requestId = detailRequestRef.current;
    detailMoreLoadingRef.current = true;
    setDetailMoreLoading(true);
    try {
      const response = await getInboxDetail(contactId, PAGE_SIZE, pagination.next_cursor);
      if (requestId !== detailRequestRef.current || selectedContactRef.current !== contactId) return false;
      setMessages((current) => mergeMessages(current, response.messages));
      detailLoadedOlderRef.current = true;
      updateDetailPagination(response.pagination ?? EMPTY_PAGINATION);
      return true;
    } catch (cause) {
      if (requestId === detailRequestRef.current && selectedContactRef.current === contactId) {
        setError(cause instanceof Error ? cause.message : "Tidak dapat memuat riwayat pesan sebelumnya.");
      }
      return false;
    } finally {
      if (requestId === detailRequestRef.current && selectedContactRef.current === contactId) {
        detailMoreLoadingRef.current = false;
        setDetailMoreLoading(false);
        if (detailRefreshPendingRef.current) {
          detailRefreshPendingRef.current = false;
          void refreshDetail();
        }
      }
    }
  }, [updateDetailPagination, refreshDetail]);

  const selectConversation = useCallback(async (contactId: string) => {
    selectedContactRef.current = contactId || null;
    const requestId = ++detailRequestRef.current;
    setSelectedContactId(contactId || null);
    setRetryPayload(null);
    setSendError(null);
    setSendWarning(null);
    detailLoadedOlderRef.current = false;
    detailRefreshPendingRef.current = false;
    updateDetailPagination(EMPTY_PAGINATION);
    if (!contactId) {
      setSelectedContact(null);
      setMessages([]);
      setDetailLoading(false);
      detailLoadingRef.current = false;
      detailMoreLoadingRef.current = false;
      setDetailMoreLoading(false);
      return;
    }

    setSelectedContact(null);
    setMessages([]);
    setDetailLoading(true);
    detailLoadingRef.current = true;
    detailMoreLoadingRef.current = false;
    setDetailMoreLoading(false);
    try {
      const response = await getInboxDetail(contactId, PAGE_SIZE);
      if (requestId !== detailRequestRef.current || selectedContactRef.current !== contactId) return;
      setSelectedContact(response.contact);
      setMessages(response.messages);
      updateDetailPagination(response.pagination ?? EMPTY_PAGINATION);
      setError(null);
    } catch (cause) {
      if (requestId === detailRequestRef.current && selectedContactRef.current === contactId) {
        setError(cause instanceof Error ? cause.message : "Tidak dapat memuat detail percakapan.");
      }
    } finally {
      if (requestId === detailRequestRef.current && selectedContactRef.current === contactId) {
        detailLoadingRef.current = false;
        setDetailLoading(false);
      }
    }
  }, [updateDetailPagination]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    const client = supabaseClient;
    if (!client) return;
    const channel = client.channel("whatsapp-inbox")
      .on("broadcast", { event: "inbox_update" }, () => {
        setSearchRevision((revision) => revision + 1);
        void refreshList();
        void refreshDetail();
      })
      .subscribe((status) => setRealtimeStatus(status));

    return () => {
      ++detailRequestRef.current;
      ++listRequestRef.current;
      ++searchRequestRef.current;
      void client.removeChannel(channel);
    };
  }, [refreshList, refreshDetail]);

  const sendPayload = useCallback(async (payload: SendMessagePayload) => {
    if (!account || !selectedContact || payload.to !== selectedContact.wa_id) return false;
    setSending(true);
    setSendError(null);
    setSendWarning(null);
    try {
      const result = await sendWhatsappMessage(payload);
      setRetryPayload(null);
      await Promise.all([refreshList(), refreshDetail()]);
      if (result.persistence_warning) {
        setSendWarning(
          `WhatsApp menerima pesan, tetapi penyimpanan status belum lengkap: ${result.persistence_warning} Jangan kirim ulang pesan ini sebelum statusnya direkonsiliasi.`,
        );
      }
      return true;
    } catch (cause) {
      const apiError = cause instanceof InboxApiError ? cause : new InboxApiError("Pengiriman pesan gagal.");
      setSendError(apiError.message);
      if (apiError.retryable || apiError.code === "DELIVERY_UNKNOWN") {
        setRetryPayload(payload);
      } else if (apiError.code === "IDEMPOTENT_PENDING" || apiError.code === "IDEMPOTENT_FAILED") {
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
          phone_number_id: account.phone_number_id,
          to: selectedContact.wa_id,
          message: message.trim(),
          client_request_id: crypto.randomUUID(),
        };
    return sendPayload(payload);
  }, [account, selectedContact, retryPayload, sendPayload]);

  const sendInteractiveMessage = useCallback((interactive: Exclude<InteractiveMessage, { type: "button_reply" }>) => {
    if (!account || !selectedContact) return Promise.resolve(false);
    return sendPayload({
      phone_number_id: account.phone_number_id,
      to: selectedContact.wa_id,
      interactive,
      client_request_id: crypto.randomUUID(),
    });
  }, [account, selectedContact, sendPayload]);

  const retryMessage = useCallback(() => (
    retryPayload ? sendPayload(retryPayload) : Promise.resolve(false)
  ), [retryPayload, sendPayload]);

  return {
    account,
    conversations,
    selectedContactId,
    selectedContact,
    messages,
    listLoading,
    listMoreLoading,
    detailLoading,
    detailMoreLoading,
    listPagination,
    detailPagination,
    searchResults,
    searchLoading,
    searchError,
    searchRevision,
    sending,
    error,
    sendError,
    sendWarning,
    retryPayload,
    realtimeStatus,
    refreshList,
    selectConversation,
    loadMoreConversations,
    loadOlderMessages,
    loadAllConversations,
    cancelConversationSearch,
    sendMessage,
    sendInteractiveMessage,
    retryMessage,
    clearSendError: () => {
      setSendError(null);
      setSendWarning(null);
    },
  };
}
