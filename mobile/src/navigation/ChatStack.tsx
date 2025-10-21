import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatStackParamList } from './types';

// Import screens (placeholders)
import ChatListScreen from '@screens/chat/ChatListScreen';
import ChatRoomScreen from '@screens/chat/ChatRoomScreen';
import NewChatScreen from '@screens/chat/NewChatScreen';

const Stack = createStackNavigator<ChatStackParamList>();

export default function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: '채팅' }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.recipientName })}
      />
      <Stack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={{ title: '새 채팅' }}
      />
    </Stack.Navigator>
  );
}
