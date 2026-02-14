/**
 * Chat List Screen - Shows all conversations
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Footer, { FooterAwareView } from '../components/Footer';

export default function ChatListScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/conversations');
      setConversations(response.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('Chat', { conversationId: conversation.id });
  };

  const handleNewChat = () => {
    navigation.navigate('NewChat');
  };

  const renderConversation = ({ item }) => {
    const hasUnread = item.unread_count > 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.conversationTitle,
                { color: colors.text },
                hasUnread && styles.unreadTitle,
              ]}
            >
              {item.subject || t('support') || 'Yordam'}
            </Text>
            {item.last_message && (
              <Text
                style={[styles.conversationTime, { color: colors.textLight }]}
              >
                {new Date(item.last_message.created_at).toLocaleDateString('uz-UZ', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            )}
          </View>
          
          {item.last_message && (
            <View style={styles.lastMessageContainer}>
              <Text
                style={[
                  styles.lastMessage,
                  { color: colors.textLight },
                  hasUnread && styles.unreadMessage,
                ]}
                numberOfLines={1}
              >
                {item.last_message.sender_name}: {item.last_message.message}
              </Text>
              {hasUnread && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadCount}>
                    {item.unread_count > 99 ? '99+' : item.unread_count}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {item.seller_name && (
            <Text style={[styles.adminName, { color: colors.textLight }]}>
              {t('admin') || 'Admin'}: {item.seller_name}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </TouchableOpacity>
    );
  };

  if (isLoading && conversations.length === 0) {
    return (
      <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Footer currentScreen="chat" />
      </FooterAwareView>
    );
  }

  return (
    <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              {t('no_conversations') || 'Hozircha suhbatlar yo\'q'}
            </Text>
            <TouchableOpacity
              style={[styles.newChatButton, { backgroundColor: colors.primary }]}
              onPress={handleNewChat}
            >
              <Text style={[styles.newChatButtonText, { color: colors.surface }]}>
                {t('new_chat') || 'Yangi suhbat'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleNewChat}
      >
        <Ionicons name="add" size={28} color={colors.surface} />
      </TouchableOpacity>
      <Footer currentScreen="chat" />
    </FooterAwareView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  conversationContent: {
    flex: 1,
    marginRight: 8,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  conversationTime: {
    fontSize: 12,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  adminName: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  newChatButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newChatButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
