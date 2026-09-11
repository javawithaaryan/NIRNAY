import type { EffectiveSegment } from "@/lib/scenario/engine/network";
import { getPlace, getRoute, getSegment, places, routes } from "@/lib/scenario/seed/nh29";
import type { RoadState } from "@/lib/scenario/types";
import type { IncidentView, MissionView } from "@/lib/scenario/view";

export type LngLat = [number, number];

export const stateColors: Record<RoadState, string> = {
  OPEN: "#0b2545",
  RESTRICTED: "#3b608c",
  HIGH_RISK: "#b45309",
  BLOCKED: "#ba1a1a",
  STALE: "#74777f",
  UNKNOWN: "#74777f",
};

export type SegmentFeatureProps = {
  id: string;
  name: string;
  corridor: string;
  state: RoadState;
  color: string;
  dashed: boolean;
  blocked: boolean;
  width: number;
  highlight: boolean;
  highlightColor: string;
};

export type SegmentFeature = GeoJSON.Feature<GeoJSON.LineString, SegmentFeatureProps>;

export function placeLngLat(placeId: string): LngLat {
  const place = getPlace(placeId);
  return [place.lon, place.lat];
}

export function segmentCoordinates(segmentId: string): [LngLat, LngLat] {
  const segment = getSegment(segmentId);
  return [placeLngLat(segment.fromPlaceId), placeLngLat(segment.toPlaceId)];
}

export function pointAlong(segmentId: string, t: number): LngLat {
  const [a, b] = segmentCoordinates(segmentId);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function segmentMidpoint(segmentId: string): LngLat {
  return pointAlong(segmentId, 0.5);
}

export function placeBounds(): [LngLat, LngLat] {
  const lons = places.map((place) => place.lon);
  const lats = places.map((place) => place.lat);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

export function missionLngLat(view: MissionView): LngLat {
  const [a, b] = segmentCoordinates(view.mission.positionSegmentId);
  const t = view.mission.positionFraction;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function buildSegmentCollection(
  segments: EffectiveSegment[],
  highlightRouteId: string | null,
): GeoJSON.FeatureCollection<GeoJSON.LineString, SegmentFeatureProps> {
  const highlighted = new Set(highlightRouteId ? getRoute(highlightRouteId).segmentIds : []);
  const highlightRouteBlocked = highlightRouteId
    ? getRoute(highlightRouteId).segmentIds.some((id) => segments.find((segment) => segment.segment.id === id)?.effectiveState === "BLOCKED")
    : false;
  return {
    type: "FeatureCollection",
    features: segments.map((segment) => {
      const state = segment.effectiveState;
      const isHighway = segment.segment.corridor === "NH-29";
      return {
        type: "Feature",
        geometry: { type: "LineString", coordinates: segmentCoordinates(segment.segment.id) },
        properties: {
          id: segment.segment.id,
          name: segment.segment.name,
          corridor: segment.segment.corridor,
          state,
          color: stateColors[state],
          dashed: state === "HIGH_RISK" || state === "STALE" || state === "UNKNOWN",
          blocked: state === "BLOCKED",
          width: isHighway ? 6 : 4,
          highlight: highlighted.has(segment.segment.id),
          highlightColor: highlightRouteBlocked ? "#ba1a1a" : "#3b608c",
        },
      };
    }),
  };
}

const routeLabelAnchors: Record<string, { segmentId: string; t: number }> = {
  A: { segmentId: "S4", t: 0.5 },
  B: { segmentId: "B2", t: 0.62 },
  C: { segmentId: "C2", t: 0.82 },
};

export function routeLabelPosition(routeId: string): LngLat {
  const anchor = routeLabelAnchors[routeId];
  if (anchor) return pointAlong(anchor.segmentId, anchor.t);
  const route = getRoute(routeId);
  return segmentMidpoint(route.segmentIds[Math.floor(route.segmentIds.length / 2)]);
}

export function incidentLngLat(view: IncidentView): LngLat {
  return [view.incident.lon, view.incident.lat];
}

export const routeIds = routes.map((route) => route.id);
