import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SettingsStackParamList } from './types';

// Import screens (placeholders)
import SettingsListScreen from '@screens/settings/SettingsListScreen';
import ProfileScreen from '@screens/settings/ProfileScreen';
import SecurityScreen from '@screens/settings/SecurityScreen';

const Stack = createStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsList"
        component={SettingsListScreen}
        options={{ title: '설정' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '프로필' }}
      />
      <Stack.Screen
        name="Security"
        component={SecurityScreen}
        options={{ title: '보안' }}
      />
    </Stack.Navigator>
  );
}
