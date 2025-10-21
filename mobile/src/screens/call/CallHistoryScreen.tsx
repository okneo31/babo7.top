import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CallHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Call History (To be implemented)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, color: '#666' },
});
