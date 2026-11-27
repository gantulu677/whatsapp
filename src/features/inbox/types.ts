export interface InboxAccount {
  id: string;
  name: string;
  phone_number_id: string;
}

export interface InboxContact {
  id: string;
  wa_id: string;
  profile_name: string | null;
}

export interface InboxMessageSummary {
  id: string;
  message_id: string | null;
  direction: "inbound" | "outbound" | "unknown";
  message_type: string;
  message_content: string | null;
  timestamp: string;
  status: string;
}

export interface InboxConversation {
  contact: InboxContact;
  last_message: InboxMessageSummary;
}

export interface InboxPagination {
  next_cursor: string | null;
  has_more: boolean;
}

export interface InboxListResponse {
  success: true;
  mode: "list";
  account: InboxAccount;
  conversations: InboxConversation[];
  pagination: InboxPagination;
}

export interface InboxMedia {
  id: string;
  media_id: string | null;
  mime_type: string | null;
  file_name: string | null;
  sha256: string | null;
  file_size: number | null;
  caption: string | null;
  url?: string;
}

export interface InteractiveReplyButton {
  type: "reply";
  reply: { id: string; title: string };
}

export interface InteractiveReplyButtons {
  type: "button";
  header?: { type: "text"; text: string };
  body: { text: string };
  footer?: { text: string };
  action: { buttons: InteractiveReplyButton[] };
}

export interface InteractiveButtonSelection {
  type: "button_reply";
  button_reply: { id: string | null; title: string | null };
}

export interface InboxMessage extends InboxMessageSummary {
  interactive?: InteractiveReplyButtons | InteractiveButtonSelection | Record<string, unknown> | null;
  status_updated_at: string | null;
  context_message_id: string | null;
  error: { code: string | null; message: string | null } | null;
  statuses: Array<{
    status: string;
    status_timestamp: string;
    recipient_wa_id: string | null;
    error_code: string | null;
    error_title: string | null;
    error_message: string | null;
  }>;
  media: InboxMedia[];
}

export interface InboxDetailResponse {
  success: true;
  mode: "detail";
  account: InboxAccount;
  contact: InboxContact;
  messages: InboxMessage[];
  pagination: InboxPagination;
}

export interface SendMessageResponse {
  success: boolean;
  delivery_unknown?: boolean;
  idempotent_replay?: boolean;
  client_request_id: string;
  saved_message?: {
    id: string;
    message_id?: string | null;
    status: string;
  };
  error?: string;
  persistence_warning?: string;
}

export interface SendMessagePayload {
  phone_number_id: string;
  to: string;
  message?: string;
  interactive?: InteractiveReplyButtons;
  client_request_id: string;
}
