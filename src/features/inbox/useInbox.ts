import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabaseClient } from "../../lib/supabase/client";
import { getInboxDetail, getInboxList, InboxApiError, sendWhatsappMessage } from "./api";
import type {
  InboxAccount,
  InboxContact,
  InboxConversation,
  InboxMessage,
  SendMessagePayload,
} from "./types";

export function useInbox() {
  const [account, setAccount] = useState<InboxAccount | null>(null);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<InboxContact | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<SendMessagePayload | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");

  const refreshList = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError("Supabase belum dikonfigurasi. Lengkapi file .env sebelum menjalankan aplikasi.");
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const response = await getInboxList();
      setAccount(response.account);
      setConversations(response.conversations);
      setError(null);
    } catch (cause) {
      const message = cause instanceof InboxApiError ? cause.message : "Tidak dapat memuat daftar percakapan.";
      setError(message);
    } finally {
      setListLoading(false);
    }
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!selectedContactId) return;
    setDetailLoading(true);
    try {
      const response = await getInboxDetail(selectedContactId);
      setSelectedContact(response.contact);
      setMessages(response.messages);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Tidak dapat memuat detail percakapan.";
      setError(message);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedContactId]);

  const selectConversation = useCallback(async (contactId: string) => {
    setSelectedContactId(contactId);
    setSelectedContact(null);
    setMessages([]);
    setDetailLoading(true);
    try {
      const response = await getInboxDetail(contactId);
      setSelectedContact(response.contact);
      setMessages(response.messages);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat memuat detail percakapan.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!supabaseClient) return;
    const channel = supabaseClient
      .channel("whatsapp-inbox")
      .on("broadcast", { event: "inbox_update" }, () => {
        void refreshList();
        void refreshDetail();
      })
      .subscribe((status) => setRealtimeStatus(status));

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [refreshList, refreshDetail]);

  const sendMessage = useCallback(async (message: string) => {
    if (!account || !selectedContact || !message.trim()) return false;
    const payload = retryPayload && retryPayload.to === selectedContact.wa_id && retryPayload.message === message.trim()
      ? retryPayload
      : {
          phone_number_id: account.phone_number_id,
          to: selectedContact.wa_id,
          message: message.trim(),
          client_request_id: crypto.randomUUID(),
        };

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
      if (apiError.retryable) setRetryPayload(payload);
      return false;
    } finally {
      setSending(false);
    }
  }, [account, selectedContact, retryPayload, refreshList, refreshDetail]);

  return {
    account,
    conversations,
    selectedContactId,
    selectedContact,
    messages,
    listLoading,
    detailLoading,
    sending,
    error,
    sendError,
    retryPayload,
    realtimeStatus,
    refreshList,
    selectConversation,
    sendMessage,
    clearSendError: () => setSendError(null),
  };
}
