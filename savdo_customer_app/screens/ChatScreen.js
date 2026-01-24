/**
 * Chat/Support Screen for Customer App
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { WebSocketManager } from '../services/websocket';
import Footer from '../components/Footer';

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const conversationId = route.params?.conversationId;
  
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);
  const wsManagerRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      loadConversation();
      setupWebSocket();
    } else {
      setIsLoading(false);
    }
    
    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
    };
  }, [conversationId]);

  const setupWebSocket = () => {
    if (!conversationId) return;
    
    wsManagerRef.current = new WebSocketManager();
    
    wsManagerRef.current.on('new_chat_message', (data) => {
      if (data.conversation_id === conversationId) {
        // Add new message to list
        setMessages(prev => [...prev, {
          id: data.message.id,
          conversation_id: data.conversation_id,
          sender_type: data.message.sender_type,
          sender_id: data.message.sender_id,
          sender_name: data.message.sender_name,
          message: data.message.message,
          is_read: false,
          read_at: null,
          created_at: new Date(data.message.created_at),
        }]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    
    wsManagerRef.current.connect();
  };

  const loadConversation = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/conversations/${conversationId}/messages`);
      
      setConversation(response.conversation);
      setMessages(response.messages || []);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading conversation:', error);
      Alert.alert(
        t('error') || 'Xato',
        t('load_error') || 'Suhbatni yuklashda xatolik yuz berdi'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || isSending) return;
    
    const text = messageText.trim();
    setMessageText('');
    setIsSending(true);
    
    try {
      const response = await api.post(
        `/conversations/${conversationId}/messages`,
        { message: text }
      );
      
      // Add message to list
      setMessages(prev => [...prev, {
        id: response.id,
        conversation_id: response.conversation_id,
        sender_type: response.sender_type,
        sender_id: response.sender_id,
        sender_name: response.sender_name,
        message: response.message,
        is_read: response.is_read,
        read_at: response.read_at,
        created_at: new Date(response.created_at),
      }]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(
        t('error') || 'Xato',
        t('send_error') || 'Xabarni yuborishda xatolik yuz berdi'
      );
      setMessageText(text); // Restore text on error
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isCustomer = item.sender_type === 'customer';
    const isOwnMessage = isCustomer;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {!isOwnMessage && (
            <Text style={[styles.senderName, { color: colors.textLight }]}>
              {item.sender_name}
            </Text>
          )}
          <Text
            style={[
              styles.messageText,
              { color: isOwnMessage ? colors.surface : colors.text },
            ]}
          >
            {item.message}
          </Text>
          <Text
            style={[
              styles.messageTime,
              { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.textLight },
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('support') || 'Yordam'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {conversation?.subject || t('support') || 'Yordam'}
          </Text>
          {conversation?.seller_name && (
            <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
              {t('admin') || 'Admin'}: {conversation.seller_name}
            </Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              {t('no_messages') || 'Hozircha xabarlar yo\'q'}
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.background },
          ]}
          placeholder={t('type_message') || 'Xabar yozing...'}
          placeholderTextColor={colors.textLight}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: messageText.trim() ? colors.primary : colors.border,
            },
          ]}
          onPress={sendMessage}
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Ionicons name="send" size={20} color={colors.surface} />
          )}
        </TouchableOpacity>
      </View>
      <Footer currentScreen="chat" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
