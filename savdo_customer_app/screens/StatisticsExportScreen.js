/**
 * Statistics Export Screen - Export statistics to Excel or PDF
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import api from '../services/api';
import Colors from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import API_CONFIG from '../config/api';
import Footer from '../components/Footer';

export default function StatisticsExportScreen({ navigation }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);

  const handleExport = async (format) => {
    setLoading(true);
    setExportingFormat(format);
    
    try {
      const baseUrl = API_CONFIG.BASE_URL;
      const url = `${baseUrl}/statistics/export?format=${format}`;
      
      // For web, open in new tab
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        showToast('Muvaffaqiyatli', 'Fayl yangi oynada ochildi', 'success');
        setLoading(false);
        setExportingFormat(null);
        return;
      }

      // For mobile, try to open URL directly (browser will handle download)
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        showToast('Muvaffaqiyatli', 'Fayl yuklab olinmoqda...', 'success');
      } else {
        throw new Error('URLni ochib bo\'lmadi');
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMsg = error.message || 'Eksportda xatolik';
      showToast('Xatolik', errorMsg, 'error');
    } finally {
      setLoading(false);
      setExportingFormat(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistikani Eksport Qilish</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            Statistikani Excel yoki PDF formatida yuklab oling
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.exportButton,
              loading && exportingFormat !== 'excel' && styles.exportButtonDisabled,
            ]}
            onPress={() => handleExport('excel')}
            disabled={loading && exportingFormat !== 'excel'}
          >
            {loading && exportingFormat === 'excel' ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={32} color={Colors.surface} />
                <Text style={styles.exportButtonText}>Excel Formatida</Text>
                <Text style={styles.exportButtonSubtext}>
                  .xlsx fayl sifatida yuklab olish
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.exportButton,
              styles.exportButtonPdf,
              loading && exportingFormat !== 'pdf' && styles.exportButtonDisabled,
            ]}
            onPress={() => handleExport('pdf')}
            disabled={loading && exportingFormat !== 'pdf'}
          >
            {loading && exportingFormat === 'pdf' ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <>
                <Ionicons name="document-outline" size={32} color={Colors.surface} />
                <Text style={styles.exportButtonText}>PDF Formatida</Text>
                <Text style={styles.exportButtonSubtext}>
                  .pdf fayl sifatida yuklab olish
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <Ionicons name="help-circle-outline" size={20} color={Colors.textLight} />
          <Text style={styles.helpText}>
            {Platform.OS === 'web'
              ? 'Fayl yangi oynada ochiladi'
              : 'Fayl brauzerda yuklab olinadi'}
          </Text>
        </View>
      </View>
      <Footer currentScreen="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  exportButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  exportButtonPdf: {
    backgroundColor: Colors.danger,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    color: Colors.surface,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  exportButtonSubtext: {
    color: Colors.surface,
    fontSize: 14,
    opacity: 0.9,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    gap: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
  },
});
