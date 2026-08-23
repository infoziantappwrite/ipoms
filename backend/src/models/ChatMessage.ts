import mongoose, { Schema, Document, Model } from 'mongoose';

export type MessageType = 'text' | 'doubt' | 'announcement' | 'lead_tag' | 'system';

export interface IReplyTo {
  message_id: string;
  sender_name: string;
  message_text: string;
}

export interface IReaction {
  emoji: string;
  user_id: string;
  user_name: string;
}

export interface IChatMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversation_id: mongoose.Types.ObjectId;
  sender_id: mongoose.Types.ObjectId;
  sender_name: string;
  sender_role?: string;
  sender_photo_url?: string;
  message_text: string;
  message_type: MessageType;
  reply_to?: IReplyTo;
  reactions?: IReaction[];
  metadata?: {
    college_code?: string;
    college_name?: string;
    lead_id?: string;
    tag?: string;
    urgency?: 'normal' | 'high' | 'urgent';
  };
  read_by: mongoose.Types.ObjectId[];
  deleted_for_users?: mongoose.Types.ObjectId[];
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: 'ChatConversation',
      required: true,
      index: true,
    },
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender_name: {
      type: String,
      required: true,
      trim: true,
    },
    sender_role: {
      type: String,
      default: 'Placement Coordinator',
    },
    sender_photo_url: {
      type: String,
      default: '',
    },
    message_text: {
      type: String,
      required: true,
      trim: true,
    },
    message_type: {
      type: String,
      enum: ['text', 'doubt', 'announcement', 'lead_tag', 'system'],
      default: 'text',
    },
    reply_to: {
      message_id: { type: String },
      sender_name: { type: String },
      message_text: { type: String },
    },
    reactions: [
      {
        emoji: { type: String, required: true },
        user_id: { type: Schema.Types.ObjectId, ref: 'User' },
        user_name: { type: String },
      },
    ],
    metadata: {
      college_code: { type: String, trim: true },
      college_name: { type: String, trim: true },
      lead_id: { type: String, trim: true },
      tag: { type: String, trim: true },
      urgency: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
    },
    read_by: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deleted_for_users: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    is_pinned: {
      type: Boolean,
      default: false,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ChatMessageSchema.index({ conversation_id: 1, created_at: -1 });

export const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
