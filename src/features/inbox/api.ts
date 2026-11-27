import { getSupabaseConfig } from "../../lib/supabase/client";
import type {
  InboxDetailResponse,
  InboxListResponse,
  SendMessagePayload,
  SendMessageResponse,
} from "./types";

export class InboxApiError extends Error {
  readonly retryable: boolean;
  readonly code?: string;

  constructor(message: string, retryable = false, code?: string) {
    super(message);
    this.name = "InboxApiError";
    this.retryable = retryable;
    this.code = code;
  }
}

async function functionRequest<T>(functionName: string, query: URLSearchParams, init?: RequestInit): Promise<T> {
  const { url, anonKey } = getSupabaseConfig();
  const endpoint = new URL(`/functions/v1/${functionName}`, url);
  query.forEach((value, key) => endpoint.searchParams.set(key, value));

  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    headers.set("apikey", anonKey);
    headers.set("Authorization", `Bearer ${anonKey}`);
    response = await fetch(endpoint, { ...init, headers });
  } catch {
    throw new InboxApiError("Koneksi ke server gagal. Periksa jaringan lalu coba lagi.", true, "NETWORK_ERROR");
  }

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    if (payload?.delivery_unknown === true) return payload as T;
    const nestedError = payload?.error;
    const message = typeof nestedError === "string"
      ? nestedError
      : nestedError && typeof nestedError === "object" && "message" in nestedError
        ? String((nestedError as { message: unknown }).message)
        : typeof payload?.message === "string"
          ? payload.message
          : `Permintaan gagal (HTTP ${response.status}).`;
    const code = nestedError && typeof nestedError === "object" && "code" in nestedError
      ? String((nestedError as { code: unknown }).code)
      : undefined;
    throw new InboxApiError(message, false, code);
  }

  return payload as T;
}

export function getInboxList(limit = 50, cursor?: string | null) {
  const query = new URLSearchParams({ mode: "list", limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return functionRequest<InboxListResponse>("whatsapp-get-inbox", query, { method: "GET" });
}

export function getInboxDetail(contactId: string, limit = 50, cursor?: string | null) {
  const query = new URLSearchParams({
    mode: "detail",
    contact_id: contactId,
    limit: String(limit),
  });
  if (cursor) query.set("cursor", cursor);
  return functionRequest<InboxDetailResponse>("whatsapp-get-inbox", query, { method: "GET" });
}

export async function sendWhatsappMessage(payload: SendMessagePayload) {
  const result = await functionRequest<SendMessageResponse>(
    "whatsapp-send-message",
    new URLSearchParams(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (result.delivery_unknown) {
    throw new InboxApiError(
      result.error ?? result.persistence_warning ?? "Status pengiriman belum dapat dipastikan. Gunakan retry dengan ID permintaan yang sama.",
      true,
      "DELIVERY_UNKNOWN",
    );
  }
  if (!result.success) {
    const savedStatus = result.saved_message?.status;
    if (result.idempotent_replay && savedStatus === "pending") {
      throw new InboxApiError("Permintaan sebelumnya masih diproses. Tidak ada pesan baru yang dikirim; tunggu pembaruan status melalui Inbox.", false, "IDEMPOTENT_PENDING");
    }
    if (result.idempotent_replay && savedStatus === "failed") {
      throw new InboxApiError("Permintaan sebelumnya berstatus gagal. Permintaan yang sama tidak akan dikirim ulang otomatis.", false, "IDEMPOTENT_FAILED");
    }
    throw new InboxApiError(result.error ?? "WhatsApp tidak menerima pesan ini.", false, "SEND_REJECTED");
  }
  return result;
}
