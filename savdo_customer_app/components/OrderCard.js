/**
 * Order Card Component
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import responsive from '../utils/responsive';

const getStatusColor = (status, colors) => {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'processing':
      return colors.primary;
    case 'pending':
      return colors.warning;
    case 'cancelled':
      return colors.danger;
    default:
      return colors.textLight;
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

export default function OrderCard({ order, onPress }) {
  const { colors } = useTheme();
  const statusColor = getStatusColor(order.status, colors);
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

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onPress && onPress(order)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.orderId, { color: colors.text }]}>Buyurtma #{order.id}</Text>
          <Text style={[styles.orderDate, { color: colors.textLight }]}>{orderDate}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.totalAmount, { color: colors.primary }]}>
          Jami: {order.total_amount?.toLocaleString('uz-UZ') || '0'} so'm
        </Text>
        <Text style={[styles.itemsCount, { color: colors.textLight }]}>
          {order.items?.length || 0} ta mahsulot
        </Text>
      </View>

      <View style={styles.footer}>
        {order.status === 'completed' && (
          <TouchableOpacity
            style={[styles.reorderButton, { borderColor: colors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              if (onPress) {
                onPress(order, 'reorder');
              }
            }}
          >
            <Ionicons name="repeat-outline" size={16} color={colors.primary} />
            <Text style={[styles.reorderButtonText, { color: colors.primary }]}>Qayta buyurtma</Text>
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: responsive.getSpacing(16),
    marginBottom: responsive.getSpacing(12),
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: responsive.getFontSize(16),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: responsive.getFontSize(12),
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: responsive.getFontSize(12),
    fontWeight: '600',
  },
  content: {
    marginBottom: 12,
  },
  totalAmount: {
    fontSize: responsive.getFontSize(16),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemsCount: {
    fontSize: responsive.getFontSize(14),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  reorderButtonText: {
    fontSize: responsive.getFontSize(12),
    fontWeight: '600',
  },
});
