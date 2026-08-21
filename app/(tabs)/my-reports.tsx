import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatRelativeTime,
  getMyReports,
  STATUS_COLOR,
  STATUS_LABEL,
  type ReportRow,
} from '@/lib/reports';

type FilterKey = 'all' | 'active' | 'resolved';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
];

export default function MyReportsScreen() {
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    const result = await getMyReports().catch(() => []);
    setReports(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    if (!reports) return [];
    if (filter === 'all') return reports;
    if (filter === 'resolved') return reports.filter((r) => r.status === 'resolved');
    return reports.filter((r) => r.status !== 'resolved');
  }, [reports, filter]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Active Reports</Text>
      </View>

      <View style={styles.tabRow}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.tabPill, filter === item.key && styles.tabPillActive]}
            onPress={() => setFilter(item.key)}>
            <Text style={[styles.tabPillText, filter === item.key && styles.tabPillTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {reports === null ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1B6B3A" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={36} color="#c3cac6" />
          <Text style={styles.emptyText}>No reports here yet.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1B6B3A" />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push({ pathname: '/report-status', params: { id: item.id } })}>
              <Image source={{ uri: item.media_url }} style={styles.thumb} contentFit="cover" />
              <View style={styles.cardBody}>
                <Text style={styles.cardCode}>
                  {item.report_code} {item.category}
                </Text>
                <Text style={styles.cardTime}>{formatRelativeTime(item.created_at)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status].bg }]}>
                <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[item.status].text }]}>
                  {STATUS_LABEL[item.status]}
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2E22',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f4f7f5',
  },
  tabPillActive: {
    backgroundColor: '#1B6B3A',
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7770',
  },
  tabPillTextActive: {
    color: '#ffffff',
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
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
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardCode: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  cardTime: {
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
