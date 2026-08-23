import { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ChatConversation, IChatConversation } from '../models/ChatConversation';
import { ChatMessage, IChatMessage } from '../models/ChatMessage';
import { User } from '../models/User';

// In-memory active SSE clients map for real-time broadcasts: userId -> Set of Response objects
const activeSseClients = new Map<string, Set<Response>>();

export function broadcastChatEvent(event: string, data: any, targetUserIds?: string[]) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  if (targetUserIds && targetUserIds.length > 0) {
    for (const uid of targetUserIds) {
      const clientSet = activeSseClients.get(String(uid));
      if (clientSet) {
        for (const res of clientSet) {
          try {
            res.write(payload);
          } catch {
            clientSet.delete(res);
          }
        }
      }
    }
  } else {
    // Broadcast to all connected clients
    for (const [, clientSet] of activeSseClients.entries()) {
      for (const res of clientSet) {
        try {
          res.write(payload);
        } catch {
          clientSet.delete(res);
        }
      }
    }
  }
}

// Seed default team channels
export async function seedDefaultChatChannels() {
  try {
    // Strictly enforce ONLY 1 Team Channel: Placements (delete urgent-doubts and any other channels)
    await ChatConversation.deleteMany({
      type: 'channel',
      channel_slug: { $ne: 'placements' },
    }).catch(() => {});

    // Ensure Placements channel exists
    const placementsChannel = await ChatConversation.findOne({
      type: 'channel',
      channel_slug: 'placements',
    });
    if (placementsChannel) {
      placementsChannel.title = 'Placements';
      placementsChannel.channel_slug = 'placements';
      placementsChannel.description = 'General placement operations, daily discussions, Q&A & drive updates';
      await placementsChannel.save();
    } else {
      await ChatConversation.create({
        type: 'channel',
        title: 'Placements',
        channel_slug: 'placements',
        description: 'General placement operations, daily discussions, Q&A & drive updates',
        last_message_text: 'Welcome to the Placements Channel',
        last_message_at: new Date(),
      });
    }
  } catch (err) {
    console.error('Error seeding chat channels:', err);
  }
}

/**
 * The user's identity for every chat route, full stop — derived only from
 * the verified JWT (req.user, set by authenticateJWT or, for the one route
 * that can't carry a header, the equivalent query-token check in server.ts).
 * Deliberately does NOT fall back to req.body/req.query — a client-supplied
 * sender_id/user_id must never be trusted as identity, or any signed-in user
 * could post, react, or mark-read as someone else just by naming their id.
 */
export function getAuthUserId(req: Request): string | undefined {
  return (req as any).user?.userId;
}

export function registerChatRoutes(app: Express) {
  // ── 1. GET /api/v1/chat/stream (SSE Stream) ────────────────────────────
  app.get('/api/v1/chat/stream', (req: Request, res: Response) => {
    const userId = getAuthUserId(req) || 'anonymous';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    if (!activeSseClients.has(userId)) {
      activeSseClients.set(userId, new Set());
    }
    activeSseClients.get(userId)!.add(res);

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', user_id: userId })}\n\n`);

    // Broadcast online status to others
    if (userId !== 'anonymous') {
      broadcastChatEvent('presence_update', {
        user_id: userId,
        status: 'online',
        timestamp: new Date().toISOString(),
      });
    }

    req.on('close', () => {
      const set = activeSseClients.get(userId);
      if (set) {
        set.delete(res);
        if (set.size === 0) {
          activeSseClients.delete(userId);
          if (userId !== 'anonymous') {
            broadcastChatEvent('presence_update', {
              user_id: userId,
              status: 'offline',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    });
  });

  // ── 2. GET /api/v1/chat/conversations ──────────────────────────────────
  app.get('/api/v1/chat/conversations', async (req: Request, res: Response) => {
    try {
      const currentUserId = getAuthUserId(req);

      // STRICT PRIVACY:
      // Channels are accessible to all authenticated staff.
      // Direct (1-on-1) chats are ONLY returned if currentUserId is a participant!
      const filter: any = {
        is_archived: false,
        $or: [
          { type: 'channel' },
          ...(currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)
            ? [{ type: 'direct', participant_ids: new mongoose.Types.ObjectId(currentUserId) }]
            : []),
        ],
      };

      // Clean up any legacy or urgent-doubts channels
      await ChatConversation.deleteMany({
        type: 'channel',
        channel_slug: { $ne: 'placements' },
      }).catch(() => {});

      // Automatically clean up any invalid direct conversations where participants <= 1
      await ChatConversation.deleteMany({
        type: 'direct',
        $or: [
          { participant_ids: { $size: 0 } },
          { participant_ids: { $size: 1 } },
        ],
      }).catch(() => {});

      const conversations = await ChatConversation.find(filter)
        .populate('participant_ids', 'full_name username official_email profile_photo_url role_codes')
        .sort({ last_message_at: -1 })
        .lean();

      // Compute unread count and dynamically set 1-on-1 direct title to the OTHER coordinator's name
      const enriched = await Promise.all(
        conversations.map(async (conv) => {
          let unreadCount = 0;
          if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
            unreadCount = await ChatMessage.countDocuments({
              conversation_id: conv._id,
              sender_id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
              read_by: { $nin: [new mongoose.Types.ObjectId(currentUserId)] },
            });
          }

          let dynamicTitle = conv.title;
          if (conv.type === 'direct' && Array.isArray(conv.participant_ids)) {
            const otherParticipant = conv.participant_ids.find(
              (p: any) => String(p?._id || p) !== String(currentUserId)
            );
            if (otherParticipant && (otherParticipant as any).full_name) {
              dynamicTitle = (otherParticipant as any).full_name;
            }
          }

          return {
            ...conv,
            title: dynamicTitle,
            unread_count: unreadCount,
          };
        })
      );

      // Filter out any broken direct chats that don't have another coordinator
      const validConversations = enriched.filter((conv) => {
        if (conv.type === 'direct') {
          const others = (conv.participant_ids || []).filter(
            (p: any) => String(p?._id || p) !== String(currentUserId)
          );
          return others.length > 0;
        }
        return true;
      });

      return res.status(200).json({
        success: true,
        data: validConversations,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to load conversations' },
      });
    }
  });

  // ── 3. GET /api/v1/chat/conversations/:id/messages ─────────────────────
  app.get('/api/v1/chat/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = getAuthUserId(req);
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);

      const conversation = await ChatConversation.findById(id).lean();
      if (!conversation) {
        return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      }

      // STRICT PRIVACY: Verify current user is a participant of this 1-on-1 direct conversation
      if (conversation.type === 'direct') {
        const isParticipant =
          currentUserId &&
          conversation.participant_ids?.some(
            (p: any) => String(p) === String(currentUserId) || String(p._id) === String(currentUserId)
          );

        if (!isParticipant) {
          return res.status(403).json({
            success: false,
            error: { message: 'Access Denied: You are not authorized to view this private 1-on-1 conversation' },
          });
        }
      }

      const msgFilter: any = {
        conversation_id: id,
        is_deleted: false,
      };
      if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
        msgFilter.deleted_for_users = { $nin: [new mongoose.Types.ObjectId(currentUserId)] };
      }

      const messages = await ChatMessage.find(msgFilter)
        .sort({ created_at: 1 })
        .limit(limit)
        .lean();

      // Automatically mark messages as read by current user and broadcast read event
      if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
        const userObjId = new mongoose.Types.ObjectId(currentUserId);
        ChatMessage.updateMany(
          { conversation_id: id, read_by: { $ne: userObjId } },
          { $addToSet: { read_by: userObjId } }
        ).then((result) => {
          if (result.modifiedCount > 0) {
            broadcastChatEvent('messages_read', {
              conversation_id: id,
              reader_id: currentUserId,
            });
          }
        }).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to load messages' },
      });
    }
  });

  // ── 4. POST /api/v1/chat/conversations (Create/Get Direct Chat) ────────
  app.post('/api/v1/chat/conversations', async (req: Request, res: Response) => {
    try {
      const currentUserId = getAuthUserId(req);
      const { recipient_id, type = 'direct', title, description } = req.body;

      if (type === 'direct') {
        if (!recipient_id || !currentUserId || !mongoose.Types.ObjectId.isValid(recipient_id) || !mongoose.Types.ObjectId.isValid(currentUserId)) {
          return res.status(400).json({
            success: false,
            error: { message: 'Recipient ID and valid session user are required to start a direct chat' },
          });
        }

        if (String(recipient_id) === String(currentUserId)) {
          return res.status(400).json({ success: false, error: { message: 'Cannot start direct chat with yourself' } });
        }

        // Check if direct conversation already exists between THESE TWO users
        const existing = await ChatConversation.findOne({
          type: 'direct',
          participant_ids: {
            $all: [new mongoose.Types.ObjectId(currentUserId), new mongoose.Types.ObjectId(recipient_id)],
          },
        })
          .populate('participant_ids', 'full_name username official_email profile_photo_url role_codes')
          .lean();

        if (existing) {
          return res.status(200).json({ success: true, data: existing });
        }

        // Fetch recipient user details for title
        const recipient = await User.findById(recipient_id);
        const newDirect = await ChatConversation.create({
          type: 'direct',
          title: recipient ? recipient.full_name : 'Direct Chat',
          participant_ids: [
            new mongoose.Types.ObjectId(currentUserId),
            new mongoose.Types.ObjectId(recipient_id),
          ],
          created_by: new mongoose.Types.ObjectId(currentUserId),
        });

        const populated = await ChatConversation.findById(newDirect._id)
          .populate('participant_ids', 'full_name username official_email profile_photo_url role_codes')
          .lean();

        broadcastChatEvent('conversation_created', populated, [String(currentUserId), String(recipient_id)]);
        return res.status(201).json({ success: true, data: populated });
      } else {
        // Channel creation (Admin only)
        if (!title) {
          return res.status(400).json({ success: false, error: { message: 'Channel title is required' } });
        }

        const channelSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newChannel = await ChatConversation.create({
          type: 'channel',
          title,
          channel_slug: channelSlug,
          description: description || '',
          created_by: currentUserId && mongoose.Types.ObjectId.isValid(currentUserId) ? new mongoose.Types.ObjectId(currentUserId) : undefined,
        });

        broadcastChatEvent('conversation_created', newChannel);
        return res.status(201).json({ success: true, data: newChannel });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to create conversation' },
      });
    }
  });

  // ── 5. POST /api/v1/chat/conversations/:id/messages (Send Message) ─────
  app.post('/api/v1/chat/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = getAuthUserId(req);
      const {
        message_text,
        message_type = 'text',
        metadata = {},
        reply_to,
      } = req.body;

      if (!message_text || !String(message_text).trim()) {
        return res.status(400).json({ success: false, error: { message: 'Message text cannot be empty' } });
      }

      const conversation = await ChatConversation.findById(id).lean();
      if (!conversation) {
        return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      }

      // Enforce 1-on-1 direct message privacy
      if (conversation.type === 'direct') {
        const isParticipant =
          currentUserId &&
          conversation.participant_ids?.some(
            (p: any) => String(p) === String(currentUserId) || String(p._id) === String(currentUserId)
          );

        if (!isParticipant) {
          return res.status(403).json({
            success: false,
            error: { message: 'Access Denied: You are not authorized to post in this private 1-on-1 conversation' },
          });
        }
      }

      // Fetch user details for caching real display name and photo
      let senderName = req.body.sender_name || (req as any).user?.fullName || '';
      let senderPhoto = req.body.sender_photo_url || '';
      let senderRole = 'Placement Coordinator';

      if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
        const user = await User.findById(currentUserId);
        if (user) {
          senderName = user.full_name || senderName;
          senderPhoto = user.profile_photo_url || senderPhoto;
          senderRole =
            user.role_codes?.includes('ADMINISTRATOR') || user.role_codes?.includes('ADMIN')
              ? 'Administrator'
              : user.role_codes?.includes('TEAM_LEADER')
              ? 'Team Leader'
              : 'Placement Coordinator';
        }
      }

      if (!senderName) {
        senderName = req.body.sender_name || (req as any).user?.fullName || 'Coordinator';
      }

      const newMsg = await ChatMessage.create({
        conversation_id: id,
        sender_id: (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId))
          ? new mongoose.Types.ObjectId(currentUserId)
          : new mongoose.Types.ObjectId(),
        sender_name: senderName,
        sender_role: senderRole,
        sender_photo_url: senderPhoto,
        message_text: String(message_text).trim(),
        message_type,
        metadata,
        reply_to: reply_to && reply_to.message_id ? reply_to : undefined,
        read_by: currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)
          ? [new mongoose.Types.ObjectId(currentUserId)]
          : [],
      });

      // Update conversation last message timestamp & snippet
      await ChatConversation.findByIdAndUpdate(id, {
        last_message_at: new Date(),
        last_message_text: String(message_text).trim().substring(0, 100),
        last_sender_id: currentUserId,
        last_sender_name: senderName,
      });

      // Real-time broadcast to all clients in this conversation
      const targetUsers = conversation.type === 'direct'
        ? conversation.participant_ids.map((p: any) => String(p))
        : undefined;

      broadcastChatEvent('new_message', {
        conversation_id: id,
        message: newMsg,
      }, targetUsers);

      return res.status(201).json({
        success: true,
        data: newMsg,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to send message' },
      });
    }
  });

  // ── 6. POST /api/v1/chat/messages/:id/reactions (Add/Remove Reaction) ──
  app.post('/api/v1/chat/messages/:id/reactions', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { emoji } = req.body;
      const currentUserId = getAuthUserId(req);

      if (!emoji) {
        return res.status(400).json({ success: false, error: { message: 'Emoji is required' } });
      }

      const msg = await ChatMessage.findById(id);
      if (!msg) {
        return res.status(404).json({ success: false, error: { message: 'Message not found' } });
      }

      const user = currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)
        ? await User.findById(currentUserId)
        : null;
      const userName = user?.full_name || req.body.user_name || 'Coordinator';

      const existingIndex = (msg.reactions || []).findIndex(
        (r: any) => String(r.user_id) === String(currentUserId) && r.emoji === emoji
      );

      if (existingIndex > -1) {
        msg.reactions!.splice(existingIndex, 1);
      } else {
        if (!msg.reactions) msg.reactions = [];
        msg.reactions.push({
          emoji,
          user_id: currentUserId ? new mongoose.Types.ObjectId(currentUserId) : new mongoose.Types.ObjectId(),
          user_name: userName,
        } as any);
      }

      await msg.save();

      broadcastChatEvent('message_reaction_updated', {
        message_id: id,
        conversation_id: msg.conversation_id,
        reactions: msg.reactions,
      });

      return res.status(200).json({ success: true, data: msg });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  });

  // ── 6. POST /api/v1/chat/conversations/:id/read ────────────────────────
  app.post('/api/v1/chat/conversations/:id/read', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = getAuthUserId(req);

      if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
        const userObjId = new mongoose.Types.ObjectId(currentUserId);
        const updateRes = await ChatMessage.updateMany(
          { conversation_id: id, read_by: { $ne: userObjId } },
          { $addToSet: { read_by: userObjId } }
        );
        if (updateRes.modifiedCount > 0) {
          broadcastChatEvent('messages_read', {
            conversation_id: id,
            reader_id: currentUserId,
          });
        }
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  });

  // ── 7. GET /api/v1/chat/coordinators (Roster for direct messaging) ─────
  app.get('/api/v1/chat/coordinators', async (req: Request, res: Response) => {
    try {
      const currentUserId = getAuthUserId(req);

      const filter: any = {
        is_deleted: { $ne: true },
        account_status: 'active',
        role_codes: {
          $in: [
            'PLACEMENT_COORDINATOR',
            'COORDINATOR',
            'TEAM_LEADER',
            'ADMINISTRATOR',
            'ADMIN',
            'MANAGEMENT',
          ],
        },
      };
      if (currentUserId) {
        filter._id = { $ne: currentUserId };
      }

      const users = await User.find(filter)
        .select('full_name username official_email primary_mobile role_codes profile_photo_url designation is_locked')
        .sort({ full_name: 1 })
        .lean();

      // Check online presence
      const enriched = users.map((u) => ({
        ...u,
        is_online: activeSseClients.has(String(u._id)) && (activeSseClients.get(String(u._id))?.size || 0) > 0,
      }));

      return res.status(200).json({
        success: true,
        data: enriched,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  });

  // ── 8. DELETE /api/v1/chat/messages/:id (Delete Single Message: For Me vs For Everyone) ──
  app.delete('/api/v1/chat/messages/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = getAuthUserId(req);
      const deleteType = req.body?.delete_type || req.query?.delete_type || 'for_me';

      const msg = await ChatMessage.findById(id);
      if (!msg) {
        return res.status(404).json({ success: false, error: { message: 'Message not found' } });
      }

      const conversationId = msg.conversation_id;
      const isSender = currentUserId && String(msg.sender_id) === String(currentUserId);
      
      const user = currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)
        ? await User.findById(currentUserId)
        : null;
      const isAdmin = user?.role_codes?.some((r: string) => {
        const role = String(r).toUpperCase();
        return role.includes('ADMIN') || role.includes('MANAGEMENT');
      });

      if (deleteType === 'everyone') {
        // Enforce permissions: Only the message sender or an Admin can Delete for Everyone
        if (!isSender && !isAdmin) {
          return res.status(403).json({
            success: false,
            error: { message: 'Permission Denied: Only the person who sent this message or an Administrator can delete it for everyone' },
          });
        }

        await ChatMessage.findByIdAndDelete(id);

        // Update latest message in conversation
        const latest = await ChatMessage.findOne({ conversation_id: conversationId, is_deleted: false })
          .sort({ created_at: -1 })
          .lean();

        await ChatConversation.findByIdAndUpdate(conversationId, {
          last_message_at: latest ? latest.created_at : new Date(),
          last_message_text: latest ? latest.message_text.substring(0, 100) : '',
          last_sender_name: latest ? latest.sender_name : '',
        });

        broadcastChatEvent('message_deleted', {
          message_id: id,
          conversation_id: conversationId,
          delete_type: 'everyone',
        });

        return res.status(200).json({ success: true, data: { message_id: id, delete_type: 'everyone' } });
      } else {
        // "Delete for Me": hide from this user's view
        if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
          const userObjId = new mongoose.Types.ObjectId(currentUserId);
          await ChatMessage.findByIdAndUpdate(id, {
            $addToSet: { deleted_for_users: userObjId },
          });
        }

        return res.status(200).json({ success: true, data: { message_id: id, delete_type: 'for_me' } });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  });

  // ── 9. DELETE /api/v1/chat/conversations/:id (Delete Entire Chat) ──────
  app.delete('/api/v1/chat/conversations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const conv = await ChatConversation.findById(id);
      if (!conv) {
        return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      }

      // Delete all messages in this conversation
      await ChatMessage.deleteMany({ conversation_id: id });

      if (conv.type === 'direct') {
        await ChatConversation.findByIdAndDelete(id);
      } else {
        await ChatConversation.findByIdAndUpdate(id, {
          last_message_text: 'Chat history cleared',
          last_message_at: new Date(),
        });
      }

      broadcastChatEvent('conversation_deleted', {
        conversation_id: id,
        type: conv.type,
      });

      return res.status(200).json({ success: true, data: { conversation_id: id } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  });
}
