// Shared Leaflet + OpenStreetMap HTML for the tap/drag-to-pin location
// picker used by both the report flow and the profile screen.
export function buildLocationPickerHtml(latitude: number, longitude: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${latitude}, ${longitude}], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    var marker = L.marker([${latitude}, ${longitude}], { draggable: true }).addTo(map);

    function notify(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
    }

    marker.on('dragend', function () {
      var pos = marker.getLatLng();
      notify(pos.lat, pos.lng);
    });

    map.on('click', function (e) {
      marker.setLatLng(e.latlng);
      notify(e.latlng.lat, e.latlng.lng);
    });

    window.setMarker = function (lat, lng) {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], 16);
      notify(lat, lng);
    };
  </script>
</body>
</html>`;
}

// Live "on the way" tracking map: a red marker fixed at the report's
// location, a truck marker for the field team's live GPS position (pushed in
// via window.updateTruckPosition as expo-location reports move), and an
// optional road-snapped route line (window.setRoute) between them. No API
// key — same free Leaflet + OpenStreetMap tiles as every other map screen in
// this app; the route itself is fetched RN-side from the public OSRM demo
// router and passed in as plain coordinates, this file has no routing logic
// of its own.
export function buildLiveTrackingMapHtml(destination: { latitude: number; longitude: number }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #eaf3ef; }
    .truck-marker { display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .dest-marker { display: flex; align-items: center; justify-content: center; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #c0392b; width: 26px; height: 26px; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35); }
    .dest-marker span { transform: rotate(45deg); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var dest = [${destination.latitude}, ${destination.longitude}];
    var map = L.map('map', { zoomControl: false }).setView(dest, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var destIcon = L.divIcon({
      className: '',
      html: '<div class="dest-marker"><span>\u{1F6A9}</span></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });
    L.marker(dest, { icon: destIcon }).addTo(map);

    var truckIcon = L.divIcon({ className: '', html: '<div class="truck-marker">\u{1F69A}</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
    var truckMarker = null;
    var routeLine = null;

    window.updateTruckPosition = function (lat, lng) {
      if (truckMarker) {
        truckMarker.setLatLng([lat, lng]);
      } else {
        truckMarker = L.marker([lat, lng], { icon: truckIcon }).addTo(map);
        map.fitBounds(L.latLngBounds([dest, [lat, lng]]).pad(0.3));
      }
    };

    // coords: array of [lat, lng] pairs describing the road-snapped route.
    window.setRoute = function (coordsJson) {
      var coords = JSON.parse(coordsJson);
      if (routeLine) map.removeLayer(routeLine);
      if (coords.length === 0) return;
      routeLine = L.polyline(coords, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(routeLine.getBounds().pad(0.25));
    };
  </script>
</body>
</html>`;
}

// The field app's Map tab: one marker per assigned task (colored/glyphed by
// urgency+status — see MARKER_ICONS below), a pulsing "my location" dot fed
// by expo-location's live watch, and an on-demand road-snapped route line
// (only drawn once the user taps Navigate, not automatically) — same free
// Leaflet + OSM + OSRM stack as the other map screens, no API key. RN owns
// all task/location data; this file only renders whatever it's pushed.
export function buildTasksMapHtml(center: { latitude: number; longitude: number }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .task-marker { display: flex; align-items: center; justify-content: center; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35); }
    .task-marker span { transform: rotate(45deg); font-size: 15px; }
    .user-dot { width: 18px; height: 18px; border-radius: 9px; background: #2563eb; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35); position: relative; }
    .user-dot::after { content: ''; position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 20px; background: rgba(37,99,235,0.25); animation: pulse 2s ease-out infinite; }
    @keyframes pulse { 0% { transform: scale(0.4); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
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

    var taskLayer = L.layerGroup().addTo(map);
    var taskMarkers = {};
    var userMarker = null;
    var routeLine = null;

    var MARKER_META = {
      urgent: { bg: '#c0392b', glyph: '!' },
      pending: { bg: '#d97706', glyph: '⏳' },
      in_progress: { bg: '#2563eb', glyph: '⏱' },
      completed: { bg: '#1B6B3A', glyph: '✓' },
    };

    function makeTaskIcon(kind) {
      var meta = MARKER_META[kind] || MARKER_META.pending;
      return L.divIcon({
        className: '',
        html: '<div class="task-marker" style="background:' + meta.bg + ';width:32px;height:32px;"><span>' + meta.glyph + '</span></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
    }

    // tasks: array of { id, latitude, longitude, kind }.
    window.setMarkers = function (tasksJson) {
      var tasks = JSON.parse(tasksJson);
      var seen = {};
      tasks.forEach(function (t) {
        seen[t.id] = true;
        if (taskMarkers[t.id]) {
          taskMarkers[t.id].setLatLng([t.latitude, t.longitude]);
          taskMarkers[t.id].setIcon(makeTaskIcon(t.kind));
        } else {
          var marker = L.marker([t.latitude, t.longitude], { icon: makeTaskIcon(t.kind) });
          marker.on('click', function () {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: t.id }));
          });
          marker.addTo(taskLayer);
          taskMarkers[t.id] = marker;
        }
      });
      Object.keys(taskMarkers).forEach(function (id) {
        if (!seen[id]) {
          taskLayer.removeLayer(taskMarkers[id]);
          delete taskMarkers[id];
        }
      });
    };

    window.setUserLocation = function (lat, lng) {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        var icon = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
        userMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 }).addTo(map);
      }
    };

    window.focusUser = function (lat, lng) {
      map.setView([lat, lng], 15);
    };

    window.fitAllMarkers = function () {
      var layers = taskLayer.getLayers().slice();
      if (userMarker) layers.push(userMarker);
      if (layers.length === 0) return;
      map.fitBounds(L.featureGroup(layers).getBounds().pad(0.25));
    };

    // coords: array of [lat, lng] pairs describing the road-snapped route.
    window.setRoute = function (coordsJson) {
      var coords = JSON.parse(coordsJson);
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
      if (coords.length === 0) return;
      routeLine = L.polyline(coords, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(routeLine.getBounds().pad(0.2));
    };

    window.clearRoute = function () {
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
    };
  </script>
</body>
</html>`;
}
