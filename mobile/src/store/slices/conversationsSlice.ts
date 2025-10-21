import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '@services/api.service';
import { Conversation } from '@types/index';

interface ConversationsState {
  list: Conversation[];
  loading: boolean;
  error: string | null;
  selectedConversationId: string | null;
}

const initialState: ConversationsState = {
  list: [],
  loading: false,
  error: null,
  selectedConversationId: null,
};

// Async thunks
export const fetchConversations = createAsyncThunk(
  'conversations/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const conversations = await apiService.getConversations();
      return conversations;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

export const createConversation = createAsyncThunk(
  'conversations/create',
  async (participantIds: string[], { rejectWithValue }) => {
    try {
      const conversation = await apiService.createConversation(participantIds);
      return conversation;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create conversation');
    }
  }
);

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    selectConversation: (state, action: PayloadAction<string>) => {
      state.selectedConversationId = action.payload;
    },
    updateConversation: (state, action: PayloadAction<Conversation>) => {
      const index = state.list.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    },
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const conversation = state.list.find((c) => c.id === action.payload);
      if (conversation) {
        conversation.unreadCount += 1;
      }
    },
    resetUnreadCount: (state, action: PayloadAction<string>) => {
      const conversation = state.list.find((c) => c.id === action.payload);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch conversations
    builder.addCase(fetchConversations.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchConversations.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload;
    });
    builder.addCase(fetchConversations.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create conversation
    builder.addCase(createConversation.fulfilled, (state, action) => {
      state.list.unshift(action.payload);
    });
  },
});

export const {
  selectConversation,
  updateConversation,
  incrementUnreadCount,
  resetUnreadCount,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
