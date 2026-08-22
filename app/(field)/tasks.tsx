import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FIELD_TASK_STATUS_BADGE,
  FIELD_TASK_STATUS_LABEL,
  type FieldTask,
  getMyTasks,
  routeForTaskStatus,
  subscribeToMyTasks,
} from '@/lib/field-tasks';
import { getMyTeam } from '@/lib/field-team';
import { priorityMeta } from '@/lib/field-ui';
import { formatDistance, haversineMeters } from '@/lib/geo';

type TabValue = 'all' | 'in_progress' | 'completed';

// Same "actively being handled" grouping used by the Home screen's stat
// cards — on_the_way and pending_review both count as "In Progress" here,
// since neither is a state a field worker would think of as separate.
function inProgressBucket(status: FieldTask['status']): boolean {
  return status === 'on_the_way' || status === 'in_progress' || status === 'pending_review';
}

export default function FieldTasksScreen() {
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [teamId, setTeamId] = useState<string | null | undefined>(undefined);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabValue>('all');
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Lets other screens (e.g. Reports' "View All") deep-link straight into a
  // specific tab, e.g. /(field)/tasks?tab=completed — re-applies whenever a
  // new param arrives, since this screen stays mounted in the tab bar.
  // React's documented "adjusting state when a prop changes" recipe: store
  // the previous param in state (not a ref — refs can't be read/written
  // during render) and compare during render.
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    if (tabParam === 'all' || tabParam === 'in_progress' || tabParam === 'completed') {
      setTab(tabParam);
    }
  }

  const reloadTasks = useCallback(async (id: string) => {
    try {
      setTasks(await getMyTasks(id));
    } catch {
      // keep whatever was already on screen
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getMyTeam()
        .then((team) => {
          if (cancelled) return;
          setTeamId(team?.id ?? null);
          if (team) reloadTasks(team.id);
          else setLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setTeamId(null);
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [reloadTasks])
  );

  // Every task the admin assigns/reassigns, or any status change made from
  // either this app or the admin panel, lands here instantly.
  useEffect(() => {
    if (!teamId) return;
    return subscribeToMyTasks(teamId, () => reloadTasks(teamId));
  }, [teamId, reloadTasks]);

  // Best-effort distance readout, same as Home — silently hidden if
  // permission isn't granted rather than showing a made-up number.
  useEffect(() => {
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMyLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      } catch {
        // no distance readout — not fatal
      }
    })();
  }, []);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      in_progress: tasks.filter((t) => inProgressBucket(t.status)).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    }),
    [tasks]
  );

  const filtered = useMemo(() => {
    if (tab === 'in_progress') return tasks.filter((t) => inProgressBucket(t.status));
    if (tab === 'completed') return tasks.filter((t) => t.status === 'completed');
    return tasks;
  }, [tasks, tab]);

  function distanceFor(task: FieldTask): string | null {
    if (!myLocation) return null;
    return formatDistance(
      haversineMeters(myLocation.latitude, myLocation.longitude, task.report.latitude, task.report.longitude)
    );
  }

  function openTask(task: FieldTask) {
    router.push({ pathname: routeForTaskStatus(task.status), params: { id: task.id } });
  }

  const TABS: { label: string; value: TabValue }[] = [
    { label: `All (${counts.all})`, value: 'all' },
    { label: `In Progress (${counts.in_progress})`, value: 'in_progress' },
    { label: `Completed (${counts.completed})`, value: 'completed' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tasks</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTab(t.value)}
            style={[styles.tab, tab === t.value && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1B6B3A" />
        </View>
      ) : teamId === null ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={28} color="#c0392b" />
          <Text style={styles.emptyText}>This login isn&apos;t a field team account.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="checkmark-done-circle-outline" size={28} color="#9aa5a0" />
          <Text style={styles.emptyText}>
            {tasks.length === 0
              ? 'No tasks assigned yet. New tasks from the admin will show up here instantly.'
              : 'Nothing here yet.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.map((task) => {
            const priority = priorityMeta(task.report.urgency_label);
            const statusBadge = FIELD_TASK_STATUS_BADGE[task.status];
            const distance = distanceFor(task);
            return (
              <Pressable key={task.id} style={styles.card} onPress={() => openTask(task)}>
                <Image source={{ uri: task.report.media_url }} style={styles.thumb} contentFit="cover" />
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.taskCode}>#{task.assignment_code}</Text>
                    <View style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}>
                      <Text style={[styles.statusPillText, { color: statusBadge.text }]}>
                        {FIELD_TASK_STATUS_LABEL[task.status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.taskTitle}>{task.report.category}</Text>
                  <Text style={[styles.priorityText, { color: priority.text }]}>{priority.label} Priority</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={12} color="#6b7770" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {task.report.address}
                    </Text>
                  </View>
                  {distance && <Text style={styles.distanceText}>{distance}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#c3cdc7" />
              </Pressable>
            );
          })}
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E22',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tab: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f1f3f2',
  },
  tabActive: {
    backgroundColor: '#1B6B3A',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7770',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7770',
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef1ef',
    padding: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#eef1ef',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskCode: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1A2E22',
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  taskTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A2E22',
    marginTop: 1,
  },
  priorityText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11.5,
    color: '#6b7770',
    flexShrink: 1,
  },
  distanceText: {
    fontSize: 10.5,
    color: '#8a9590',
    marginTop: 1,
  },
});
