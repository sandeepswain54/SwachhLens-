// Great-circle distance between two lat/lng points, in meters.
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

export function formatEta(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

export type RoadRoute = { coordinates: [number, number][]; durationSeconds: number };

// Real, road-snapped route + ETA from the free OSRM public demo server (no
// API key — this repo has neither react-native-maps nor a Google Maps key,
// see app/waste-hotspots.tsx). It's a best-effort, rate-limited public
// service with no uptime guarantee, so every caller must treat a null
// result as normal and fall back to a straight line / haversine estimate
// rather than failing the screen.
export async function fetchRoadRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): Promise<RoadRoute | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    const route = json?.routes?.[0];
    if (!route?.geometry?.coordinates) return null;

    const coordinates: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    return { coordinates, durationSeconds: route.duration };
  } catch {
    return null;
  }
}
