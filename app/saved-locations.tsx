import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/language-context';
import {
  formatRelativeTime,
  getMyReports,
  STATUS_COLOR,
  type ReportRow,
} from '@/lib/reports';

export default function SavedLocationsScreen() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportRow[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getMyReports()
        .catch(() => [])
        .then((result) => {
          if (!cancelled) setReports(result);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('savedLocationsPage.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      {reports === null ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1B6B3A" />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="location-outline" size={36} color="#c3cac6" />
          <Text style={styles.emptyText}>{t('savedLocationsPage.noLocationsYet')}</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push({ pathname: '/report-status', params: { id: item.id } })}>
              <View style={styles.pinCircle}>
                <Ionicons name="location" size={18} color="#1B6B3A" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardAddress} numberOfLines={2}>
                  {item.address}
                </Text>
                <Text style={styles.cardMeta}>
                  {t(`wasteCategory.${item.category}`)} · {formatRelativeTime(item.created_at, t)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status].bg }]}>
                <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[item.status].text }]}>
                  {t(`reportStatus.${item.status}`)}
                </Text>
              </View>
            </Pressable>
          )}
        />
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 13.5,
    color: '#9aa5a0',
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#eceeec',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  pinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f3ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardAddress: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  cardMeta: {
    marginTop: 3,
    fontSize: 11.5,
    color: '#9aa5a0',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
