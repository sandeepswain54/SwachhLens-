import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

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
        html: '<div class="pin-marker" style="background:' + color + ';width:30px;height:30px;"><span>\u{1F343}</span></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
    }

    function addPin(pin) {
      if (markers[pin.id]) return;
      var marker = L.marker([pin.latitude, pin.longitude], { icon: makeIcon(colorFor(pin.severity_label)) });
      marker.bindPopup('<b>' + pin.category + '</b><br/>' + pin.severity_label + ' severity &middot; ' + pin.report_code);
      marker.addTo(markerLayer);
      markers[pin.id] = marker;
    }

    window.addPin = function (json) {
      addPin(JSON.parse(json));
    };

    window.fitAll = function () {
      var layers = markerLayer.getLayers();
      if (layers.length === 0) return;
      map.fitBounds(L.featureGroup(layers).getBounds().pad(0.2));
    };

    (${pinsJson}).forEach(addPin);
  </script>
</body>
</html>`;
}

export default function WasteHotspotsScreen() {
  const webviewRef = useRef<WebView>(null);
  const [pins, setPins] = useState<ReportPin[] | null>(null);
  const [html, setHtml] = useState<string | null>(null);
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

    getCommunityReportPins()
      .then(initializeMap)
      .catch(() => initializeMap([]));

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
  }, []);

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
            onLoadEnd={handleMapLoaded}
          />
        ) : (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#1B6B3A" size="large" />
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
