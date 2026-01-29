/**
 * New Chat Screen - Create a new conversation
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import Footer, { FooterAwareView } from '../components/Footer';

export default function NewChatScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert(
        t('error') || 'Xato',
        t('message_required') || 'Xabar matnini kiriting'
      );
      return;
    }

    setIsSending(true);
    try {
      const response = await api.post('/conversations', {
        message: message.trim(),
        subject: subject.trim() || undefined,
      });
      
      // Navigate to chat screen
      navigation.replace('Chat', { conversationId: response.id });
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert(
        t('error') || 'Xato',
        t('create_error') || 'Suhbat yaratishda xatolik yuz berdi'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <FooterAwareView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('new_chat') || 'Yangi suhbat'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('subject') || 'Mavzu'} (ixtiyoriy)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={t('subject_placeholder') || 'Masalan: Buyurtma haqida savol'}
              placeholderTextColor={colors.textLight}
              value={subject}
              onChangeText={setSubject}
              maxLength={200}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('message') || 'Xabar'} *
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={t('message_placeholder') || 'Xabaringizni yozing...'}
              placeholderTextColor={colors.textLight}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={8}
              maxLength={5000}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textLight }]}>
              {message.length} / 5000
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: message.trim() ? colors.primary : colors.border,
              },
            ]}
            onPress={handleSend}
            disabled={!message.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={colors.surface} />
                <Text style={[styles.sendButtonText, { color: colors.surface }]}>
                  {t('send') || 'Yuborish'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Footer currentScreen="chat" />
    </FooterAwareView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
