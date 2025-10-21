import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { logout } from '@store/slices/authSlice';

export default function SettingsListScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.displayName?.[0] || 'U'}</Text>
        </View>
        <Text style={styles.username}>{user?.displayName || 'User'}</Text>
        <Text style={styles.userId}>@{user?.username}</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <Text style={styles.menuText}>프로필</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Security' as never)}
        >
          <Text style={styles.menuText}>보안</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleLogout}>
          <Text style={[styles.menuText, styles.dangerText]}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  profile: { alignItems: 'center', paddingVertical: 40 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '600' },
  username: { fontSize: 24, fontWeight: '600', marginBottom: 4 },
  userId: { fontSize: 16, color: '#666' },
  menu: { paddingHorizontal: 20 },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  menuText: { fontSize: 16, color: '#000' },
  dangerItem: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FF3B30' },
  dangerText: { color: '#FF3B30' },
});
