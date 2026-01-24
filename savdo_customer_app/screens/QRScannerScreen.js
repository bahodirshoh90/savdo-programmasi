/**
 * QR Code Scanner Screen for Customer App
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

export default function QRScannerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { translate } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Request camera permission on mount
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      console.log('Scanned code:', type, data);

      // Call backend API to find product by scanned code
      const response = await api.post('/api/products/scan', { code: data });

      if (response.success && response.product) {
        // Navigate to product detail screen
        navigation.navigate('ProductDetail', {
          productId: response.product.id,
        });
      } else {
        Alert.alert(
          translate('error') || 'Xato',
          translate('product_not_found') || 'Mahsulot topilmadi',
          [
            {
              text: translate('ok') || 'OK',
              onPress: () => setScanned(false),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error scanning code:', error);
      Alert.alert(
        translate('error') || 'Xato',
        error.response?.data?.detail ||
          translate('scan_error') ||
          'Skan qilishda xatolik yuz berdi',
        [
          {
            text: translate('try_again') || 'Qayta urinish',
            onPress: () => setScanned(false),
          },
          {
            text: translate('cancel') || 'Bekor qilish',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textLight} />
          <Text style={[styles.permissionText, { color: colors.text }]}>
            {translate('camera_permission_required') ||
              'Kamera ruxsati kerak'}
          </Text>
          <Text
            style={[styles.permissionSubtext, { color: colors.textLight }]}
          >
            {translate('camera_permission_message') ||
              'QR kod va barcode skan qilish uchun kameraga ruxsat bering'}
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, { color: colors.surface }]}>
              {translate('grant_permission') || 'Ruxsat berish'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr',
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'code93',
            'codabar',
            'itf14',
            'databar',
            'databar_expanded',
          ],
        }}
      >
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color={colors.surface} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.surface }]}>
              {translate('scan_qr_code') || 'QR kod skan qiling'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Scanning area */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={[styles.instructionText, { color: colors.surface }]}>
              {translate('scan_instruction') ||
                'QR kod yoki barcode ni ramka ichiga qo\'ying'}
            </Text>
          </View>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.surface} />
                <Text style={[styles.loadingText, { color: colors.surface }]}>
                  {translate('processing') || 'Qayta ishlanmoqda...'}
                </Text>
              </View>
            )}
            {scanned && !loading && (
              <TouchableOpacity
                style={[styles.rescanButton, { backgroundColor: colors.primary }]}
                onPress={() => setScanned(false)}
              >
                <Text style={[styles.rescanButtonText, { color: colors.surface }]}>
                  {translate('scan_again') || 'Qayta skan qilish'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
      <Footer currentScreen="products" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    marginBottom: 30,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
  },
  rescanButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
