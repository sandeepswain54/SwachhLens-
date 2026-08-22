import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  type FieldNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToMyNotifications,
} from '@/lib/field-notifications';
import {
  FIELD_TASK_STATUS_LABEL,
  type FieldTask,
  getMyTasks,
  routeForTaskStatus,
  subscribeToMyTasks,
} from '@/lib/field-tasks';
import { priorityMeta } from '@/lib/field-ui';
import { getMyTeam, subscribeToMyTeam, TEAM_STATUS_LABEL, type MyTeam } from '@/lib/field-team';
import { formatDistance, haversineMeters } from '@/lib/geo';
import { getCurrentProfile } from '@/lib/profile';
import { formatRelativeTime } from '@/lib/reports';
import { supabase } from '@/lib/supabase';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatDuration(ms: number): string {
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60000))}m`;
  return `${hours.toFixed(1)}h`;
}

const STATUS_DOT: Record<MyTeam['status'], string> = {
  on_duty: '#2ecc71',
  available: '#2ecc71',
  maintenance: '#e0a13a',
};

const SHEET_BG = '#eaf3ef';

export default function FieldHomeScreen() {
  const insets = useSafeAreaInsets();
  const [team, setTeam] = useState<MyTeam | null | undefined>(undefined);
  const [fullName, setFullName] = useState('');
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [notifications, setNotifications] = useState<FieldNotification[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [, setGreetingTick] = useState(0);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

  // Keeps "Good Morning/Afternoon/Evening" accurate if the app is left open
  // across the boundary between them.
  useEffect(() => {
    const interval = setInterval(() => setGreetingTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Powers the "away" distance readout on task cards — best-effort only: if
  // permission is denied or location fails, those readouts just stay hidden
  // rather than showing a made-up number.
  useEffect(() => {
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setMyLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      } catch {
        // no distance readout — not fatal
      }
    })();
  }, []);

  const reloadTasks = useCallback(async (teamId: string) => {
    try {
      setTasks(await getMyTasks(teamId));
    } catch {
      // keep whatever was already on screen
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const [myTeam, profile] = await Promise.all([
          getMyTeam().catch(() => null),
          getCurrentProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setTeam(myTeam);
        setFullName(profile?.fullName ?? '');

        if (!myTeam) {
          setLoadingTasks(false);
          return;
        }
        await Promise.all([
          reloadTasks(myTeam.id),
          getMyNotifications(myTeam.id)
            .then((rows) => !cancelled && setNotifications(rows))
            .catch(() => null),
        ]);
      }
      load();

      return () => {
        cancelled = true;
      };
    }, [reloadTasks])
  );

  const teamId = team?.id;

  // Realtime: a task the admin assigns/reassigns/advances, a change to this
  // team's own record (zone/status), or a new notification all land here the
  // moment they happen — no pull-to-refresh needed.
  useEffect(() => {
    if (!teamId) return;
    const unsubTasks = subscribeToMyTasks(teamId, () => reloadTasks(teamId));
    const unsubTeam = subscribeToMyTeam(teamId, (row) => setTeam(row));
    const unsubNotifs = subscribeToMyNotifications(teamId, (row) =>
      setNotifications((prev) => [row, ...prev])
    );
    return () => {
      unsubTasks();
      unsubTeam();
      unsubNotifs();
    };
  }, [teamId, reloadTasks]);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks]);

  // pending_review tasks are excluded from "next task" — they're already
  // submitted and waiting on the admin, there's no field action left to
  // take on them, so surfacing one as "what to do next" would be misleading.
  // They still show up in the list below with a "Pending Review" badge.
  const nextTask = useMemo(() => {
    const candidates = activeTasks.filter((t) => t.status !== 'pending_review');
    if (candidates.length === 0) return null;
    const weight = (u: string) => (u === 'Urgent' ? 3 : u === 'High' ? 2 : 1);
    return [...candidates].sort((a, b) => {
      const byPriority = weight(b.report.urgency_label) - weight(a.report.urgency_label);
      if (byPriority !== 0) return byPriority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })[0];
  }, [activeTasks]);

  const otherTasks = useMemo(() => tasks.filter((t) => t.id !== nextTask?.id), [tasks, nextTask]);

  const stats = useMemo(
    () => ({
      assignedToday: tasks.filter((t) => isToday(t.assigned_at ?? t.created_at)).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      inProgress: tasks.filter(
        (t) => t.status === 'on_the_way' || t.status === 'in_progress' || t.status === 'pending_review'
      ).length,
      pending: tasks.filter((t) => t.status === 'pending').length,
    }),
    [tasks]
  );

  // Everything here is derived straight from real assignment timestamps and
  // (when location permission is granted) the device's real GPS fix — no
  // placeholder numbers.
  const overview = useMemo(() => {
    const todaysTasks = tasks.filter((t) => isToday(t.assigned_at ?? t.created_at));
    const todaysCompleted = todaysTasks.filter((t) => t.status === 'completed').length;

    const responded = todaysTasks.filter(
      (t) => t.status === 'completed' && t.completed_at
    );
    const avgResponseMs = responded.length
      ? responded.reduce((sum, t) => {
          const started = new Date(t.assigned_at ?? t.created_at).getTime();
          const done = new Date(t.completed_at as string).getTime();
          return sum + Math.max(0, done - started);
        }, 0) / responded.length
      : null;

    const urgentActive = activeTasks.filter((t) => t.report.urgency_label === 'Urgent').length;

    const nextDistanceMeters =
      myLocation && nextTask
        ? haversineMeters(
            myLocation.latitude,
            myLocation.longitude,
            nextTask.report.latitude,
            nextTask.report.longitude
          )
        : null;

    return {
      completedRatio: `${todaysCompleted}/${todaysTasks.length}`,
      avgResponseLabel: avgResponseMs === null ? '—' : formatDuration(avgResponseMs),
      urgentActive,
      nextDistanceLabel: nextDistanceMeters === null ? '—' : formatDistance(nextDistanceMeters).replace(' away', ''),
    };
  }, [tasks, activeTasks, myLocation, nextTask]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function distanceFor(task: FieldTask): string | null {
    if (!myLocation) return null;
    return formatDistance(
      haversineMeters(
        myLocation.latitude,
        myLocation.longitude,
        task.report.latitude,
        task.report.longitude
      )
    );
  }

  function openTask(task: FieldTask) {
    router.push({ pathname: routeForTaskStatus(task.status), params: { id: task.id } });
  }

  function handleNotificationPress(n: FieldNotification) {
    if (n.is_read) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    markNotificationRead(n.id).catch(() => null);
  }

  function handleMarkAllRead() {
    if (!teamId) return;
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    markAllNotificationsRead(teamId).catch(() => null);
  }

  async function handleLogout() {
    setNotifOpen(false);
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function handleMenuPress() {
    Alert.alert('Menu', undefined, [
      { text: 'Logout', style: 'destructive', onPress: handleLogout },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (team === undefined) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator color="#1B6B3A" />
      </SafeAreaView>
    );
  }

  if (team === null) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Ionicons name="alert-circle-outline" size={32} color="#c0392b" />
        <Text style={styles.errorTitle}>This login isn&apos;t a field team account.</Text>
        <Pressable style={styles.errorLogoutButton} onPress={handleLogout}>
          <Text style={styles.errorLogoutText}>Back to Login</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
              <Pressable hitSlop={8} onPress={handleMenuPress}>
                <Ionicons name="menu" size={26} color="#ffffff" />
              </Pressable>
              <Pressable hitSlop={8} style={styles.bellButton} onPress={() => setNotifOpen(true)}>
                <Ionicons name="notifications-outline" size={24} color="#ffffff" />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            <Text style={styles.greeting}>
              {getGreeting()}, <Text style={styles.greetingName}>{fullName || team.leader_name}</Text> 👋
            </Text>
            <Text style={styles.teamName}>
              {team.team_name} ({team.zone})
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_DOT[team.status] }]} />
              <Text style={styles.statusText}>{TEAM_STATUS_LABEL[team.status]}</Text>
            </View>
          </View>

          <View style={styles.sheet}>
            <View style={styles.statsRow}>
              <StatCard icon="clipboard-outline" color="#1B6B3A" bg="#e3f3ea" value={stats.assignedToday} label={'Assigned\nToday'} />
              <StatCard icon="checkmark-done-outline" color="#2563eb" bg="#e6eefd" value={stats.completed} label="Completed" />
              <StatCard icon="hourglass-outline" color="#d97706" bg="#fbead2" value={stats.inProgress} label={'In\nProgress'} />
              <StatCard icon="time-outline" color="#7c3aed" bg="#ede6fb" value={stats.pending} label="Pending" />
            </View>

            {tasks.length > 0 && (
              <View style={styles.overviewCard}>
                <Text style={styles.overviewHeading}>Today&apos;s Overview</Text>
                <View style={styles.overviewRow}>
                  <OverviewTile icon="flag-outline" value={String(overview.urgentActive)} label="Urgent Now" />
                  <OverviewTile icon="list-outline" value={overview.completedRatio} label="Completed" />
                  <OverviewTile icon="stopwatch-outline" value={overview.avgResponseLabel} label="Avg. Response" />
                  <OverviewTile icon="navigate-outline" value={overview.nextDistanceLabel} label="Next Task" />
                </View>
              </View>
            )}

            {loadingTasks ? (
              <ActivityIndicator color="#1B6B3A" style={{ marginTop: 24 }} />
            ) : tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-done-circle-outline" size={28} color="#9aa5a0" />
                <Text style={styles.emptyText}>No tasks assigned yet. New tasks from the admin will show up here instantly.</Text>
              </View>
            ) : (
              <>
                {nextTask && (
                  <View style={styles.nextTaskSection}>
                    <Text style={styles.sectionHeading}>Your Next Task</Text>
                    <View style={styles.nextTaskCard}>
                      <View style={styles.nextTaskTop}>
                        <Image
                          source={{ uri: nextTask.report.media_url }}
                          style={styles.nextTaskThumb}
                          contentFit="cover"
                        />
                        <View style={styles.nextTaskInfo}>
                          <View style={styles.nextTaskInfoTop}>
                            <Text style={styles.taskCode}>#{nextTask.assignment_code}</Text>
                            <View
                              style={[
                                styles.priorityBadge,
                                { backgroundColor: priorityMeta(nextTask.report.urgency_label).bg },
                              ]}>
                              <Text
                                style={[
                                  styles.priorityBadgeText,
                                  { color: priorityMeta(nextTask.report.urgency_label).text },
                                ]}>
                                {priorityMeta(nextTask.report.urgency_label).label} Priority
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.taskTitle}>{nextTask.report.category}</Text>
                          <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={13} color="#6b7770" />
                            <Text style={styles.metaText} numberOfLines={1}>
                              {nextTask.report.address}
                            </Text>
                          </View>
                          <View style={styles.metaBottomRow}>
                            <Text style={styles.metaTimeText}>
                              Assigned {formatRelativeTime(nextTask.assigned_at ?? nextTask.created_at)}
                            </Text>
                            {distanceFor(nextTask) && (
                              <>
                                <View style={styles.metaDivider} />
                                <Text style={styles.metaTimeText}>{distanceFor(nextTask)}</Text>
                              </>
                            )}
                          </View>
                        </View>
                      </View>

                      <Pressable style={styles.startButton} onPress={() => openTask(nextTask)}>
                        <Ionicons name="send" size={16} color="#ffffff" />
                        <Text style={styles.startButtonText}>
                          {nextTask.status === 'pending'
                            ? 'Start Task'
                            : nextTask.status === 'on_the_way'
                              ? 'Continue: On the Way'
                              : 'Continue: Upload Progress'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                <View style={styles.recentSection}>
                  <Text style={styles.sectionHeading}>
                    {nextTask ? 'Recent Assignments' : 'All Assignments'}
                  </Text>
                  <View style={styles.recentList}>
                    {otherTasks.map((task, index) => (
                      <Pressable
                        key={task.id}
                        onPress={() => openTask(task)}
                        style={[
                          styles.recentRow,
                          index === otherTasks.length - 1 && styles.recentRowLast,
                        ]}>
                        <Image
                          source={{ uri: task.report.media_url }}
                          style={styles.recentThumb}
                          contentFit="cover"
                        />
                        <View style={styles.recentInfo}>
                          <Text style={styles.taskCode}>#{task.assignment_code}</Text>
                          <Text style={styles.recentTitle}>{task.report.category}</Text>
                          <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={12} color="#6b7770" />
                            <Text style={styles.metaText} numberOfLines={1}>
                              {task.report.address}
                            </Text>
                          </View>
                          {distanceFor(task) && (
                            <Text style={styles.recentDistanceText}>{distanceFor(task)}</Text>
                          )}
                        </View>
                        <View style={styles.recentAside}>
                          <View
                            style={[
                              styles.priorityBadge,
                              { backgroundColor: priorityMeta(task.report.urgency_label).bg },
                            ]}>
                            <Text
                              style={[
                                styles.priorityBadgeText,
                                { color: priorityMeta(task.report.urgency_label).text },
                              ]}>
                              {priorityMeta(task.report.urgency_label).label}
                            </Text>
                          </View>
                          <Text style={styles.recentStatusText}>{FIELD_TASK_STATUS_LABEL[task.status]}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#c3cdc7" />
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
      </ScrollView>

      <Modal visible={notifOpen} animationType="slide" transparent onRequestClose={() => setNotifOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setNotifOpen(false)}>
          <Pressable style={styles.notifPanel} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView edges={['top']}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifHeaderTitle}>Notifications</Text>
                <View style={styles.notifHeaderActions}>
                  {unreadCount > 0 && (
                    <Pressable onPress={handleMarkAllRead}>
                      <Text style={styles.notifMarkAllText}>Mark all read</Text>
                    </Pressable>
                  )}
                  <Pressable hitSlop={8} onPress={() => setNotifOpen(false)}>
                    <Ionicons name="close" size={22} color="#1A2E22" />
                  </Pressable>
                </View>
              </View>

              <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <Text style={styles.notifEmptyText}>No notifications yet.</Text>
                ) : (
                  notifications.map((n) => (
                    <Pressable
                      key={n.id}
                      style={[styles.notifRow, !n.is_read && styles.notifRowUnread]}
                      onPress={() => handleNotificationPress(n)}>
                      {!n.is_read && <View style={styles.notifDot} />}
                      <View style={styles.notifRowBody}>
                        <Text style={styles.notifTitle}>{n.title}</Text>
                        <Text style={styles.notifBody}>{n.body}</Text>
                        <Text style={styles.notifTime}>{formatRelativeTime(n.created_at)}</Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StatCard({
  icon,
  color,
  bg,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function OverviewTile({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.overviewTile}>
      <Ionicons name={icon} size={17} color="#1B6B3A" />
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SHEET_BG,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E22',
    textAlign: 'center',
  },
  errorLogoutButton: {
    marginTop: 8,
    backgroundColor: '#1B6B3A',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  errorLogoutText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#0f3d2b',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 44,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bellButton: {
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#e0432b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0f3d2b',
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  greeting: {
    marginTop: 22,
    fontSize: 16,
    fontWeight: '600',
    color: '#dcefe3',
  },
  greetingName: {
    fontWeight: '800',
    color: '#ffffff',
  },
  teamName: {
    marginTop: 4,
    fontSize: 23,
    fontWeight: '800',
    color: '#ffffff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a9e2c1',
  },
  sheet: {
    flex: 1,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: 22,
    paddingHorizontal: 20,
    gap: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
  },
  statIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2E22',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7770',
    textAlign: 'center',
    lineHeight: 12,
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  overviewHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1A2E22',
  },
  overviewRow: {
    flexDirection: 'row',
  },
  overviewTile: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  overviewValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2E22',
  },
  overviewLabel: {
    fontSize: 10,
    color: '#8a9590',
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7770',
    textAlign: 'center',
    lineHeight: 18,
  },
  nextTaskSection: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E22',
  },
  nextTaskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d7ece0',
    padding: 14,
    gap: 14,
  },
  nextTaskTop: {
    flexDirection: 'row',
    gap: 12,
  },
  nextTaskThumb: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: '#eef1ef',
  },
  nextTaskInfo: {
    flex: 1,
    gap: 3,
  },
  nextTaskInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskCode: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1A2E22',
  },
  priorityBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  taskTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#1A2E22',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
    color: '#6b7770',
    flexShrink: 1,
  },
  metaBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaTimeText: {
    fontSize: 11,
    color: '#8a9590',
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#c3cdc7',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B6B3A',
    borderRadius: 14,
    paddingVertical: 14,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  recentSection: {
    gap: 10,
  },
  recentList: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f2',
  },
  recentRowLast: {
    borderBottomWidth: 0,
  },
  recentThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#eef1ef',
  },
  recentInfo: {
    flex: 1,
    gap: 2,
  },
  recentTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  recentDistanceText: {
    fontSize: 10.5,
    color: '#8a9590',
    marginTop: 1,
  },
  recentAside: {
    alignItems: 'flex-end',
    gap: 6,
  },
  recentStatusText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8a9590',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,20,15,0.4)',
  },
  notifPanel: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    maxHeight: '70%',
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f2',
  },
  notifHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E22',
  },
  notifHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notifMarkAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  notifList: {
    paddingHorizontal: 12,
  },
  notifEmptyText: {
    textAlign: 'center',
    color: '#8a9590',
    fontSize: 13,
    paddingVertical: 28,
  },
  notifRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f6f7f6',
  },
  notifRowUnread: {
    backgroundColor: '#f3faf6',
    borderRadius: 12,
  },
  notifDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1B6B3A',
    marginTop: 6,
  },
  notifRowBody: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A2E22',
  },
  notifBody: {
    fontSize: 12,
    color: '#4a5750',
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10.5,
    color: '#9aa5a0',
    marginTop: 2,
  },
});
