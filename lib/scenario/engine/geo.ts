const earthRadiusKm = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
