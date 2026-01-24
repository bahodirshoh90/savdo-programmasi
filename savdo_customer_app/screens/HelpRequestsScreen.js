
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Appbar, FAB, Dialog, Portal, Button, TextInput, List, Snackbar, ActivityIndicator, Text } from 'react-native-paper';

const API_BASE = 'http://localhost:8000/api'; // Change to your backend URL

export default function HelpRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/help-requests`);
      if (!res.ok) throw new Error('So\'rovlarni yuklashda xatolik');
      const data = await res.json();
      setRequests(data || []);
    } catch (e) {
      setSnackbar({ visible: true, message: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const openDialog = () => {
    setMessage('');
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setMessage('');
  };

  const handleSend = async () => {
    if (!message.trim()) {
      setSnackbar({ visible: true, message: 'So\'rov matni bo\'sh bo\'lmasligi kerak' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/help-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error('Yuborishda xatolik');
      closeDialog();
      fetchRequests();
      setSnackbar({ visible: true, message: 'So\'rov yuborildi' });
    } catch (e) {
      setSnackbar({ visible: true, message: e.message });
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Yordam so'rovlari" />
        <Appbar.Action icon="refresh" onPress={fetchRequests} />
      </Appbar.Header>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id?.toString() || item.message}
          renderItem={({ item }) => (
            <List.Item
              title={item.message}
              description={item.created_at ? new Date(item.created_at).toLocaleString() : ''}
              left={props => <List.Icon {...props} icon="help-circle" />}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>So'rovlar yo'q</Text>}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={openDialog}
        label="Yangi so'rov"
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>Yangi yordam so'rovi</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="So'rov matni"
              value={message}
              onChangeText={setMessage}
              autoFocus
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
