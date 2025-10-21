import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@types/index';

interface UsersState {
  byId: {
    [userId: string]: User;
  };
}

const initialState: UsersState = {
  byId: {},
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUser: (state, action: PayloadAction<User>) => {
      state.byId[action.payload.id] = action.payload;
    },
    addUsers: (state, action: PayloadAction<User[]>) => {
      action.payload.forEach((user) => {
        state.byId[user.id] = user;
      });
    },
    updateUser: (state, action: PayloadAction<User>) => {
      if (state.byId[action.payload.id]) {
        state.byId[action.payload.id] = {
          ...state.byId[action.payload.id],
          ...action.payload,
        };
      }
    },
    setUserOnlineStatus: (state, action: PayloadAction<{ userId: string; isOnline: boolean }>) => {
      const { userId, isOnline } = action.payload;
      if (state.byId[userId]) {
        state.byId[userId].isOnline = isOnline;
        if (!isOnline) {
          state.byId[userId].lastSeen = new Date().toISOString();
        }
      }
    },
  },
});

export const { addUser, addUsers, updateUser, setUserOnlineStatus } = usersSlice.actions;
export default usersSlice.reducer;
