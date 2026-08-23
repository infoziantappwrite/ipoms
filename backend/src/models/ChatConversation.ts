import mongoose, { Schema, Document, Model } from 'mongoose';

export type ConversationType = 'direct' | 'channel';

export interface IChatConversation extends Document {
  _id: mongoose.Types.ObjectId;
  type: ConversationType;
  title: string;
  description?: string;
  channel_slug?: string;
  participant_ids: mongoose.Types.ObjectId[];
  last_message_at?: Date;
  last_message_text?: string;
  last_sender_id?: mongoose.Types.ObjectId;
  last_sender_name?: string;
  created_by?: mongoose.Types.ObjectId;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

const ChatConversationSchema = new Schema<IChatConversation>(
  {
    type: {
      type: String,
      enum: ['direct', 'channel'],
      required: true,
      default: 'channel',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    channel_slug: {
      type: String,
      trim: true,
      index: true,
    },
    participant_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    last_message_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    last_message_text: {
      type: String,
      default: '',
    },
    last_sender_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    last_sender_name: {
      type: String,
      default: '',
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    is_archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ChatConversationSchema.index({ type: 1, last_message_at: -1 });

export const ChatConversation: Model<IChatConversation> =
  mongoose.models.ChatConversation ||
  mongoose.model<IChatConversation>('ChatConversation', ChatConversationSchema);
