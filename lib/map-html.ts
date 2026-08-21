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
