
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Appbar, List, Snackbar, ActivityIndicator, Text } from 'react-native-paper';

const API_BASE = 'http://localhost:8000/api'; // Change to your backend URL

export default function AuditLogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/audit-logs`);
      if (!res.ok) throw new Error('Loglarni yuklashda xatolik');
      const data = await res.json();
      setLogs(data || []);
    } catch (e) {
      setSnackbar({ visible: true, message: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Audit loglari" />
        <Appbar.Action icon="refresh" onPress={fetchLogs} />
      </Appbar.Header>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id?.toString() || item.action}
          renderItem={({ item }) => (
            <List.Item
              title={item.action}
              description={item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
              left={props => <List.Icon {...props} icon="history" />}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Loglar yo'q</Text>}
        />
      )}

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
  empty: { textAlign: 'center', marginTop: 32, color: '#888' },
});
