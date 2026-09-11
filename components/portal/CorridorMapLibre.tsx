"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LayerSpecification, Map as MapLibreMap, Marker as MapLibreMarker, StyleSpecification } from "maplibre-gl";
import type { EffectiveSegment } from "@/lib/scenario/engine/network";
import {
  buildSegmentCollection,
  incidentLngLat,
  missionLngLat,
  placeBounds,
  placeLngLat,
  pointAlong,
  routeLabelPosition,
  type LngLat,
} from "@/lib/scenario/geo";
import { getPlace, getRoute, places, scenarioMeta, segments as seededSegments } from "@/lib/scenario/seed/nh29";
import type { IncidentView, MissionView } from "@/lib/scenario/view";

type Props = {
  segments: EffectiveSegment[];
  incidents: IncidentView[];
  missions: MissionView[];
  highlightRouteId?: string | null;
  selectedMissionId?: string | null;
  onSelectMission?: (missionId: string) => void;
  heightClass?: string;
  overlay?: ReactNode;
};

type BasemapMode = "vector" | "osm" | "plain";

const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim() || null;
const vectorTilesUrl = maptilerKey ? `https://api.maptiler.com/tiles/v3/tiles.json?key=${encodeURIComponent(maptilerKey)}` : null;

const vectorLayers: LayerSpecification[] = [
  { id: "vt-landcover", type: "fill", source: "basemap-vector", "source-layer": "landcover", filter: ["in", ["get", "class"], ["literal", ["wood", "forest", "grass"]]], paint: { "fill-color": "#dfe9dd", "fill-opacity": 0.7 } },
  { id: "vt-park", type: "fill", source: "basemap-vector", "source-layer": "park", paint: { "fill-color": "#d8e6d4", "fill-opacity": 0.6 } },
  { id: "vt-water", type: "fill", source: "basemap-vector", "source-layer": "water", paint: { "fill-color": "#c7dbeb" } },
  { id: "vt-waterway", type: "line", source: "basemap-vector", "source-layer": "waterway", paint: { "line-color": "#c7dbeb", "line-width": 1.2 } },
  { id: "vt-roads-minor", type: "line", source: "basemap-vector", "source-layer": "transportation", minzoom: 10, filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary"]]], paint: { "line-color": "#dde1e7", "line-width": 1 } },
  { id: "vt-roads-major", type: "line", source: "basemap-vector", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#cfd4dc", "line-width": 2 } },
  { id: "vt-boundary-state", type: "line", source: "basemap-vector", "source-layer": "boundary", filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]], paint: { "line-color": "#7d8296", "line-width": 1.4, "line-dasharray": [3, 2] } },
  { id: "vt-boundary-country", type: "line", source: "basemap-vector", "source-layer": "boundary", filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]], paint: { "line-color": "#5b6070", "line-width": 1.8 } },
];

const baseStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#eef1f5" } }],
};

const osmSource = {
  type: "raster" as const,
  tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  tileSize: 256,
  attribution: "© OpenStreetMap contributors",
  maxzoom: 19,
};

function missionTone(view: MissionView): string {
  switch (view.responseState) {
    case "HOLD":
    case "AWAITING_AUTHORITY":
    case "REJECTED":
      return "#ba1a1a";
    case "REROUTING":
    case "REROUTE_PENDING_ACK":
      return "#3b608c";
    case "AFFECTED":
    case "VERIFICATION_REQUESTED":
      return "#b45309";
    default:
      return "#15803d";
  }
}

function missionStateText(view: MissionView): string {
  switch (view.responseState) {
    case "ON_TIME":
      return "On time · Route A";
    case "AFFECTED":
      return "Affected · assessing";
    case "AWAITING_AUTHORITY":
      return `${view.activeDecision?.recommendation.action ?? "Decision"}${view.activeDecision?.recommendation.routeId ? ` via ${view.activeDecision.recommendation.routeId}` : ""} · awaiting authority`;
    case "VERIFICATION_REQUESTED":
      return "Verification requested";
    case "REJECTED":
      return "Recommendation rejected";
    case "HOLD":
      return "HOLD approved · staging";
    case "REROUTE_PENDING_ACK":
      return `Reroute via ${view.currentRouteId} · awaiting driver`;
    case "REROUTING":
      return `Rerouting via Route ${view.currentRouteId}`;
  }
}

function el(html: string, className: string): HTMLDivElement {
  const node = document.createElement("div");
  node.className = className;
  node.innerHTML = html;
  return node;
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

export function CorridorMapLibre({
  segments,
  incidents,
  missions,
  highlightRouteId = null,
  selectedMissionId = null,
  onSelectMission,
  heightClass = "h-[560px]",
  overlay,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState<BasemapMode>(vectorTilesUrl ? "vector" : "osm");
  const [vectorFailed, setVectorFailed] = useState(false);
  const [tileError, setTileError] = useState(false);
  const onSelectRef = useRef(onSelectMission);

  useEffect(() => {
    onSelectRef.current = onSelectMission;
  }, [onSelectMission]);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) return;
    const setup = async () => {
      const maplibre = await import("maplibre-gl");
      if (disposed) return;
      maplibreRef.current = maplibre;
      maplibre.setWorkerUrl(new URL("/maplibre/maplibre-gl-worker.mjs", window.location.origin).href);
      const bounds = placeBounds();
      const map = new maplibre.Map({
        container,
        style: baseStyle,
        bounds,
        fitBoundsOptions: { padding: { top: 90, bottom: 50, left: 60, right: 60 } },
        attributionControl: { compact: true },
        cooperativeGestures: false,
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.on("error", (event) => {
        const sourceId = (event as { sourceId?: string }).sourceId;
        if (sourceId === "basemap-vector") {
          setVectorFailed(true);
          setBasemap((current) => (current === "vector" ? "osm" : current));
          return;
        }
        if (sourceId === "osm" || String(event.error?.message ?? "").toLowerCase().includes("tile")) setTileError(true);
      });
      map.on("load", () => {
        if (disposed) return;
        map.addSource("osm", osmSource);
        map.addLayer({ id: "osm", type: "raster", source: "osm", paint: { "raster-opacity": 0.8, "raster-saturation": -0.7, "raster-contrast": -0.15 } });
        if (vectorTilesUrl) {
          try {
            map.addSource("basemap-vector", { type: "vector", url: vectorTilesUrl });
            for (const layer of vectorLayers) map.addLayer({ ...layer, layout: { ...layer.layout, visibility: "none" } } as LayerSpecification);
          } catch {
            setVectorFailed(true);
            setBasemap("osm");
          }
        }
        map.addSource("segments", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "segments-highlight",
          type: "line",
          source: "segments",
          filter: ["==", ["get", "highlight"], true],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "highlightColor"], "line-width": 18, "line-opacity": 0.28 },
        });
        map.addLayer({
          id: "segments-casing",
          type: "line",
          source: "segments",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#ffffff", "line-width": ["+", ["get", "width"], 4] },
        });
        map.addLayer({
          id: "segments-solid",
          type: "line",
          source: "segments",
          filter: ["==", ["get", "dashed"], false],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], "line-width": ["get", "width"] },
        });
        map.addLayer({
          id: "segments-dashed",
          type: "line",
          source: "segments",
          filter: ["==", ["get", "dashed"], true],
          paint: { "line-color": ["get", "color"], "line-width": ["get", "width"], "line-dasharray": [2, 1.6] },
        });
        map.addLayer({
          id: "segments-blocked-hatch",
          type: "line",
          source: "segments",
          filter: ["==", ["get", "blocked"], true],
          paint: { "line-color": "#ffffff", "line-width": 2, "line-dasharray": [1.2, 1.6] },
        });
        mapRef.current = map;
        (window as unknown as { __nirnyayMap?: MapLibreMap }).__nirnyayMap = map;
        map.resize();
        map.fitBounds(bounds, { padding: { top: 90, bottom: 50, left: 60, right: 60 }, duration: 0 });
        setReady(true);
      });
      const observer = new ResizeObserver(() => map.resize());
      observer.observe(container);
      return () => observer.disconnect();
    };
    const cleanupPromise = setup();
    return () => {
      disposed = true;
      void cleanupPromise.then((cleanup) => cleanup?.());
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty("osm", "visibility", basemap === "osm" ? "visible" : "none");
    for (const layer of vectorLayers) {
      if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, "visibility", basemap === "vector" ? "visible" : "none");
    }
  }, [basemap, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("segments");
    if (source && "setData" in source) {
      (source as { setData: (data: GeoJSON.FeatureCollection) => void }).setData(buildSegmentCollection(segments, highlightRouteId));
    }
  }, [segments, highlightRouteId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!map || !maplibre || !ready) return;
    markersRef.current.forEach((marker) => marker.remove());
    const markers: MapLibreMarker[] = [];
    const add = (lngLat: LngLat, element: HTMLElement, anchor: "center" | "left" | "right" | "top" | "bottom" | "top-left" | "bottom-left" = "center", offset: [number, number] = [0, 0]) => {
      const marker = new maplibre.Marker({ element, anchor, offset }).setLngLat(lngLat).addTo(map);
      markers.push(marker);
    };

    for (const place of places) {
      const major = place.kind === "city";
      const dot = place.kind === "staging"
        ? `<span class="block size-3 border-2 border-primary-container bg-surface-container-low"></span>`
        : `<span class="block ${major ? "size-3.5" : "size-2.5"} rounded-full border-2 border-white ${major ? "bg-primary-container" : "bg-on-surface-variant"} shadow"></span>`;
      add(
        placeLngLat(place.id),
        el(
          `${dot}<span class="mt-0.5 whitespace-nowrap rounded-xs bg-white/90 px-1 text-[11px] ${major ? "font-bold" : "font-semibold"} text-on-surface shadow-xs">${escape(place.shortName)}</span>`,
          "flex flex-col items-center pointer-events-none",
        ),
        "top",
        [0, -7],
      );
    }

    for (const route of [getRoute("A"), getRoute("B"), getRoute("C")]) {
      const worst = route.segmentIds
        .map((id) => segments.find((segment) => segment.segment.id === id)?.effectiveState ?? "UNKNOWN")
        .reduce((acc, state) => (rank(state) > rank(acc) ? state : acc), "OPEN" as EffectiveSegment["effectiveState"]);
      const color = worst === "BLOCKED" ? "border-error text-on-error-container" : worst === "HIGH_RISK" ? "border-warning-outline text-warning" : "border-primary-container text-primary-container";
      const restriction = route.segmentIds.map((id) => seededSegments.find((segment) => segment.id === id)?.restriction?.maxVehicleClass).find(Boolean);
      const offset: [number, number] = route.id === "A" ? [0, 28] : route.id === "B" ? [0, -26] : [-20, 26];
      add(
        routeLabelPosition(route.id),
        el(
          `<span class="font-bold">${escape(route.name)}</span> · ${escape(route.label)} <span class="font-bold">${escape(worst.replace("_", " "))}</span>${restriction ? ` · ${restriction} only` : ""}`,
          `pointer-events-none whitespace-nowrap rounded-xs border bg-white px-1.5 py-0.5 text-[11px] shadow ${color} ${highlightRouteId === route.id ? "ring-2 ring-secondary" : ""}`,
        ),
        "center",
        offset,
      );
    }

    for (const segment of segments) {
      const restriction = segment.segment.restriction;
      if (!restriction?.maxVehicleClass) continue;
      add(
        pointAlong(segment.segment.id, 0.3),
        el(`${restriction.maxVehicleClass} only · hard constraint`, "pointer-events-none whitespace-nowrap rounded-xs border border-secondary bg-secondary-container px-1.5 py-0.5 text-[10px] font-bold text-on-secondary-container shadow"),
        "center",
        [0, 18],
      );
    }

    for (const view of incidents) {
      const status = view.incident.verifiedAt ? "VERIFIED" : view.assessment.status === "CORROBORATED" ? "CORROBORATED" : "PENDING VERIFICATION";
      add(
        incidentLngLat(view),
        el(
          `<span class="relative flex size-7 items-center justify-center rounded-full border-2 border-error bg-error-container shadow"><span class="size-3 rounded-full bg-error"></span></span>`,
          "pointer-events-none",
        ),
      );
      add(
        incidentLngLat(view),
        el(
          `<div class="text-[10px] font-extrabold tracking-wider text-on-error-container">${escape(view.incident.reference)} · ${escape(view.incident.ai.label.split(" ")[0])}</div><div class="text-[11px] font-semibold text-on-surface">${escape(view.segment?.segment.name ?? "")}</div><div class="text-[10px] font-bold ${view.incident.verifiedAt ? "text-success" : "text-warning"}">${status}</div>`,
          "pointer-events-none rounded-xs border border-error bg-white px-2 py-1 shadow-md",
        ),
        "left",
        [22, -6],
      );
    }

    missions.forEach((view, index) => {
      const tone = missionTone(view);
      const selected = selectedMissionId === view.mission.id;
      const dot = el("", "size-3.5 rounded-full border-2 border-white shadow");
      dot.style.backgroundColor = tone;
      add(missionLngLat(view), dot);
      const callout = el(
        `<div class="text-[11px] font-bold" style="color:${tone}">${escape(view.mission.id)} · ${escape(view.vehicle.vehicleClass)} ${view.vehicle.grossTonnes} t</div><div class="text-[10px] text-on-surface-variant">${escape(missionStateText(view))}</div>`,
        `cursor-pointer rounded-xs border bg-white px-2 py-1 shadow-md ${selected ? "ring-2 ring-secondary" : ""}`,
      );
      callout.style.borderColor = tone;
      callout.addEventListener("click", () => onSelectRef.current?.(view.mission.id));
      add(missionLngLat(view), callout, "bottom-left", [26, -50 - index * 50]);
    });

    const divertMission = missions.find((view) => view.mission.id === selectedMissionId) ?? missions.find((view) => view.activeDecision?.recommendation.divertPlaceId);
    const divertPlaceId = divertMission?.activeDecision?.recommendation.divertPlaceId ?? null;
    if (divertPlaceId && divertMission?.activeDecision?.recommendation.action === "REROUTE") {
      add(
        placeLngLat(divertPlaceId),
        el(`DIVERT AT ${escape(getPlace(divertPlaceId).shortName)} → Route ${escape(divertMission.activeDecision.recommendation.routeId ?? "")} (${escape(divertMission.mission.id)})`, "pointer-events-none whitespace-nowrap rounded-xs bg-secondary px-2 py-0.5 text-[10px] font-bold text-white shadow"),
        "top",
        [0, 34],
      );
    }
    const staging = missions.find((view) => view.activeDecision?.recommendation.action === "HOLD" && view.activeDecision.status === "APPROVED");
    if (staging) {
      add(
        placeLngLat(scenarioMeta.defaultStagingPlaceId),
        el(`HOLD · ${missions.filter((view) => view.activeDecision?.recommendation.action === "HOLD").map((view) => view.mission.id).join(", ")}`, "pointer-events-none whitespace-nowrap rounded-xs bg-error px-2 py-0.5 text-[10px] font-bold text-white shadow"),
        "bottom",
        [0, -12],
      );
    }

    markersRef.current = markers;
  }, [segments, incidents, missions, selectedMissionId, highlightRouteId, ready]);

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/40 bg-surface-container-low px-4 py-2.5">
        <div className="text-xs">
          <span className="font-bold uppercase tracking-wide text-primary-container">Operational map</span>
          <span className="ml-2 text-on-surface-variant">{scenarioMeta.corridor}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[0.6875rem]">
          <span className="rounded-xs border border-outline-variant/60 bg-surface-container px-2 py-0.5 font-bold uppercase tracking-wider text-on-surface-variant">
            Corridor geometry: demo-only simulated
          </span>
          <div role="group" aria-label="Basemap" className="inline-flex overflow-hidden rounded-xs border border-outline-variant/60">
            {((vectorTilesUrl && !vectorFailed ? ["vector", "osm", "plain"] : ["osm", "plain"]) as BasemapMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={basemap === mode}
                onClick={() => setBasemap(mode)}
                className={`px-2 py-0.5 font-semibold ${basemap === mode ? "bg-primary-container text-on-primary" : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"}`}
              >
                {mode === "vector" ? "Vector" : mode === "osm" ? "OpenStreetMap" : "Plain"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={`relative ${heightClass}`}>
        <div ref={containerRef} className="h-full w-full" role="region" aria-label="MapLibre corridor map" />
        {overlay}
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-xs text-on-surface-variant">Loading map…</div>}
        {tileError && basemap === "osm" && (
          <p className="absolute left-3 top-3 rounded-xs border border-warning-outline bg-warning-container px-2 py-1 text-[0.6875rem] font-semibold text-warning">
            Basemap tiles unavailable (offline?) — corridor layers still shown
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-outline-variant/40 px-4 py-2.5 text-xs text-on-surface">
        <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-outline">Legend</span>
        <Legend color="#0b2545" label="Open" />
        <Legend color="#ba1a1a" label="Blocked" />
        <Legend color="#b45309" label="High risk" dashed />
        <Legend color="#74777f" label="Stale / unknown" dashed />
        <Legend color="#3b608c" label="Highlighted route" glow />
        <span className="rounded-xs border border-warning-outline bg-warning-container px-2 py-0.5 font-bold text-warning">UNKNOWN ≠ OPEN</span>
        <span className="rounded-xs border border-warning-outline bg-warning-container px-2 py-0.5 font-bold text-warning">STALE ≠ CURRENT</span>
      </div>
    </div>
  );
}

function rank(state: EffectiveSegment["effectiveState"]): number {
  return { BLOCKED: 5, HIGH_RISK: 4, UNKNOWN: 3, STALE: 2, RESTRICTED: 1, OPEN: 0 }[state];
}

function Legend({ color, label, dashed = false, glow = false }: { color: string; label: string; dashed?: boolean; glow?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-0 w-5"
        style={glow ? { borderTop: `6px solid ${color}`, opacity: 0.35 } : { borderTop: `3px ${dashed ? "dashed" : "solid"} ${color}` }}
      />
      {label}
    </span>
  );
}
