import React from 'react';
import InAppNotification from '@/components/InAppNoti';
import { useInAppNotification } from '@/hooks/useInAppNotification';
import { StyleSheet, Button, Text, View } from 'react-native';

export default function AddReminderPage() {
  const { notification, showNotification, hideNotification } =
    useInAppNotification();

  const handlePress = () => {
    showNotification('New message received!');
  };

  return (
    <View style={styles.container}>
      {notification && (
        <InAppNotification
          message={(notification as any)?.message}
          onHide={hideNotification}
        />
      )}
      <Text style={styles.text}>Custom UI Notification Example</Text>
      <Button title='Show Notification Banner' onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },
});
