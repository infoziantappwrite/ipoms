'use client';

/**
 * Single shared SSE connection to /chat/stream, used by every chat surface
 * (full page, sidebar unread badge, floating dock) instead of each one
 * opening its own EventSource. Two things this fixes, not just tidies up:
 *
 * 1. Auth — the browser's native EventSource cannot set a custom
 *    Authorization header, so the token rides in the query string instead
 *    (?token=...), verified server-side in server.ts. Passing a bare
 *    ?user_id= (the old approach) let the connection claim to be anyone.
 * 2. One connection per tab instead of up to three, each independently
 *    retrying and each separately parsing every event.
 */

type Listener = (data: any) => void;

const EVENT_NAMES = [
  'connected',
  'new_message',
  'presence_update',
  'conversation_created',
  'message_reaction_updated',
  'message_deleted',
  'conversation_deleted',
  'messages_read',
] as const;

let es: EventSource | null = null;
let refCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Map<string, Set<Listener>>();

function teardown() {
  if (es) {
    es.close();
    es = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function ensureConnection() {
  if (es || typeof window === 'undefined') return;

  const token = localStorage.getItem('ipoms_token');
  if (!token) return;

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const instance = new EventSource(`${base}/chat/stream?token=${encodeURIComponent(token)}`);
  es = instance;

  EVENT_NAMES.forEach((name) => {
    instance.addEventListener(name, (e: MessageEvent) => {
      let data: any = null;
      try {
        data = e.data ? JSON.parse(e.data) : null;
      } catch {
        return;
      }
      listeners.get(name)?.forEach((fn) => fn(data));
    });
  });

  instance.onerror = () => {
    instance.close();
    if (es === instance) es = null;
    if (refCount > 0 && !retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (refCount > 0) ensureConnection();
      }, 3000);
    }
  };
}

/**
 * Subscribe to one chat SSE event. Returns an unsubscribe function — call it
 * from a useEffect cleanup. The underlying connection opens on the first
 * subscriber and closes once the last one unsubscribes.
 */
export function subscribeChatEvent(event: (typeof EVENT_NAMES)[number], cb: Listener): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(cb);
  refCount += 1;
  ensureConnection();

  return () => {
    listeners.get(event)?.delete(cb);
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0) teardown();
  };
}
