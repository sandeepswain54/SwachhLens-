import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';

function homeIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:#1B6B3A;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.4)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function pointIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#eb6834;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.35)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export function TeamMiniMap({ center, points }: { center: [number, number]; points: [number, number][] }) {
  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Recenter center={center} />
      <Marker position={center} icon={homeIcon()} />
      {points.map((p, i) => (
        <Marker key={i} position={p} icon={pointIcon()} />
      ))}
    </MapContainer>
  );
}
