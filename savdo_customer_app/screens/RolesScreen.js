import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Appbar, FAB, Dialog, Portal, Button, TextInput, Snackbar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../services/api';

export default function RolesScreen() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const [snackbar, setSnackbar] = useState('');

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles');
      setRoles(res);
    } catch (e) {
      setError('Rollarni yuklashda xatolik');
    }
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleSave = async () => {
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, { name: roleName });
        setSnackbar('Rol yangilandi');
      } else {
        await api.post('/roles', { name: roleName });
        setSnackbar('Yangi rol qo‘shildi');
      }
      setShowDialog(false);
      setRoleName('');
      setEditingRole(null);
      fetchRoles();
    } catch (e) {
      setSnackbar('Saqlashda xatolik');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/roles/${id}`);
      setSnackbar('Rol o‘chirildi');
      fetchRoles();
    } catch (e) {
      setSnackbar('O‘chirishda xatolik');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f6f6' }}>
      <Appbar.Header>
        <Appbar.Content title="Rollar boshqaruvi" />
        <Appbar.Action icon="refresh" onPress={fetchRoles} />
      </Appbar.Header>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={roles}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.roleItem}>
              <Icon name="account-key" size={24} color="#1976d2" style={{ marginRight: 12 }} />
              <Text style={styles.roleName}>{item.name}</Text>
              <TouchableOpacity onPress={() => { setEditingRole(item); setRoleName(item.name); setShowDialog(true); }}>
                <Icon name="pencil" size={22} color="#888" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Icon name="delete" size={22} color="#e53935" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => { setShowDialog(true); setEditingRole(null); setRoleName(''); }}
        color="#fff"
      />
      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>{editingRole ? 'Rolni tahrirlash' : 'Yangi rol qo‘shish'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Rol nomi"
              value={roleName}
              onChangeText={setRoleName}
              mode="outlined"
              style={{ backgroundColor: '#fff' }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>Bekor qilish</Button>
            <Button onPress={handleSave}>Saqlash</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={2000}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  roleName: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#1976d2',
  },
  error: {
    color: '#e53935',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
});
