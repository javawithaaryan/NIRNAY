import type { LocationFix } from "@/lib/field/types";

export type LocationErrorCode =
  | "unsupported"
  | "insecure-context"
  | "permission-denied"
  | "position-unavailable"
  | "timeout";

export class LocationError extends Error {
  readonly code: LocationErrorCode;

  constructor(code: LocationErrorCode) {
    super(code);
    this.name = "LocationError";
    this.code = code;
  }
}

export const lowAccuracyThresholdM = 100;

const positionOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

function requestPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, positionOptions);
  });
}

function toLocationError(error: unknown): LocationError {
  if (error instanceof LocationError) return error;
  const code = (error as Partial<GeolocationPositionError> | undefined)?.code;
  if (code === 1) return new LocationError("permission-denied");
  if (code === 3) return new LocationError("timeout");
  return new LocationError("position-unavailable");
}

export async function captureLocation(): Promise<LocationFix> {
  if (!window.isSecureContext) throw new LocationError("insecure-context");
  if (!("geolocation" in navigator)) throw new LocationError("unsupported");
  try {
    const position = await requestPosition();
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyM: position.coords.accuracy,
      fixedAt: new Date(position.timestamp).toISOString(),
    };
  } catch (error) {
    throw toLocationError(error);
  }
}
