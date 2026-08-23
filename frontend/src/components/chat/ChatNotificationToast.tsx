'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquareText, X, HelpCircle, ArrowRight, Bell } from 'lucide-react';
import { readSessionUser, type SessionUser } from '@/lib/session';
import { getSenderColor } from '@/lib/chatColors';

interface IncomingMessage {
  _id: string;
  conversation_id: string;
  conversation_title?: string;
  channel_slug?: string;
  sender_id: string;
  sender_name: string;
  sender_role?: string;
  sender_photo_url?: string;
  message_text: string;
  message_type?: string;
  metadata?: {
    urgency?: string;
    tag?: string;
  };
  created_at: string;
}

// Gentle pleasant Telegram/Slack-style notification chime via Web Audio API
function playMessageChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // AudioContext blocked by user gesture policy
  }
}

export function ChatNotificationToast() {
  const pathname = usePathname();
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<IncomingMessage | null>(null);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentUser(readSessionUser());
  }, []);

  useEffect(() => {
    const handleNewMessage = (e: CustomEvent<IncomingMessage>) => {
      const msg = e.detail;
      if (!msg) return;

      const myId = currentUser?._id || (currentUser as any)?.userId;
      // Do not notify on own messages
      if (myId && String(msg.sender_id) === String(myId)) return;

      // If user is already on the full /chat page, don't show full pop-up toast
      if (pathname === '/chat') return;

      setToastMessage(msg);
      playMessageChime();

      // Auto-dismiss after 6 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 6000);
    };

    window.addEventListener('ipoms_chat_toast_notify' as any, handleNewMessage as EventListener);
    return () => {
      window.removeEventListener('ipoms_chat_toast_notify' as any, handleNewMessage as EventListener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentUser, pathname]);

  if (!toastMessage) return null;

  const color = getSenderColor(toastMessage.sender_name, toastMessage.sender_role);
  const isDoubt = toastMessage.message_type === 'doubt';
  const senderInitials = toastMessage.sender_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleOpenChat = () => {
    setToastMessage(null);
    router.push('/chat');
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-5 z-50 max-w-sm w-full animate-slideUp select-none"
    >
      <div
        onClick={handleOpenChat}
        className="glass-panel p-4 rounded-2xl border border-border shadow-4 hover:shadow-primary/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] space-y-2.5 relative group"
      >
        {/* Top Row: Sender Info & Close */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar with Distinct Coordinator Color */}
            <div
              className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${color.avatarBg}`}
            >
              {toastMessage.sender_photo_url ? (
                <img
                  src={toastMessage.sender_photo_url}
                  alt={toastMessage.sender_name}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                senderInitials
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className={`text-xs font-bold truncate ${color.text}`}>
                  {toastMessage.sender_role === 'Administrator' || toastMessage.sender_name === 'Placement Management' || toastMessage.sender_name === 'Administrator'
                    ? 'Administrator'
                    : toastMessage.sender_name}
                </span>
              </div>
              <div className="text-[10px] text-fg-subtle flex items-center gap-1 font-mono">
                <MessageSquareText size={10} />
                <span>{toastMessage.conversation_title || 'Team Channel'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setToastMessage(null);
            }}
            className="w-6 h-6 rounded-lg hover:bg-surface-sunken text-fg-subtle hover:text-fg flex items-center justify-center transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        {/* Message Preview */}
        <div
          className={`p-2.5 rounded-xl text-xs leading-relaxed border ${
            isDoubt
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100 font-medium'
              : 'bg-surface-sunken border-border text-fg'
          }`}
        >
          {isDoubt && (
            <div className="text-[10px] font-bold text-amber-600 mb-1 flex items-center gap-1">
              <HelpCircle size={11} />
              <span>COORDINATOR DOUBT</span>
            </div>
          )}
          <p className="line-clamp-2">{toastMessage.message_text}</p>
        </div>

        {/* Footer Action Hint */}
        <div className="flex items-center justify-between text-[10px] text-primary font-bold pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>New message received</span>
          </span>
          <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Click to reply</span>
            <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </div>
  );
}
