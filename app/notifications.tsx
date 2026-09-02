import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/language-context';
import {
  type CitizenNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToMyNotifications,
} from '@/lib/citizen-notifications';
import { formatRelativeTime } from '@/lib/reports';
import { supabase } from '@/lib/supabase';

export default function NotificationsScreen() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<CitizenNotification[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let unsubscribe: (() => void) | null = null;

      supabase.auth.getUser().then(({ data }) => {
        if (cancelled) return;
        const uid = data.user?.id ?? null;
        setUserId(uid);
        if (!uid) {
          setNotifications([]);
          return;
        }
        getMyNotifications(uid)
          .then((rows) => {
            if (!cancelled) setNotifications(rows);
          })
          .catch(() => {
            if (!cancelled) setNotifications([]);
          });
        unsubscribe = subscribeToMyNotifications(uid, (row) => {
          setNotifications((prev) => [row, ...(prev ?? [])]);
        });
      });

      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    }, [])
  );

  function handlePress(n: CitizenNotification) {
    if (n.is_read) return;
    setNotifications((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    markNotificationRead(n.id).catch(() => null);
  }

  function handleMarkAllRead() {
    if (!userId) return;
    setNotifications((prev) => (prev ?? []).map((x) => ({ ...x, is_read: true })));
    markAllNotificationsRead(userId).catch(() => null);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('notificationsPage.title')}</Text>
        {unreadCount > 0 ? (
          <Pressable hitSlop={8} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>{t('common.markAllRead')}</Text>
          </Pressable>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      {notifications === null ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1B6B3A" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-outline" size={36} color="#c3cac6" />
          <Text style={styles.emptyText}>{t('common.noNotificationsYet')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.row, !n.is_read && styles.rowUnread]}
              onPress={() => handlePress(n)}>
              {!n.is_read && <View style={styles.dot} />}
              <View style={styles.rowBody}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.time}>{formatRelativeTime(n.created_at, t)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2E22',
  },
  markAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13.5,
    color: '#9aa5a0',
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f6f7f6',
  },
  rowUnread: {
    backgroundColor: '#f3faf6',
    borderRadius: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1B6B3A',
    marginTop: 6,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  body: {
    fontSize: 12,
    color: '#4a5750',
    lineHeight: 16,
  },
  time: {
    fontSize: 10.5,
    color: '#9aa5a0',
    marginTop: 2,
  },
});
