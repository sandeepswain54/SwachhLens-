import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { getCommunityReportPins, subscribeToNewReportPins, type ReportPin } from '@/lib/reports';

const DEFAULT_CENTER = { latitude: 20.2961, longitude: 85.8245 };

function severityBucket(label: string): 'high' | 'medium' | 'low' {
  if (label === 'Critical' || label === 'High') return 'high';
  if (label === 'Medium') return 'medium';
  return 'low';
}

function buildHotspotMapHtml(pins: ReportPin[], center: { latitude: number; longitude: number }) {
  const pinsJson = JSON.stringify(pins).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .pin-marker { display: flex; align-items: center; justify-content: center; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35); }
    .pin-marker span { transform: rotate(45deg); font-size: 14px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    function post(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
      }
    }
    // Catches anything that slips past the try/catch blocks below so a
    // single bad row can never silently kill every marker on the map.
    window.onerror = function (message) {
      post('error', String(message));
      return false;
    };

    var map = L.map('map', { zoomControl: false }).setView([${center.latitude}, ${center.longitude}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var markerLayer = L.layerGroup().addTo(map);
    var markers = {};

    function colorFor(severity) {
      if (severity === 'Critical' || severity === 'High') return '#c0392b';
      if (severity === 'Medium') return '#d97706';
      return '#1B6B3A';
    }

    function makeIcon(color) {
      return L.divIcon({
        className: '',
        html: '<div class="pin-marker" style="background:' + color + ';width:30px;height:30px;"><span>\u{1F5D1}\u{FE0F}</span></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
    }

    function addPin(pin) {
      try {
        if (!pin || markers[pin.id]) return;
        var lat = Number(pin.latitude);
        var lng = Number(pin.longitude);
        if (!isFinite(lat) || !isFinite(lng)) {
          post('error', 'Skipped pin ' + pin.id + ' — invalid coordinates (' + pin.latitude + ', ' + pin.longitude + ')');
          return;
        }
        var marker = L.marker([lat, lng], { icon: makeIcon(colorFor(pin.severity_label)) });
        marker.bindPopup('<b>' + pin.category + '</b><br/>' + pin.severity_label + ' severity &middot; ' + pin.report_code);
        marker.addTo(markerLayer);
        markers[pin.id] = marker;
      } catch (err) {
        post('error', 'addPin failed: ' + (err && err.message ? err.message : err));
      }
    }

    window.addPin = function (json) {
      try {
        // Accept either a JSON string (the normal injectJavaScript bridge
        // call) or an already-parsed object, so a stray call shape never
        // throws an uncaught SyntaxError that JSON.parse(object) would
        // otherwise produce.
        var pin = typeof json === 'string' ? JSON.parse(json) : json;
        addPin(pin);
      } catch (err) {
        post('error', 'window.addPin failed: ' + (err && err.message ? err.message : err));
      }
    };

    window.fitAll = function () {
      var layers = markerLayer.getLayers();
      if (layers.length === 0) return;
      if (layers.length === 1) {
        map.setView(layers[0].getLatLng(), 15);
        return;
      }
      map.fitBounds(L.featureGroup(layers).getBounds().pad(0.2));
    };

    // Fit the map to every hotspot right away, instead of leaving it
    // centered/zoomed on just the most recent report — otherwise reports
    // elsewhere in the city stay off-screen until the user manually taps
    // "View All on Map".
    var initialPins = ${pinsJson};
    initialPins.forEach(addPin);
    post('pinsAdded', markerLayer.getLayers().length);
    if (initialPins.length > 0) {
      window.fitAll();
    }
  </script>
</body>
</html>`;
}

export default function WasteHotspotsScreen() {
  const webviewRef = useRef<WebView>(null);
  const [pins, setPins] = useState<ReportPin[] | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapScriptError, setMapScriptError] = useState<string | null>(null);
  const [pinsRenderedCount, setPinsRenderedCount] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const mapReadyRef = useRef(false);
  const pendingPinsRef = useRef<ReportPin[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Build the map's HTML exactly once, from whichever pins load first —
    // later pins arrive via the realtime addPin() bridge below instead, so
    // the map never resets its pan/zoom.
    function initializeMap(result: ReportPin[]) {
      if (cancelled) return;
      setPins(result);
      const center =
        result.length > 0
          ? { latitude: result[0].latitude, longitude: result[0].longitude }
          : DEFAULT_CENTER;
      setHtml(buildHotspotMapHtml(result, center));
    }

    setHtml(null);
    setLoadError(null);
    setMapScriptError(null);
    setPinsRenderedCount(null);

    getCommunityReportPins()
      .then((result) => {
        if (cancelled) return;
        setLoadError(null);
        initializeMap(result);
      })
      .catch((err) => {
        if (cancelled) return;
        // Reports fail to load here if the "Authenticated users can view
        // all reports" RLS policy (001_admin_dashboard.sql) isn't applied
        // on this Supabase project — surface that instead of silently
        // showing an empty map with no explanation.
        setLoadError(err instanceof Error ? err.message : 'Could not load hotspots.');
        initializeMap([]);
      });

    const unsubscribe = subscribeToNewReportPins((pin) => {
      setPins((prev) => (prev ? [pin, ...prev] : [pin]));
      if (mapReadyRef.current) {
        webviewRef.current?.injectJavaScript(`window.addPin(${JSON.stringify(JSON.stringify(pin))}); true;`);
      } else {
        pendingPinsRef.current.push(pin);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [reloadKey]);

  const counts = useMemo(() => {
    const result = { high: 0, medium: 0, low: 0 };
    (pins ?? []).forEach((pin) => {
      result[severityBucket(pin.severity_label)] += 1;
    });
    return result;
  }, [pins]);

  function handleMapLoaded() {
    mapReadyRef.current = true;
    if (pendingPinsRef.current.length > 0) {
      pendingPinsRef.current.forEach((pin) => {
        webviewRef.current?.injectJavaScript(`window.addPin(${JSON.stringify(JSON.stringify(pin))}); true;`);
      });
      pendingPinsRef.current = [];
    }
  }

  // The map's own script reports how many markers it actually managed to
  // place (and any per-marker failure) via postMessage — this is what
  // catches e.g. a report with bad/missing coordinates that would
  // otherwise silently render zero markers with no error anywhere.
  function handleWebViewMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type: string; payload: unknown };
      if (message.type === 'error') {
        console.warn('[waste-hotspots map]', message.payload);
        setMapScriptError(String(message.payload));
      } else if (message.type === 'pinsAdded') {
        setPinsRenderedCount(Number(message.payload) || 0);
      }
    } catch {
      // Ignore malformed bridge messages.
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A2E22" />
        </Pressable>
        <Text style={styles.headerTitle}>Waste Hotspots</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.mapWrapper}>
        {html ? (
          <WebView
            ref={webviewRef}
            source={{ html }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
            onLoadEnd={handleMapLoaded}
            onMessage={handleWebViewMessage}
          />
        ) : (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#1B6B3A" size="large" />
          </View>
        )}

        {html && pins?.length === 0 && (
          <View style={styles.overlayCard} pointerEvents="box-none">
            <View style={styles.overlayInner}>
              <Ionicons
                name={loadError ? 'alert-circle-outline' : 'location-outline'}
                size={20}
                color={loadError ? '#c0392b' : '#6b7770'}
              />
              <Text style={styles.overlayText}>
                {loadError
                  ? `Couldn't load hotspots: ${loadError}`
                  : 'No waste hotspots reported yet. Be the first to report one!'}
              </Text>
              {loadError && (
                <Pressable onPress={() => setReloadKey((k) => k + 1)}>
                  <Text style={styles.overlayRetry}>Retry</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {html && pins && pins.length > 0 && pinsRenderedCount === 0 && (
          <View style={styles.overlayCard} pointerEvents="box-none">
            <View style={styles.overlayInner}>
              <Ionicons name="alert-circle-outline" size={20} color="#c0392b" />
              <Text style={styles.overlayText}>
                {mapScriptError
                  ? `Markers failed to draw: ${mapScriptError}`
                  : `Found ${pins.length} report${pins.length === 1 ? '' : 's'} but couldn't place any markers.`}
              </Text>
              <Pressable onPress={() => setReloadKey((k) => k + 1)}>
                <Text style={styles.overlayRetry}>Retry</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#c0392b' }]} />
          <Text style={styles.legendLabel}>High</Text>
          <Text style={styles.legendCount}>{counts.high}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#d97706' }]} />
          <Text style={styles.legendLabel}>Medium</Text>
          <Text style={styles.legendCount}>{counts.medium}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#1B6B3A' }]} />
          <Text style={styles.legendLabel}>Low</Text>
          <Text style={styles.legendCount}>{counts.low}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.viewAllButton}
          onPress={() => webviewRef.current?.injectJavaScript('window.fitAll(); true;')}>
          <Text style={styles.viewAllButtonText}>View All on Map</Text>
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
  overlayCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  overlayInner: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  overlayText: {
    fontSize: 12.5,
    color: '#4a5750',
    textAlign: 'center',
  },
  overlayRetry: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1B6B3A',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#eceeec',
  },
  legendItem: {
    alignItems: 'center',
    gap: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 2,
  },
  legendLabel: {
    fontSize: 11,
    color: '#6b7770',
  },
  legendCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2E22',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  viewAllButton: {
    backgroundColor: '#1B6B3A',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
