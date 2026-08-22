import L from 'leaflet';
import 'leaflet.heat';
import { Maximize2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import { SEVERITY_COLOR } from '@/lib/palette';
import { INTENSITY_ORDER, INTENSITY_SCORE_RANGE, type HotspotCluster } from '@/lib/hotspots';
import type { ReportRow, SeverityLabel } from '@/lib/reports';

const DEFAULT_CENTER: [number, number] = [20.2961, 85.8245];

const HEAT_WEIGHT: Record<SeverityLabel, number> = { Critical: 1, High: 0.75, Medium: 0.5, Low: 0.25 };

function bubbleRadius(totalComplaints: number): number {
  if (totalComplaints >= 20) return 26;
  if (totalComplaints >= 12) return 22;
  if (totalComplaints >= 6) return 18;
  return 14;
}

function clusterIcon(cluster: HotspotCluster) {
  const r = bubbleRadius(cluster.totalComplaints);
  const size = r * 2;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${SEVERITY_COLOR[cluster.intensity]};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${size > 40 ? 13 : 11}px;border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3)">${cluster.totalComplaints}</div>`,
    iconSize: [size, size],
  });
}

// Realtime because it's fed `reports` straight from ReportsContext — a new
// INSERT flows through the same subscription that already powers the
// Dashboard/Complaints pages, so a fresh complaint lights this up without a
// page refresh.
function HeatLayer({ points }: { points: Array<[number, number, number]> }) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    const layer = L.heatLayer(points, {
      radius: 32,
      blur: 24,
      maxZoom: 17,
      minOpacity: 0.35,
      gradient: { 0.2: '#0ca30c', 0.45: '#fab219', 0.7: '#ec835a', 1: '#d03b3b' },
    });
    layerRef.current = layer;
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    layerRef.current?.setLatLngs(points);
  }, [points]);

  return null;
}

function FlyToHandler({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.75 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
}

export function HotspotsMap({
  clusters,
  reports,
  view,
  onViewChange,
  focusTarget,
  onSelectCluster,
  onExpandFullScreen,
}: {
  clusters: HotspotCluster[];
  reports: ReportRow[];
  view: 'map' | 'heatmap';
  onViewChange: (view: 'map' | 'heatmap') => void;
  focusTarget: [number, number] | null;
  onSelectCluster?: (cluster: HotspotCluster) => void;
  onExpandFullScreen?: () => void;
}) {
  const center: [number, number] = clusters.length > 0 ? [clusters[0].lat, clusters[0].lng] : DEFAULT_CENTER;

  const heatPoints = useMemo<Array<[number, number, number]>>(
    () => reports.map((r) => [r.latitude, r.longitude, HEAT_WEIGHT[r.severity_label]]),
    [reports]
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <div className="absolute right-2 top-2 z-[1000] flex overflow-hidden rounded-lg border border-slate-200 bg-white text-[12px] shadow-sm dark:border-white/10 dark:bg-[#111814]">
        <button
          type="button"
          onClick={() => onViewChange('map')}
          className={`px-3 py-1.5 font-medium transition-colors ${
            view === 'map' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
          }`}>
          Map
        </button>
        <button
          type="button"
          onClick={() => onViewChange('heatmap')}
          className={`px-3 py-1.5 font-medium transition-colors ${
            view === 'heatmap' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
          }`}>
          Heatmap
        </button>
      </div>

      <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {view === 'heatmap' ? (
          <HeatLayer points={heatPoints} />
        ) : (
          <>
            {clusters.map((c) => (
              <CircleMarker
                key={`${c.cellKey}-halo`}
                center={[c.lat, c.lng]}
                radius={bubbleRadius(c.totalComplaints) * 1.8}
                pathOptions={{ color: SEVERITY_COLOR[c.intensity], fillColor: SEVERITY_COLOR[c.intensity], fillOpacity: 0.16, weight: 0 }}
              />
            ))}
            {clusters.map((c) => (
              <Marker
                key={c.cellKey}
                position={[c.lat, c.lng]}
                icon={clusterIcon(c)}
                eventHandlers={{ click: () => onSelectCluster?.(c) }}>
                <Popup>
                  <div style={{ fontFamily: 'inherit' }}>
                    <b>{c.locality}</b>
                    <br />
                    {c.intensity} intensity &middot; {c.totalComplaints} complaint{c.totalComplaints === 1 ? '' : 's'}
                    <br />
                    {c.category} &middot; {c.address}
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        <FlyToHandler target={focusTarget} />
      </MapContainer>

      {view === 'map' && (
        <div className="absolute bottom-2 left-2 z-[1000] w-40 rounded-xl border border-slate-200 bg-white/95 p-3 text-[11px] shadow-md backdrop-blur dark:border-white/10 dark:bg-[#111814]/95">
          <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Hotspot Intensity</p>
          <div className="space-y-1.5">
            {INTENSITY_ORDER.map((level) => (
              <div key={level} className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[level] }} />
                  {level}
                </span>
                <span>{INTENSITY_SCORE_RANGE[level]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {onExpandFullScreen && (
        <button
          type="button"
          onClick={onExpandFullScreen}
          className="absolute bottom-2 right-2 z-[1000] flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-[#111814] dark:text-slate-300 dark:hover:bg-white/5">
          <Maximize2 size={13} /> View Full Screen
        </button>
      )}
    </div>
  );
}
