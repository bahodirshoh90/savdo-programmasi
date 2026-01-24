
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Appbar, FAB, Dialog, Portal, Button, TextInput, List, Snackbar, ActivityIndicator, Text } from 'react-native-paper';

const API_BASE = 'http://localhost:8000/api'; // Change to your backend URL

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      if (!res.ok) throw new Error('Bildirishnomalarni yuklashda xatolik');
      const data = await res.json();
      setNotifications(data || []);
    } catch (e) {
      setSnackbar({ visible: true, message: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const openDialog = () => {
    setNotifTitle('');
    setNotifBody('');
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setNotifTitle('');
    setNotifBody('');
  };

  const handleSend = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      setSnackbar({ visible: true, message: 'Sarlavha va matn bo\'sh bo\'lmasligi kerak' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notifTitle, body: notifBody })
      });
      if (!res.ok) throw new Error('Yuborishda xatolik');
      closeDialog();
      fetchNotifications();
      setSnackbar({ visible: true, message: 'Bildirishnoma yuborildi' });
    } catch (e) {
      setSnackbar({ visible: true, message: e.message });
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Bildirishnomalar" />
        <Appbar.Action icon="refresh" onPress={fetchNotifications} />
      </Appbar.Header>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id?.toString() || item.title}
          renderItem={({ item }) => (
            <List.Item
              title={item.title}
              description={item.body}
              left={props => <List.Icon {...props} icon="bell" />}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Bildirishnomalar yo'q</Text>}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={openDialog}
        label="Yangi bildirishnoma"
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>Yangi bildirishnoma</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Sarlavha"
              value={notifTitle}
              onChangeText={setNotifTitle}
              autoFocus
            />
            <TextInput
              label="Matn"
              value={notifBody}
              onChangeText={setNotifBody}
              multiline
              style={{ marginTop: 8 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Bekor qilish</Button>
            <Button onPress={handleSend}>Yuborish</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  fab: { position: 'absolute', right: 16, bottom: 24 },
  empty: { textAlign: 'center', marginTop: 32, color: '#888' },
});
