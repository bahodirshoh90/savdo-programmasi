/**
 * Barcode Scanner Component
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import Colors from '../constants/colors';

// Only import camera for native platforms
let CameraView, CameraType, useCameraPermissions;
if (Platform.OS !== 'web') {
  try {
    const cameraModule = require('expo-camera');
    CameraView = cameraModule.CameraView;
    CameraType = cameraModule.CameraType;
    useCameraPermissions = cameraModule.useCameraPermissions;
  } catch (error) {
    console.warn('expo-camera not available:', error);
  }
}

export default function BarcodeScanner({ visible, onClose, onScan }) {
  const [permission, requestPermission] = Platform.OS !== 'web' && useCameraPermissions 
    ? useCameraPermissions() 
    : [{ granted: false }, () => Promise.resolve({ granted: false })];
  const [scanned, setScanned] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  useEffect(() => {
    if (visible && Platform.OS !== 'web' && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleBarCodeScanned = ({ type, data }) => {
    if (!scanned && Platform.OS !== 'web') {
      setScanned(true);
      console.log('Barcode scanned:', { type, data });
      
      if (data) {
        onScan(data);
        // Reset after 2 seconds
        setTimeout(() => {
          setScanned(false);
        }, 2000);
      }
    }
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode('');
      onClose();
    }
  };

  // Web platform doesn't support camera scanning
  if (Platform.OS === 'web') {
    if (!visible) {
      return null;
    }
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>📷 Barcode kiritish</Text>
            <Text style={styles.text}>
              Web versiyada barcode skanerlash funksiyasi mavjud emas. Barcode ni qo'lda kiriting.
            </Text>
            <TextInput
              style={styles.manualInput}
              placeholder="Barcode yoki QR code ni kiriting..."
              value={manualBarcode}
              onChangeText={setManualBarcode}
              autoFocus
              onSubmitEditing={handleManualSubmit}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleManualSubmit}
              disabled={!manualBarcode.trim()}
            >
              <Text style={styles.buttonText}>Qidirish</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Bekor qilish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!visible) {
    return null;
  }

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.text}>Kamera ruxsatini so'rash...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted || !CameraView) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Kamera ruxsati kerak</Text>
            <Text style={styles.text}>
              Barcode skanerlash uchun kameraga ruxsat berishingiz kerak.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={requestPermission}
            >
              <Text style={styles.buttonText}>Ruxsat berish</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Bekor qilish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing={CameraType.back}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.topOverlay} />
            <View style={styles.middleOverlay}>
              <View style={styles.sideOverlay} />
              <View style={styles.scanArea}>
                <View style={[styles.corner, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 }]} />
                <View style={[styles.corner, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 }]} />
                <View style={[styles.corner, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 }]} />
                <View style={[styles.corner, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }]} />
              </View>
              <View style={styles.sideOverlay} />
            </View>
            <View style={styles.bottomOverlay}>
              <Text style={styles.scanText}>
                Barcode yoki QR codeni skanerlang
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>✕ Yopish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
    margin: 20,
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  manualInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 20,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: Colors.borderLight,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.textLight,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleOverlay: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
