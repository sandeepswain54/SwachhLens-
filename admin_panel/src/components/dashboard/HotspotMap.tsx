import L from 'leaflet';
import 'leaflet.markercluster';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

import { SEVERITY_COLOR } from '@/lib/palette';
import { STATUS_LABEL, type ReportRow, type SeverityLabel } from '@/lib/reports';

const DEFAULT_CENTER: [number, number] = [20.2961, 85.8245];

function severityWeight(label: SeverityLabel): number {
  if (label === 'Critical') return 3;
  if (label === 'High') return 2;
  if (label === 'Medium') return 1;
  return 0;
}

function colorForWeight(weight: number): string {
  if (weight === 3) return SEVERITY_COLOR.Critical;
  if (weight === 2) return SEVERITY_COLOR.High;
  if (weight === 1) return SEVERITY_COLOR.Medium;
  return SEVERITY_COLOR.Low;
}

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

// Marker.options doesn't declare a custom `severityWeight` field — this is
// the one place that shape gets stamped on and read back, so the cluster
// bubble can be colored by the worst severity it contains.
type WeightedMarker = L.Marker & { severityWeight?: number };

function ClusterLayer({ reports }: { reports: ReportRow[] }) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => {
        const markers = cluster.getAllChildMarkers() as WeightedMarker[];
        const worst = markers.reduce((max, m) => Math.max(max, m.severityWeight ?? 0), 0);
        const color = colorForWeight(worst);
        const count = cluster.getChildCount();
        const size = count < 10 ? 34 : count < 30 ? 42 : 50;
        return L.divIcon({
          className: '',
          html: `<div class="marker-cluster-swl" style="width:${size}px;height:${size}px;background:${color}">${count}</div>`,
          iconSize: [size, size],
        });
      },
    });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();

    reports.forEach((r) => {
      const weight = severityWeight(r.severity_label);
      const marker: WeightedMarker = L.marker([r.latitude, r.longitude], {
        icon: pinIcon(colorForWeight(weight)),
      });
      marker.severityWeight = weight;
      marker.bindPopup(
        `<div style="font-family:inherit"><b>${r.category}</b><br/>${r.severity_label} severity &middot; ${r.report_code}<br/>${STATUS_LABEL[r.status]} &middot; ${r.address}</div>`
      );
      group.addLayer(marker);
    });
  }, [reports]);

  return null;
}

export function HotspotMap({ reports }: { reports: ReportRow[] }) {
  const center: [number, number] =
    reports.length > 0 ? [reports[0].latitude, reports[0].longitude] : DEFAULT_CENTER;

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClusterLayer reports={reports} />
    </MapContainer>
  );
}
