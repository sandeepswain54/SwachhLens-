// Free reverse geocoding via OpenStreetMap's Nominatim service.
// Usage policy: max ~1 request/sec, requires a descriptive User-Agent, and is
// meant for light/manual use — not for high-volume production traffic.
// https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM_HEADERS = {
  'User-Agent': 'SwachhLens/1.0 (civic waste-reporting app)',
  'Accept-Language': 'en',
};

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
  const response = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!response.ok) {
    throw new Error('Could not resolve an address for this location.');
  }
  const json = await response.json();
  return json?.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
