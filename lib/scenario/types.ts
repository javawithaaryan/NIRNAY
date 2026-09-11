export type RoadState = "OPEN" | "RESTRICTED" | "HIGH_RISK" | "BLOCKED" | "UNKNOWN" | "STALE";
export type VehicleClass = "LMV" | "MCV" | "HCV";
export type Priority = "CRITICAL" | "HIGH" | "NORMAL";
export type Feasibility = "FEASIBLE" | "INFEASIBLE" | "UNDETERMINED";
export type DecisionAction = "CONTINUE" | "REROUTE" | "HOLD";
export type DecisionStatus = "RECOMMENDED" | "APPROVED" | "REJECTED" | "VERIFICATION_REQUESTED" | "SUPERSEDED";
export type EvidenceStatus = "PENDING_VERIFICATION" | "CORROBORATED" | "VERIFIED" | "REJECTED";
export type GeometrySource = "REAL_OSM_DERIVED" | "DEMO_ONLY_SIMULATED";
export type EvidenceOrigin = "FIELD" | "SIMULATED" | "SEEDED";
export type EvidenceKind =
  | "FIELD_REPORT"
  | "NEARBY_REPORT"
  | "SECOND_REPORT"
  | "WEATHER"
  | "INSTITUTIONAL"
  | "HISTORICAL"
  | "LOGISTICS"
  | "NETWORK_RECORD";
export type IncidentCategory = "landslide" | "flooding" | "road-damage" | "bridge" | "blockage" | "other";
export type FollowUp = "VERIFY" | "ESCALATE";
export type ImpactLevel = "NONE" | "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type PriorityTier = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type ActorRole = "OPERATOR" | "AUTHORITY" | "DRIVER" | "SYSTEM" | "PRESENTER";

export type Actor = { name: string; role: ActorRole };

export type Place = {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  kind: "city" | "town" | "junction" | "staging";
  note?: string;
};

export type VehicleRestriction = {
  maxVehicleClass?: VehicleClass;
  maxGrossTonnes?: number;
  note: string;
};

export type RoadSegment = {
  id: string;
  name: string;
  corridor: string;
  fromPlaceId: string;
  toPlaceId: string;
  distanceKm: number;
  travelMin: number;
  roadClass: string;
  geometrySource: GeometrySource;
  initialState: RoadState;
  initialVerifiedHoursAgo: number;
  restriction?: VehicleRestriction;
  riskNote?: string;
};

export type Route = {
  id: string;
  name: string;
  label: string;
  segmentIds: string[];
  geometrySource: GeometrySource;
  description: string;
};

export type Vehicle = {
  id: string;
  name: string;
  vehicleClass: VehicleClass;
  wheels: number;
  grossTonnes: number;
  lengthM: number;
};

export type Mission = {
  id: string;
  cargo: string;
  cargoDetail: string;
  vehicleId: string;
  originPlaceId: string;
  destinationPlaceId: string;
  deadlineHours: number;
  priority: Priority;
  plannedRouteId: string;
  positionSegmentId: string;
  positionFraction: number;
  timeSensitivity: number;
  consequenceExposure: number;
  driverName: string;
};

export type EvidenceItem = {
  id: string;
  incidentId: string;
  kind: EvidenceKind;
  origin: EvidenceOrigin;
  source: string;
  title: string;
  summary: string;
  capturedAt: number;
  lat?: number;
  lon?: number;
  accuracyM?: number;
  distanceKm?: number;
  originalLat?: number;
  originalLon?: number;
  reliability: number;
  contextualConsistency?: number;
  photo?: { kind: "field-db"; reportId: string } | { kind: "none" };
  fieldReportReference?: string;
};

export type AiAssessment = {
  label: string;
  indicators: string[];
  categoryGuess: IncidentCategory;
  provider: string;
  caveat: string;
};

export type Incident = {
  id: string;
  reference: string;
  segmentId: string;
  lat: number;
  lon: number;
  reportedAt: number;
  category: IncidentCategory;
  note: string | null;
  fullBlockage: boolean;
  verifiedAt: number | null;
  verifiedBy: Actor | null;
  rejectedAt: number | null;
  rejectedBy: Actor | null;
  moreEvidenceRequestedAt: number | null;
  ai: AiAssessment;
};

export type SegmentRuntime = {
  state: RoadState;
  lastVerifiedAt: number;
  incidentIds: string[];
  reason: string | null;
};

export type RouteEvaluation = {
  routeId: string;
  feasibility: Feasibility;
  travelMin: number;
  arrivalAt: number;
  deadlineAchievable: boolean | null;
  reasons: { ok: boolean | null; text: string }[];
  blockingSegmentIds: string[];
  undeterminedSegmentIds: string[];
  hardConstraintViolation: boolean;
};

export type DecisionRecommendation = {
  action: DecisionAction;
  routeId: string | null;
  feasibility: Feasibility;
  noVerifiedFeasibleRoute: boolean;
  followUp: FollowUp[];
  stagingPlaceId: string | null;
  divertPlaceId: string | null;
  etaAt: number | null;
  why: string[];
  evaluations: RouteEvaluation[];
  instruction: string | null;
};

export type DecisionRecord = {
  id: string;
  missionId: string;
  createdAt: number;
  status: DecisionStatus;
  recommendation: DecisionRecommendation;
  triggerIncidentId: string | null;
  reassessmentOf: string | null;
  supersededBy: string | null;
  supersededAt: number | null;
  actedBy: Actor | null;
  actedAt: number | null;
  actedStatus: DecisionStatus | null;
  actionNote: string | null;
};

export type Instruction = {
  id: string;
  decisionId: string;
  missionId: string;
  text: string;
  issuedAt: number;
  acknowledgedAt: number | null;
  acknowledgedBy: string | null;
};
