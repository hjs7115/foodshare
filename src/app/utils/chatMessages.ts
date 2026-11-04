// randomUUID is unavailable on HTTP LAN addresses used for local demonstrations.
// getRandomValues is also available outside secure contexts; this ID is a deduplication key.
export function createClientMessageId(cryptoApi: Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>> = globalThis.crypto): string {
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface ChatMessage {
  messageId: number;
  senderId?: number;
  senderNickname?: string;
  senderProfileImage?: string;
  content: string;
  mine: boolean;
  systemMessage: boolean;
  unreadCount?: number;
  unreadByPartner?: boolean;
  readByUserIds?: number[];
  createdAt?: string;
}

export function applyReadReceipt(message: ChatMessage, readerId: number): ChatMessage {
  if (!message.mine || message.systemMessage) return message;
  if (message.readByUserIds?.includes(readerId)) return message;

  const currentUnreadCount = message.unreadCount ?? (message.unreadByPartner ? 1 : 0);
  const nextUnreadCount = Math.max(0, currentUnreadCount - 1);

  return {
    ...message,
    unreadCount: nextUnreadCount,
    unreadByPartner: nextUnreadCount > 0,
    readByUserIds: [...(message.readByUserIds || []), readerId],
  };
}

export function mergeMessageList(messages: ChatMessage[], currentUserId?: number) {
  return sortMessages(messages.reduce<ChatMessage[]>((merged, message) => (
    mergeMessages(merged, message, currentUserId)
  ), []));
}

export function mergeMessages(messages: ChatMessage[], incoming: ChatMessage, currentUserId?: number) {
  const normalizedIncoming = normalizeMine(incoming, currentUserId);

  const idIndex = normalizedIncoming.messageId > 0
    ? messages.findIndex((message) => message.messageId === normalizedIncoming.messageId)
    : -1;
  if (idIndex >= 0) {
    const next = [...messages];
    next[idIndex] = mergeMessageState(next[idIndex], normalizedIncoming);
    return sortMessages(next);
  }

  const pendingIndex = messages.findIndex((message) => isMatchingPendingMessage(message, normalizedIncoming, currentUserId));
  if (pendingIndex >= 0) {
    const next = [...messages];
    next[pendingIndex] = mergeMessageState(next[pendingIndex], { ...normalizedIncoming, mine: true });
    return sortMessages(next);
  }

  if (messages.some((message) => isSameMessage(message, normalizedIncoming))) {
    return messages;
  }

  return sortMessages([...messages, normalizedIncoming]);
}

export function mergeMessageState(existing: ChatMessage, incoming: ChatMessage): ChatMessage {
  const unreadCount = incoming.unreadCount !== undefined ? incoming.unreadCount : existing.unreadCount;

  return {
    ...existing,
    ...incoming,
    unreadCount,
    unreadByPartner: unreadCount !== undefined ? unreadCount > 0 : incoming.unreadByPartner,
    readByUserIds: incoming.readByUserIds && incoming.readByUserIds.length > 0
      ? incoming.readByUserIds
      : existing.readByUserIds,
  };
}

export function normalizeMine(message: ChatMessage, currentUserId?: number) {
  if (currentUserId === undefined || message.senderId === undefined) {
    return message;
  }
  return {
    ...message,
    mine: message.mine || message.senderId === currentUserId,
  };
}

export function isMatchingPendingMessage(message: ChatMessage, incoming: ChatMessage, currentUserId?: number) {
  if (message.messageId >= 0 || !message.mine || message.content !== incoming.content) {
    return false;
  }

  if (incoming.mine || (currentUserId !== undefined && incoming.senderId === currentUserId)) {
    return true;
  }

  return currentUserId === undefined && areCloseMessageTimes(message.createdAt, incoming.createdAt, 15000);
}

export function isSameMessage(message: ChatMessage, incoming: ChatMessage) {
  if (message.messageId > 0 && incoming.messageId > 0) return message.messageId === incoming.messageId;

  if (message.content !== incoming.content || message.systemMessage !== incoming.systemMessage) {
    return false;
  }

  const sameSender = message.senderId !== undefined && incoming.senderId !== undefined
    ? message.senderId === incoming.senderId
    : message.mine === incoming.mine && message.senderNickname === incoming.senderNickname;

  return sameSender && areCloseMessageTimes(message.createdAt, incoming.createdAt, 2000);
}

export function hasEquivalentMessage(messages: ChatMessage[], incoming: ChatMessage) {
  return messages.some((message) => isSameMessage(message, incoming));
}

export function areMessageListsEqual(left: ChatMessage[], right: ChatMessage[]) {
  if (left.length !== right.length) return false;

  return left.every((message, index) => {
    const other = right[index];
    return Boolean(other) &&
      message.messageId === other.messageId &&
      message.senderId === other.senderId &&
      message.senderNickname === other.senderNickname &&
      message.senderProfileImage === other.senderProfileImage &&
      message.content === other.content &&
      message.mine === other.mine &&
      message.systemMessage === other.systemMessage &&
      (message.unreadCount ?? 0) === (other.unreadCount ?? 0) &&
      Boolean(message.unreadByPartner) === Boolean(other.unreadByPartner) &&
      message.createdAt === other.createdAt;
  });
}

export function areCloseMessageTimes(left?: string, right?: string, thresholdMs = 2000) {
  if (!left || !right) return left === right;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return left === right;
  return Math.abs(leftTime - rightTime) <= thresholdMs;
}

export function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort((left, right) => {
    const leftTime = getMessageTime(left);
    const rightTime = getMessageTime(right);
    if (leftTime !== rightTime) return leftTime - rightTime;

    const leftId = left.messageId > 0 ? left.messageId : Number.MAX_SAFE_INTEGER + Math.abs(left.messageId);
    const rightId = right.messageId > 0 ? right.messageId : Number.MAX_SAFE_INTEGER + Math.abs(right.messageId);
    return leftId - rightId;
  });
}

export function getMessageTime(message: ChatMessage) {
  const time = message.createdAt ? new Date(message.createdAt).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}
