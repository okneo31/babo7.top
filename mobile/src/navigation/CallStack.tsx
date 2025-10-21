import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { CallStackParamList } from './types';

// Import screens (placeholders)
import CallHistoryScreen from '@screens/call/CallHistoryScreen';
import VideoCallScreen from '@screens/call/VideoCallScreen';
import IncomingCallScreen from '@screens/call/IncomingCallScreen';

const Stack = createStackNavigator<CallStackParamList>();

export default function CallStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CallHistory"
        component={CallHistoryScreen}
        options={{ title: '통화 기록' }}
      />
      <Stack.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
