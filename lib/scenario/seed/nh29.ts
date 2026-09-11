import type { Mission, Place, RoadSegment, Route, Vehicle } from "@/lib/scenario/types";

export const scenarioMeta = {
  id: "nh29-sept-2024-reconstruction",
  name: "One Landslide. Three Missions. Different Decisions.",
  corridor: "Dimapur → Pherima → Pagala Pahar → Kohima (NH-29)",
  basis:
    "Controlled NIRNYAY simulation reconstructing the September 2024 NH-29 (Nagaland) disruption. Place coordinates are approximate and all road geometry is schematic demo data. NIRNYAY did not operate during the historical event.",
  stalenessHours: 12,
  defaultStagingPlaceId: "dimapur-staging",
};

export const places: Place[] = [
  { id: "dimapur", name: "Dimapur", shortName: "Dimapur", lat: 25.906, lon: 93.727, kind: "city", note: "Origin · KM 0" },
  {
    id: "dimapur-staging",
    name: "Dimapur Safe Staging Point",
    shortName: "Staging",
    lat: 25.918,
    lon: 93.745,
    kind: "staging",
    note: "Designated hold location (demo)",
  },
  {
    id: "chumoukedima",
    name: "Chümoukedima junction (J-12A)",
    shortName: "Chümoukedima · J-12A",
    lat: 25.867,
    lon: 93.783,
    kind: "junction",
    note: "Divert point for Routes B and C",
  },
  { id: "pherima", name: "Pherima", shortName: "Pherima", lat: 25.8, lon: 93.853, kind: "town" },
  { id: "pagala-pahar", name: "Pagala Pahar", shortName: "Pagala Pahar", lat: 25.768, lon: 93.905, kind: "town" },
  { id: "zubza", name: "Zubza", shortName: "Zubza", lat: 25.716, lon: 94.031, kind: "town" },
  { id: "kohima", name: "Kohima", shortName: "Kohima", lat: 25.675, lon: 94.109, kind: "city", note: "Destination · KM 74" },
  { id: "niuland", name: "Niuland", shortName: "Niuland", lat: 25.975, lon: 93.868, kind: "town" },
  { id: "pimla", name: "Pimla", shortName: "Pimla", lat: 25.845, lon: 93.842, kind: "town" },
  { id: "mhainamtsi", name: "Mhainamtsi", shortName: "Mhainamtsi", lat: 25.79, lon: 93.985, kind: "town" },
];

export const segments: RoadSegment[] = [
  {
    id: "S1",
    name: "Dimapur – Chümoukedima",
    corridor: "NH-29",
    fromPlaceId: "dimapur",
    toPlaceId: "chumoukedima",
    distanceKm: 14,
    travelMin: 25,
    roadClass: "National Highway",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "OPEN",
    initialVerifiedHoursAgo: 0.5,
  },
  {
    id: "S2",
    name: "Chümoukedima – Pherima",
    corridor: "NH-29",
    fromPlaceId: "chumoukedima",
    toPlaceId: "pherima",
    distanceKm: 28,
    travelMin: 50,
    roadClass: "National Highway",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "OPEN",
    initialVerifiedHoursAgo: 0.5,
  },
  {
    id: "S3",
    name: "Pherima – Pagala Pahar",
    corridor: "NH-29",
    fromPlaceId: "pherima",
    toPlaceId: "pagala-pahar",
    distanceKm: 10,
    travelMin: 20,
    roadClass: "National Highway (hill section)",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "OPEN",
    initialVerifiedHoursAgo: 0.5,
    riskNote: "Recurrent monsoon landslide stretch",
  },
  {
    id: "S4",
    name: "Pagala Pahar – Zubza",
    corridor: "NH-29",
    fromPlaceId: "pagala-pahar",
    toPlaceId: "zubza",
    distanceKm: 12,
    travelMin: 25,
    roadClass: "National Highway (hill section)",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "OPEN",
    initialVerifiedHoursAgo: 0.5,
  },
  {
    id: "S5",
    name: "Zubza – Kohima",
    corridor: "NH-29",
    fromPlaceId: "zubza",
    toPlaceId: "kohima",
    distanceKm: 10,
    travelMin: 30,
    roadClass: "National Highway",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "OPEN",
    initialVerifiedHoursAgo: 0.5,
  },
  {
    id: "B1",
    name: "Chümoukedima – Pimla",
    corridor: "Route B",
    fromPlaceId: "chumoukedima",
    toPlaceId: "pimla",
    distanceKm: 12,
    travelMin: 30,
    roadClass: "State road",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "OPEN",
    initialVerifiedHoursAgo: 30,
  },
  {
    id: "B2",
    name: "Pimla – Mhainamtsi",
    corridor: "Route B",
    fromPlaceId: "pimla",
    toPlaceId: "mhainamtsi",
    distanceKm: 30,
    travelMin: 90,
    roadClass: "Hill road",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "HIGH_RISK",
    initialVerifiedHoursAgo: 30,
    riskNote: "Reported slope failures and washouts after continuous rainfall (simulated); no patrol confirmation in the last 30 h",
  },
  {
    id: "B3",
    name: "Mhainamtsi – Zubza",
    corridor: "Route B",
    fromPlaceId: "mhainamtsi",
    toPlaceId: "zubza",
    distanceKm: 20,
    travelMin: 60,
    roadClass: "Hill road",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "OPEN",
    initialVerifiedHoursAgo: 30,
  },
  {
    id: "C1",
    name: "Chümoukedima – Niuland",
    corridor: "Route C",
    fromPlaceId: "chumoukedima",
    toPlaceId: "niuland",
    distanceKm: 24,
    travelMin: 45,
    roadClass: "District road",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "OPEN",
    initialVerifiedHoursAgo: 2,
  },
  {
    id: "C2",
    name: "Niuland – Kohima bypass",
    corridor: "Route C",
    fromPlaceId: "niuland",
    toPlaceId: "kohima",
    distanceKm: 60,
    travelMin: 117,
    roadClass: "Narrow hill bypass",
    geometrySource: "DEMO_ONLY_SIMULATED",
    initialState: "OPEN",
    initialVerifiedHoursAgo: 2,
    restriction: {
      maxVehicleClass: "LMV",
      note: "Light motor vehicles only — narrow carriageway and weak culverts (seeded demo restriction)",
    },
  },
];

export const routes: Route[] = [
  {
    id: "A",
    name: "Route A",
    label: "Original NH-29",
    segmentIds: ["S1", "S2", "S3", "S4", "S5"],
    geometrySource: "DEMO_ONLY_SIMULATED",
    description: "Dimapur → Chümoukedima → Pherima → Pagala Pahar → Zubza → Kohima",
  },
  {
    id: "B",
    name: "Route B",
    label: "Pimla – Mhainamtsi",
    segmentIds: ["S1", "B1", "B2", "B3", "S5"],
    geometrySource: "DEMO_ONLY_SIMULATED",
    description: "Dimapur → Chümoukedima → Pimla → Mhainamtsi → Zubza → Kohima",
  },
  {
    id: "C",
    name: "Route C",
    label: "Niuland – Kohima",
    segmentIds: ["S1", "C1", "C2"],
    geometrySource: "DEMO_ONLY_SIMULATED",
    description: "Dimapur → Chümoukedima → Niuland → Kohima",
  },
];

export const vehicles: Vehicle[] = [
  { id: "V-HCV-16W", name: "16-wheeler HCV", vehicleClass: "HCV", wheels: 16, grossTonnes: 38, lengthM: 16 },
  { id: "V-MCV", name: "Medium truck", vehicleClass: "MCV", wheels: 6, grossTonnes: 12, lengthM: 8.5 },
  { id: "V-LMV", name: "LMV / pickup", vehicleClass: "LMV", wheels: 4, grossTonnes: 3.5, lengthM: 5.2 },
];

export const missions: Mission[] = [
  {
    id: "M-101",
    cargo: "Critical medicines",
    cargoDetail: "Cold-chain vaccines and ICU consumables",
    vehicleId: "V-HCV-16W",
    originPlaceId: "dimapur",
    destinationPlaceId: "kohima",
    deadlineHours: 8,
    priority: "CRITICAL",
    plannedRouteId: "A",
    positionSegmentId: "S1",
    positionFraction: 0.15,
    timeSensitivity: 1,
    consequenceExposure: 0.9,
    driverName: "Driver M-101",
  },
  {
    id: "M-102",
    cargo: "Relief food",
    cargoDetail: "Rice, pulses and fortified rations",
    vehicleId: "V-MCV",
    originPlaceId: "dimapur",
    destinationPlaceId: "kohima",
    deadlineHours: 12,
    priority: "HIGH",
    plannedRouteId: "A",
    positionSegmentId: "S1",
    positionFraction: 0.3,
    timeSensitivity: 0.6,
    consequenceExposure: 0.7,
    driverName: "Driver M-102",
  },
  {
    id: "M-103",
    cargo: "Routine construction material",
    cargoDetail: "Cement, fittings and hardware",
    vehicleId: "V-LMV",
    originPlaceId: "dimapur",
    destinationPlaceId: "kohima",
    deadlineHours: 72,
    priority: "NORMAL",
    plannedRouteId: "A",
    positionSegmentId: "S1",
    positionFraction: 0.45,
    timeSensitivity: 0.2,
    consequenceExposure: 0.2,
    driverName: "Driver M-103",
  },
];

export const primaryIncidentSeed = {
  reference: "I-001",
  segmentId: "S3",
  lat: 25.789,
  lon: 93.87,
  category: "landslide" as const,
  note: "Debris and boulders across both lanes near Pherima. Vehicles halted on both sides.",
  fullBlockage: true,
};

export const secondaryIncidentSeed = {
  reference: "I-002",
  segmentId: "C2",
  lat: 25.82,
  lon: 93.99,
  category: "landslide" as const,
  note: "Slope failure on the Niuland bypass; carriageway covered, no passage.",
  fullBlockage: true,
};

const placeIndex = new Map(places.map((place) => [place.id, place]));
const segmentIndex = new Map(segments.map((segment) => [segment.id, segment]));
const routeIndex = new Map(routes.map((route) => [route.id, route]));
const vehicleIndex = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
const missionIndex = new Map(missions.map((mission) => [mission.id, mission]));

export function getPlace(id: string): Place {
  const place = placeIndex.get(id);
  if (!place) throw new Error(`Unknown place ${id}`);
  return place;
}

export function getSegment(id: string): RoadSegment {
  const segment = segmentIndex.get(id);
  if (!segment) throw new Error(`Unknown segment ${id}`);
  return segment;
}

export function getRoute(id: string): Route {
  const route = routeIndex.get(id);
  if (!route) throw new Error(`Unknown route ${id}`);
  return route;
}

export function getVehicle(id: string): Vehicle {
  const vehicle = vehicleIndex.get(id);
  if (!vehicle) throw new Error(`Unknown vehicle ${id}`);
  return vehicle;
}

export function getMission(id: string): Mission {
  const mission = missionIndex.get(id);
  if (!mission) throw new Error(`Unknown mission ${id}`);
  return mission;
}
