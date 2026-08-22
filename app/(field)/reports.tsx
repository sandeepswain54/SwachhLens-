import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colorForCategory,
  computeCategoryBreakdown,
  computeReportStats,
  computeTrend,
  getPeriodRange,
  kgFor,
  type ReportPeriod,
} from '@/lib/field-report-stats';
import {
  FIELD_TASK_STATUS_BADGE,
  FIELD_TASK_STATUS_LABEL,
  type FieldTask,
  getMyTasks,
  routeForTaskStatus,
  subscribeToMyTasks,
} from '@/lib/field-tasks';
import { getMyTeam } from '@/lib/field-team';
import { formatDateTime } from '@/lib/reports';

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};

const RECENT_ACTIVITY_ICON: Record<FieldTask['status'], keyof typeof Ionicons.glyphMap> = {
  pending: 'hourglass',
  on_the_way: 'navigate',
  in_progress: 'time',
  pending_review: 'hourglass',
  completed: 'checkmark',
};

function DeltaLabel({ deltaPercent, caption }: { deltaPercent: number | null; caption: string }) {
  if (deltaPercent === null) {
    return <Text style={styles.deltaNeutral}>No data {caption}</Text>;
  }
  const isUp = deltaPercent >= 0;
  return (
    <View style={styles.deltaRow}>
      <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={11} color={isUp ? '#1B6B3A' : '#c0392b'} />
      <Text style={[styles.deltaText, { color: isUp ? '#1B6B3A' : '#c0392b' }]}>
        {Math.abs(deltaPercent).toFixed(0)}% {caption}
      </Text>
    </View>
  );
}

export default function FieldReportsScreen() {
  const [teamId, setTeamId] = useState<string | null | undefined>(undefined);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ReportPeriod>('week');

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

  // Every assignment change — new task, status change, admin review outcome
  // — updates every stat/chart on this screen the moment it happens.
  useEffect(() => {
    if (!teamId) return;
    return subscribeToMyTasks(teamId, () => reloadTasks(teamId));
  }, [teamId, reloadTasks]);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const stats = useMemo(() => computeReportStats(tasks, range), [tasks, range]);
  const trend = useMemo(() => computeTrend(tasks, period, range), [tasks, period, range]);
  const breakdown = useMemo(() => computeCategoryBreakdown(tasks, range), [tasks, range]);
  const totalKg = useMemo(() => breakdown.reduce((sum, b) => sum + b.kg, 0), [breakdown]);

  const recentActivity = useMemo(() => {
    function timestampFor(t: FieldTask): string {
      return t.completed_at ?? t.submitted_for_review_at ?? t.started_at ?? t.assigned_at ?? t.created_at;
    }
    return [...tasks].sort((a, b) => new Date(timestampFor(b)).getTime() - new Date(timestampFor(a)).getTime()).slice(0, 6);
  }, [tasks]);

  function handlePeriodPress() {
    Alert.alert('Select Period', undefined, [
      { text: 'Today', onPress: () => setPeriod('today') },
      { text: 'This Week', onPress: () => setPeriod('week') },
      { text: 'This Month', onPress: () => setPeriod('month') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function openTask(task: FieldTask) {
    router.push({ pathname: routeForTaskStatus(task.status), params: { id: task.id } });
  }

  if (teamId === undefined || loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <ActivityIndicator color="#1B6B3A" />
      </SafeAreaView>
    );
  }

  if (teamId === null) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Ionicons name="alert-circle-outline" size={28} color="#c0392b" />
        <Text style={styles.emptyText}>This login isn&apos;t a field team account.</Text>
      </SafeAreaView>
    );
  }

  const maxTrend = Math.max(1, ...trend.map((p) => p.value));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSubtitle}>Track performance and impact</Text>
          </View>
          <Pressable style={styles.periodButton} onPress={handlePeriodPress}>
            <Ionicons name="calendar-outline" size={14} color="#1B6B3A" />
            <Text style={styles.periodButtonText}>{PERIOD_LABEL[period]}</Text>
            <Ionicons name="chevron-down" size={13} color="#1B6B3A" />
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="checkmark-done-outline"
            color="#1B6B3A"
            bg="#e3f3ea"
            value={String(stats.tasksCompleted.value)}
            label="Tasks Completed"
            deltaPercent={stats.tasksCompleted.deltaPercent}
            deltaCaption={range.deltaCaption}
          />
          <StatCard
            icon="cube-outline"
            color="#2563eb"
            bg="#e6eefd"
            value={`${stats.tonsCollected.value.toFixed(1)} T`}
            label="Tons Collected"
            deltaPercent={stats.tonsCollected.deltaPercent}
            deltaCaption={range.deltaCaption}
          />
          <StatCard
            icon="stopwatch-outline"
            color="#7c3aed"
            bg="#ede6fb"
            value={stats.avgResponseHrs.value === null ? '—' : `${stats.avgResponseHrs.value.toFixed(1)}h`}
            label="Avg. Response Time"
            deltaPercent={stats.avgResponseHrs.deltaPercent}
            deltaCaption={range.deltaCaption}
          />
          <StatCard
            icon="flag-outline"
            color="#d97706"
            bg="#fbead2"
            value={String(stats.urgentCompleted.value)}
            label="Urgent Completed"
            deltaPercent={stats.urgentCompleted.deltaPercent}
            deltaCaption={range.deltaCaption}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Tasks Trend</Text>
          <Text style={styles.cardSubheading}>{range.label}</Text>
          {trend.every((p) => p.value === 0) ? (
            <Text style={styles.emptyInlineText}>No completed tasks in this period yet.</Text>
          ) : (
            <View style={styles.trendChart}>
              {trend.map((point) => (
                <View key={point.label} style={styles.trendBarColumn}>
                  <Text style={styles.trendValue}>{point.value}</Text>
                  <View style={styles.trendBarTrack}>
                    <View
                      style={[
                        styles.trendBarFill,
                        { height: Math.max(4, (point.value / maxTrend) * 100) },
                      ]}
                    />
                  </View>
                  <Text style={styles.trendLabel}>{point.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeadingRow}>
            <View>
              <Text style={styles.cardHeading}>Waste Breakdown</Text>
              <Text style={styles.cardSubheading}>{range.label}</Text>
            </View>
            <Text style={styles.wasteTotalValue}>{(totalKg / 1000).toFixed(1)} T</Text>
          </View>

          {breakdown.length === 0 ? (
            <Text style={styles.emptyInlineText}>No completed tasks in this period yet.</Text>
          ) : (
            <>
              <View style={styles.stackedBar}>
                {breakdown.map((b) => (
                  <View
                    key={b.category}
                    style={{ flex: Math.max(b.percent, 2), backgroundColor: colorForCategory(b.category) }}
                  />
                ))}
              </View>

              <View style={styles.breakdownList}>
                {breakdown.map((b) => (
                  <View key={b.category} style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: colorForCategory(b.category) }]} />
                    <Text style={styles.breakdownLabel} numberOfLines={1}>
                      {b.category}
                    </Text>
                    <Text style={styles.breakdownKg}>{(b.kg / 1000).toFixed(2)} T</Text>
                    <Text style={styles.breakdownPercent}>{b.percent.toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeadingRow}>
            <Text style={styles.cardHeading}>Recent Activity</Text>
            <Pressable onPress={() => router.push({ pathname: '/(field)/tasks', params: { tab: 'all' } })}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>

          {recentActivity.length === 0 ? (
            <Text style={styles.emptyInlineText}>No tasks yet.</Text>
          ) : (
            <View style={styles.activityList}>
              {recentActivity.map((task, index) => {
                const badge = FIELD_TASK_STATUS_BADGE[task.status];
                const kg = kgFor(task);
                return (
                  <Pressable
                    key={task.id}
                    onPress={() => openTask(task)}
                    style={[
                      styles.activityRow,
                      index === recentActivity.length - 1 && styles.activityRowLast,
                    ]}>
                    <View style={[styles.activityIcon, { backgroundColor: badge.bg }]}>
                      <Ionicons name={RECENT_ACTIVITY_ICON[task.status]} size={14} color={badge.text} />
                    </View>
                    <Image source={{ uri: task.report.media_url }} style={styles.activityThumb} contentFit="cover" />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityCode}>#{task.assignment_code}</Text>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {task.report.category}
                      </Text>
                      <Text style={styles.activityDate}>{formatDateTime(task.created_at)}</Text>
                    </View>
                    <View style={styles.activityAside}>
                      <Text style={[styles.activityValue, { color: badge.text }]}>
                        {task.status === 'completed' && kg > 0
                          ? `${(kg / 1000).toFixed(1)} T`
                          : FIELD_TASK_STATUS_LABEL[task.status]}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#c3cdc7" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  color,
  bg,
  value,
  label,
  deltaPercent,
  deltaCaption,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  value: string;
  label: string;
  deltaPercent: number | null;
  deltaCaption: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <DeltaLabel deltaPercent={deltaPercent} caption={deltaCaption} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaf3ef',
  },
  centered: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7770',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A2E22',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#6b7770',
    marginTop: 2,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d7ece0',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11.5,
    color: '#6b7770',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  deltaText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  deltaNeutral: {
    fontSize: 10.5,
    color: '#9aa5a0',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
  },
  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1A2E22',
  },
  cardSubheading: {
    fontSize: 10.5,
    color: '#8a9590',
    marginTop: 1,
  },
  emptyInlineText: {
    marginTop: 12,
    fontSize: 12.5,
    color: '#8a9590',
    textAlign: 'center',
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    height: 140,
  },
  trendBarColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  trendValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A2E22',
  },
  trendBarTrack: {
    width: 14,
    height: 100,
    justifyContent: 'flex-end',
  },
  trendBarFill: {
    width: '100%',
    backgroundColor: '#1B6B3A',
    borderRadius: 6,
  },
  trendLabel: {
    fontSize: 9.5,
    color: '#8a9590',
  },
  wasteTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E22',
  },
  stackedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 14,
    backgroundColor: '#eef1ef',
  },
  breakdownList: {
    marginTop: 14,
    gap: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 12.5,
    color: '#1A2E22',
    fontWeight: '600',
  },
  breakdownKg: {
    fontSize: 12,
    color: '#4a5750',
    fontWeight: '700',
  },
  breakdownPercent: {
    fontSize: 11,
    color: '#8a9590',
    width: 34,
    textAlign: 'right',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  activityList: {
    marginTop: 10,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f2',
  },
  activityRowLast: {
    borderBottomWidth: 0,
  },
  activityIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eef1ef',
  },
  activityInfo: {
    flex: 1,
    gap: 1,
  },
  activityCode: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1A2E22',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2E22',
  },
  activityDate: {
    fontSize: 10.5,
    color: '#8a9590',
  },
  activityAside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityValue: {
    fontSize: 12,
    fontWeight: '700',
  },
});
