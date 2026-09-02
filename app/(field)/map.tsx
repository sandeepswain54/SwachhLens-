import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useLanguage } from '@/contexts/language-context';
import { type FieldTask, getMyTasks, subscribeToMyTasks } from '@/lib/field-tasks';
import { getMyTeam } from '@/lib/field-team';
import { priorityMeta } from '@/lib/field-ui';
import { fetchRoadRoute, formatDistance, formatEta, haversineMeters } from '@/lib/geo';
import { buildTasksMapHtml } from '@/lib/map-html';

const DEFAULT_CENTER = { latitude: 20.2961, longitude: 85.8245 };

type LatLng = { latitude: number; longitude: number };
type MarkerKind = 'urgent' | 'pending' | 'in_progress' | 'completed';
type TabValue = 'all' | 'in_progress' | 'completed' | 'pending';

function inProgressBucket(status: FieldTask['status']): boolean {
  return status === 'on_the_way' || status === 'in_progress' || status === 'pending_review';
}

// High-priority (Urgent) takes visual precedence over the plain status
// bucket, matching the map's legend (High Priority / Pending / In Progress
// / Completed) — a task can be both urgent and pending, but there's only
// one marker glyph to show, and knowing it's urgent matters more.
function kindFor(task: FieldTask): MarkerKind {
  if (task.status === 'completed') return 'completed';
  if (task.report.urgency_label === 'Urgent') return 'urgent';
  if (task.status === 'pending') return 'pending';
  return 'in_progress';
}

const LEGEND: { kind: MarkerKind; color: string; labelKey: 'fieldMap.legendHighPriority' | 'fieldMap.legendPending' | 'fieldMap.legendInProgress' | 'fieldMap.legendCompleted'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: 'urgent', color: '#c0392b', labelKey: 'fieldMap.legendHighPriority', icon: 'alert' },
  { kind: 'pending', color: '#d97706', labelKey: 'fieldMap.legendPending', icon: 'hourglass' },
  { kind: 'in_progress', color: '#2563eb', labelKey: 'fieldMap.legendInProgress', icon: 'time' },
  { kind: 'completed', color: '#1B6B3A', labelKey: 'fieldMap.legendCompleted', icon: 'checkmark' },
];

export default function FieldMapScreen() {
  const { t } = useLanguage();
  const [teamId, setTeamId] = useState<string | null | undefined>(undefined);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [mapHtml, setMapHtml] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>('all');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [etaByTask, setEtaByTask] = useState<{ taskId: string; label: string } | null>(null);
  const [navigating, setNavigating] = useState(false);

  const webviewRef = useRef<WebView>(null);
  const mapReadyRef = useRef(false);
  const pendingUserLocationRef = useRef<LatLng | null>(null);
  const lastRouteRef = useRef<{ taskId: string; coords: [number, number][] } | null>(null);

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

  useEffect(() => {
    if (!teamId) return;
    return subscribeToMyTasks(teamId, () => reloadTasks(teamId));
  }, [teamId, reloadTasks]);

  // Continuous GPS — this screen is meant to track the field worker moving
  // around, not just a one-shot fix like the "away" readouts elsewhere.
  useEffect(() => {
    let subscription: Awaited<ReturnType<typeof Location.watchPositionAsync>> | null = null;
    let cancelled = false;

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted || cancelled) return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 15 },
        (position) => {
          const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setMyLocation(coords);
          if (mapReadyRef.current) {
            webviewRef.current?.injectJavaScript(
              `window.setUserLocation(${coords.latitude}, ${coords.longitude}); true;`
            );
          } else {
            pendingUserLocationRef.current = coords;
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  // Build the WebView's HTML exactly once, from whichever center is known
  // first — later updates go through injectJavaScript instead, so the map
  // never resets the user's own pan/zoom. Set during render (React's
  // documented pattern for "adjust state once a condition becomes true")
  // rather than in an effect, since there's no external system to wait on
  // here — myLocation/tasks/loading are already plain render-time values.
  if (!mapHtml) {
    const initialCenter = myLocation
      ? myLocation
      : tasks.length > 0
        ? { latitude: tasks[0].report.latitude, longitude: tasks[0].report.longitude }
        : !loading
          ? DEFAULT_CENTER
          : null;
    if (initialCenter) {
      setMapHtml(buildTasksMapHtml(initialCenter));
    }
  }

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (tab === 'in_progress') list = list.filter((t) => inProgressBucket(t.status));
    else if (tab === 'completed') list = list.filter((t) => t.status === 'completed');
    else if (tab === 'pending') list = list.filter((t) => t.status === 'pending');
    if (urgentOnly) list = list.filter((t) => t.report.urgency_label === 'Urgent');
    return list;
  }, [tasks, tab, urgentOnly]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      in_progress: tasks.filter((t) => inProgressBucket(t.status)).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      pending: tasks.filter((t) => t.status === 'pending').length,
    }),
    [tasks]
  );

  // Realtime marker sync — every add/remove/status-change flows through
  // here the moment `tasks` (or the tab/priority filter) changes.
  useEffect(() => {
    if (!mapReadyRef.current) return;
    const markers = filteredTasks.map((t) => ({
      id: t.id,
      latitude: t.report.latitude,
      longitude: t.report.longitude,
      kind: kindFor(t),
    }));
    webviewRef.current?.injectJavaScript(`window.setMarkers(${JSON.stringify(JSON.stringify(markers))}); true;`);
  }, [filteredTasks]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId && t.status !== 'completed') ?? null,
    [tasks, selectedTaskId]
  );

  // Pick a sensible default: the nearest not-yet-done task, once we know
  // where the field worker actually is. Only runs until something gets
  // selected (by this or a marker tap) — never overrides a manual choice.
  // Set during render, same reasoning as the mapHtml latch above.
  if (!selectedTaskId && myLocation) {
    const active = tasks.filter((t) => t.status !== 'completed');
    if (active.length > 0) {
      const nearest = [...active].sort(
        (a, b) =>
          haversineMeters(myLocation.latitude, myLocation.longitude, a.report.latitude, a.report.longitude) -
          haversineMeters(myLocation.latitude, myLocation.longitude, b.report.latitude, b.report.longitude)
      )[0];
      setSelectedTaskId(nearest.id);
    }
  }

  // Fetching in the background (not on Navigate) keeps the ETA readout live
  // the moment a task is selected — Navigate itself only decides whether the
  // route line actually gets drawn on the map. The "no eta yet" case is
  // handled by the `eta` derivation below rather than reset here, since
  // that's plain render-time derivation, not something to synchronize via
  // an effect.
  useEffect(() => {
    if (!selectedTask || !myLocation) return;
    if (lastRouteRef.current?.taskId === selectedTask.id) return;
    let cancelled = false;
    fetchRoadRoute(myLocation, { latitude: selectedTask.report.latitude, longitude: selectedTask.report.longitude }).then(
      (route) => {
        if (cancelled || !route) return;
        lastRouteRef.current = { taskId: selectedTask.id, coords: route.coordinates };
        setEtaByTask({ taskId: selectedTask.id, label: formatEta(route.durationSeconds) });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [selectedTask, myLocation]);

  const eta = etaByTask && selectedTask && etaByTask.taskId === selectedTask.id ? etaByTask.label : null;

  function handleMapLoaded() {
    mapReadyRef.current = true;
    const markers = filteredTasks.map((t) => ({
      id: t.id,
      latitude: t.report.latitude,
      longitude: t.report.longitude,
      kind: kindFor(t),
    }));
    webviewRef.current?.injectJavaScript(`window.setMarkers(${JSON.stringify(JSON.stringify(markers))}); true;`);
    if (pendingUserLocationRef.current) {
      const { latitude, longitude } = pendingUserLocationRef.current;
      webviewRef.current?.injectJavaScript(`window.setUserLocation(${latitude}, ${longitude}); true;`);
    }
  }

  function handleWebViewMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type: string; id: string };
      if (message.type !== 'marker') return;
      const task = tasks.find((t) => t.id === message.id);
      if (!task || task.status === 'completed') return; // completed tasks have nothing to review here
      webviewRef.current?.injectJavaScript('window.clearRoute(); true;');
      setSelectedTaskId(task.id);
    } catch {
      // ignore malformed messages
    }
  }

  async function handleNavigate() {
    if (!selectedTask || !myLocation) return;
    setNavigating(true);
    try {
      let coords = lastRouteRef.current?.taskId === selectedTask.id ? lastRouteRef.current.coords : null;
      if (!coords) {
        const route = await fetchRoadRoute(myLocation, {
          latitude: selectedTask.report.latitude,
          longitude: selectedTask.report.longitude,
        });
        if (!route) {
          Alert.alert(t('fieldMap.couldNotGetRoute'), t('fieldMap.routingUnavailable'));
          return;
        }
        lastRouteRef.current = { taskId: selectedTask.id, coords: route.coordinates };
        setEtaByTask({ taskId: selectedTask.id, label: formatEta(route.durationSeconds) });
        coords = route.coordinates;
      }
      webviewRef.current?.injectJavaScript(`window.setRoute(${JSON.stringify(JSON.stringify(coords))}); true;`);
    } finally {
      setNavigating(false);
    }
  }

  function handleFocusMe() {
    if (!myLocation) return;
    webviewRef.current?.injectJavaScript(`window.focusUser(${myLocation.latitude}, ${myLocation.longitude}); true;`);
  }

  function handleFitAll() {
    webviewRef.current?.injectJavaScript('window.fitAllMarkers(); true;');
  }

  function handleFilterPress() {
    Alert.alert(t('common.filterByPriority'), undefined, [
      { text: t('common.allPriorities'), onPress: () => setUrgentOnly(false) },
      { text: t('common.highPriorityOnly'), onPress: () => setUrgentOnly(true) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function distanceFor(task: FieldTask): string | null {
    if (!myLocation) return null;
    return formatDistance(
      haversineMeters(myLocation.latitude, myLocation.longitude, task.report.latitude, task.report.longitude)
    );
  }

  const TABS: { label: string; value: TabValue; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: `${t('fieldMap.allTasks')} (${counts.all})`, value: 'all', icon: 'location' },
    { label: `${t('fieldTasks.tabInProgress')} (${counts.in_progress})`, value: 'in_progress', icon: 'time' },
    { label: `${t('fieldTasks.tabCompleted')} (${counts.completed})`, value: 'completed', icon: 'checkmark-circle' },
    { label: `${t('fieldHome.pending')} (${counts.pending})`, value: 'pending', icon: 'hourglass' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('fieldMap.headerTitle')}</Text>
        <Pressable style={styles.listViewButton} onPress={() => router.push('/(field)/tasks')}>
          <Ionicons name="list" size={15} color="#1B6B3A" />
          <Text style={styles.listViewText}>{t('fieldMap.listView')}</Text>
        </Pressable>
      </View>

      <View style={styles.tabScroller}>
        {TABS.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTab(t.value)}
            style={[styles.tab, tab === t.value && styles.tabActive]}>
            <Ionicons name={t.icon} size={13} color={tab === t.value ? '#1B6B3A' : '#8a9590'} />
            <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.mapWrap}>
        {mapHtml ? (
          <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            javaScriptEnabled
            source={{ html: mapHtml }}
            onLoadEnd={handleMapLoaded}
            onMessage={handleWebViewMessage}
            style={styles.map}
          />
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator color="#1B6B3A" size="large" />
          </View>
        )}

        <View style={styles.mapButtons}>
          <Pressable style={styles.mapButton} onPress={handleFocusMe}>
            <Ionicons name="locate" size={18} color="#1A2E22" />
            <Text style={styles.mapButtonLabel}>{t('fieldMap.myLocation')}</Text>
          </Pressable>
          <Pressable style={styles.mapButton} onPress={handleFilterPress}>
            <Ionicons name="filter" size={18} color={urgentOnly ? '#c0392b' : '#1A2E22'} />
            <Text style={styles.mapButtonLabel}>{t('fieldMap.filter')}</Text>
          </Pressable>
          <Pressable style={styles.mapButton} onPress={handleFitAll}>
            <Ionicons name="navigate" size={18} color="#1A2E22" />
            <Text style={styles.mapButtonLabel}>{t('fieldMap.recenter')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sheet}>
        {selectedTask && (
          <View style={styles.card}>
            <Image source={{ uri: selectedTask.report.media_url }} style={styles.cardThumb} contentFit="cover" />
            <View style={styles.cardInfo}>
              <View style={styles.cardTopRow}>
                <Text style={styles.taskCode}>#{selectedTask.assignment_code}</Text>
                <View
                  style={[styles.priorityBadge, { backgroundColor: priorityMeta(selectedTask.report.urgency_label).bg }]}>
                  <Text style={[styles.priorityBadgeText, { color: priorityMeta(selectedTask.report.urgency_label).text }]}>
                    {t('fieldHome.priority', { label: t(`severityLevel.${priorityMeta(selectedTask.report.urgency_label).label}`) })}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{t(`wasteCategory.${selectedTask.report.category}`)}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location" size={12} color="#1B6B3A" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {selectedTask.report.address}
                </Text>
              </View>
              {distanceFor(selectedTask) && <Text style={styles.distanceText}>{distanceFor(selectedTask)}</Text>}
            </View>
            <View style={styles.cardActions}>
              <Pressable style={styles.navigateButton} disabled={navigating || !myLocation} onPress={handleNavigate}>
                {navigating ? (
                  <ActivityIndicator color="#1B6B3A" size="small" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={13} color="#1B6B3A" />
                    <Text style={styles.navigateButtonText}>{t('fieldMap.navigate')}</Text>
                  </>
                )}
              </Pressable>
              {eta && <Text style={styles.etaText}>{t('fieldMap.eta', { eta })}</Text>}
            </View>
          </View>
        )}

        <View style={styles.legendRow}>
          {LEGEND.map((item) => (
            <View key={item.kind} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={9} color="#ffffff" />
              </View>
              <Text style={styles.legendLabel}>{t(item.labelKey)}</Text>
            </View>
          ))}
        </View>
      </View>
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E22',
  },
  listViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#1B6B3A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  listViewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  tabScroller: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#f1f3f2',
  },
  tabActive: {
    backgroundColor: '#e3f3ea',
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8a9590',
  },
  tabTextActive: {
    color: '#1B6B3A',
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
    backgroundColor: '#eaf3ef',
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf3ef',
  },
  mapButtons: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 8,
  },
  mapButton: {
    width: 62,
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mapButtonLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4a5750',
  },
  sheet: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f2',
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
  },
  cardThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#eef1ef',
  },
  cardInfo: {
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
  priorityBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  priorityBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 1,
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
    fontSize: 11,
    color: '#8a9590',
    marginTop: 2,
  },
  cardActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#1B6B3A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 92,
    justifyContent: 'center',
  },
  navigateButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  etaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1B6B3A',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    fontSize: 10,
    color: '#4a5750',
    fontWeight: '600',
  },
});
