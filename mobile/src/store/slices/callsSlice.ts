import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Call } from '@types/index';

interface CallsState {
  activeCall: Call | null;
  incomingCall: Call | null;
  callHistory: Call[];
}

const initialState: CallsState = {
  activeCall: null,
  incomingCall: null,
  callHistory: [],
};

const callsSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    setActiveCall: (state, action: PayloadAction<Call | null>) => {
      state.activeCall = action.payload;
    },
    setIncomingCall: (state, action: PayloadAction<Call | null>) => {
      state.incomingCall = action.payload;
    },
    updateCallStatus: (state, action: PayloadAction<{ callId: string; status: Call['status'] }>) => {
      if (state.activeCall?.id === action.payload.callId) {
        state.activeCall.status = action.payload.status;
      }
    },
    endCall: (state) => {
      if (state.activeCall) {
        state.callHistory.unshift({
          ...state.activeCall,
          status: 'ended',
          endedAt: new Date().toISOString(),
        });
      }
      state.activeCall = null;
      state.incomingCall = null;
    },
    addToCallHistory: (state, action: PayloadAction<Call>) => {
      state.callHistory.unshift(action.payload);
    },
  },
});

export const {
  setActiveCall,
  setIncomingCall,
  updateCallStatus,
  endCall,
  addToCallHistory,
} = callsSlice.actions;

export default callsSlice.reducer;
