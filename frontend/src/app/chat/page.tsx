'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquareText, Hash, Send, Plus, Search, HelpCircle,
  AlertCircle, Users, CheckCheck, Clock, Building, Phone,
  Mail, Sparkles, Video, PhoneCall, RefreshCw, X, ChevronRight,
  Pin, MessageCircle, Shield, User as UserIcon, Smile,
  CornerUpLeft, Copy, Check, Trash2
} from 'lucide-react';
import { readSessionUser, type SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { UserSignOutButton } from '@/components/UserSignOutButton';
import { NotificationBellDropdown } from '@/components/NotificationBellDropdown';
import { getSenderColor } from '@/lib/chatColors';
import { subscribeChatEvent } from '@/lib/chatStream';

interface Conversation {
  _id: string;
  type: 'channel' | 'direct';
  title: string;
  description?: string;
  channel_slug?: string;
  participant_ids?: any[];
  last_message_at?: string;
  last_message_text?: string;
  last_sender_name?: string;
  unread_count?: number;
}

interface ReplyTo {
  message_id: string;
  sender_name: string;
  message_text: string;
}

interface Reaction {
  emoji: string;
  user_id: string;
  user_name: string;
}

interface Message {
  _id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role?: string;
  sender_photo_url?: string;
  message_text: string;
  message_type: 'text' | 'doubt' | 'announcement' | 'lead_tag' | 'system';
  reply_to?: ReplyTo;
  reactions?: Reaction[];
  metadata?: {
    college_code?: string;
    college_name?: string;
    lead_id?: string;
    tag?: string;
    urgency?: 'normal' | 'high' | 'urgent';
  };
  read_by?: string[];
  is_pinned?: boolean;
  created_at: string;
}

interface Coordinator {
  _id: string;
  full_name: string;
  username: string;
  official_email: string;
  primary_mobile?: string;
  profile_photo_url?: string;
  role_codes: string[];
  is_online?: boolean;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys & Reactions',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎', '🤩', '🥳', '😏', '🤔', '🤫', '🫡', '😮', '😴', '😭', '🤯', '🔥', '✨', '💯', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍'],
  },
  {
    name: 'Hands & Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👌', '🤌', '🤏', '💪', '👊', '👋'],
  },
  {
    name: 'Work & Placements',
    emojis: ['💼', '📁', '📊', '📈', '📋', '📌', '🎯', '🚀', '💡', '🏆', '🎓', '🏫', '🏢', '📞', '💻', '📧', '📅', '⏳', '⏰', '📢', '✅', '❌', '⚠️', '❓', '❗'],
  },
];

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🚀', '💡'];

export default function TeamChatPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isDoubtMode, setIsDoubtMode] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // WhatsApp-style Rail Navigation & Filter
  const [sidebarTab, setSidebarTab] = useState<'direct' | 'channels'>('direct');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread'>('all');

  // WhatsApp-style Reply & Emoji Picker state
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
    displayName: string;
  } | null>(null);

  // Right-click context menu on sidebar conversations
  const [convContextMenu, setConvContextMenu] = useState<{
    x: number;
    y: number;
    conversation: Conversation;
    partnerName: string;
  } | null>(null);

  // WhatsApp-style Delete for Me vs Delete for Everyone modal
  const [deleteModalTarget, setDeleteModalTarget] = useState<{
    message: Message;
    displayName: string;
    canDeleteForEveryone: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close context menu & emoji picker on outside click
  useEffect(() => {
    const handleWindowClick = (e: MouseEvent) => {
      setContextMenu(null);
      setConvContextMenu(null);
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // 1. Initial Data Load & Session User
  useEffect(() => {
    const user = readSessionUser();
    setCurrentUser(user);

    loadConversations();
    loadCoordinators();

    // 2. Real-Time updates via the shared chat SSE connection (one per tab,
    // authenticated with a real token — see lib/chatStream.ts).
    const unsubscribers = [
      subscribeChatEvent('new_message', (parsed) => {
        if (!parsed) return;
        const { conversation_id, message } = parsed;

        setMessages((prev) => {
          if (activeConvId === conversation_id) {
            if (prev.some((m) => m._id === message._id)) return prev;
            return [...prev, message];
          }
          return prev;
        });

        setConversations((prev) =>
          prev.map((c) => {
            if (c._id === conversation_id) {
              const isCurrentActive = activeConvId === conversation_id;
              return {
                ...c,
                last_message_at: message.created_at,
                last_message_text: message.message_text,
                last_sender_name: message.sender_name,
                unread_count: isCurrentActive ? 0 : (c.unread_count || 0) + 1,
              };
            }
            return c;
          })
        );
      }),

      subscribeChatEvent('presence_update', (parsed) => {
        if (!parsed) return;
        const { user_id, status } = parsed;
        setCoordinators((prev) =>
          prev.map((coord) => (coord._id === user_id ? { ...coord, is_online: status === 'online' } : coord))
        );
      }),

      subscribeChatEvent('conversation_created', () => {
        loadConversations();
      }),

      subscribeChatEvent('message_reaction_updated', (parsed) => {
        if (!parsed) return;
        const { message_id, reactions } = parsed;
        setMessages((prev) =>
          prev.map((m) => (m._id === message_id ? { ...m, reactions } : m))
        );
      }),

      subscribeChatEvent('message_deleted', (parsed) => {
        if (!parsed) return;
        const { message_id } = parsed;
        setMessages((prev) => prev.filter((m) => m._id !== message_id));
      }),

      subscribeChatEvent('conversation_deleted', (parsed) => {
        if (!parsed) return;
        const { conversation_id } = parsed;
        setConversations((prev) => prev.filter((c) => c._id !== conversation_id));
        if (activeConvId === conversation_id) {
          setActiveConvId('');
          loadConversations();
        }
      }),

      subscribeChatEvent('messages_read', (parsed) => {
        if (!parsed) return;
        const { conversation_id, reader_id } = parsed;
        if (conversation_id === activeConvId && reader_id) {
          setMessages((prev) =>
            prev.map((msg) => {
              const currentReadBy = Array.isArray(msg.read_by) ? [...msg.read_by] : [];
              if (!currentReadBy.some((uid) => String(uid) === String(reader_id))) {
                currentReadBy.push(reader_id);
              }
              return { ...msg, read_by: currentReadBy };
            })
          );
        }
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [activeConvId]);

  // Toggle message reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const user = readSessionUser();
      const res = await apiFetch(`/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({
          emoji,
          user_id: user?._id || (user as any)?.userId,
          user_name: user?.full_name || 'Coordinator',
        }),
      });
      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions: res.data.reactions } : m))
        );
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  // Open WhatsApp-style Delete confirmation modal
  const handlePromptDeleteMessage = (msg: Message, displayName: string) => {
    const myId = String(currentUser?._id || (currentUser as any)?.userId || '');
    const isSender = String(msg.sender_id) === myId;
    const isAdmin = currentUser?.role_codes?.some((r: string) => {
      const role = String(r).toUpperCase();
      return role.includes('ADMIN') || role.includes('MANAGEMENT');
    }) || false;

    setDeleteModalTarget({
      message: msg,
      displayName,
      canDeleteForEveryone: isSender || isAdmin,
    });
  };

  // Confirm delete message (Delete for Me vs Delete for Everyone)
  const handleConfirmDeleteMessage = async (messageId: string, deleteType: 'everyone' | 'for_me') => {
    setDeleteModalTarget(null);
    try {
      const user = readSessionUser();
      const uid = user?._id || (user as any)?.userId;
      const res = await apiFetch(`/chat/messages/${messageId}${uid ? `?user_id=${uid}` : ''}`, {
        method: 'DELETE',
        body: JSON.stringify({
          delete_type: deleteType,
          user_id: uid,
        }),
      });
      if (res.success) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Delete entire conversation
  const handleDeleteConversation = async (convId: string) => {
    if (!convId) return;
    if (!window.confirm('Are you sure you want to delete this chat completely? All messages will be permanently removed.')) {
      return;
    }
    try {
      const res = await apiFetch(`/chat/conversations/${convId}`, { method: 'DELETE' });
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c._id !== convId));
        setMessages([]);
        setActiveConvId('');
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const user = readSessionUser();
      const uid = user?._id || (user as any)?.userId;
      const res = await apiFetch(`/chat/conversations${uid ? `?user_id=${uid}` : ''}`);
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
        if (!activeConvId && res.data.length > 0) {
          // Default to #placements channel
          const defaultChannel =
            res.data.find((c: any) => c.channel_slug === 'placements') ||
            res.data[0];
          setActiveConvId(defaultChannel._id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [activeConvId]);

  // Load coordinators roster
  const loadCoordinators = async () => {
    try {
      const res = await apiFetch('/chat/coordinators');
      if (res.success && Array.isArray(res.data)) {
        setCoordinators(res.data);
      }
    } catch (err) {
      console.error('Failed to load coordinators:', err);
    }
  };

  // Instantly mark conversation as read on click
  const handleSelectConversation = (convId: string) => {
    setActiveConvId(convId);
    setConversations((prev) =>
      prev.map((c) => (c._id === convId ? { ...c, unread_count: 0 } : c))
    );
    const user = readSessionUser();
    const uid = user?._id || (user as any)?.userId;
    apiFetch(`/chat/conversations/${convId}/read${uid ? `?user_id=${uid}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ user_id: uid }),
    }).catch(() => {});
    window.dispatchEvent(new CustomEvent('ipoms_chat_read'));
  };

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const user = readSessionUser();
        const uid = user?._id || (user as any)?.userId;
        const res = await apiFetch(`/chat/conversations/${activeConvId}/messages${uid ? `?user_id=${uid}` : ''}`);
        if (res.success && Array.isArray(res.data)) {
          setMessages(res.data);
          // Mark conversation as read in backend
          apiFetch(`/chat/conversations/${activeConvId}/read${uid ? `?user_id=${uid}` : ''}`, {
            method: 'POST',
            body: JSON.stringify({ user_id: uid }),
          }).catch(() => {});
          // Reset unread count locally
          setConversations((prev) =>
            prev.map((c) => (c._id === activeConvId ? { ...c, unread_count: 0 } : c))
          );
          window.dispatchEvent(new CustomEvent('ipoms_chat_read'));
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeConvId]);

  // Auto-scroll to bottom of message feed
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);

  // Send Message Handler with Quoted Reply Support
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeConvId) return;

    setInputText('');
    const messageType = isDoubtMode ? 'doubt' : 'text';
    const currentUrgency = isDoubtMode ? urgencyLevel : 'normal';
    const currentReply = replyingTo;

    setIsDoubtMode(false);
    setUrgencyLevel('normal');
    setReplyingTo(null);

    try {
      const payload: any = {
        message_text: text,
        message_type: messageType,
        sender_id: currentUser?._id || (currentUser as any)?.userId,
        sender_name: currentUser?.full_name || 'Coordinator',
        sender_photo_url: currentUser?.profile_photo_url || '',
        reply_to: currentReply ? currentReply : undefined,
        metadata: {
          urgency: currentUrgency,
          tag: isDoubtMode ? 'Coordinator Doubt' : undefined,
        },
      };

      const res = await apiFetch(`/chat/conversations/${activeConvId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.data._id)) return prev;
          return [...prev, res.data];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Start Direct Chat with a Coordinator
  const handleStartDirectChat = async (coord: Coordinator) => {
    setShowNewChatModal(false);
    try {
      const res = await apiFetch('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          type: 'direct',
          recipient_id: coord._id,
        }),
      });

      if (res.success && res.data) {
        await loadConversations();
        setActiveConvId(res.data._id);
      }
    } catch (err) {
      console.error('Failed to start direct chat:', err);
    }
  };

  const activeConversation = conversations.find((c) => c._id === activeConvId);
  const channels = conversations.filter((c) => c.type === 'channel');
  const directChats = conversations.filter((c) => c.type === 'direct');

  const directUnreadTotal = directChats.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const channelUnreadTotal = channels.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  // Helper to reliably find the OTHER participant in a 1-on-1 direct conversation
  const getDirectPartner = (c: Conversation) => {
    const currentUid = String(currentUser?._id || (currentUser as any)?.userId || '');
    if (!c.participant_ids || !Array.isArray(c.participant_ids)) return null;
    return c.participant_ids.find((p: any) => String(p?._id || p) !== currentUid) || null;
  };

  // Filtered by search query & exclude dummy E2E test users
  const filteredChannels = channels.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDirectChats = directChats
    .filter((c) => !c.title.toLowerCase().startsWith('e2e'))
    .filter((c) => {
      const partner = getDirectPartner(c);
      const name = partner?.full_name || c.title;
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = chatFilter === 'unread' ? (c.unread_count || 0) > 0 : true;
      return matchesSearch && matchesFilter;
    });

  // Genuine Active Coordinators (excluding test/dummy accounts)
  const genuineCoordinators = coordinators.filter(
    (c) =>
      !c.username?.toLowerCase().startsWith('e2e') &&
      !c.official_email?.toLowerCase().startsWith('e2e') &&
      !c.full_name?.toLowerCase().startsWith('e2e')
  );

  // Active Direct Partner (if 1-on-1 chat)
  const activePartner = activeConversation?.type === 'direct'
    ? getDirectPartner(activeConversation)
    : null;

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-background text-fg flex flex-col select-none selection:bg-primary selection:text-white">
      
      {/* ── Frozen Top Header Bar ───────────────────────────────────────── */}
      <header className="shrink-0 z-30 bg-background border-b border-border px-6 py-3.5 flex items-center justify-between gap-4 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-fg tracking-tight flex items-center gap-2">
            <MessageSquareText size={20} className="text-primary" />
            <span>Chat</span>
          </h1>
          <p className="text-xs text-fg-subtle mt-0.5">
            Real-time messaging, coordinator doubt clearing & placement channels
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active online count pill */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border text-xs font-mono text-fg-muted shadow-2xs select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{genuineCoordinators.filter((c) => c.is_online).length || 1} Online</span>
          </span>

          <NotificationBellDropdown />
          <UserSignOutButton />
        </div>
      </header>

      {/* ── Main Chat Interface Grid ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden max-w-7xl mx-auto w-full p-4 sm:p-6 gap-5">
        
        {/* ── LEFT COLUMN: WhatsApp Web Mini Rail + Directory ─────────────── */}
        <aside className="w-80 sm:w-96 shrink-0 h-full glass-panel rounded-3xl border border-border flex overflow-hidden shadow-2 bg-surface">
          
          {/* 1. Leftmost Mini Icon Rail */}
          <div className="w-14 shrink-0 bg-surface-sunken/70 border-r border-border flex flex-col items-center py-4 select-none">
            <div className="flex flex-col items-center gap-3">
              {/* 💬 Direct Chats Tab Button */}
              <button
                type="button"
                onClick={() => setSidebarTab('direct')}
                className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  sidebarTab === 'direct'
                    ? 'bg-primary text-white shadow-xs scale-105'
                    : 'text-fg-subtle hover:bg-surface hover:text-fg'
                }`}
                title="Chats"
              >
                <MessageSquareText size={18} />
                {directUnreadTotal > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold shadow-xs">
                    {directUnreadTotal}
                  </span>
                )}
              </button>

              {/* 👥 Team Channels Tab Button */}
              <button
                type="button"
                onClick={() => setSidebarTab('channels')}
                className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  sidebarTab === 'channels'
                    ? 'bg-primary text-white shadow-xs scale-105'
                    : 'text-fg-subtle hover:bg-surface hover:text-fg'
                }`}
                title="Team Channels"
              >
                <Users size={18} />
                {channelUnreadTotal > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold shadow-xs">
                    {channelUnreadTotal}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 2. Directory Content (Dynamic based on sidebarTab) */}
          <div className="flex-1 flex flex-col min-w-0">
            {sidebarTab === 'direct' ? (
              /* ── CHATS VIEW (WhatsApp style) ────────────────────── */
              <>
                <div className="p-3.5 border-b border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-fg tracking-tight">Chats</h2>
                    <button
                      type="button"
                      onClick={() => setShowNewChatModal(true)}
                      className="w-8 h-8 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                      title="New Chat"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                    <input
                      type="text"
                      placeholder="Search or start a new chat"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-sunken border border-border/80 text-xs text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Filter Pills (All, Unread) */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setChatFilter('all')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        chatFilter === 'all'
                          ? 'bg-primary/15 text-primary border border-primary/20'
                          : 'bg-surface-sunken text-fg-subtle hover:text-fg border border-border/60'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatFilter('unread')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        chatFilter === 'unread'
                          ? 'bg-primary/15 text-primary border border-primary/20'
                          : 'bg-surface-sunken text-fg-subtle hover:text-fg border border-border/60'
                      }`}
                    >
                      Unread {directUnreadTotal > 0 && `(${directUnreadTotal})`}
                    </button>
                  </div>
                </div>

                {/* Chats List */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {filteredDirectChats.length === 0 ? (
                    <div className="p-6 text-center text-fg-subtle text-xs space-y-2.5">
                      <p>No chats yet. Click <span className="font-bold text-primary">+ New Chat</span> to start messaging!</p>
                      <button
                        type="button"
                        onClick={() => setShowNewChatModal(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shadow-xs hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        + New Chat
                      </button>
                    </div>
                  ) : (
                    filteredDirectChats.map((c) => {
                      const isActive = activeConvId === c._id;
                      const partner = getDirectPartner(c);
                      const partnerName = partner?.full_name || c.title;
                      const partnerInitials = partnerName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <div key={c._id} className="relative group">
                          <button
                            type="button"
                            onClick={() => handleSelectConversation(c._id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setConvContextMenu({
                                x: Math.min(e.clientX, window.innerWidth - 240),
                                y: Math.min(e.clientY, window.innerHeight - 180),
                                conversation: c,
                                partnerName,
                              });
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                              isActive
                                ? 'bg-primary text-white font-bold shadow-xs'
                                : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <div
                                  className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center font-bold text-xs ${
                                    isActive
                                      ? 'bg-white/20 text-white'
                                      : 'bg-primary-subtle text-primary border border-primary-subtle'
                                  }`}
                                >
                                  {partner?.profile_photo_url ? (
                                    <img
                                      src={partner.profile_photo_url}
                                      alt={partnerName}
                                      className="w-full h-full object-cover object-center"
                                    />
                                  ) : (
                                    partnerInitials
                                  )}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white border border-white">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                </span>
                              </div>

                              <div className="truncate min-w-0">
                                <div className="text-xs truncate font-medium">{partnerName}</div>
                                {c.last_message_text && (
                                  <div className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-fg-subtle'}`}>
                                    {c.last_message_text}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {(c.unread_count || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-xs">
                                  {c.unread_count}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConversation(c._id);
                                }}
                                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-rose-500/20 text-fg-subtle hover:text-rose-500 flex items-center justify-center transition-all cursor-pointer"
                                title="Delete this 1-on-1 chat"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              /* ── CHANNELS VIEW (Placements Channel) ───────────────────────── */
              <>
                <div className="p-3.5 border-b border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-fg tracking-tight">Channels</h2>
                    <span className="text-xs font-mono text-fg-subtle">1 Channel</span>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                    <input
                      type="text"
                      placeholder="Search channels..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-sunken border border-border/80 text-xs text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Channels List */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {filteredChannels.map((c) => {
                    const isActive = activeConvId === c._id;
                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => handleSelectConversation(c._id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConvContextMenu({
                            x: Math.min(e.clientX, window.innerWidth - 240),
                            y: Math.min(e.clientY, window.innerHeight - 180),
                            conversation: c,
                            partnerName: c.title,
                          });
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-primary text-white font-bold shadow-xs'
                            : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-primary-subtle text-primary border border-primary/20'
                            }`}
                          >
                            <Hash size={18} />
                          </div>
                          <div className="truncate min-w-0">
                            <div className="text-xs font-bold truncate">{c.title}</div>
                            <div className={`text-[11px] truncate ${isActive ? 'text-white/80' : 'text-fg-subtle'}`}>
                              {c.last_message_text || c.description}
                            </div>
                          </div>
                        </div>

                        {(c.unread_count || 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shrink-0 ml-1 shadow-xs">
                            {c.unread_count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* ── CENTER: Main Chat Window & Message Stream ──────────────────── */}
        <main className="flex-1 min-h-0 h-full glass-panel rounded-3xl border border-border flex flex-col overflow-hidden shadow-3 min-w-0 bg-surface">
          
          {/* Active Conversation Header */}
          <div className="shrink-0 px-6 py-3.5 border-b border-border bg-surface flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
                {activeConversation?.type === 'channel' ? (
                  <Hash size={20} />
                ) : (
                  <UserIcon size={20} />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-bold text-fg truncate flex items-center gap-2">
                  <span>
                    {activeConversation?.type === 'direct'
                      ? (activePartner?.full_name || activeConversation.title)
                      : (activeConversation?.title || 'Select a conversation')}
                  </span>
                </div>
                <div className="text-xs text-fg-subtle truncate">
                  {activeConversation?.description ||
                    (activePartner ? `Official: ${activePartner.official_email}` : 'Placement Coordinator Team')}
                </div>
              </div>
            </div>

            {/* Quick Action Dock in Header */}
            <div className="flex items-center gap-2">
              {activePartner && (
                <>
                  {activePartner.primary_mobile && (
                    <a
                      href={`https://wa.me/91${String(activePartner.primary_mobile).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open WhatsApp chat with coordinator"
                      className="w-8 h-8 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                    </a>
                  )}
                  <a
                    href="https://outlook.office.com/mail/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open Outlook Web Mail"
                    className="w-8 h-8 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white flex items-center justify-center shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M22 6.5l-10 6.5-10-6.5v11a1 1 0 001 1h18a1 1 0 001-1v-11z" />
                      <path d="M12 11.5l10-6.5H2l10 6.5z" opacity="0.8" />
                    </svg>
                  </a>
                </>
              )}

              {/* Delete Chat / Clear History Button */}
              {activeConvId && (
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(activeConvId)}
                  className="w-8 h-8 rounded-xl bg-surface border border-border hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 text-fg-subtle flex items-center justify-center shadow-xs transition-all cursor-pointer"
                  title={activeConversation?.type === 'direct' ? 'Delete this Chat completely' : 'Clear all messages in this channel'}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Message History Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {loadingMessages ? (
              <div className="p-8 text-center text-fg-subtle italic text-xs animate-pulse">
                Loading messages…
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center text-fg-subtle text-xs space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-fg-subtle">
                  <MessageSquareText size={24} />
                </div>
                <div className="font-bold text-fg">No messages in this channel yet</div>
                <div>Be the first to say hello or ask a question!</div>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === currentUser?._id;
                const isDoubt = msg.message_type === 'doubt';
                const isAnnouncement = msg.message_type === 'announcement';

                // Determine clean display name: 'Administrator' for admin accounts, real name for coordinators
                const displayName =
                  msg.sender_role === 'Administrator' ||
                  msg.sender_name === 'Placement Management' ||
                  msg.sender_name === 'Administrator'
                    ? 'Administrator'
                    : msg.sender_name;

                const color = getSenderColor(displayName, msg.sender_role);

                const isRead = Array.isArray(msg.read_by) && msg.read_by.some(
                  (uid: any) => String(uid) !== String(currentUser?._id)
                );

                return (
                  <div
                    key={msg._id}
                    id={`msg-${msg._id}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({
                        x: Math.min(e.clientX, window.innerWidth - 220),
                        y: Math.min(e.clientY, window.innerHeight - 200),
                        message: msg,
                        displayName,
                      });
                    }}
                    className={`flex items-start gap-3 group relative transition-all rounded-2xl p-1 ${
                      isOwn ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Sender Avatar with Distinct Coordinator Color */}
                    <div
                      className={`w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                        isOwn ? 'bg-primary/10 border border-primary/20 text-primary' : color.avatarBg
                      }`}
                    >
                      {msg.sender_photo_url ? (
                        <img
                          src={msg.sender_photo_url}
                          alt={displayName}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        displayName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()
                      )}
                    </div>

                    {/* Message Bubble Card */}
                    <div className={`max-w-[75%] space-y-1 relative ${isOwn ? 'items-end text-right' : 'items-start text-left'}`}>
                      
                      {/* Sender Name (only for received messages or in channels) */}
                      {!isOwn && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={`font-bold ${color.text}`}>
                            {displayName}
                          </span>
                        </div>
                      )}

                      {/* Main Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm relative group/bubble ${
                          isDoubt
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100'
                            : isAnnouncement
                            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-100'
                            : isOwn
                            ? 'bg-primary text-white rounded-tr-xs'
                            : 'bg-surface border border-border text-fg rounded-tl-xs'
                        }`}
                      >
                        {/* WhatsApp-Style Inset Quoted Reply Card */}
                        {msg.reply_to && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              const target = document.getElementById(`msg-${msg.reply_to?.message_id}`);
                              if (target) {
                                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                target.classList.add('ring-2', 'ring-primary', 'bg-primary/10');
                                setTimeout(() => target.classList.remove('ring-2', 'ring-primary', 'bg-primary/10'), 2000);
                              }
                            }}
                            className={`mb-2 p-2.5 rounded-xl text-[11px] border-l-[3.5px] text-left cursor-pointer transition-all ${
                              isOwn
                                ? 'bg-black/20 border-sky-300 hover:bg-black/30'
                                : 'bg-surface-sunken border-primary hover:bg-surface'
                            }`}
                          >
                            <div className={`font-bold flex items-center gap-1.5 ${isOwn ? 'text-sky-300' : 'text-primary'}`}>
                              <CornerUpLeft size={11} />
                              <span>{msg.reply_to.sender_name}</span>
                            </div>
                            <div className={`truncate mt-0.5 text-[11px] ${isOwn ? 'text-white/90 font-normal' : 'text-fg-muted'}`}>
                              {msg.reply_to.message_text}
                            </div>
                          </div>
                        )}

                        {/* Doubt Tag Alert Banner */}
                        {isDoubt && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 mb-1.5 pb-1 border-b border-amber-500/20">
                            <HelpCircle size={12} />
                            <span>COORDINATOR DOUBT · {msg.metadata?.urgency?.toUpperCase() || 'NORMAL'} PRIORITY</span>
                          </div>
                        )}

                        {/* Message Text + Bottom-Right Timestamp & WhatsApp Checkmarks */}
                        <div className="flex items-end justify-between gap-3 text-left">
                          <div className="whitespace-pre-wrap flex-1 break-words leading-relaxed text-xs">
                            {msg.message_text}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 select-none pb-0.5 text-[10px] ml-2">
                            <span className={isOwn ? 'text-white/75 font-mono' : 'text-fg-subtle font-mono'}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOwn && (
                              <span
                                title={isRead ? 'Read by recipient / channel members' : 'Delivered'}
                                className="inline-flex items-center"
                              >
                                <CheckCheck
                                  size={14}
                                  strokeWidth={2.5}
                                  className={isRead ? 'text-sky-300 drop-shadow-[0_0_2px_rgba(56,189,248,0.6)]' : 'text-white/60'}
                                />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Reactions Bar below text */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-border/40">
                            {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji) => {
                              const count = msg.reactions!.filter((r) => r.emoji === emoji).length;
                              const userReacted = msg.reactions!.some(
                                (r) => String(r.user_id) === String(currentUser?._id) && r.emoji === emoji
                              );
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleReaction(msg._id, emoji);
                                  }}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                                    userReacted
                                      ? 'bg-primary/20 border-primary text-primary font-bold shadow-2xs'
                                      : isOwn
                                      ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                                      : 'bg-surface-sunken border-border text-fg hover:bg-surface'
                                  }`}
                                  title={`Reacted by ${msg.reactions!.filter((r) => r.emoji === emoji).map((r) => r.user_name).join(', ')}`}
                                >
                                  <span>{emoji}</span>
                                  {count > 1 && <span className="text-[10px]">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* WhatsApp Hover Action Toolbar (Reply, 5 Emojis, Delete) */}
                      <div
                        className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 p-1 rounded-full bg-surface border border-border shadow-md absolute -top-3.5 ${
                          isOwn ? 'left-2' : 'right-2'
                        } z-10`}
                      >
                        {/* 1. Reply Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo({
                              message_id: msg._id,
                              sender_name: displayName,
                              message_text: msg.message_text,
                            });
                            inputRef.current?.focus();
                          }}
                          className="w-6 h-6 rounded-full hover:bg-surface-sunken text-fg-subtle hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                          title="Reply"
                        >
                          <CornerUpLeft size={13} />
                        </button>

                        {/* 2. 5 Reaction Emojis: Thumbs Up, Heart, Laughing, Surprise, Sad */}
                        {(['👍', '❤️', '😂', '😮', '😢'] as const).map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(msg._id, emoji);
                            }}
                            className="w-6 h-6 rounded-full hover:bg-surface-sunken text-xs flex items-center justify-center hover:scale-125 transition-transform cursor-pointer"
                            title={`React ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}

                        {/* 3. Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromptDeleteMessage(msg, displayName);
                          }}
                          className="w-6 h-6 rounded-full hover:bg-rose-50 text-fg-subtle hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box & Actions */}
          <div className="shrink-0 p-4 border-t border-border bg-surface space-y-2.5">
            
            {/* WhatsApp-Style Quoted Reply Preview Banner */}
            {replyingTo && (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-sunken border-l-4 border-primary border border-border shadow-xs animate-slideDown text-xs">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-primary font-bold text-[11px]">
                    <CornerUpLeft size={13} />
                    <span>Replying to {replyingTo.sender_name}</span>
                  </div>
                  <p className="text-fg-subtle text-[11px] truncate mt-0.5">{replyingTo.message_text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="w-6 h-6 rounded-lg hover:bg-surface text-fg-subtle hover:text-fg flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title="Cancel reply"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Urgency & Mode Bar */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDoubtMode(!isDoubtMode)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDoubtMode
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-surface-sunken border border-border text-fg-muted hover:text-fg'
                  }`}
                  title="Tag this message as an urgent doubt for coordinators"
                >
                  <HelpCircle size={13} />
                  <span>{isDoubtMode ? 'Doubt Mode ON' : 'Ask a Doubt'}</span>
                </button>

                {isDoubtMode && (
                  <div className="flex items-center gap-1 bg-surface-sunken p-0.5 rounded-lg border border-border animate-fadeIn">
                    {(['normal', 'high', 'urgent'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setUrgencyLevel(lvl)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          urgencyLevel === lvl
                            ? lvl === 'urgent'
                              ? 'bg-rose-500 text-white'
                              : lvl === 'high'
                              ? 'bg-amber-500 text-white'
                              : 'bg-primary text-white'
                            : 'text-fg-subtle hover:text-fg'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-[10px] text-fg-subtle font-mono hidden sm:inline">
                Right-click any message to Reply · Press Enter ↵ to send
              </span>
            </div>

            {/* Input Row with WhatsApp Emoji Picker */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
              
              {/* Emoji Picker Toggle Button */}
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
                    showEmojiPicker
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 shadow-xs'
                      : 'bg-surface border border-border text-fg-subtle hover:text-fg hover:bg-surface-sunken'
                  }`}
                  title="Insert Emoji"
                >
                  <Smile size={18} />
                </button>

                {/* WhatsApp-Style Floating Emoji Picker Modal */}
                {showEmojiPicker && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-12 left-0 z-50 w-72 sm:w-80 rounded-2xl glass-panel border border-border shadow-4 p-3 space-y-2.5 animate-scaleIn"
                  >
                    {/* Category Tabs */}
                    <div className="flex items-center gap-1 border-b border-border pb-2">
                      {EMOJI_CATEGORIES.map((cat, idx) => (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setActiveEmojiCategory(idx)}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                            activeEmojiCategory === idx
                              ? 'bg-primary text-white shadow-2xs'
                              : 'text-fg-subtle hover:bg-surface-sunken hover:text-fg'
                          }`}
                        >
                          {cat.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    {/* Emoji Grid */}
                    <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1 select-none">
                      {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setInputText((prev) => prev + emoji);
                            inputRef.current?.focus();
                          }}
                          className="w-8 h-8 rounded-lg hover:bg-surface-sunken flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="text"
                placeholder={isDoubtMode ? "Type your doubt or query for the placement team..." : "Type your message..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className={`flex-1 px-4 py-2.5 rounded-2xl bg-background border text-xs text-fg placeholder:text-fg-subtle focus:outline-none transition-all shadow-inner ${
                  isDoubtMode
                    ? 'border-amber-400 focus:ring-2 focus:ring-amber-400/30'
                    : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Send</span>
                <Send size={13} />
              </button>
            </form>

          </div>

        </main>

      </div>

      {/* ── WhatsApp-Style Right-Click Context Menu ───────────────────────── */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-52 glass-panel rounded-2xl border border-border shadow-4 p-1.5 space-y-1 animate-scaleIn text-xs select-none"
        >
          {/* Quick Emoji Reaction Row */}
          <div className="flex items-center justify-between p-1.5 border-b border-border/60">
            {QUICK_REACTION_EMOJIS.slice(0, 5).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  handleToggleReaction(contextMenu.message._id, emoji);
                  setContextMenu(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-surface-sunken flex items-center justify-center text-sm hover:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setReplyingTo({
                message_id: contextMenu.message._id,
                sender_name: contextMenu.displayName,
                message_text: contextMenu.message.message_text,
              });
              setContextMenu(null);
              inputRef.current?.focus();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-fg hover:bg-primary/10 hover:text-primary font-medium transition-colors cursor-pointer"
          >
            <CornerUpLeft size={14} />
            <span>Reply to message</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.message.message_text);
              setCopiedId(contextMenu.message._id);
              setTimeout(() => setCopiedId(null), 2000);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-fg hover:bg-surface-sunken font-medium transition-colors cursor-pointer"
          >
            {copiedId === contextMenu.message._id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>Copy Text</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const targetMsg = contextMenu.message;
              const targetName = contextMenu.displayName;
              setContextMenu(null);
              handlePromptDeleteMessage(targetMsg, targetName);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-500/10 font-medium transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Delete message</span>
          </button>
        </div>
      )}

      {/* ── Conversation Right-Click Context Menu (Delete Entire Chat) ───── */}
      {convContextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: `${convContextMenu.y}px`, left: `${convContextMenu.x}px` }}
          className="fixed z-50 w-60 glass-panel rounded-2xl border border-border shadow-4 p-2 space-y-1 animate-scaleIn text-xs select-none"
        >
          <div className="px-3 py-1.5 border-b border-border/60 text-[11px] font-bold text-fg truncate flex items-center justify-between">
            <span className="truncate">{convContextMenu.partnerName}</span>
            <span className="text-[10px] text-fg-subtle capitalize">
              {convContextMenu.conversation.type}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const cid = convContextMenu.conversation._id;
              setConvContextMenu(null);
              handleSelectConversation(cid);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-fg hover:bg-surface-sunken font-medium transition-colors cursor-pointer"
          >
            <MessageSquareText size={14} />
            <span>Open Chat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const cid = convContextMenu.conversation._id;
              setConvContextMenu(null);
              handleDeleteConversation(cid);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-500/10 font-bold transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>
              {convContextMenu.conversation.type === 'direct'
                ? 'Delete Entire Chat'
                : 'Clear Channel Messages'}
            </span>
          </button>
        </div>
      )}

      {/* ── WhatsApp-Style Delete Message Modal (Single Row Side-by-Side) ── */}
      {deleteModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn select-none">
          <div className="max-w-lg w-full rounded-3xl bg-surface border border-border p-6 shadow-2xl space-y-4 animate-scaleIn">
            {/* Title */}
            <div>
              <h3 className="text-base font-semibold text-fg">Delete message?</h3>
              <p className="text-xs text-fg-subtle mt-0.5">
                {deleteModalTarget.canDeleteForEveryone
                  ? 'Delete this message for everyone or only for yourself.'
                  : 'This message will be removed from your screen.'}
              </p>
            </div>

            {/* Message Box with Content to be Deleted */}
            <div className="p-3.5 rounded-2xl bg-surface-sunken border border-border/80 text-xs text-fg leading-relaxed">
              <div className="flex items-center justify-between text-[10px] text-fg-subtle font-semibold mb-1 uppercase tracking-wider">
                <span>Message to delete</span>
                <span>{deleteModalTarget.displayName}</span>
              </div>
              <div className="italic text-fg font-medium break-words">
                "{deleteModalTarget.message.message_text}"
              </div>
            </div>

            {/* 3 Buttons in a Single Row Side-by-Side */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmDeleteMessage(deleteModalTarget.message._id, 'for_me')}
                className="px-4 py-2 rounded-full border border-border hover:border-rose-300 bg-surface hover:bg-rose-50 text-fg hover:text-rose-600 font-semibold text-xs tracking-wide transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
              >
                Delete for me
              </button>

              {deleteModalTarget.canDeleteForEveryone && (
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteMessage(deleteModalTarget.message._id, 'everyone')}
                  className="px-4 py-2 rounded-full border border-primary/30 hover:border-primary bg-primary-subtle/60 hover:bg-primary text-primary hover:text-white font-semibold text-xs tracking-wide transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                >
                  Delete for everyone
                </button>
              )}

              <button
                type="button"
                onClick={() => setDeleteModalTarget(null)}
                className="px-4 py-2 rounded-full border border-border hover:border-fg-subtle bg-surface hover:bg-surface-sunken text-fg-muted hover:text-fg font-semibold text-xs tracking-wide transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Direct Chat Coordinator Picker Modal ────────────────────── */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-fadeIn select-none">
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Chat</h3>
                  <p className="text-[11px] text-slate-500">Select a coordinator to start messaging</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {genuineCoordinators.map((coord) => (
                <button
                  key={coord._id}
                  type="button"
                  onClick={() => handleStartDirectChat(coord)}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {coord.profile_photo_url ? (
                        <img
                          src={coord.profile_photo_url}
                          alt={coord.full_name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        coord.full_name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                        {coord.full_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {coord.official_email}
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 group-hover:bg-primary group-hover:text-white text-[11px] font-bold text-slate-600 transition-colors">
                    Chat
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
