import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NewChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>New Chat Screen (To be implemented)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, color: '#666' },
});
