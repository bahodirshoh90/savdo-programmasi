/**
 * Admin Settings Screen
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';

export default function AdminSettingsScreen() {
  const { permissions } = useAuth();
  const [settings, setSettings] = useState({
    store_name: '',
    receipt_footer_text: '',
    work_start_time: '09:00',
    work_end_time: '18:00',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.SETTINGS.GET);
      setSettings({
        store_name: response.store_name || '',
        receipt_footer_text: response.receipt_footer_text || '',
        work_start_time: response.work_start_time || '09:00',
        work_end_time: response.work_end_time || '18:00',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Xatolik', 'Sozlamalarni yuklashda xatolik');
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await api.put(API_ENDPOINTS.SETTINGS.UPDATE, settings);
      Alert.alert('Muvaffaqiyatli', 'Sozlamalar saqlandi');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Xatolik', 'Sozlamalarni saqlashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Do'kon Ma'lumotlari</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Do'kon nomi</Text>
          <TextInput
            style={styles.input}
            value={settings.store_name}
            onChangeText={(text) =>
              setSettings({ ...settings, store_name: text })
            }
            placeholder="Do'kon nomi"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Chek footer matni</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={settings.receipt_footer_text}
            onChangeText={(text) =>
              setSettings({ ...settings, receipt_footer_text: text })
            }
            placeholder="Chek footer matni"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ish boshlanish vaqti</Text>
          <TextInput
            style={styles.input}
            value={settings.work_start_time}
            onChangeText={(text) =>
              setSettings({ ...settings, work_start_time: text })
            }
            placeholder="09:00"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ish tugash vaqti</Text>
          <TextInput
            style={styles.input}
            value={settings.work_end_time}
            onChangeText={(text) =>
              setSettings({ ...settings, work_end_time: text })
            }
            placeholder="18:00"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saqlanmoqda...' : 'Saqlash'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

