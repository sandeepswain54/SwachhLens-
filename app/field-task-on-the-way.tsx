import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { arriveAtTask, getTaskById, type FieldTask } from '@/lib/field-tasks';
import { fetchRoadRoute, formatEta, haversineMeters } from '@/lib/geo';
import { buildLiveTrackingMapHtml } from '@/lib/map-html';

// Only refetch the road route (and thus the ETA) once the device has moved
// this far from where the last route was fetched from — the truck marker
// itself still updates on every GPS tick, this just throttles calls to the
// public OSRM router.
const ROUTE_REFRESH_METERS = 150;

type LatLng = { latitude: number; longitude: number };

export default function FieldTaskOnTheWayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<FieldTask | null | undefined>(undefined);
  const [eta, setEta] = useState<string | null>(null);
  const [arriving, setArriving] = useState(false);
  const webviewRef = useRef<WebView>(null);
  const mapReadyRef = useRef(false);
  const lastRouteFetchRef = useRef<LatLng | null>(null);
  const pendingPositionRef = useRef<LatLng | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getTaskById(id).then((result) => {
        if (!cancelled) setTask(result);
      });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  useEffect(() => {
    if (!task) return;
    let subscription: Awaited<ReturnType<typeof Location.watchPositionAsync>> | null = null;
    let cancelled = false;
    const destination = { latitude: task.report.latitude, longitude: task.report.longitude };

    function pushPosition(coords: LatLng) {
      if (!mapReadyRef.current) {
        pendingPositionRef.current = coords;
        return;
      }
      webviewRef.current?.injectJavaScript(
        `window.updateTruckPosition(${coords.latitude}, ${coords.longitude}); true;`
      );
    }

    async function maybeRefreshRoute(coords: LatLng) {
      const last = lastRouteFetchRef.current;
      if (
        last &&
        haversineMeters(last.latitude, last.longitude, coords.latitude, coords.longitude) < ROUTE_REFRESH_METERS
      ) {
        return;
      }
      lastRouteFetchRef.current = coords;
      const route = await fetchRoadRoute(coords, destination);
      if (cancelled || !route) return;
      setEta(formatEta(route.durationSeconds));
      if (mapReadyRef.current) {
        const coordsJson = JSON.stringify(route.coordinates);
        webviewRef.current?.injectJavaScript(`window.setRoute(${JSON.stringify(coordsJson)}); true;`);
      }
    }

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted || cancelled) return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 15 },
        (position) => {
          const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          pushPosition(coords);
          void maybeRefreshRoute(coords);
        }
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [task]);

  function handleMapLoaded() {
    mapReadyRef.current = true;
    if (pendingPositionRef.current) {
      const { latitude, longitude } = pendingPositionRef.current;
      webviewRef.current?.injectJavaScript(`window.updateTruckPosition(${latitude}, ${longitude}); true;`);
    }
  }

  async function handleArrived() {
    if (!task) return;
    setArriving(true);
    try {
      await arriveAtTask(task.id);
      router.replace({ pathname: '/field-task-progress', params: { id: task.id } });
    } catch (err) {
      Alert.alert('Could not update task', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setArriving(false);
    }
  }

  if (task === undefined) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <ActivityIndicator color="#1B6B3A" />
      </SafeAreaView>
    );
  }
  if (task === null) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Text style={styles.notFoundText}>Could not find this task.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>On the Way</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.mapWrap}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          javaScriptEnabled
          source={{
            html: buildLiveTrackingMapHtml({
              latitude: task.report.latitude,
              longitude: task.report.longitude,
            }),
          }}
          onLoadEnd={handleMapLoaded}
          style={styles.map}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.taskCode}>#{task.assignment_code}</Text>
            <Text style={styles.taskTitle}>{task.report.category}</Text>
            <Text style={styles.taskAddress} numberOfLines={1}>
              {task.report.address}
            </Text>
          </View>
          <Image source={{ uri: task.report.media_url }} style={styles.thumb} contentFit="cover" />
        </View>

        <View style={styles.etaRow}>
          <Text style={styles.etaLabel}>ETA</Text>
          <Text style={styles.etaValue}>{eta ?? 'Calculating…'}</Text>
        </View>

        <Pressable style={styles.arrivedButton} disabled={arriving} onPress={handleArrived}>
          {arriving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.arrivedButtonText}>I Have Reached</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centered: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  notFoundText: {
    fontSize: 14,
    color: '#6b7770',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2E22',
  },
  mapWrap: {
    flex: 1,
    backgroundColor: '#eaf3ef',
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  card: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f2',
    gap: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  taskCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A2E22',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E22',
    marginTop: 2,
  },
  taskAddress: {
    fontSize: 12.5,
    color: '#6b7770',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#eef1ef',
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f2',
    paddingTop: 12,
  },
  etaLabel: {
    fontSize: 13,
    color: '#6b7770',
    fontWeight: '600',
  },
  etaValue: {
    fontSize: 16,
    color: '#1A2E22',
    fontWeight: '800',
  },
  arrivedButton: {
    backgroundColor: '#1B6B3A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  arrivedButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
