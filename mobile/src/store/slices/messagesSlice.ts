import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '@services/api.service';
import encryptionService from '@services/encryption.service';
import { Message, DecryptedMessage } from '@types/index';

interface MessagesState {
  byConversation: {
    [conversationId: string]: DecryptedMessage[];
  };
  loading: boolean;
  error: string | null;
}

const initialState: MessagesState = {
  byConversation: {},
  loading: false,
  error: null,
};

// Async thunks
export const fetchMessages = createAsyncThunk(
  'messages/fetchByConversation',
  async ({ conversationId, limit, before }: { conversationId: string; limit?: number; before?: string }, { rejectWithValue }) => {
    try {
      const messages = await apiService.getMessages(conversationId, limit, before);

      // Decrypt messages
      const decryptedMessages: DecryptedMessage[] = await Promise.all(
        messages.map(async (msg: Message) => {
          try {
            const decryptedContent = await encryptionService.decryptMessage(
              msg.encryptedContent,
              msg.senderId
            );
            return {
              ...msg,
              content: decryptedContent,
            };
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            return {
              ...msg,
              content: '[Failed to decrypt]',
            };
          }
        })
      );

      return { conversationId, messages: decryptedMessages };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'messages/send',
  async (
    {
      conversationId,
      content,
      recipientId,
      messageType = 'text',
    }: {
      conversationId: string;
      content: string;
      recipientId: string;
      messageType?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // Encrypt message
      const encryptedContent = await encryptionService.encryptMessage(content, recipientId);

      const message = await apiService.sendMessage(conversationId, encryptedContent, messageType);

      return {
        conversationId,
        message: {
          ...message,
          content,
        } as DecryptedMessage,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const markMessagesAsRead = createAsyncThunk(
  'messages/markAsRead',
  async (messageIds: string[]) => {
    await apiService.markAsRead(messageIds);
    return messageIds;
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ conversationId: string; message: DecryptedMessage }>) => {
      const { conversationId, message } = action.payload;
      if (!state.byConversation[conversationId]) {
        state.byConversation[conversationId] = [];
      }
      state.byConversation[conversationId].push(message);
    },
    updateMessageStatus: (
      state,
      action: PayloadAction<{ messageId: string; status: string }>
    ) => {
      const { messageId, status } = action.payload;
      Object.values(state.byConversation).forEach((messages) => {
        const message = messages.find((m) => m.id === messageId);
        if (message) {
          message.status = status as any;
        }
      });
    },
    deleteMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string }>) => {
      const { conversationId, messageId } = action.payload;
      if (state.byConversation[conversationId]) {
        state.byConversation[conversationId] = state.byConversation[conversationId].filter(
          (m) => m.id !== messageId
        );
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch messages
    builder.addCase(fetchMessages.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      state.loading = false;
      const { conversationId, messages } = action.payload;
      state.byConversation[conversationId] = messages;
    });
    builder.addCase(fetchMessages.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Send message
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.byConversation[conversationId]) {
        state.byConversation[conversationId] = [];
      }
      state.byConversation[conversationId].push(message);
    });
  },
});

export const { addMessage, updateMessageStatus, deleteMessage } = messagesSlice.actions;
export default messagesSlice.reducer;
