import type { EvidenceKind, EvidenceOrigin, IncidentCategory } from "@/lib/scenario/types";

export type PhotoStats = {
  meanLuminance: number;
  contrast: number;
  earthToneShare: number;
  greyShare: number;
  greenShare: number;
  sampledPixels: number;
};

export type InterpretationPhotoInput =
  | { present: false }
  | { present: true; source: "field-db"; reportId: string; width: number; height: number; byteSize: number; stats: PhotoStats | null };

export type InterpretationContextInput = { kind: EvidenceKind; origin: EvidenceOrigin; source: string; summary: string };

export type InterpretationInputs = {
  incidentId: string;
  reference: string;
  segmentName: string;
  corridor: string;
  category: IncidentCategory | null;
  note: string | null;
  photo: InterpretationPhotoInput;
  context: InterpretationContextInput[];
};

export type CueSource = "photo" | "note" | "category" | "context";
export type CueStrength = "strong" | "moderate" | "weak";
export type LaneObstruction = "FULL" | "PARTIAL" | "NONE" | "UNDETERMINED";
export type ImageRelevance = "HIGH" | "MEDIUM" | "LOW" | "NOT_ASSESSED";
export type ContextConsistency = "CONSISTENT" | "PARTIAL" | "INCONSISTENT" | "NO_CONTEXT";
export type ProviderKind = "deterministic-fallback" | "llm-backend";

export type AiInterpretation = {
  id: string;
  incidentId: string;
  producedAt: number;
  provider: { name: string; kind: ProviderKind; model: string | null };
  inputFingerprint: string;
  inputsUsed: { photo: boolean; note: boolean; category: IncidentCategory | null; contextKinds: EvidenceKind[] };
  hazard: { label: string; category: IncidentCategory | null; likelihood: number; alternatives: { label: string; likelihood: number }[] };
  cues: { text: string; source: CueSource; strength: CueStrength }[];
  laneObstruction: { assessment: LaneObstruction; basis: string };
  imageQuality: { relevance: ImageRelevance; notes: string[] };
  consistency: { assessment: ContextConsistency; notes: string[] };
  confidence: number;
  summary: string;
  limitations: string[];
};

export const aiGuardrails = [
  "Does not verify the incident — an authorized officer must verify.",
  "Does not change any road or network state.",
  "Does not select, rank or authorize any route.",
  "Cannot override vehicle, bridge or network hard constraints.",
] as const;

export const aiAssistiveLabel = "AI assistance used · Officer verification required";
