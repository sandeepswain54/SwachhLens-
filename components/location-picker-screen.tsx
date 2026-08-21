import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { reverseGeocode } from '@/lib/geocoding';
import { buildLocationPickerHtml } from '@/lib/map-html';

// Default map center: Bhubaneswar, Odisha — used when no location is set yet.
const DEFAULT_CENTER = { latitude: 20.2961, longitude: 85.8245 };

export type PickedLocation = { latitude: number; longitude: number; address: string };

type Props = {
  title?: string;
  initialLocation: PickedLocation | null;
  onConfirm: (location: PickedLocation) => void;
};

export function LocationPickerScreen({ title = 'Set Location', initialLocation, onConfirm }: Props) {
  const webviewRef = useRef<WebView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initial = initialLocation ?? DEFAULT_CENTER;
  const html = useMemo(
    () => buildLocationPickerHtml(initial.latitude, initial.longitude),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialLocation ? { latitude: initialLocation.latitude, longitude: initialLocation.longitude } : null
  );
  const [address, setAddress] = useState<string | null>(initialLocation?.address ?? null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;

      setCoords({ latitude: data.latitude, longitude: data.longitude });
      setAddress(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setResolving(true);
        try {
          const resolved = await reverseGeocode(data.latitude, data.longitude);
          setAddress(resolved);
        } catch {
          setAddress(`${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`);
        } finally {
          setResolving(false);
        }
      }, 700);
    } catch {
      // Ignore malformed messages from the page.
    }
  }

  async function handleUseCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Location access needed', 'Allow location access to use your current position.');
      return;
    }
    setLocating(true);
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      webviewRef.current?.injectJavaScript(
        `window.setMarker(${position.coords.latitude}, ${position.coords.longitude}); true;`
      );
    } catch {
      Alert.alert('Could not get location', 'Please try again or set a location manually on the map.');
    } finally {
      setLocating(false);
    }
  }

  function handleConfirm() {
    if (!coords) return;
    onConfirm({
      latitude: coords.latitude,
      longitude: coords.longitude,
      address: address ?? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.mapWrapper}>
        <WebView
          ref={webviewRef}
          source={{ html }}
          style={styles.map}
          onMessage={handleMessage}
          javaScriptEnabled
        />
        <View pointerEvents="none" style={styles.mapHint}>
          <Text style={styles.mapHintText}>Tap or drag the pin to set the exact spot</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.currentLocationButton}
          onPress={handleUseCurrentLocation}
          disabled={locating}>
          {locating ? (
            <ActivityIndicator color="#1B6B3A" size="small" />
          ) : (
            <Ionicons name="locate-outline" size={18} color="#1B6B3A" />
          )}
          <Text style={styles.currentLocationText}>Use Current Location</Text>
        </Pressable>

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={16} color="#6b7770" />
          <Text style={styles.addressText} numberOfLines={2}>
            {resolving ? 'Resolving address...' : (address ?? 'Tap the map to drop a pin')}
          </Text>
        </View>

        <Pressable
          style={[styles.confirmButton, !coords && styles.confirmButtonDisabled]}
          disabled={!coords}
          onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
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
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapHint: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(26,46,34,0.85)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  mapHintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eceeec',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1B6B3A',
    borderRadius: 14,
    paddingVertical: 12,
  },
  currentLocationText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#1A2E22',
  },
  confirmButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
