import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { useAppSelector } from '@store/hooks';

// Import navigators
import AuthStack from './AuthStack';
import MainNavigator from './MainNavigator';

// Import modal screens
import ChatRoomScreen from '@screens/chat/ChatRoomScreen';
import VideoCallScreen from '@screens/call/VideoCallScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'card',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params.recipientName,
              })}
            />
            <Stack.Screen
              name="VideoCall"
              component={VideoCallScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
