/**
 * Order Detail Screen for Customer App
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Colors from '../constants/colors';
import { getOrder } from '../services/orders';
import OrderTrackingStepper from '../components/OrderTrackingStepper';
import websocketService from '../services/websocket';

const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return Colors.success;
    case 'processing': return Colors.primary;
    case 'pending': return Colors.warning;
    case 'cancelled': return Colors.danger;
    default: return Colors.textLight;
  }
};

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Kutilmoqda',
    processing: 'Jarayonda',
    completed: 'Bajarildi',
    cancelled: 'Bekor qilindi',
  };
  return labels[status] || status;
};

export default function OrderDetailScreen({ route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrder();
    
    // Subscribe to order status updates via WebSocket
    const handleStatusUpdate = (data) => {
      if (data.order_id === orderId) {
        setOrder(prev => prev ? { ...prev, status: data.status } : null);
      }
    };

    websocketService.on('order_status_update', handleStatusUpdate);

    return () => {
      websocketService.off('order_status_update', handleStatusUpdate);
    };
  }, [orderId]);

  const loadOrder = async () => {
    setIsLoading(true);
    try {
      const result = await getOrder(orderId);
      setOrder(result);
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Xatolik', 'Buyurtma ma\'lumotlarini yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Buyurtma topilmadi</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(order.status);
  const statusLabel = getStatusLabel(order.status);
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  // Calculate estimated delivery (3 days from order date for processing orders)
  const estimatedDelivery = order.status === 'processing' && order.created_at
    ? new Date(new Date(order.created_at).getTime() + 3 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <ScrollView style={styles.container}>
      {/* Order Tracking Stepper */}
      <OrderTrackingStepper
        currentStatus={order.status}
        orderDate={order.created_at}
        estimatedDelivery={estimatedDelivery}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.orderId}>Buyurtma #{order.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sana:</Text>
          <Text style={styles.infoValue}>{orderDate}</Text>
        </View>
        {order.customer_name && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mijoz:</Text>
            <Text style={styles.infoValue}>{order.customer_name}</Text>
          </View>
        )}
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mahsulotlar:</Text>
        {order.items?.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemName}>{item.product_name || 'Noma\'lum'}</Text>
              <Text style={styles.itemDetails}>
                {item.requested_quantity} x {item.unit_price?.toLocaleString('uz-UZ') || '0'} so'm
              </Text>
            </View>
            <Text style={styles.itemTotal}>
              {item.subtotal?.toLocaleString('uz-UZ') || '0'} so'm
            </Text>
          </View>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Jami:</Text>
          <Text style={styles.totalValue}>
            {order.total_amount?.toLocaleString('uz-UZ') || '0'} so'm
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: Colors.textLight,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  totalSection: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
